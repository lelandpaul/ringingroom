from flask import Flask, render_template
from flask_socketio import SocketIO, emit
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
        'wsgi_path': '/static/css',
        'strip_extension': True
    }
})


# Serve the basic template
@app.route('/', methods=('GET', 'POST'))
def index():
    return render_template('ringing_room.html')


@socketio.on('pulling_event')
def broadcast_ringing(event_dict):
    cur_bell = event_dict["bell"]
    if global_bell_state[cur_bell - 1] is event_dict["stroke"]:
        global_bell_state[cur_bell - 1] = not global_bell_state[cur_bell - 1]
    else:
        print('Current stroke disagrees between server and client')
    emit('ringing_event', {"global_bell_state": global_bell_state, "who_rang": cur_bell}, broadcast=True,
         include_self=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0')
