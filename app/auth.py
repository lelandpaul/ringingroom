from app.models import User, towers
from app.extensions import login
from flask_socketio import emit
from flask_login import login_user
from flask import url_for

@login.user_loader
def load_user(id):
    return User.query.get(int(id))

@login.request_loader
def load_user_from_request(request):
    token = request.headers.get('Authorization')
    if token:
        token = token.replace('Bearer ', '', 1)
        user = User.check_token(token)
        if user:
            return user
    return None

def token_login(func):
    """
    Decorator for SocketIO listeners: Finds tries to get a Bearer token from the
    event data and logs the user in if it checks out.
    """
    def wrapper_listener(data):
        token = data.get('user_token')
        if token:
            user = User.check_token(token)
            if user:
                login_user(user)
            else:
                # The user showed up with an invalid token
                # Send an error message in case the user isn't a browser
                emit('s_bad_token', data)
                # Assume that they're logged out and redirect them to the authentication page
                tower = towers[data['tower_id']]
                url = str(tower.tower_id) + '/' + tower.url_safe_name
                emit('s_redirection', url_for('authenticate', next=url))
                return # don't continue executing
        func(data)
    return wrapper_listener
