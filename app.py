from flask import Flask, render_template
from flask_socketio import SocketIO, emit, send

app = Flask(__name__)
app.config['SECRET_KEY'] = 's7WUt93.ir_bFya7'
socketio = SocketIO(app)


# Serve the basic template
@app.route('/',methods=('GET','POST'))
def index():
	return render_template('ringing_room.html')


@socketio.on('ringing_event')
def broadcast_ringing(json):
	emit('ringing_event',json,broadcast=True,include_self=False)
