# coding: utf-8

import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, has_request_context, request, session
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_assets import Environment, Bundle
from flask_login import LoginManager

from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
assets = Environment(app)
socketio = SocketIO(app,
                    logging=True,
                    cors_allowed_origins='*')
login = LoginManager(app)


# Set up logging
class RequestFormatter(logging.Formatter):
    def format(self, record):
        if has_request_context():
            if request.referrer:
                record.url = '/'.join(request.referrer.split('/')[-2:])
            else:
                record.url = request.url
            try:
                record.user_id = session['user_id']
            except:
                record.user_id = None
        else:
            record.url = None
            record.remote_addr = None
            record.user_id = None

        return super().format(record)

formatter = RequestFormatter(
    '[%(asctime)s] User %(user_id)s at %(url)s\n'
    '\t%(message)s'
)


file_handler = RotatingFileHandler('logs/ringingroom.log','a', 1 * 1024 * 1024, 10)
file_handler.setFormatter(formatter)
app.logger.setLevel(logging.INFO)
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.info('Ringing Room startup')

def log(*args):
    app.logger.info(' '.join([str(l) for l in args]))


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

from app.models import *

# make the tower dict
towers = TowerDict()

from app import routes, models, listeners
