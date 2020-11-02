from flask import request
from app.extensions import db, log
import app.wheatley
from config import Config
from random import shuffle, sample, randint
import json
import re
from datetime import datetime, timedelta, date
from time import time
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import base64
import os


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(64), index=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    towers = db.relationship("UserTowerRelation", back_populates="user")
    joined = db.Column(db.Date, default=date.today)
    token = db.Column(db.String(32), index=True, unique=True)
    token_expiration = db.Column(db.DateTime)


    def to_dict(self):
        data = {
            'username': self.username,
            'email': self.email,
        }
        return data

    def get_token(self, expires_in=86400):
        now = datetime.utcnow()
        if self.token and self.token_expiration > now + timedelta(seconds=60):
            return self.token
        self.token = base64.b64encode(os.urandom(24)).decode('utf-8')
        self.token_expiration = now + timedelta(seconds=expires_in)
        db.session.commit()
        return self.token

    def revoke_token(self):
        self.token_expiration = datetime.utcnow() - timedelta(seconds=1)

    @staticmethod
    def check_token(token):
        user = User.query.filter_by(token=token).first()
        if user is None or user.token_expiration < datetime.utcnow():
            return None
        return user

    def __repr__(self):
        return '<User {}>'.format(self.username)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def _clean_recent_towers(self, cutoff=10):
        # delete all but the cuttoff most recent towers
        old_rels = sorted([tower for tower in self.towers if tower.recent],
                           key=lambda x: x.visited,
                           reverse=True)[cutoff:]
        for rel in old_rels:
            db.session.delete(rel)

    def get_reset_password_token(self, expires_in=86400):
        return jwt.encode(
            {'reset_password': self.id, 'exp': time() + expires_in},
            Config.SECRET_KEY, algorithm='HS256').decode('utf-8')

    @staticmethod
    def verify_reset_password_token(token):
        try:
            id = jwt.decode(token, Config.SECRET_KEY,
                            algorithms=['HS256'])['reset_password']
        except BaseException:
            return
        return User.query.get(id)

    def _get_relation_to_tower(self, tower):
        # Helper function: returns a relation between the user and the tower.
        # Creates the relation if none existed before.
        if isinstance(tower, Tower):
            # cast to TowerDB
            tower = tower.to_TowerDB()
        # See if a relation already exists
        rel = UserTowerRelation.query.filter(UserTowerRelation.user == self,
                                             UserTowerRelation.tower == tower).first()
        if not rel:
            # Just creating this is enough to add it to the database with
            # relevant relations
            rel = UserTowerRelation(user=self, tower=tower)

        return rel

    def clear_all_towers(self):
        for rel in self.towers:
            db.session.delete(rel)

    def add_recent_tower(self, tower):
        rel = self._get_relation_to_tower(tower)
        # Update the timestamp (and recent, if necessary)
        rel.recent = True
        rel.visited = datetime.now()
        # self._clean_recent_towers() # no reason to do this now that the
        # my_towers page exists
        db.session.commit()

    def remove_recent_tower(self, tower):
        rel = self._get_relation_to_tower(tower)
        rel.recent = False
        db.session.commit()

    def toggle_bookmark(self, tower):
        rel = self._get_relation_to_tower(tower)
        rel.bookmark = not rel.bookmark
        db.session.commit()


    def recent_towers(self, n=0):
        # Allows you to limit to n items; returns all by default
        # This returns a list of TowerDB objects — if we want to convert them
        # to memory, that should
        # happen by looking them up in the TowerDict instance
        n = n or len(self.towers)
        return [rel.tower for rel
                in sorted(self.towers, key=lambda r: r.visited, reverse=True)
                if rel.recent][:n]

    def bookmarked_towers(self, n=0):
        # Allows you to limit to n items; returns all by default
        # This returns a list of TowerDB objects — if we want to convert them
        # to memory, that should
        # happen by looking them up in the TowerDict instance
        n = n or len(self.towers)
        return [rel.tower for rel
                in self.towers
                if rel.bookmark][:n]

    def bookmarked(self, tower_id):
        # checks if a tower_id is bookmarked
        return tower_id in [
            rel.tower.tower_id for rel in self.towers if rel.bookmark]

    @property
    def tower_properties(self):
        # For the my_towers page, we need the tower relations as a list of
        # dictionaries, which each include the tower info + the relation info
        tower_properties = []
        for rel in sorted(self.towers, key=lambda x: x.visited, reverse=True):
            tower_properties.append(
                dict(
                    {'tower_id': rel.tower.tower_id,
                     'tower_url': rel.tower.url_safe_name,
                     'tower_name': rel.tower.tower_name},
                    **rel.relation_dict))
        return tower_properties

    def check_permissions(self, tower_id, permission):
        # Given a tower_id: check if the user has relevant permissions
        # 'creator': can edit settings
        # 'host': can manage practices in host mode
        if permission not in ['creator', 'host']:
            raise KeyError('The requested permission type does not exist.')
        return tower_id in [int(t.tower_id)
                            for t in self.towers if getattr(t, permission)]

    def make_host(self, tower):
        rel = self._get_relation_to_tower(tower)
        rel.host = True
        if not isinstance(tower, Tower):
            tower = tower.to_Tower()
        tower.add_host_id(self.id)
        db.session.commit()

    def remove_host(self, tower):
        rel = self._get_relation_to_tower(tower)
        rel.host = False
        if not isinstance(tower, Tower):
            tower = tower.to_Tower()
        try:
            tower.remove_host_id(self.id)
        except ValueError:
            pass
        db.session.commit()


class TowerDB(db.Model):
    tower_id = db.Column(db.Integer, primary_key=True)
    tower_name = db.Column(db.String(32), index=True)
    created_on = db.Column(db.Date,default=date.today)
    last_access = db.Column(db.Date,
                            nullable=False,
                            default=date.today,
                            onupdate=date.today)
    users = db.relationship("UserTowerRelation", back_populates="tower")
    host_mode_enabled = db.Column(db.Boolean, default=False)
    additional_sizes_enabled = db.Column(db.Boolean, default=False)
    half_muffled = db.Column(db.Boolean, default=False)
    wheatley_enabled = db.Column(db.Boolean, default=False)
    wheatley_settings_json = db.Column(db.String(), default="{}")

    def __repr__(self):
        return '<TowerDB {}: {}>'.format(self.tower_id, self.tower_name)

    def to_dict(self):
        data = {
            'tower_id': self.tower_id,
            'tower_name': self.tower_name,
            'host_mode_enabled': self.host_mode_enabled,
            'hosts': [u.to_dict() for u in self.hosts],
        }
        return data

    def to_Tower(self):
        has_changed_db = False

        # Parse Wheatley's settings from JSON (and initialise with '{}' if invalid or non-existent)
        wheatley_settings = None
        while wheatley_settings is None:
            try:
                wheatley_settings = json.loads(self.wheatley_settings_json)
            except TypeError:
                self.wheatley_settings_json = "{}"
                has_changed_db = True
            except Exception as e:
                self.log(f"Invalid Wheatley settings JSON {self.wheatley_settings_json}: {e}")
                self.wheatley_settings_json = "{}"
                has_changed_db = True

        # Read Wheatley's enabledness from the database, and initialise it if it's null
        if self.wheatley_enabled is None:
            self.wheatley_enabled = False
            has_changed_db = True

        # Commit the changes to the database if they've been made
        if has_changed_db:
            db.session.commit()

        return Tower(self.tower_name, tower_id=self.tower_id, host_mode_enabled=self.host_mode_enabled,
                     # Force wheatley_enabled to be False if the Wheatley feature flag is not set
                     wheatley_enabled=self.wheatley_enabled and app.wheatley.feature_flag(),
                     wheatley_db_settings=wheatley_settings)

    def created_by(self, user):
        # Expects a User object
        # This should go through the user object, to avoid duplicating the
        # relation
        rel = user._get_relation_to_tower(self)
        rel.creator = True
        rel.host = True
        db.session.commit()

    @property
    def creator(self):
        rel = UserTowerRelation.query.filter(UserTowerRelation.tower==self,
                                             UserTowerRelation.creator==True).first()
        return rel.user if rel else None

    # We need to be able to get this from the TowerDB object for the User Menu
    @property
    def url_safe_name(self):
        out = re.sub(r'\s', '_', self.tower_name)
        out = re.sub(r'\W', '', out)
        return out.lower()

    @property
    def hosts(self):
        return [rel.user for rel in UserTowerRelation.query.filter(
            UserTowerRelation.tower==self,
            UserTowerRelation.host==True).all()]

    @property
    def host_ids(self):
        return [rel.user.id for rel in UserTowerRelation.query.filter(
            UserTowerRelation.tower == self,
            UserTowerRelation.host==True).all()]


class UserTowerRelation(db.Model):
    user_id = db.Column(
        'user_id',
        db.Integer,
        db.ForeignKey('user.id'),
        primary_key=True)
    tower_id = db.Column(
        'tower_id',
        db.Integer,
        db.ForeignKey('towerDB.tower_id'),
        primary_key=True)
    user = db.relationship("User", back_populates="towers")
    tower = db.relationship("TowerDB", back_populates="users")

    # Most recent visit to tower
    visited = db.Column(
        db.DateTime,
        default=datetime.now,
        onupdate=datetime.now)

    # Boolean columns for relationship types; also
    recent = db.Column('recent', db.Boolean, default=False)
    creator = db.Column('creator', db.Boolean, default=False)
    bookmark = db.Column('bookmark', db.Boolean, default=False)
    host = db.Column('host', db.Boolean, default=False)

    def __repr__(self):
        return '<Relationship: {} --- {} {}>'.format(self.user.username,
                                                     self.tower.tower_name,
                                                     self.tower.tower_id)

    @property
    def relation_dict(self):
        # return the relation types as a dictionary
        return {'recent': int(self.recent or False),
                'creator': int(self.creator or False),
                'bookmark': int(self.bookmark or False),
                'host': int(self.host or False)}

    def to_dict(self):
        data = {
            'tower_id': self.tower_id,
            'tower_name': self.tower.tower_name,
            'visited': self.visited,
        }
        data.update(self.relation_dict)
        return data

    def clean_up(self):
        # Call this whenever you change a boolean column from True to False
        # Checks if all relations are false, deletes if relevant
        if not any(self.relation_dict.values()):
            self.delete()

# Keep track of towers


# Constant to hold the value that Ringing Room uses to denote a bell not being assigned to any user.
# `0` is therefore a reserved user ID and cannot be taken by any user, even Wheatley (who is user `-1`)
UNASSIGNED_BELL = 0


class Tower:
    def __init__(self, name, tower_id=None, n=8, host_mode_enabled=False, wheatley_enabled=False,
                 wheatley_db_settings={}):
        if not tower_id:
            self._id = self.generate_random_change()
        else:
            self._id = tower_id

        self._name = name
        self._n = 8
        self._bell_state = [True] * n
        self._audio = True
        self._users = {}
        self._assignments = {i + 1: '' for i in range(n)}
        self._observers = set()
        self._host_mode = False
        self._host_mode_enabled = host_mode_enabled
        self.wheatley = app.wheatley.Wheatley(self, wheatley_enabled, wheatley_db_settings)
        towerdb = self.to_TowerDB()
        self._host_ids = towerdb.host_ids
        self._additional_sizes_enabled = towerdb.additional_sizes_enabled

    # generate a random caters change, for use as uid
    def generate_random_change(self):
        # Helper function to generate a potentially good change for a tower ID, given how
        # much of the change it is required to shuffle.
        def generate_candidate(shuffle_length):
            # Generate rounds as a base change
            new_row = list(range(9))

            # Use backrounds as a base half the time
            if randint(0, 1) == 0:
                new_row = list(reversed(new_row))

            # Rotate the change to a random amount, to produce a cyclic parthead or reverse parthead
            cyclic_rotation_amount = randint(0, 9)
            for _ in range(cyclic_rotation_amount):
                new_row.append(new_row[0])
                del new_row[0]

            # Shuffle the first or last 4 digits of the row to preserve the longest run
            if cyclic_rotation_amount <= 4:
                start = new_row[-shuffle_length:]
                shuffle(start)
                new_row = start + new_row[:-shuffle_length]
            else:
                start = new_row[:shuffle_length]
                shuffle(start)
                new_row = new_row[shuffle_length:] + start

            return int(''.join(map(str, [i+1 for i in new_row])))

        attempted_ids = 0

        # The formula as the argument to generate_candidate is there to ensure that if too many
        # tower ID collisions are found, the changes get steadily more random to prevent
        # unnecessary load on the database
        tmp_tower_id = generate_candidate(4 + attempted_ids // 5)
        overlapping_tower_ids = TowerDB.query.filter_by(tower_id=tmp_tower_id)

        while not overlapping_tower_ids.count() == 0:
            tmp_tower_id = generate_candidate(4 + attempted_ids // 5)
            overlapping_tower_ids = TowerDB.query.filter_by(tower_id=tmp_tower_id)

            attempted_ids += 1

        return tmp_tower_id

    def to_TowerDB(self):
        # Check if it's already there — we need this for checking whether a tower is already in a
        # users related towers
        tower_db = TowerDB.query.filter(TowerDB.tower_id==self.tower_id).first()
        return tower_db or TowerDB(tower_id=self.tower_id,
                                   tower_name=self.name,
                                   host_mode_enabled=self._host_mode_enabled,
                                   wheatley_enabled=self.wheatley.enabled)

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
            for (bell, assignment) in self._assignments.items():
                if assignment == user_id:
                    # unassign the user from all bells
                    self._assignments[bell] = UNASSIGNED_BELL
            del self._users[int(user_id)]
        except ValueError: log('Value error when removing user from tower.')
        except KeyError: log("Tried to remove user that wasn't there")

    @property
    def user_names(self):
        return list(self._users.values())

    @property
    def user_json(self):
        # Returns an object appropriate for sending with s_set_userlist
        return [{'user_id': id, 'username': username} for id, username in self._users.items()]

    @property
    def host_mode(self):
        return self._host_mode

    @host_mode.setter
    def host_mode(self, new_mode):
        self._host_mode = new_mode

    @property
    def assignments(self):
        return(self._assignments)

    def assignments_as_list(self):
        return(list(self._assignments.values()))

    def assign_bell(self, bell, user):
        # Tell Wheatley if he's been assigned a bell
        if user == app.wheatley.USER_ID:
            self.wheatley.on_assigned_bell()

        self.assignments[bell] = user

    @property
    def n_bells(self,):
        return(self._n)

    @n_bells.setter
    def n_bells(self, new_size):
        # don't de-assign everyone on re-size
        if new_size < self._n: # new tower is smaller than old tower, remove old assignments
            for k in range(new_size + 1, self._n + 1):
                self._assignments.pop(k)
        else: # add new keys for new assignments
            for k in range(self._n + 1, new_size + 1):
                self._assignments[k] = UNASSIGNED_BELL

        self._n = new_size
        self._bell_state = [True] * new_size


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

    def host_present(self):
        for id in self._users.keys():
            if id in self._host_ids:
                return True
        return False

    def add_host_id(self, user_id):
        self._host_ids.append(user_id)

    def remove_host_id(self, user_id):
        self._host_ids.remove(user_id)

    @property
    def host_mode_enabled(self):
        return self._host_mode_enabled

    @host_mode_enabled.setter
    def host_mode_enabled(self, new_state):
        self._host_mode_enabled = new_state
        self.to_TowerDB().host_mode_enabled = new_state
        db.session.commit()

    @property
    def additional_sizes_enabled(self):
        return self._additional_sizes_enabled

    @additional_sizes_enabled.setter
    def additional_sizes_enabled(self, new_state):
        self._additional_sizes_enabled = new_state
        self.to_TowerDB().additional_sizes_enabled = new_state
        db.session.commit()

    @property
    def sizes_available(self):
        if self._additional_sizes_enabled:
            return [4,5,6,8,10,12,14,16]
        else:
            return [4,6,8,10,12]

    @property
    def half_muffled(self):
        return self.to_TowerDB().half_muffled

    @half_muffled.setter
    def half_muffled(self, new_state):
        print("setting half_muffled to: ", new_state)
        self.to_TowerDB().half_muffled = new_state
        db.session.commit()




class TowerDict(dict):

    def __init__(self, table=TowerDB, db=db):
        self._db = db
        self._table = table
        self._garbage_collection_interval = timedelta(hours=12)

    def garbage_collection(self, key=None):
        # prepare garbage collection
        # don't collect the key we're currently looking up though
        keys_to_delete = [k for k, (value, timestamp) in self.items()
                          if timestamp < datetime.now() - self._garbage_collection_interval
                          and k != key ]
        log('Garbage collection:', keys_to_delete)

        # run garbage collection
        for deleted_key in keys_to_delete:
            dict.__delitem__(self, deleted_key)

    def check_db_for_key(self, key):

        if key in self.keys():
            # It's already in memory, don't check the db
            return True

        tower = self._table.query.get(key)
        if tower:
            log('Loading tower from db:', key)
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

        timestamp = datetime.now()

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


# make the TowerDict that we'll be using elsewhere
towers = TowerDict()

# Helper function to get a server IP, with load balancing
# If there is a list of IPs set in SOCKETIO_SERVER_ADDRESSES, this will automatically balance rooms
# across those servers. Otherwise, it will just direct everything to the current server.
def get_server_ip(tower_id):
    servers = Config.SOCKETIO_SERVER_ADDRESSES
    if not servers:
        return request.url_root
    else:
        return 'https://' + servers[tower_id % 10 % len(servers)]


