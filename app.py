from flask import Flask, render_template, redirect, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from sassutils.wsgi import SassMiddleware
import json

app = Flask(__name__)
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

towers = {'main': Tower('Ringing Room')}



# Serve the basic template
# For now: Redirect to a room called "main" if the user hasn't specified a room
@app.route('/', methods=('GET', 'POST'))
def index():
  return redirect('/tower/main')

# Create / find other towers/rooms
@app.route('/tower/<tower_code>')
def tower(tower_code):
  if tower_code not in towers:
    towers[tower_code] = Tower(tower_code)
  return render_template('ringing_room.html')

# Serve static files even when in the /tower/ namespace
# If there's a less kludgey way to do this, I can't find it
@app.route('/tower/static/<path:path>')
def serve_static(path):
  return send_from_directory('static', path)


# SocketIO Handlers

# Join a room — happens on connection, but with more information passed
@socketio.on('join')
def join_tower(json):
  tower_code = json['tower_code']
  join_room(tower_code)
  emit('size_change_event',{'size': towers[tower_code].n_bells})
  emit('global_state',{'global_bell_state': towers[tower_code].bell_state})

# A rope was pulled; ring the bell
@socketio.on('pulling_event')
def on_pulling_event(event_dict):
    cur_bell = event_dict["bell"]
    cur_room = event_dict["room"]
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
  emit('call_received',call_dict,
  broadcast=True,include_self=True,room=room)

# Tower size was changed
@socketio.on('request_size_change')
def on_size_change(size):
  room = size['room']
  size = size['new_size']
  towers[room].n_bells = size
  emit('size_change_event', {'size': size}, 
      broadcast=True, include_self=True, room=room)
  emit('global_state',{'global_bell_state': towers[room].bell_state},
      broadcast=True,include_self=True, room=room)


if __name__ == '__main__':
    socketio.run(app=app,host='0.0.0.0')
