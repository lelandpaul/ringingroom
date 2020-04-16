from flask_socketio import emit, join_room
from flask import session, request
from app import socketio, towers, log
from app.models import Tower
import random
import string

# SocketIO Handlers


# The user entered a tower code on the landing page; check it
@socketio.on('c_check_tower_id')
def on_check_tower_id(json):
    tower_id = json['tower_id']
    try:
        # Doing it this way (using towers[id]) tests the database for us
        emit('s_check_id_success', {'tower_name': towers[tower_id].name})
        log('Found tower_id:', str(tower_id))
    except KeyError:
        emit('s_check_id_failure')
        log("Didn't find tower_id:", str(tower_id))


# The user entered a valid tower code and joined it
@socketio.on('c_join_tower_by_id')
def on_join_tower_by_id(json):
    log('c_join_tower_by_id', json)
    tower_id = json['tower_id']
    tower_name = towers[tower_id].url_safe_name
    emit('s_redirection', str(tower_id) + '/' + tower_name)


# Create a new room with the user's name
@socketio.on('c_create_tower')
def on_create_tower(data):
    log('c_create_tower', data)
    tower_name = data['tower_name']
    new_tower = Tower(tower_name)
    towers[new_tower.tower_id] = new_tower

    emit('s_redirection',
         str(new_tower.tower_id) + '/' + new_tower.url_safe_name)



# Set up the room when a user first joins
@socketio.on('c_join')
def on_join(json):
    log('c_join',json)

    # Helper function to generate a random string for use as a uid
    def assign_user_id():
        letters = string.ascii_lowercase
        return ''.join(random.choice(letters) for i in range(8))

    # First: check that the user has a unique ID in their cookie
    # This will be used for keeping track of who's in the room
    if 'user_id' not in session.keys():
        session['user_id'] = assign_user_id()
    user_id = session['user_id']

    # The user may already have a username set in their cookies. if so, get it
    user_name = session.get('user_name') or ''
    if user_name: log('SETUP Found username in cookie:',user_name)

    # Next, get the tower_id & tower from the client, then join the room
    tower_id = json['tower_id']
    tower = towers[tower_id]
    join_room(tower_id)
    log('SETUP Joined tower:',tower_id)

    # Store the tower in case of accidental disconnect
    session['tower_id'] = json['tower_id']

    # It's possible we already have them listed in the tower's user or listener list
    # Check this via the user_id
    user_already_present = user_id in tower.users.keys()

    # Give the user the list of currently-present users
    emit('s_set_users', {'users': list(tower.users.values())})
    log('SETUP s_set_users:', list(tower.users.values()))

    # If the user is in the room: Remove them (in preparation for adding them again)
    if user_already_present:
        log('SETUP User already present')
        tower.remove_user(user_id)
        emit('s_user_left', {'user_name': user_name}, 
                            broadcast = True,
                            include_self = True,
                            room = tower_id)

    # Check whether their selected name is available
    user_name_available = user_name not in tower.users.values()

    # Send the user their name, along with whether it's currently available or not
    emit('s_set_user_name', {'user_name': user_name,
                             'name_available': user_name_available})
    log('SETUP s_set_user_name:', {'user_name': user_name, 'name_available': user_name_available})

    # emit the number of listeners
    emit('s_set_listeners', {'listeners': tower.listeners},
         broadcast=True, include_self=True, room=tower_id)
    log('SETUP s_set_listeners', tower.listeners)
    
    # Set up tower metadata
    emit('s_name_change', {'new_name': tower.name})
    emit('s_audio_change', {'new_audio': tower.audio})
    log('SETUP s_name_change', tower.name)
    log('SETUP s_audio_change', tower.audio)

    # Set the size (then wait for the client to ask for the global state)
    emit('s_size_change', {'size': tower.n_bells})
    log('SETUP s_size_change',tower.n_bells)


# Set up room when a listener first joins
@socketio.on('c_join_listener')
def on_listener_joined(json):
    log('c_join_listener',json)

    # Helper function to generate a random string for use as a uid
    def assign_user_id():
        letters = string.ascii_lowercase
        return ''.join(random.choice(letters) for i in range(8))

    # First: check that the user has a unique ID in their cookie
    # This will be used for keeping track of who's in the room
    if 'user_id' not in session.keys():
        session['user_id'] = assign_user_id()
    user_id = session['user_id']

    # Next, get the tower_id & tower from the client, then join the room
    tower_id = json['tower_id']
    tower = towers[tower_id]
    join_room(tower_id)
    log('SETUP Listener joined tower:',tower_id)

    # Store the tower in case of accidental disconnect
    # Also note that this was a listener
    session['tower_id'] = json['tower_id']
    session['listener'] = True

    # Add the listener and emit the total number of listeners
    tower.add_listener(user_id)
    emit('s_set_listeners', {'listeners': tower.listeners},
         broadcast=True, include_self=True, room=tower_id)
    log('SETUP listener s_set_listeners', tower.listeners)

    # Give the user the list of currently-present users
    emit('s_set_users', {'users': list(tower.users.values())})
    log('SETUP s_set_users:', list(tower.users.values()))

    # Set up tower metadata
    emit('s_name_change', {'new_name': tower.name})
    emit('s_audio_change', {'new_audio': tower.audio})
    log('SETUP s_name_change', tower.name)
    log('SETUP s_audio_change', tower.audio)

    # Set the size (then wait for the client to ask for the global state)
    emit('s_size_change', {'size': tower.n_bells})
    log('SETUP s_size_change',tower.n_bells)


# Helper for sending assignments
def send_assignments(tower_id):
    tower = towers[tower_id]
    for (bell, user_name) in tower.assignments.items():
        log('s_assign_user', {'bell': bell, 'user': user_name})
        emit('s_assign_user', {'bell': bell, 'user': user_name},
             broadcast=True, include_self=True, room=tower_id)


# A user entered a room
@socketio.on('c_user_entered')
def on_user_entered(json):
    log('c_user_entered',json)

    # Store their username for the future
    session['user_name'] = json['user_name']
    user_name = json['user_name']
    session.modified = True

    # Get their unique ID
    user_id = session['user_id']

    # Get the tower
    tower = towers[json['tower_id']]
    tower.add_user(user_id, user_name)

    emit('s_user_entered', { 'user_name': user_name },
         broadcast=True, include_self = True, room=json['tower_id'])


# A user left a room (and the event actually fired)
@socketio.on('c_user_left')
def on_user_left(json):
    log('c_user_left', json)
    tower_id = json['tower_id']
    tower = towers[tower_id]
    user_id = session['user_id']

    if json['listener']:

        tower.remove_listener(user_id)
        emit('s_set_listeners', {'listeners': tower.listeners},
             broadcast = True, include_self = False, room=tower_id)
        return

    user_name = json['user_name']

    try:
        tower.remove_user(user_id)
    except KeyError:
        # The user key wasn't present in the tower, for some reason
        # For now, just pass
        pass

    emit('s_user_left', { 'user_name': user_name },
         broadcast=True, include_self = False, room=tower_id)

    send_assignments(tower_id)


# A user disconnected (via timeout)
@socketio.on('disconnect')
def on_disconnect():
    tower_id = session['tower_id']
    tower = towers[tower_id]
    user_id = session['user_id']

    if session['listener']:
        tower.remove_listener(user_id)
        emit('s_set_listeners', {'listeners': tower.listeners},
             broadcast = True, include_self = False, room=tower_id)
        return

    user_name = session['user_name']
    log('disconnect', user_name)
    try:
        tower.remove_user(user_id)
    except KeyError:
        log('User was already removed.')
    emit('s_user_left', { 'user_name': user_name },
         broadcast=True, include_self = False, room=tower_id)

# User was assigned to rope
@socketio.on('c_assign_user')
def on_assign_user(json):
    log('c_assign_user',json)
    tower = towers[json['tower_id']]
    tower.assign_bell(json['bell'], json['user'])
    emit('s_assign_user', json,
         broadcast=True, include_self=True, room=json['tower_id'])


# A rope was pulled; ring the bell
@socketio.on('c_bell_rung')
def on_bell_rung(event_dict):
    log('c_bell_rung', event_dict)
    disagreement = False
    cur_bell = event_dict["bell"]
    tower_id = event_dict["tower_id"]
    cur_tower = towers[tower_id]
    bell_state = cur_tower.bell_state
    if bell_state[cur_bell - 1] is event_dict["stroke"]:
        bell_state[cur_bell - 1] = not bell_state[cur_bell - 1]
    else:
        log('Current stroke disagrees between server and client')
        disagreement = True
    emit('s_bell_rung',
         {"global_bell_state": bell_state,
          "who_rang": cur_bell,
          "disagree": disagreement},
         broadcast=True, include_self=True, room=tower_id)


# A call was made
@socketio.on('c_call')
def on_call(call_dict):
    log('c_call', call_dict)
    tower_id = call_dict['tower_id']
    emit('s_call', call_dict, broadcast=True,
         include_self=True, room=tower_id)


# Tower size was changed
@socketio.on('c_size_change')
def on_size_change(size):
    log('c_size_change', size)
    tower_id = size['tower_id']
    size = size['new_size']
    towers[tower_id].n_bells = size
    towers[tower_id].set_at_hand()
    emit('s_size_change', {'size': size},
         broadcast=True, include_self=True, room=tower_id)

# The client finished resizing and is now ready to get the global state
@socketio.on('c_request_global_state')
def on_request_global_state(json):
    log('c_request_global_state', json)
    print('global state requested')
    tower_id = json['tower_id']
    tower = towers[tower_id]
    state = tower.bell_state
    emit('s_global_state', {'global_bell_state': state})

    # Send assignments
    # Broadcast these bc the relevant user might have been removed from their assignments
    send_assignments(tower_id)


# Audio type was changed
@socketio.on('c_audio_change')
def on_audio_change(json):
    log('c_audio_change', json)
    tower_id = json['tower_id']
    new_audio = 'Hand' if json['old_audio'] == 'Tower' else 'Tower'
    towers[tower_id].audio = new_audio
    emit('s_audio_change', {'new_audio': new_audio},
         broadcast=True, include_self=True, room=tower_id)

# Set all bells at hand
@socketio.on('c_set_bells')
def on_set_bells(json):
    log('c_set_bells', json)
    tower_id = json['tower_id']
    tower = towers[tower_id]
    tower.set_at_hand()
    emit('s_global_state', {'global_bell_state': tower.bell_state},
         broadcast = True, include_self=True, room=tower_id)
