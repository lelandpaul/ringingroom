# coding: utf-8

from app import app
from app.extensions import socketio, db
from app.models import TowerDB, Tower, User, UserTowerRelation, towers


@app.shell_context_processor
def make_shell_context():
    return {'db': db,
            'TowerDB': TowerDB,
            'towers': towers,
            'Tower': Tower,
            'User': User,
            'UserTowerRelation': UserTowerRelation,
            'u': User.query.first(),
            't': TowerDB.query.first(),
            'donated': add_donation_thank_you}

cur_user = None
def get_user_by_email(email):
    user = User.query.filter_by(email=email).first()
    if user is None:
        return "Not found"
    cur_user = user
    return cur_user

def add_donation_thank_you(email):
    user = User.query.filter_by(email=email).first()
    if not user:
        return "User not found"
    x = input("Setting donation name for user: " + user.username + "; proceed? ")
    if x != 'y':
        return "Aborting"
    name = input("Donation name: ")
    user.donation_thank_you = name
    db.session.commit()
    return("Done.")



if __name__ == '__main__':
    socketio.run(app=app, host='0.0.0.0',port=8080)
