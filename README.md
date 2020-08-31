# virtual-ringing-room

A space where socially-distanced ringers can practice together.

## Build instructions

Get the CSS set up with sass:
 - Install dart-sass (e.g. `brew install sass/sass/sass`); https://github.com/sass/dart-sass/releases
 - (Optional) Create & activate a [virtual environment](https://packaging.python.org/guides/installing-using-pip-and-virtual-environments/);
 - Install python dependencies `pip install -r requirements.txt`
 - In the project root, run `sass app/static/sass/:app/static/css/`. This will compile the sass to css.
 
Get the DB set up with Flask:
 - In the project root, run `flask db upgrade`
 
You are now ready to run the server:
 - In the project root, run `flask run`
 - This will give you a local address where you can access the app 



## API

Ringing Room supplies a basic API for use in 3rd-party apps.

### Summary of Endpoints & Methods

| Endpoint                         | Method   | Description                            |
| ---                              | ---      | ---                                    |
| `/api/tokens`                    | `POST`   | Get bearer token                       |
| `/api/tokens`                    | `DELETE` | Revoke bearer token                    |
| `/api/user`                      | `GET`    | Get current user details               |
| `/api/user`                      | `POST`   | Register new user                      |
| `/api/user`                      | `PUT`    | Modify user settings                   |
| `/api/user`                      | `DELETE` | Delete user account                    |
| `/api/my_towers`                 | `GET`    | Get all towers related to current user |
| `/api/my_towers/<tower_id>`      | `PUT`    | Toggle bookmark for `tower_id`         |
| `/api/my_towers/<tower_id>`      | `DELETE` | Remove `tower_id` from recent towers   |
| `/api/tower/<tower_id>/settings` | `GET`    | Get tower settings (if permitted)      |
| `/api/tower/<tower_id>/settings` | `PUT`    | Modify tower settings (if permitted)   |
| `/api/tower/<tower_id>/hosts`    | `POST`   | Add hosts (if permitted)               |
| `/api/tower/<tower_id>/hosts`    | `DELETE` | Remove hosts (if permitted)            |
| `/api/tower/<tower_id>`          | `GET`    | Get connection details for `tower_id`  |
| `/api/tower`                     | `POST`   | Create new tower                       |
| `/api/tower/<tower_id>`          | `DELETE` | Delete tower (if permitted)            |

### Authorization

Initial authorization uses HTTP Basic Auth: `POST` to `/api/tokens` with the header `Authorization: Basic <credentials>`, where `<credentials>` is a base-64-encoded `email:password`. The response will include a bearer token valid for 24 hours.

All other endpoints (except `POST /api/user` for registering new users) require the header `Authorization: Bearer <token>`.

### User

`GET /api/user`: Gets user details. Responds with a JSON including the fields `username` & `email`.

`POST /api/user`: Registers new user. Request must include a JSON with fields `username`, `email`, & `password`. Responds as per `GET /api/user`. (Does not require Bearer token.)

`PUT /api/user`: Modifies user details Request JSON may include `new_username`, `new_email`, `new_password`. Responds as per `GET /api/user`.

`DELETE /api/user`:  Deletes user.

### My_Towers

`GET /api/my_towers`: Gets all related towers:

```
{
    "928134567": {
        "bookmark": 0,
        "creator": 1,
        "host": 1,
        "recent": 1,
        "tower_id": 928134567,
        "tower_name": "Advent",
        "visited": "Mon, 31 Aug 2020 15:45:54 GMT"
    },
    "987654321": {
        "bookmark": 0,
        "creator": 0,
        "host": 0,
        "recent": 1,
        "tower_id": 987654321,
        "tower_name": "Old North",
        "visited": "Mon, 31 Aug 2020 15:44:40 GMT"
    }
}
```

`PUT /my_towers/<tower_id>`: Toggles the `bookmark` value for that tower. Responds as per `GET /api/my_towers` but with only the details for the requested tower.

`DELETE /my_towers/tower_id>`: Removes the tower from the current user's recent towers. Responds as per `GET /api/my_towers` but with only the details for the requested tower.


### Tower

`GET /api/tower/<tower_id>`: Gets connection information for the tower. Response JSON includes `tower_id`, `tower_name`, and `server_address`.

`POST /api/tower`: Creates a new tower. Request JSON should include `tower_name`. Responds as per `GET /api/tower/<tower_id>`.

`DELETE /api/tower/<tower_id>`: Deletes the tower, if the current user has permission to do so.

`GET /api/tower/<tower_id>/settings`: Gets tower settings, if the current user has permission to modify them. Response JSON includes `host_mode_enabled`, `tower_id`, `tower_name`, and `hosts`, a list of objects containing `email` & `username`.

`PUT /api/tower/<tower_id>/settings`: Modifies tower settings, if the current user has permission to do so. Request JSON may include `tower_name`, `permit_host_mode`. Responds as per `GET /api/tower/<tower_id>/settings`.

`POST /api/tower/<tower_id>/hosts`: Adds new hosts, if the current user has permission to do so. Request JSON must include `new_hosts`, a list of email addresses. Responds as per `GET /api/tower/<tower_id>/settings`.

`DELETE /api/tower/<tower_id>/hosts`: Remove hosts, if the current user has permission to do so. Request JSON must include `hosts`, a list of email addresses. Responds as per `GET /api/tower/<tower_id>/settings`.


### Connecting to a Tower

All communication between the API consumer and an individual tower should take place through SocketIO. The basic workflow for setting up communication is:

1. Establish a connection with the `server_address` returned by `GET /api/tower/<tower_id>`.
2. Emit `c_join` with a JSON payload containing `tower_id`, `user_token` (the Bearer token), and `anonymous_user`. **At present, our API doesn't support anonymous users, so this should always have the value `false`.**
3. Listen for `s_set_userlist`, `s_size_change`, `s_audio_change`, `s_host_mode`, `s_user_entered`, and `s_assign_user` to set up the tower.
4. Once you've set up the rope circle, emit `c_request_global_state` and listen for `s_global_state` to set the bells at back/hand.
5. Ring!
6. Emit `c_user_left` when leaving.


### Events

Communication between client & server is handled by Socket.IO events.

Events are prefixed by *origin*:
- `c_` for client
- `s_` for server

What follows is a incomplete list of events — these should be only the events relevant to an API consumer (i.e. where functionality is not duplicated elsewhere).

| Event                    | Payload                                                                  | Description                        |
| ---                      | ---                                                                      | ---                                |
| `c_join`                 | `{tower_id: Int, user_token: Str, anonymous_user: Bool}`                 | User joined a tower.               |
| `s_user_entered`         | `{user_name: Str}`                                                       | Server relayed user entering.      |
| `c_user_left`            | `{user_name: Str, user_token: Str, anonymous_user: Bool, tower_id: Int}` | User left a tower.                 |
| `s_user_left`            | `{user_name: Str}`                                                       | Server relayed user leaving.       |
| `c_request_global_state` | `{tower_id: Int}`                                                        | Client requested tower state.      |
| `s_global_state`         | `{global_bell_state: [Bool]}`                                            | Server sent current tower state.   |
| `s_set_userlist`         | `{user_list: [Str]}`                                                     | Server set list of users in tower. |
| `c_bell_rung`            | `{bell: Int, stroke: Bool, tower_id: Int}`                               | User rang a bell.                  |
| `s_bell_rung`            | `{global_bell_state: [Bool], who_rang: Int, disagreement: Bool}`         | Server relayed bell ringing.       |
| `c_assign_user`          | `{bell: Int, user: Str, tower_id: Int}`                                  | User assigned someone to a bell.   |
| `s_assign_user`          | `{bell: Int, user: Str}`                                                 | Server sent bell assignment.       |
| `c_audio_change`         | `{new_audio: ("Tower"\|"Hand"), tower_id: Int}`                          | User changed audio type.           |
| `s_audio_change`         | `{new_audio: ("Tower"\|"Hand")}`                                         | Server sent audio state.           |
| `c_host_mode`            | `{new_mode: Bool, tower_id: Int}`                                        | User toggled host mode.            |
| `s_host_mode`            | `{tower_id: Int, new_mode: Bool}`                                        | Server sent host mode.             |
| `c_size_change`          | `{new_size: Int, tower_id: Int}`                                         | User changed tower size.           |
| `s_size_change`          | `{size: Int}`                                                            | Server sent tower size.            |
| `c_msg_sent`             | `{user: Str, email: Str, msg: Str, time: Date, tower_id: Int}`           | User sent a chat.                  |
| `s_msg_sent`             | `{user: Str, email: Str, msg: Str, time: Date, tower_id: Int}`           | Server relayed chat.               |
| `c_call`                 | `{call: Str, tower_id: Int}`                                             | User made a call.                  |
| `s_call`                 | `{call: Str, tower_id: Int}`                                             | Server relayed user call.          |
| `c_set_bells`            | `{tower_id: Int}`                                                        | User set all bells at hand.        |


### Directory structure (abbreviated...)

```
.
├── LICENSE
├── README.md
├── __pycache__
├── app
│   ├── __init__.py
│   ├── __pycache__
│   ├── api
│   ├── email.py
│   ├── forms.py
│   ├── listeners.py
│   ├── models.py
│   ├── routes.py
│   ├── static
│   │   ├── audio
│   │   │   ├── hand.ac3
│   │   │   ├── hand.json
│   │   │   ├── hand.m4a
│   │   │   ├── hand.mp3
│   │   │   ├── hand.ogg
│   │   │   ├── processed_audio
│   │   │   ├── raw_audio
│   │   │   ├── tower.ac3
│   │   │   ├── tower.json
│   │   │   ├── tower.m4a
│   │   │   ├── tower.mp3
│   │   │   └── tower.ogg
│   │   ├── audio.js
│   │   ├── bootstrap
│   │   │   ├── js
│   │   │   └── scss
│   │   ├── css
│   │   │   ├── circle.css
│   │   │   ├── circle.css.map
│   │   │   ├── global_design.css
│   │   │   ├── global_design.css.map
│   │   │   ├── ringing_room.css
│   │   │   ├── ringing_room.css.map
│   │   │   ├── static.css
│   │   │   ├── static.css.map
│   │   │   └── static.scss.css
│   │   ├── dark-mode-switch
│   │   │   ├── LICENSE
│   │   │   ├── README.md
│   │   │   ├── dark-mode-switch.js
│   │   │   ├── dark-mode-switch.min.js
│   │   │   ├── dark-mode.css
│   │   │   ├── index.html
│   │   │   └── package.json
│   │   ├── downloads
│   │   ├── gen
│   │   ├── howler.core.min.js
│   │   ├── images
│   │   │   ├── dncb.png
│   │   │   ├── favicon
│   │   │   ├── h-backstroke.png
│   │   │   ├── h-handstroke-treble.png
│   │   │   ├── h-handstroke.png
│   │   │   ├── logo.png
│   │   │   ├── t-backstroke.png
│   │   │   ├── t-handstroke-treble.png
│   │   │   ├── t-handstroke.png
│   │   │   └── test-email.py
│   │   ├── landing.js
│   │   ├── my_towers.js
│   │   ├── ringing_room.js
│   │   └── sass
│   │       ├── circle.scss
│   │       ├── global_design.scss
│   │       ├── ringing_room.css
│   │       ├── ringing_room.css.map
│   │       ├── ringing_room.scss
│   │       ├── static.css
│   │       ├── static.css.map
│   │       └── static.scss
│   └── templates
│       ├── _code_of_conduct.html
│       ├── _news_toast.html
│       ├── _privacy_policy.html
│       ├── _user_menu.html
│       ├── about.html
│       ├── authenticate.html
│       ├── base.html
│       ├── blog.html
│       ├── code_of_conduct.html
│       ├── contact.html
│       ├── donate.html
│       ├── email
│       │   ├── reset_password.html
│       │   └── reset_password.txt
│       ├── help.html
│       ├── landing_page.html
│       ├── my_towers.html
│       ├── news
│       ├── reset_password.html
│       ├── reset_password_request.html
│       ├── ringing_room.html
│       ├── tower_settings.html
│       └── user_settings.html
├── app.db
├── config.py
├── env
├── flask_session
├── logs
├── migrations
│   ├── README
│   ├── __pycache__
│   │   └── env.cpython-37.pyc
│   ├── alembic.ini
│   ├── env.py
│   ├── script.py.mako
│   └── versions
├── requirements.txt
└── ringingroom.py
```
