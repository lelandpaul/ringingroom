from flask import render_template, send_from_directory, abort, flash, redirect
from app import app, towers, log
from flask_login import login_user, logout_user, current_user, login_required
from app.models import User
from flask_login import current_user, login_user
from app.forms import LoginForm


# redirect for static files on subdomains

@app.route('/<int:tower_id>/static/<path:path>')
@app.route('/<int:tower_id>/<decorator>/static/<path:path>')
def redirect_static(tower_id, path, decorator = None):
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
        log('Bad tower_id')
        abort(404)
    return render_template('ringing_room.html',
                           tower_name=tower_name)


# Create / find other towers/rooms
@app.route('/<int:tower_id>/listen')
@app.route('/<int:tower_id>/<decorator>/listen')
def observer(tower_id, decorator=None):
    try:
        tower_name = towers[tower_id].name
    except KeyError:
        log('Bad tower_id')
        abort(404)
    return render_template('observe.html',
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

<<<<<<< HEAD
@app.route('/blog')
def blog():
    return render_template('blog.html')
=======
# Handle the login page

@app.route('/login', methods=['GET','POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        flash('Login requested for user {}, remember_me={}'.format(
            form.username.data, form.remember_me.data))
        return redirect('/')
    return render_template('login.html', form=form)
    
>>>>>>> basic login page with wtf
