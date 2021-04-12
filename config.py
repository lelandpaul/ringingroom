import os
import datetime
basedir = os.path.abspath(os.path.dirname(__file__))
from dotenv import load_dotenv

load_dotenv(os.path.join(basedir,'.env'))


class Config(object):

    RR_VERSION = "21.13"

    RR_API_VERSION = "1.1"

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

    SUPPORT_SERVER = os.getenv('SUPPORT_SERVER') or False

    MORE_COWBELL = os.getenv('COWBELL_ENABLED') or False

    DEFAULT_SETTINGS = {
            'keybindings': {
                'left': ['f', 'F', 'left'],
                'right': ['space', 'j', 'J', 'right'],
                'set_at_hand': ['shift+s'],
                'bob': ['b','B'],
                'single': ['n', 'N'],
                'go': ['g', 'G'],
                'all': ['h', 'H'],
                'stand': ['t', 'T'],
                'look': ['l', 'L'],
                'rounds': ['o', 'O'],
                'change': ['c', 'C'],
                'sorry': ['s'],
                '1':  ['1'],
                '2':  ['2'],
                '3':  ['3'],
                '4':  ['4'],
                '5':  ['5'],
                '6':  ['6'],
                '7':  ['7'],
                '8':  ['8'],
                '9':  ['9'],
                '10': ['0'],
                '11': ['-'],
                '12': ['='],
                '13': ['q'],
                '14': ['w'],
                '15': ['e'],
                '16': ['r'],
                'rotate-1':  ['shift+1'],
                'rotate-2':  ['shift+2'],
                'rotate-3':  ['shift+3'],
                'rotate-4':  ['shift+4'],
                'rotate-5':  ['shift+5'],
                'rotate-6':  ['shift+6'],
                'rotate-7':  ['shift+7'],
                'rotate-8':  ['shift+8'],
                'rotate-9':  ['shift+9'],
                'rotate-10': ['shift+0'],
                'rotate-11': ['shift+-'],
                'rotate-12': ['shift+='],
                'rotate-13': ['shift+q'],
                'rotate-14': ['shift+w'],
                'rotate-15': ['shift+e'],
                'rotate-16': ['shift+r'],
                },
             'controllers': {
                 'debounce': 600,
                 'handstroke': 100,
                 'backstroke': -600,
                 'left_left': 'Stand',
                 'left_right': 'Go',
                 'right_left': 'Single',
                 'right_right': 'Bob',
                 }
            }
