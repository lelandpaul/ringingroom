from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room
from sassutils.wsgi import SassMiddleware
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 's7WUt93.ir_bFya7'
socketio = SocketIO(app)

n_bells = 8
global_bell_state = [True] * n_bells

# set up automatic sass compilation
app.wsgi_app = SassMiddleware(app.wsgi_app, {
    'app': {
        'sass_path': 'static/sass',
        'css_path': 'static/css',
        'wsgi_path': 'static/css',
        'strip_extension': False
    }
})


# Serve the basic template
@app.route('/', methods=('GET', 'POST'))
def index():
    return render_template('ringing_room.html')


@socketio.on('join_main_room')
def on_join_main_room():
	print('joining main ',n_bells)
	join_room('main')
	emit('size_change_event',{'size': n_bells})
	emit('global_state',{'global_bell_state': global_bell_state})


@socketio.on('pulling_event')
def broadcast_ringing(event_dict):
    cur_bell = event_dict["bell"]
    global global_bell_state
    if global_bell_state[cur_bell - 1] is event_dict["stroke"]:
        global_bell_state[cur_bell - 1] = not global_bell_state[cur_bell - 1]
    else:
        print('Current stroke disagrees between server and client')
    emit('ringing_event', {"global_bell_state": global_bell_state, "who_rang": cur_bell}, broadcast=True,
         include_self=True, room='main')

@socketio.on('call_made')
def on_call_made(call_dict):
	emit('call_received',call_dict,
	broadcast=True,include_self=True,room='main')


# Manage tower size

@socketio.on('request_size_change')
def on_size_change(size):
	size = size['new_size']
	global n_bells
	n_bells = size
	global global_bell_state
	global_bell_state = [True] * n_bells
	emit('size_change_event', {'size': n_bells}, 
			broadcast=True, include_self=True, room='main')
	emit('global_state',{'global_bell_state': global_bell_state})


if __name__ == '__main__':
    socketio.run(app=app,host='0.0.0.0')
