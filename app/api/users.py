from flask import jsonify
from app.models import User
from app.api import bp
from app.api.auth import token_auth
from flask_login import current_user

# Routes for the api go here

@bp.route('/user/', methods=['GET'])
@token_auth.login_required
def get_user():
    return jsonify(current_user.to_dict())
