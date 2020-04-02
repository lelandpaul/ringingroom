# coding: utf-8

from app import app, socketio, db
from app.models import TowerDB


@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'TowerDB': TowerDB}


if __name__ == '__main__':
    socketio.run(app=app, host='0.0.0.0')
