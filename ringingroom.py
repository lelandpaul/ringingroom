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

def set_creator(tower_id, email_addr):
     t1 = TowerDB.query.get(tower_id)
     u1 = User.query.filter_by(email=email_addr).first()

     if t1 is None:
         print("Tower doesn't exist.")
     elif u1 is None:
         print("User doesn't exist.")
     else:
         input(f"Tower name: {t1}. Proceed? (y/n):")

         if t1.creator is None:
             t1.created_by(u1)
             print(f"Success! {tower_id} owner is now {email_addr}")
         else:
             print(f"There is already a creator: {t1.creator}")

     db.session.commit()


if __name__ == '__main__':
    socketio.run(app=app, host='0.0.0.0',port=8080)
