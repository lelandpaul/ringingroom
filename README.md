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


