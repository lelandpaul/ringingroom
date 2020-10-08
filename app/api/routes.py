from flask import jsonify, request, url_for
from config import Config
from app.models import User, TowerDB, UserTowerRelation, Tower, get_server_ip, towers
from app.extensions import db
from app.api import bp
from app.api.errors import error_response, bad_request
from app.api.auth import token_auth
from flask_login import current_user

# version endpoint

@bp.route('/version', methods=['GET'])
def get_version():
    data = {
        "version": Config.RR_VERSION,
        "api-version": Config.RR_API_VERSION,
        "socketio-version": Config.RR_SOCKETIO_VERSION
    }
    return jsonify(data)

# user endpoints

@bp.route('/user', methods=['GET'])
@token_auth.login_required
def get_user():
    return jsonify(current_user.to_dict())


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

@bp.route('/user', methods=['PUT'])
@token_auth.login_required
def modify_user():
    data = request.get_json() or {}
    new_username = data.get('new_username')
    new_email = data.get('new_email')
    new_password = data.get('new_password')
    if new_username and new_username != current_user.username:
        current_user.username = new_username
    if new_email and new_email != current_user.email:
        conflicts = User.query.filter_by(email=new_email).all()
        if len(conflicts):
            return bad_request('There is already an account registered withat email address.')
        current_user.email = new_email
    if new_password:
        current_user.set_password(new_password)
    db.session.commit()
    response = jsonify(current_user.to_dict())
    response.status_code = 201
    response.headers['Location'] = url_for('api.get_user')
    return response

@bp.route('/user', methods=['DELETE'])
@token_auth.login_required
def delete_user():
    email = current_user.email
    # first, delete rels
    for r in current_user.towers:
        db.session.delete(r)
    db.session.delete(current_user)
    db.session.commit()
    # Respond
    payload = {'deleted_user': email}
    response = jsonify(payload)
    response.status_code = 202
    return response


# my_towers endpoints

@bp.route('/my_towers', methods=['GET'])
@token_auth.login_required
def get_my_towers():
    data = {r.tower_id: r.to_dict() for r in current_user.towers}
    return jsonify(data)

@bp.route('/my_towers/<int:tower_id>', methods=['PUT'])
@token_auth.login_required
def toggle_bookmark(tower_id):
    tower = TowerDB.query.get_or_404(tower_id)
    current_user.toggle_bookmark(tower)
    r = current_user._get_relation_to_tower(tower)
    response = jsonify(r.to_dict())
    response.status_code = 200
    return response

@bp.route('/my_towers/<int:tower_id>', methods=['DELETE'])
def remove_recent_tower(tower_id):
    tower = TowerDB.query.get_or_404(tower_id)
    current_user.remove_recent_tower(tower)
    r = current_user._get_relation_to_tower(tower)
    response = jsonify(r.to_dict())
    response.status_code = 200
    return response


# tower_settings endpoints

@bp.route('/tower/<int:tower_id>/settings', methods=['GET'])
@token_auth.login_required
def get_tower_settings(tower_id):
    tower = TowerDB.query.get_or_404(tower_id)
    if not current_user.check_permissions(tower_id, 'creator'):
        return error_response(403)
    return jsonify(tower.to_dict())

@bp.route('/tower/<int:tower_id>/settings', methods=['PUT'])
@token_auth.login_required
def change_tower_settings(tower_id):
    if not current_user.check_permissions(tower_id, 'creator'):
        return error_response(403)
    data = request.get_json() or {}
    tower = TowerDB.query.get_or_404(tower_id)
    new_name = data.get('tower_name')
    new_permit_host = data.get('permit_host_mode')
    if new_name and new_name != tower.tower_name:
        tower.tower_name = new_name
    if new_permit_host and new_permit_host != tower.permit_host_mode:
        tower.permit_host_mode = new_permit_host
    db.session.commit()
    response = jsonify(tower.to_dict())
    response.status_code = 200
    return response

@bp.route('/tower/<int:tower_id>/hosts', methods=['POST'])
@token_auth.login_required
def add_hosts(tower_id):
    if not current_user.check_permissions(tower_id, 'creator'):
        return error_response(403)
    data = request.get_json() or {}
    tower = TowerDB.query.get_or_404(tower_id)
    users = [User.query.filter_by(email=u).first() for u in data['new_hosts']]
    for u in users:
        if u:
            u.make_host(tower)
    response = jsonify(tower.to_dict())
    response.status_code = 200
    return response

@bp.route('/tower/<int:tower_id>/hosts', methods=['DELETE'])
@token_auth.login_required
def remove_hosts(tower_id):
    if not current_user.check_permissions(tower_id, 'creator'):
        return error_response(403)
    data = request.get_json() or {}
    tower = TowerDB.query.get_or_404(tower_id)
    users = [User.query.filter_by(email=u).first() for u in data['hosts']]
    for u in users:
        if u and u.id != current_user.id:
            u.remove_host(tower)
    response = jsonify(tower.to_dict())
    response.status_code = 200
    return response


# individual tower endpoints

@bp.route('/tower/<int:tower_id>', methods=['GET'])
@token_auth.login_required
def get_tower(tower_id):
    tower = TowerDB.query.get_or_404(tower_id)
    data = {
        'tower_id': tower_id,
        'tower_name': tower.tower_name,
        'server_address': get_server_ip(tower_id),
    }
    return jsonify(data)

@bp.route('/tower', methods=['POST'])
@token_auth.login_required
def create_tower():
    data = request.get_json() or {}
    try:
        tower = Tower(name = data['tower_name'])
    except KeyError:
        return bad_request('You must supply a tower name.')
    tower_db = tower.to_TowerDB()
    tower_db.created_by(current_user)
    db.session.add(tower_db)
    db.session.commit()
    data = {
        'tower_id': tower_db.tower_id,
        'tower_name': tower_db.tower_name,
        'server_address': get_server_ip(tower_db.tower_id),
    }
    return jsonify(data)

@bp.route('/tower/<int:tower_id>', methods=['DELETE'])
@token_auth.login_required
def delete_tower(tower_id):
    tower_db = TowerDB.query.get_or_404(tower_id)
    if not current_user.check_permissions(tower_id, 'creator'):
        return error_response(403)
    # First, delete all relations
    rels = UserTowerRelation.query.filter_by(tower_id=tower_id).all()
    for r in rels:
        db.session.delete(r)
    # Next, delete the tower_db object
    db.session.delete(tower_db)
    db.session.commit()
    # Finally, delete the in-memory tower (if it exists)
    try:
        del towers[tower_id]
    except KeyError:
        pass
    # Respond
    payload = {'deleted_tower_id': tower_id}
    response = jsonify(payload)
    response.status_code = 202
    return response


