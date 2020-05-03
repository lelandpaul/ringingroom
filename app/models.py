from app import db, log, login
from random import sample
import re
from datetime import datetime, timedelta, date
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from enum import Enum

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    towers = db.relationship("UserTowerRelation", back_populates="user")

    def __repr__(self):
        return '<User {}>'.format(self.username)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def _add_related_tower(self, tower, relationship):
        # Just instantiating this is enough — back population takes care of the rest
        UserTowerRelation(user=self, tower=tower, relationship=relationship)
        db.session.commit()

    def _get_related_towers(self, relationship=''):
        # Returns TowerDB objects, not Tower!
        return [relation.tower for relation in self.towers if relationship in relation.relationship]

    def add_recent_tower(self, tower):
        # Expects a Tower object
        tower_db = tower.to_TowerDB()
        if tower_db not in self._get_related_towers(relationship='RECENT'):
            # if there are already 10 towers, expunge the oldest
            # (at present, only the first 5 are displayed)
            if len(self._get_related_towers(relationship='RECENT')) == 10:
                oldest = sorted([rel for rel in self.towers if rel.relationship=='RECENT'],
                                key=lambda x: x.datetime)[0]
                db.session.delete(oldest)
            self._add_related_tower(tower.to_TowerDB(), 'RECENT')
        else:
            # Update the timestamp
            r = UserTowerRelation.query.filter(UserTowerRelation.user_id == self.id,
                                               UserTowerRelation.tower_id == tower.tower_id,
                                               UserTowerRelation.relationship == 'RECENT').first()

            r.datetime = datetime.now()
            db.session.commit()

    def recent_towers(self, n=0):
        # Allows you to limit to n items; returns all by default
        # This returns a list of TowerDB objects!
        n = n or len(self.towers)
        return [rel.tower for rel \
                in sorted(self.towers, key=lambda r: r.datetime, reverse=True)[:n]]


@login.user_loader
def load_user(id):
    return User.query.get(int(id))


class TowerDB(db.Model):
    tower_id = db.Column(db.Integer, primary_key=True)
    tower_name = db.Column(db.String(32), index=True)
    last_access = db.Column(db.Date, 
                              nullable=False,
                              default=date.today,
                              onupdate=date.today)
    users = db.relationship("UserTowerRelation", back_populates="tower")

    def __repr__(self):
        return '<TowerDB {}: {}>'.format(self.tower_id, self.tower_name)

    def to_Tower(self):
        return Tower(self.tower_name, tower_id=self.tower_id)


class UserTowerRelation(db.Model):
    user_id = db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key = True)
    tower_id = db.Column('tower_id',db.Integer, db.ForeignKey('towerDB.tower_id'), primary_key = True)
    relationship = db.Column(db.String(32))
    datetime = db.Column(db.DateTime, default=datetime.now,onupdate=datetime.now)
    user = db.relationship("User", back_populates="towers")
    tower = db.relationship("TowerDB",back_populates="users")

    def __repr__(self):
        return '<Relationship: {} -- {} {}>'.format(self.relationship, self.user.username, self.tower.tower_id)




# Keep track of towers
class Tower:
    def __init__(self, name, tower_id=None, n=8):
        if not tower_id:
            self._id = self.generate_random_change()
        else:
            self._id = tower_id
        self._name = name
        self._n = 8
        self._bell_state = [True] * n
        self._audio = True
        self._users = {}
        self._assignments = {i+1: '' for i in range(n)}
        self._observers = set()

    def generate_random_change(self):
        # generate a random caters change, for use as uid
        tmp_tower_id = int(''.join(map(str, sample([i+1 for i in range(9)], k=9))))
        overlapping_tower_ids = TowerDB.query.filter_by(tower_id=tmp_tower_id)

        while not overlapping_tower_ids.count() == 0:
            tmp_tower_id = int(''.join(map(str, sample([i + 1 for i in range(9)], k=9))))
            overlapping_tower_ids = TowerDB.query.filter_by(tower_id=tmp_tower_id)

        return tmp_tower_id

    def to_TowerDB(self):
        # Check if it's already there — we need this for checking whether a tower is already in a
        # users related towers
        tower_db = TowerDB.query.filter(TowerDB.tower_id==self.tower_id).first()
        return tower_db or TowerDB(tower_id=self.tower_id, tower_name=self.name)

    @property
    def tower_id(self):
        return(self._id)

    @property
    def name(self):
        return(self._name)

    @name.setter
    def name(self, new_name):
        self._name = new_name

    @property
    def users(self):
        return(self._users)

    @users.setter
    def users(self, users):
        self._users = users

    def add_user(self, user_id, user_name):
        self._users[user_id] = user_name

    def remove_user(self, user_id):
        try:
            user_name = self.users[user_id]
            for (bell, assignment) in self._assignments.items():
                if assignment == user_name:
                    self._assignments[bell] = '' # unassign the user from all bells
            del self._users[user_id]
        except ValueError: pass
    
    @property
    def user_names(self):
        return list(self._users.values())

    @property
    def assignments(self):
        return(self._assignments)

    def assignments_as_list(self):
        return(list(self._assignments.values()))

    def assign_bell(self, bell, user):
        self.assignments[bell] = user

    @property
    def n_bells(self,):
        return(self._n)

    @n_bells.setter
    def n_bells(self, new_size):
        self._n = new_size
        self._bell_state = [True] * new_size
        self._assignments = {i+1: '' for i in range(new_size)}

    @property
    def bell_state(self):
        return(self._bell_state)

    @bell_state.setter
    def bell_state(self, new_state):
        self._bell_state = new_state

    @property
    def audio(self):
        return('Tower' if self._audio else 'Hand')

    @audio.setter
    def audio(self, new_state):
        self._audio = True if new_state == 'Tower' else False

    @property
    def url_safe_name(self):
        out = re.sub(r'\s', '_', self.name)
        out = re.sub(r'\W', '', out)
        return out.lower()

    def set_at_hand(self):
        self._bell_state = [True] * self._n

    @property
    def observers(self):
        return len(self._observers)

    def add_observer(self, new_observer):
        self._observers.add(new_observer)

    def remove_observer(self, removed_observer):
        try:
            self._observers.remove(removed_observer)
        except KeyError:
            log("Tried to remove an observer that didn't exist.")
            pass

class TowerDict(dict):

    def __init__(self, table=TowerDB, db=db):
        self._db = db
        self._table = table
        self._garbage_collection_interval = timedelta(hours=12)

    def check_db_for_key(self, key):

        # prepare garbage collection
        # don't collect the key we're currently looking up though
        keys_to_delete = [k for k, (value, timestamp) in self.items() 
                          if timestamp < datetime.now() - self._garbage_collection_interval
                          and k != key ]
        log('Garbage collection:', keys_to_delete)

        # run garbage collection
        for key in keys_to_delete: 
            dict.__delitem__(self, key)

        if key in self.keys():
            # It's already in memory, don't check the db
            return True

        tower = self._table.query.get(key)
        if tower:
            log('Loading tower from db:',key)
            # load the thing back into memory
            dict.__setitem__(self, key, (tower.to_Tower(), datetime.now()))
            return True

        return False

    def __setitem__(self, key, value):
        key = int(key)  # just to be sure

        # if it's in the database, load it into memory
        self.check_db_for_key(key)

        # It's already in use
        if key in self.keys():
            raise KeyError('Key already in use.')

        timestamp =  datetime.now()

        # add it to both memory and database
        dict.__setitem__(self, key, (value, timestamp))
        self._db.session.add(value.to_TowerDB())
        self._db.session.commit()

    def __getitem__(self, key):
        key = int(key)  # just to be sure
        self.check_db_for_key(key)

        value, timestamp = dict.__getitem__(self, key)

        # Update the timestamp
        timestamp = datetime.now()
        dict.__setitem__(self, key, (value, timestamp))

        return value


