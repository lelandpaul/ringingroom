# coding: utf-8

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_session import Session
from sassutils.wsgi import SassMiddleware
from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, manage_session=False)
Session(app)

# set up automatic sass compilation
app.wsgi_app = SassMiddleware(app.wsgi_app, {
    'app': {
        'sass_path': 'static/sass',
        'css_path': 'static/css',
        'wsgi_path': 'static/css',
        'strip_extension': False
    }
})

from app.models import *

# make the tower dict
towers = TowerDict()

from app import routes, models, listeners
