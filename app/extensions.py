from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_assets import Environment, Bundle
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate(db)
assets = Environment()
socketio = SocketIO(logging=True,
                    async_mode="threading",
                    cors_allowed_origins='*')
login = LoginManager()

# asset bundles
bundles = {

    'js_landing':   Bundle( 'landing.js',
                            filters='jsmin',
                            output='gen/landing.%(version)s.js'),

    'js_rr':        Bundle('ringing_room.js',
                           'audio.js',
                           # filters='jsmin',
                            output='gen/rr.%(version)s.js'),
    'js_my_towers': Bundle('my_towers.js',
                           output='gen/my_towers.%(version)s.js'),

    'css_static':   Bundle( 'css/static.css',
                            output='gen/static.%(version)s.css'),

    'css_rr':   Bundle( 'css/ringing_room.css',
                         output='gen/rr.%(version)s.css'),

}

assets.register(bundles)

def log(*args):
    from app import app
    app.logger.info(' '.join([str(l) for l in args]))
