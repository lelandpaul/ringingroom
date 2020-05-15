import os
import datetime
basedir = os.path.abspath(os.path.dirname(__file__))


class Config(object):

    SECRET_KEY = os.environ.get('SECRET_KEY') or 's7WUt93.ir_bFya7'

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'app.db')

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_TYPE = 'filesystem'

    PERMANENT_SESSION_LIFETIME = datetime.timedelta(days = 1)

    # We want this to be None if the environment variable isn't set
    SOCKETIO_SERVER_ADDRESSES = os.environ.get('SOCKETIO_SERVER_ADDRESSES')
    if SOCKETIO_SERVER_ADDRESSES:
        SOCKETIO_SERVER_ADDRESSES = SOCKETIO_SERVER_ADDRESSES.split(',')
