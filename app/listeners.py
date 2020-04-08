from flask_socketio import emit, join_room
from flask import session, request
from app import socketio, towers
from app.models import Tower

# SocketIO Handlers

# The user entered a tower code on the landing page; check it
@socketio.on('c_check_tower_id')
def on_check_tower_id(json):
    tower_id = json['tower_id']
    try:
        # Doing it this way (using towers[id]) tests the database for us
        emit('s_check_id_success', {'tower_name': towers[tower_id].name})
    except KeyError:
        emit('s_check_id_failure')


# The user entered a valid tower code and joined it
@socketio.on('c_join_tower_by_id')
def on_join_tower_by_id(json):
    tower_id = json['tower_id']
    tower_name = towers[tower_id].url_safe_name
    emit('s_redirection', str(tower_id) + '/' + tower_name)


# Create a new room with the user's name
@socketio.on('c_create_tower')
def on_create_tower(data):
    tower_name = data['tower_name']
    new_tower = Tower(tower_name)
    towers[new_tower.tower_id] = new_tower

    emit('s_redirection',
         str(new_tower.tower_id) + '/' + new_tower.url_safe_name)


# Join a room — happens on connection, but with more information passed
@socketio.on('c_join')
def on_join(json):
    tower_id = json['tower_id']
    tower = towers[tower_id]
    join_room(tower_id)
    if 'user_name' in session.keys():
        print('found username: ' + session['user_name'])
        cur_user = session['user_name']
        name_available = cur_user not in tower.users
        emit('s_set_username', {'user_name': cur_user,
                                'name_available': name_available})
    emit('s_size_change', {'size': tower.n_bells})
    emit('s_name_change', {'new_name': tower.name})
    emit('s_audio_change', {'new_audio': tower.audio})
    emit('s_set_users', {'users': tower.users})
    emit('s_global_state', {'global_bell_state': tower.bell_state})
    for (bell, user) in tower.assignments.items():
        if not user: continue
        emit('s_assign_user', {'bell': bell, 'user': user})


# User logged in
@socketio.on('c_user_entered')
def on_user_entered(json):
    session['user_name'] = json['user_name']
    session['tower_id'] = json['tower_id']
    session.modified = True
    print('set username to: ' + session['user_name'])
    tower = towers[json['tower_id']]
    user = json['user_name']
    tower.add_user(user)
    emit('s_user_entered', { 'user': user },
         broadcast=True, include_self = True, room=json['tower_id'])

@socketio.on('disconnect')
def on_disconnect():
    user = session['user_name']
    tower_id = session['tower_id']
    session['tower_id'] = ''
    session.modified = True
    print('disconnecting ' + user + ' from ' + str(tower_id));
    towers[tower_id].remove_user(user)
    print('users in ' + str(tower_id) + ': ' + str(towers[tower_id].users))
    emit('s_user_left', { 'user': user },
         broadcast=True, include_self = False, room=tower_id)


# # User left
# @socketio.on('c_user_left')
# def on_user_left(json):
#     tower = towers[json['tower_id']]
#     user = json['user_name']
#     tower.remove_user(user)
#     emit('s_user_left', { 'user': user },
#          broadcast=True, include_self = False, room=json['tower_id'])

# User was assigned to rope
@socketio.on('c_assign_user')
def on_assign_user(json):
    print('user was assigned')
    tower = towers[json['tower_id']]
    tower.assign_bell(json['bell'], json['user'])
    emit('s_assign_user', json,
         broadcast=True, include_self=True, room=json['tower_id'])


# A rope was pulled; ring the bell
@socketio.on('c_bell_rung')
def on_bell_rung(event_dict):
    disagreement = False
    cur_bell = event_dict["bell"]
    tower_id = event_dict["tower_id"]
    cur_tower = towers[tower_id]
    bell_state = cur_tower.bell_state
    if bell_state[cur_bell - 1] is event_dict["stroke"]:
        bell_state[cur_bell - 1] = not bell_state[cur_bell - 1]
    else:
        print('Current stroke disagrees between server and client')
        disagreement = True
    emit('s_bell_rung',
         {"global_bell_state": bell_state,
          "who_rang": cur_bell,
          "disagree": disagreement},
         broadcast=True, include_self=True, room=tower_id)


# A call was made
@socketio.on('c_call')
def on_call(call_dict):
    tower_id = call_dict['tower_id']
    emit('s_call', call_dict, broadcast=True,
         include_self=True, room=tower_id)


# Tower size was changed
@socketio.on('c_size_change')
def on_size_change(size):
    def emit_global_state():
        emit('s_global_state', {'global_bell_state': towers[tower_id].bell_state},
             broadcast=True, include_self=True, room=tower_id)

    tower_id = size['tower_id']
    size = size['new_size']
    towers[tower_id].n_bells = size
    emit('s_size_change', {'size': size},
         broadcast=True, include_self=True, room=tower_id, callback = emit_global_state)


# Audio type was changed
@socketio.on('c_audio_change')
def on_audio_change(json):
    tower_id = json['tower_id']
    new_audio = 'Hand' if json['old_audio'] == 'Tower' else 'Tower'
    towers[tower_id].audio = new_audio
    emit('s_audio_change', {'new_audio': new_audio},
         broadcast=True, include_self=True, room=tower_id)

# Set all bells at hand
@socketio.on('c_set_bells')
def on_set_bells(json):
    tower_id = json['tower_id']
    tower = towers[tower_id]
    tower.set_at_hand()
    emit('s_global_state', {'global_bell_state': tower.bell_state},
         broadcast = True, include_self=True, room=tower_id)
