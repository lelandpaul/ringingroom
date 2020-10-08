import os
import datetime
basedir = os.path.abspath(os.path.dirname(__file__))
from dotenv import load_dotenv

load_dotenv(os.path.join(basedir,'.env'))


class Config(object):

    RR_VERSION = "20.39"

    RR_API_VERSION = "1.0"

    RR_SOCKETIO_VERSION = "1.0"

    SECRET_KEY = os.getenv('SECRET_KEY') or 's7WUt93.ir_bFya7'

    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'app.db')

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_TYPE = 'filesystem'

    PERMANENT_SESSION_LIFETIME = datetime.timedelta(days = 1)

    # We want this to be None if the environment variable isn't set
    SOCKETIO_SERVER_ADDRESSES = os.getenv('SOCKETIO_SERVER_ADDRESSES')
    if SOCKETIO_SERVER_ADDRESSES:
        SOCKETIO_SERVER_ADDRESSES = SOCKETIO_SERVER_ADDRESSES.split(',')

    RR_SOCKETIO_PORT = os.getenv('RR_SOCKETIO_PORT') or 5000
