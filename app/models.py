from app import db
from random import sample
import re

class TowerDB(db.Model):
    tower_id = db.Column(db.Integer, primary_key=True)
    tower_name = db.Column(db.String(32), index=True)

    def __repr__(self):
        return '<Tower {}: {}>'.format(self.tower_id, self.tower_name)

    def to_Tower(self):
        return Tower(self.tower_name, tower_id=self.tower_id)


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

    def generate_random_change(self):
        # generate a random royal change, for use as uid
        return int(''.join(map(str, sample([i+1 for i in range(9)], k=9))))

    def to_TowerDB(self):
        return(TowerDB(tower_id=self.tower_id, tower_name=self.name))

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
    def n_bells(self,):
        return(self._n)

    @n_bells.setter
    def n_bells(self, new_size):
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


class TowerDict(dict):
    def __init__(self, table=TowerDB, db=db):
        self._db = db
        self._table = table
        self._dict = dict()

    def check_db_for_key(self, key):
        if key in self._dict.keys():
            # It's already in memory, don't check the db
            return True

        tower = self._table.query.get(key)
        if tower:
            # load the thing back into memory
            self._dict[key] = tower.to_Tower()
            return True

        return False

    def __setitem__(self, key, value):
        key = int(key)  # just to be sure

        # if it's in the database, load it into memory
        self.check_db_for_key(key)

        # It's already in use
        if key in self._dict.keys():
            raise KeyError('Key already in use.')

        # add it to both memory and database
        self._dict[key] = value
        self._db.session.add(value.to_TowerDB())
        self._db.session.commit()

    def __getitem__(self, key):
        key = int(key)  # just to be sure
        self.check_db_for_key(key)

        return self._dict[key]



