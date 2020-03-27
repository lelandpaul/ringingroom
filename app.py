from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
from sassutils.wsgi import SassMiddleware
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 's7WUt93.ir_bFya7'
socketio = SocketIO(app)


class Tower:
	def __init__(self,name,n=8):
		self._name = name
		self._n = 8
		self._bell_state = [True] * n
	
	@property
	def name():
		return(self._name)

	@name.setter
	def name(new_name):
		self._name = new_name
	
	@property
	def n_bells():
		return(self._n)

	@n_bells.setter
	def n_bells(new_size):
		self._n = new_size
		self._bell_state = [True] * new_size

	@property
	def bell_state():
		return(self._bell_state)

	@bell_state.setter
	def bell_state(new_state):
		self._bell_state = new_state

global_rooms = {'main': Tower('Ringing Room')}

# set up automatic sass compilation
app.wsgi_app = SassMiddleware(app.wsgi_app, {
    'app': {
        'sass_path': 'static/sass',
        'css_path': 'static/css',
        'wsgi_path': '/static/css',
        'strip_extension': True
    }
})


# Serve the basic template
@app.route('/', methods=('GET', 'POST'))
def index():
    return render_template('ringing_room.html')

# Create / find other towers/rooms
@app.route('/tower/<tower_code>')
def tower(tower_code):
	if tower_code not in global_rooms:
		global_rooms[tower_code] = Tower(tower_code)
	join_room(tower_code)
	return render_template('ringing_room.html')


@socketio.on('pulling_event')
def on_pulling_event(event_dict):
    cur_bell = event_dict["bell"]
    cur_room = event_dict["room"]
    global_bell_state = global_rooms[cur_room]
    if global_bell_state[cur_bell - 1] is event_dict["stroke"]:
        global_bell_state[cur_bell - 1] = not global_bell_state[cur_bell - 1]
    else:
        print('Current stroke disagrees between server and client')
    emit('ringing_event', {"global_bell_state": global_bell_state, "who_rang": cur_bell},
         broadcast=True, include_self=True, room=cur_room)


def messageReceived(methods=['GET', 'POST']):
    print('message was received!!!')


@socketio.on('message_sent')
def on_message_sent(json):
	print('A message was sent: ' + str(json))
	socketio.emit('message_received',json,broadcast=True,include_self=True,
			room=json['room'])


@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    emit(username + ' has entered the room.', room=room,
         broadcast=True, include_self=True)
    emit('global_state',{'global_bell_state': global_rooms[room].bell_state})


@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    emit(username + ' has left the room.', room=room,
         broadcast=True, include_self=True)


@socketio.on('new_room')
def new_room(data):
    global_rooms.append(data['new_room_name'])
    room = data['new_room_name']
    username = data['username']
    join_room(data['new_room_name'])
    # Notification about new user joined room
    send({"msg": username + " has created the " + room + " room."}, room=room)


if __name__ == '__main__':
    app.run()
