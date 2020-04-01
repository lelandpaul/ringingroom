# virtual-ringing-room

A space where socially-distanced ringers can practice together.

# Filestructure

```
.
├── README.md                       => this file
├── requirements.txt                => requirements for virtual environment
├── setup_helper.py                 => script for deployment tasks
├── app.py                          => serverside app
├── migrations/                     => database migrations (maintined by `flask db`)
├── static
│   ├── audio
│   │   ├── (various).mp3           => raw audio assets
│   │   ├── hand.(various audio)    => audiosprite for handbells
│   │   ├── hand.json               => offsets for handbell audiosprite
│   │   ├── tower.(various audio)   => audiosprite for towerbells
│   │   └── tower.json              => offsets for towerbell audiosprite
│   ├── css/                        => compiled css, maintained by sass (don't modify!)
│   ├── sass
│   │   ├── static.scss            => sass for for static pages
│   │   └── ringing_room.scss       => sass for ringing_room itself
│   ├── howler.core.min.js          => javascript audio library
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


# Events

Communication between client & server is handled by Socket.IO events.

Events are prefixed by *origin*:
- "c-" for client
- "s-" for server

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
  user ended a tower name; create it
- **c_join, {tower_id: Int}**:
  emited when the ringing_room page loads
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
