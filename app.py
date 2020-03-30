from flask import Flask, render_template, redirect, send_from_directory, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
from sassutils.wsgi import SassMiddleware
from random import sample
import json
import re
import os

app = Flask(__name__,static_folder=os.path.join(os.getcwd(),'static'))
app.config['SECRET_KEY'] = 's7WUt93.ir_bFya7'

socketio = SocketIO(app)

# set up automatic sass compilation
app.wsgi_app = SassMiddleware(app.wsgi_app, {
    'app': {
        'sass_path': 'static/sass',
        'css_path': 'static/css',
        'wsgi_path': 'static/css',
        'strip_extension': False
    }
})




# Keep track of towers

class Tower:
  def __init__(self,name,n=8):
    self._name = name
    self._n = 8
    self._bell_state = [True] * n
  
  @property
  def name(self):
    return(self._name)

  @name.setter
  def name(self,new_name):
    self._name = new_name
  
  @property
  def n_bells(self,):
    return(self._n)

  @n_bells.setter
  def n_bells(self,new_size):
    self._n = new_size
    self._bell_state = [True] * new_size

  @property
  def bell_state(self):
    return(self._bell_state)

  @bell_state.setter
  def bell_state(self,new_state):
    self._bell_state = new_state






def clean_tower_name(name):
  out = re.sub('\s','_',name)
  out = re.sub('\W','',out)
  return out.lower()

def generate_random_change():
	# generate a random royal change, for use as uid
	return int(''.join(map(str,sample([i+1 for i in range(9)],k=9))))

towers = {}

# Serve the landing page
@app.route('/', methods=('GET', 'POST'))
def index():
  return render_template('landing_page.html')

@app.route('/<int:tower_id>/static/<path:path>')
def redirect_static(tower_id,path):
	return send_from_directory(app.static_folder,path)


# Serve the static pages

@app.route('/about')
def about():
	return render_template('about.html')

@app.route('/help')
def help():
	return render_template('help.html')

@app.route('/contact')
def contact():
	return render_template('contact.html')

@app.route('/donate')
def donate():
	return render_template('donate.html')

# The user entered a tower code; check it
@socketio.on('check_room_code')
def on_check_room_code(json):
	global towers
	room_code = int(json['room_code'])
	if room_code in towers.keys():
		emit('check_code_success',{'tower_name': towers[room_code].name})
	else:
		emit('check_code_failure')

# The user entered a valid tower code and joined it
@socketio.on('join_room_by_code')
def on_join_by_code(json):
	tower_code = int(json['tower_code'])
	tower_name = towers[tower_code].name
	emit('redirection', str(tower_code) + '/' + clean_tower_name(tower_name))

# Create a new room with the user's name
@socketio.on('create_room')
def on_room_name_entered(data):
  global towers
  global clean_tower_name

  room_name = data['room_name']
  new_room = Tower(room_name)
  new_uid = generate_random_change()
  towers[new_uid] = new_room
  emit('redirection', str(new_uid) + '/' + clean_tower_name(room_name))


# Create / find other towers/rooms
@app.route('/<int:tower_id>')
@app.route('/<int:tower_id>/<decorator>')
def tower(tower_id,decorator = None):
  return render_template('ringing_room.html', 
                         tower_name = towers[tower_id].name)

# SocketIO Handlers

# Join a room — happens on connection, but with more information passed
@socketio.on('join')
def join_tower(json):
  tower_code = int(json['tower_code'])
  join_room(tower_code)
  emit('size_change_event',{'size': towers[tower_code].n_bells})
  emit('global_state',{'global_bell_state': towers[tower_code].bell_state})
  emit('tower_name_change',{'new_name': towers[tower_code].name})

# A rope was pulled; ring the bell
@socketio.on('pulling_event')
def on_pulling_event(event_dict):
    cur_bell = event_dict["bell"]
    cur_room = int(event_dict["tower_code"])
    cur_tower = towers[cur_room]
    bell_state = cur_tower.bell_state
    if bell_state[cur_bell - 1] is event_dict["stroke"]:
        bell_state[cur_bell - 1] = not bell_state[cur_bell - 1]
    else:
        print('Current stroke disagrees between server and client')
    disagreement = True
    emit('ringing_event', {"global_bell_state": bell_state, 
               "who_rang": cur_bell, 
               "disagree": disagreement},
         broadcast=True, include_self=True, room=cur_room)


# A call was made
@socketio.on('call_made')
def on_call_made(call_dict):
  room = call_dict['room']
  emit('call_received',call_dict, broadcast=True,include_self=True,room=int(room))

# Tower size was changed
@socketio.on('request_size_change')
def on_size_change(size):
  room = int(size['room'])
  size = size['new_size']
  towers[room].n_bells = size
  emit('size_change_event', {'size': size}, 
      broadcast=True, include_self=True, room=room)
  emit('global_state',{'global_bell_state': towers[room].bell_state},
      broadcast=True,include_self=True, room=room)


if __name__ == '__main__':
    socketio.run(app=app,host='0.0.0.0')
