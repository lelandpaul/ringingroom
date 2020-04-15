from flask import render_template, send_from_directory, abort
from app import app, towers


# redirect for static files on subdomains

@app.route('/<int:tower_id>/static/<path:path>')
def redirect_static(tower_id, path):
    return send_from_directory(app.static_folder, path)


# Serve the landing page

@app.route('/', methods=('GET', 'POST'))
def index():
    return render_template('landing_page.html')


# Create / find other towers/rooms
@app.route('/<int:tower_id>')
@app.route('/<int:tower_id>/<decorator>')
def tower(tower_id, decorator=None):
    try:
        tower_name = towers[tower_id].name
    except KeyError:
        abort(404)
    return render_template('ringing_room.html',
                           tower_name=tower_name)


#  Serve the static pages

@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/help')
def help():
    return render_template('help.html')


@app.route('/contact')
def contact():
    return render_template('contact.html')


@app.route('/donate')
def donate():
    return render_template('donate.html')
