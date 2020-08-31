from app.models import User
from app.extensions import login
from flask_login import login_user

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
            login_user(user)
        func(data)
    return wrapper_listener
