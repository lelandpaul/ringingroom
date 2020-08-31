# coding: utf-8

import logging
import mimetypes
from logging.handlers import RotatingFileHandler
from flask import Flask, has_request_context, request, session
from config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    register_extensions(app)
    register_blueprints(app)

    return app


def register_extensions(app):
    from app.extensions import db
    from app.extensions import migrate
    from app.extensions import assets
    from app.extensions import socketio
    from app.extensions import login

    db.init_app(app)
    migrate.init_app(app, db)
    assets.init_app(app)
    socketio.init_app(app)
    login.init_app(app)


def register_blueprints(app):
    from app.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')


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


app = create_app()

file_handler = RotatingFileHandler('logs/ringingroom.log','a', 1 * 1024 * 1024, 10)
file_handler.setFormatter(formatter)
app.logger.setLevel(logging.ERROR)
file_handler.setLevel(logging.ERROR)
app.logger.addHandler(file_handler)
app.logger.info('Ringing Room startup')


mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')

from app import routes, models, listeners, models
