import os
import datetime

basedir = os.path.abspath(os.path.dirname(__file__))
from dotenv import load_dotenv

load_dotenv(os.path.join(basedir, ".env"))


class Config(object):

    RR_VERSION = "21.32"

    RR_API_VERSION = "1.2"

    RR_SOCKETIO_VERSION = "1.0"

    SECRET_KEY = os.getenv("SECRET_KEY") or "s7WUt93.ir_bFya7"

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") or "sqlite:///" + os.path.join(
        basedir, "app.db"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_TYPE = "filesystem"

    PERMANENT_SESSION_LIFETIME = datetime.timedelta(days=1)

    # We want this to be None if the environment variable isn't set
    SOCKETIO_SERVER_ADDRESSES = os.getenv("SOCKETIO_SERVER_ADDRESSES")
    if SOCKETIO_SERVER_ADDRESSES:
        SOCKETIO_SERVER_ADDRESSES = SOCKETIO_SERVER_ADDRESSES.split(",")

    RR_SOCKETIO_PORT = os.getenv("RR_SOCKETIO_PORT") or 5000

    SUPPORT_SERVER = os.getenv("SUPPORT_SERVER") or False

    DEFAULT_SETTINGS = {
        "keybindings": {
            "left": ["f", "shift+f", "left"],
            "right": ["space", "j", "shift+j", "right"],
            "set_at_hand": ["shift+s"],
            "bob": ["b", "shift+b"],
            "single": ["n", "shift+n"],
            "go": ["g", "shift+g"],
            "all": ["h", "shift+h"],
            "stand": ["t", "shift+t"],
            "look": ["l", "shift+l"],
            "rounds": ["o", "shift+o"],
            "change": ["c", "shift+c"],
            "sorry": ["s"],
            "1": ["1"],
            "2": ["2"],
            "3": ["3"],
            "4": ["4"],
            "5": ["5"],
            "6": ["6"],
            "7": ["7"],
            "8": ["8"],
            "9": ["9"],
            "10": ["0"],
            "11": ["-"],
            "12": ["="],
            "13": ["q"],
            "14": ["w"],
            "15": ["e"],
            "16": ["r"],
            "rotate-1": ["shift+1"],
            "rotate-2": ["shift+2"],
            "rotate-3": ["shift+3"],
            "rotate-4": ["shift+4"],
            "rotate-5": ["shift+5"],
            "rotate-6": ["shift+6"],
            "rotate-7": ["shift+7"],
            "rotate-8": ["shift+8"],
            "rotate-9": ["shift+9"],
            "rotate-10": ["shift+0"],
            "rotate-11": ["shift+-"],
            "rotate-12": ["shift+="],
            "rotate-13": ["shift+q"],
            "rotate-14": ["shift+w"],
            "rotate-15": ["shift+e"],
            "rotate-16": ["shift+r"],
            "catch-1": ["meta+shift+1"],
            "catch-2": ["meta+shift+2"],
            "catch-3": ["meta+shift+3"],
            "catch-4": ["meta+shift+4"],
            "catch-5": ["meta+shift+5"],
            "catch-6": ["meta+shift+6"],
            "catch-7": ["meta+shift+7"],
            "catch-8": ["meta+shift+8"],
            "catch-9": ["meta+shift+9"],
            "catch-10": ["meta+shift+0"],
            "catch-11": ["meta+shift+-"],
            "catch-12": ["meta+shift+="],
            "catch-13": ["meta+shift+q"],
            "catch-14": ["meta+shift+w"],
            "catch-15": ["meta+shift+e"],
            "catch-16": ["meta+shift+r"],
            "flip-left": ["a", "shift+a"],
            "flip-right": [";", "shift+;"],
        },
        "controllers": {
            "debounce": 600,
            "handstroke": 100,
            "backstroke": -1200,
            "left_left": "Stand next",
            "left_right": "Go",
            "right_left": "Single",
            "right_right": "Bob",
        },
    }
