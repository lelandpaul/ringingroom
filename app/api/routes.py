from flask import jsonify, request, url_for
from app.models import User, TowerDB, get_server_ip
from app.extensions import db
from app.api import bp
from app.api.errors import error_response, bad_request
from app.api.auth import token_auth
from flask_login import current_user


# GET endpoints

@bp.route('/user', methods=['GET'])
@token_auth.login_required
def get_user():
    return jsonify(current_user.to_dict())

@bp.route('/my_towers', methods=['GET'])
@token_auth.login_required
def get_my_towers():
    data = {r.tower_id: r.to_dict() for r in current_user.towers}
    return jsonify(data)

@bp.route('/tower/<int:tower_id>', methods=['GET'])
@token_auth.login_required
def get_tower(tower_id):
    tower = TowerDB.query.get_or_404(tower_id)
    data = {
        'tower_id': tower_id,
        'tower_name': tower.tower_name,
        'server_address': get_server_ip(tower_id),
        'host_permissions': current_user.check_permissions(tower_id, 'host')
    }
    return jsonify(data)

@bp.route('/tower_settings/<int:tower_id>', methods=['GET'])
@token_auth.login_required
def get_tower_settings(tower_id):
    tower = TowerDB.query.get_or_404(tower_id)
    if not current_user.check_permissions(tower_id, 'creator'):
        return error_response(403)
    data = {
        'tower_id': tower_id,
        'tower_name': tower.tower_name,
        'host_mode_enabled': tower.host_mode_enabled,
        'hosts': [u.to_dict() for u in tower.hosts],
    }
    return jsonify(data)


# POST endpoints

@bp.route('/user', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    if 'username' not in data or 'email' not in data or 'password' not in data:
        return bad_request('Must include username, email, and password fields.')
    if User.query.filter_by(username=data['email']).first():
        return bad_request('There is already an account registered with that email address.')
    user = User(username = data['username'], email = data['email'])
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    response = jsonify(user.to_dict())
    response.status_code = 201
    response.headers['Location'] = url_for('api.get_user')
    return response





