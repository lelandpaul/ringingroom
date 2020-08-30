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

## Filestructure

```text
.
├── README.md                           => this file
├── .flaskenv                           => defines environment variables
├── requirements.txt                    => requirements for virtual environment
├── setup_helper.py                     => script for deployment tasks
├── ringingroom.py                      => launches server-side app
├── config.py                           => flask configuration
├── migrations/                         => database migrations (maintained by `flask db`)
└── app                                 => all of the actual application
    ├── __init__.py                     => sets up flask app
    ├── listeners.py                    => socketio listeners
    ├── models.py                       => database models & Tower, TowerDict classes
    ├── routes.py                       => flask routes
    ├── static
    │   ├── audio
    │   │   ├── calls/                  => raw files for calls
    │   │   ├── hand/                   => raw files for handbell audio
    │   │   ├── tower/                  => raw files for towerbell audio
    │   │   ├── hand.(various audio)    => audiosprite for handbells
    │   │   ├── hand.json               => offsets for handbell audiosprite
    │   │   ├── tower.(various audio)   => audiosprite for towerbells
    │   │   └── tower.json              => offsets for towerbell audiosprite
    │   ├── css/                        => compiled css, maintained by sass (don't modify!)
    │   ├── sass
    │   │   ├── static.scss             => sass for for static pages
    │   │   └── ringing_room.scss       => sass for ringing_room itself
    │   ├── images
    │   │   ├── favicon/                => favicon assets
    │   │   ├── backstroke.png          => rope at backstroke
    │   │   └── handstroke.png          => rope at handstroke
    │   ├── landing.js                  => client scripts for landing page
    │   └── ringing_room.js             => client scripts for ringing_room itself
    └── templates                       => jinja2 templates for all pages
        ├── about.html
        ├── contact.html
        ├── donate.html
        ├── help.html
        ├── landing_page.html
        └── ringing_room.html
 ```

## Events

Communication between client & server is handled by Socket.IO events.

Events are prefixed by *origin*:
- "c_" for client
- "s_" for server


Currently, the following events are defined:

- **c_check_tower_id, {tower_id: Int}**:
  on the landing page, the user has entered a tower_id; check whether it exists
- **s_check_id_success, {tower_name: Str}**:
  tower id did correspond to an extant tower; tell the client the name
- **s_check_id_failure, None**:
  tower id did not correspond to an extant tower
- **c_join_tower_by_id, {tower_id: Int}**:
  user joined a tower by an id
- **s_redirection, Str ("tower_id/tower_name")**:
  send the user to a specific tower
- **c_create_tower, {tower_name: Str}**:
  user entered a tower name; create it
- **c_join, {tower_id: Int}**:
  emitted when the ringing_room page loads
- **c_size_change, {size: Int, tower_id: Int}**,
  **s_size_change, {size: Int}**:
  change the number of bells in a tower
- **s_global_state, {global_bell_state: List(Bool) }**:
  set the positions of all the bells from the server's state
- **s_name_change, {new_name: Str}**:
  set the name of the tower
- **c_audio_change, {old_audio: 'Tower' or 'Hand', tower_id: Int},**
  **s_audio_change, {new_audio: 'Tower' or 'Hand'}**:
  set the audio type
- **c_bell_rung, {bell: Int, stroke: Bool, tower_id: Int}**:
  report ringing a bell
- **s_bell_rung, {global_bell_state: List(Bool), who_rang: Int, disagree: Bool}**:
  broadcast a bell stroke. Disagree indicates that the server & client disagreed
- **{c/s}_call, {call: Str, tower_id: Int}**:
  report & broadcast a call made

# API

This API is currently in alpha state and might change at any time.


## Login Tokens

Authentication is done through tokens. To log in, `POST` to `/api/tokens` with the standard Basic Authorization header:

```
    Authorization: Basic <credentials>
```

Where `<credentials>` is the Base64 encoding of `<username>:<password>`.

The response will be a JSON object with data `token`. Tokens are good for 24 hours.

## Using tokens

When accessing any page that is login protected, send the `Authorization` header `Bearer <token>`.

## Revoking tokens

If you send a `DELETE` request to `/api/tokens` with an authorized token, that token will be revoked.

## API Endpoints

At the moment, only one other API endpoint is implemented: A `GET` request to `/api/user/` (note the trailing `/`) with an authorized token will return user details for that user in JSON format, including related towers.


