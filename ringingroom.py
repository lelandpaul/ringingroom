# coding: utf-8

from app import app, towers
from app.extensions import socketio, db
from app.models import TowerDB, Tower, User, UserTowerRelation


@app.shell_context_processor
def make_shell_context():
    return {'db': db,
            'TowerDB': TowerDB,
            'towers': towers,
            'Tower': Tower,
            'User': User,
            'UserTowerRelation': UserTowerRelation,
            'u': User.query.first(),
            't': TowerDB.query.first()}


if __name__ == '__main__':
    socketio.run(app=app, host='0.0.0.0',port=8080)
