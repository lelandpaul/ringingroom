from flask import render_template, send_from_directory, abort, flash, redirect, url_for, session, request
from flask_login import login_user, logout_user, current_user, login_required
from app import app, towers, log, db
from app.models import User
from flask_login import current_user, login_user, logout_user, login_required
from app.forms import LoginForm, RegistrationForm, UserSettingsForm
from urllib.parse import urlparse
import string
import random


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
@app.route('/<int:tower_id>/listen')
@app.route('/<int:tower_id>/<decorator>/listen')
def observer(tower_id, decorator=None):
    try:
        tower = towers[tower_id]
    except KeyError:
        log('Bad tower_id')
        abort(404)
    return render_template('ringing_room.html',
                           tower=tower,
                           listen_link=True)

# Helper function to generate a random string for use as a unique user_id
def assign_user_id():
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(8))

# Create / find other towers/rooms
@app.route('/<int:tower_id>')
@app.route('/<int:tower_id>/<decorator>')
def tower(tower_id, decorator=None):
    try:
        tower = towers[tower_id]
    except KeyError:
        log('Bad tower_id')
        abort(404)
    if current_user.is_anonymous:
        # Not logged in.
        session['user_name'] = ''
        name_available = True
    else:
        # User is logged in. Their globally-unique user_name works as both id and display
        session['user_id'] = current_user.username
        session['user_name'] = current_user.username
        name_available = True # it's globally unique
                         
    # Pass in both the tower and the user_name
    return render_template('ringing_room.html',
                            tower = tower,
                            user_name = session['user_name'],
                            name_available = name_available,
                            listen_link = False)


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

@app.route('/blog')
def blog():
    return render_template('blog.html')

@app.route('/authenticate')
def authenticate():
    login_form = LoginForm()
    registration_form = RegistrationForm()
    next = request.args.get('next')
    return render_template('authenticate.html', 
                           login_form=login_form,
                           registration_form=registration_form,
                           next=next)

@app.route('/login', methods=['POST'])
def login():
    login_form = LoginForm()
    registration_form = RegistrationForm()
    if login_form.validate_on_submit():

        next = request.args.get('next')
        if urlparse(next).netloc != '':
            # All our next redirections will be relative; if there's a netloc, that means
            # someone has tampered with the next arg and we should throw it out
            next = ''


        user = User.query.filter_by(email=login_form.username.data).first() or \
               User.query.filter_by(username=login_form.username.data).first()
        if user is None or not user.check_password(login_form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('authenticate'))

        login_user(user, remember=login_form.remember_me.data)

        return redirect(next or url_for('index'))
    return redirect(url_for('authenticate', next=next))


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))
    
@app.route('/register', methods=['POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    login_form = LoginForm()
    registration_form = RegistrationForm()
    if registration_form.validate_on_submit():
        user = User(username=registration_form.username.data, email=registration_form.email.data)
        user.set_password(registration_form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Welcome, ' + registration_form.username.data + '!')
        return redirect(url_for('index'))
    return redirect(url_for('authenticate'))

@app.route('/settings', methods=['GET','POST'])
@login_required
def user_settings():
    form = UserSettingsForm()
    if form.validate_on_submit():
        if current_user.check_password(form.password.data):
            current_user.set_password(form.new_password.data)
            flash('Password updated.')
        db.session.commit()
    return render_template('user_settings.html', form=form)

