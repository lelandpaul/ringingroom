# coding: utf-8

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_assets import Environment, Bundle
from flask_session import Session

from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
assets = Environment(app)
socketio = SocketIO(app, 
                    manage_session=False,
                    ping_interval=2000,
                    ping_timeout=18000) # 5 hours (enough for a long peal and then some)
Session(app)


# asset bundles
bundles = {

    'js_landing':   Bundle( 'landing.js',
                            filters='jsmin', 
                            output='gen/landing.%(version)s.js'),

    'js_rr':        Bundle('ringing_room.js',
                           'audio.js',
                           # filters='jsmin',
                            output='gen/rr.%(version)s.js'),

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
