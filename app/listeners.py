from flask_socketio import emit, join_room
from flask import session, request
from flask_login import current_user
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

    if not current_user.is_anonymous:
        new_tower.to_TowerDB().created_by(current_user)

    emit('s_redirection',
         str(new_tower.tower_id) + '/' + new_tower.url_safe_name)

# Helper function to generate a random string for use as a uid
def assign_user_id():
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(8))


# Set up the room when a user first joins
@socketio.on('c_join')
def on_join(json):
    log('c_join',json)


    # First, get the tower_id & tower from the client and find the tower
    tower_id = json['tower_id']
    tower = towers[tower_id]


    # Next, join the tower
    join_room(tower_id)
    log('SETUP Joined tower:',tower_id)

    # If the user is anonymous, mark them as an observer and set some cookies
    if current_user.is_anonymous:
        # Check they're not already in the room
        if 'user_id' in session.keys():
            tower.remove_observer(session['user_id'])
        session['user_id'] = assign_user_id()
        tower.add_observer(session['user_id'])
        log('SETUP Observer joined tower:',tower_id)
        emit('s_set_observers', {'observers': tower.observers},
             broadcast=True, include_self=True, room=tower_id)
        log('SETUP observer s_set_observers', tower.observers)
    else:
        # The user is logged in. Add this as a recent tower
        current_user.add_recent_tower(tower)
        # If the user is logged in, but is already in the room: Remove them (in
        # preparation for adding them again)
        if current_user.username in tower.users.keys():
            log('SETUP User already present')
            tower.remove_user(current_user.id)
            emit('s_user_left', {'user_name': current_user.username}, 
                                broadcast = True,
                                include_self = True,
                                room = tower_id)
        # For now: Keeping the "id/username" split in the tower model
        # Eventually, this will allow us to have display names different
        # from the username
        tower.add_user(current_user.id, current_user.username)
        emit('s_user_entered', { 'user_name': current_user.username },
             broadcast=True, include_self = True, room=json['tower_id'])


    # Store the tower in case of accidental disconnect
    # We need to do it under the SocketIO SID, otherwise a refresh might kick us out of the room
    if not 'tower_ids' in session.keys():
        session['tower_ids'] = {}
    session['tower_ids'][request.sid] = json['tower_id']
    session.modified= True


# Helper for sending assignments
def send_assignments(tower_id):
    tower = towers[tower_id]
    for (bell, user_name) in tower.assignments.items():
        log('s_assign_user', {'bell': bell, 'user': user_name})
        emit('s_assign_user', {'bell': bell, 'user': user_name},
             broadcast=True, include_self=True, room=tower_id)


# A user left a room (and the event actually fired)
@socketio.on('c_user_left')
def on_user_left(json):
    log('c_user_left', json)
    tower_id = json['tower_id']
    tower = towers[tower_id]

    user_id = current_user.id if not current_user.is_anonymous else session['user_id']

    if current_user.is_anonymous:
        tower.remove_observer(user_id)
        emit('s_set_observers', {'observers': tower.observers},
             broadcast = True, include_self = False, room=tower_id)
        return


    tower.remove_user(user_id)
    emit('s_user_left', { 'user_name': user_id },
         broadcast=True, include_self = False, room=tower_id)

    send_assignments(tower_id)


# # A user disconnected (via timeout)
# @socketio.on('disconnect')
# def on_disconnect():
#     try:
#         tower_id = session['tower_id']
#         tower = towers[tower_id]
#         user_id = session['user_id']
#     except KeyError:
#         return

#     try:
#         if session['observer']:
#             tower.remove_observer(user_id)
#             emit('s_set_observers', {'observers': tower.observers},
#                  broadcast = True, include_self = False, room=tower_id)
#             session['observer'] = False
#             return
#     except KeyError:
#         pass

#     user_name = session['user_name']
#     log('disconnect', user_name)
#     try:
#         tower.remove_user(user_id)
#     except KeyError:
#         log('User was already removed.')
#     emit('s_user_left', { 'user_name': user_name },
#          broadcast=True, include_self = False, room=tower_id)

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
    towers[tower_id].audio = json['new_audio']
    emit('s_audio_change', {'new_audio': json['new_audio']},
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
