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


## Events

Communication between client & server is handled by Socket.IO events.

Events are prefixed by *origin*:
- "c_" for client
- "s_" for server
