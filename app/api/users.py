from flask import jsonify
from app.models import User
from app.api import bp
from app.api.auth import token_auth

# Routes for the api go here

@bp.route('/users/<int:id>', methods=['GET'])
@token_auth.login_required
def get_user(id):
    return jsonify(User.query.get_or_404(id).to_dict())
