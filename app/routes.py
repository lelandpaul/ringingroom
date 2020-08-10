from flask import render_template, send_from_directory, abort, flash, redirect, url_for, session, request
from flask_login import login_user, logout_user, current_user, login_required
from app import app, towers, log, db
from app.models import User, UserTowerRelation
from flask_login import current_user, login_user, logout_user, login_required
from app.forms import *

from urllib.parse import urlparse
import string
import random
from app.email import send_password_reset_email
import jwt
import os

# Helper function to get a server IP, with load balancing
# If there is a list of IPs set in SOCKETIO_SERVER_ADDRESSES, this will automatically balance rooms
# across those servers. Otherwise, it will just direct everything to the current server.
def get_server_ip(tower_id):
    servers = app.config['SOCKETIO_SERVER_ADDRESSES']
    cur_server_name = app.config['RR_SERVER_NAME']
    if not servers or cur_server_name != 'UK':
        return request.url_root
    else:
        return 'https://' + servers[tower_id % 10 % len(servers)]

# redirect for static files on subdomains

@app.route('/<int:tower_id>/static/<path:path>')
@app.route('/<int:tower_id>/<decorator>/static/<path:path>')
@app.route('/tower_settings/static/<path:path>')
def redirect_static(tower_id=None, path=None, decorator = None):
    return send_from_directory(app.static_folder, path)


# Helper function to load toasts
def load_toasts(modal):
    return [render_template('news/' + f,modal_id=i, modal=modal) for (i, f) \
                in enumerate(os.listdir('app/templates/' + 'news/')) if not f.startswith('.')]

# Serve the landing page

@app.route('/', methods=('GET', 'POST'))
def index():
    form = LoginForm() if current_user.is_anonymous else None

    server_name = app.config['RR_SERVER_NAME']
    server_line = server_name if server_name != 'UK' else None
    return render_template('landing_page.html',
                           server_line=server_line,
                           toasts=load_toasts(modal=False),
                           modals=load_toasts(modal=True),
                           login_form=form)


# Create / find other towers/rooms as an observer
@app.route('/<int:tower_id>/listen')
@app.route('/<int:tower_id>/<decorator>/listen')
def observer(tower_id, decorator=None):
    try:
        towers.garbage_collection(tower_id)
        tower = towers[tower_id]
    except KeyError:
        log('Bad tower_id')
        abort(404)
    return render_template('ringing_room.html',
                           tower=tower,
                           listen_link=True,
                           server_ip=get_server_ip(tower_id))

# Helper function to generate a random string for use as a unique user_id
def assign_user_id():
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(8))

# Create / find other towers/rooms
@app.route('/<int:tower_id>')
@app.route('/<int:tower_id>/<decorator>')
def tower(tower_id, decorator=None):
    # If the user isn't authorized on this server, just redirect them
    # back to the landing
    if not current_user.is_authorized_on_server:
        return redirect(url_for('index'))


    try:
        towers.garbage_collection(tower_id)
        tower = towers[tower_id]
    except KeyError:
        log('Bad tower_id')
        abort(404)

    # Generate a jwt token to pass user_id
    # This allows us to pass user_id securely through the client html,
    # which in turn allows backup servers to get the current user without cross-domain cookies
    user_token = '' if current_user.is_anonymous \
                    else jwt.encode({'id': current_user.get_id()}, app.config['SECRET_KEY'],
                                    algorithm='HS256').decode('utf-8')

    # Pass in both the tower and the user_name
    return render_template('ringing_room.html',
                            tower = tower,
                            user_name = '' if current_user.is_anonymous else current_user.username,
                            user_email = '' if current_user.is_anonymous else current_user.email,
                            server_ip=get_server_ip(tower_id),
                            user_token = user_token,
                            host_permissions = current_user.check_permissions(tower_id,'host')\
                                                if current_user.is_authenticated else False,
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

@app.route('/code_of_conduct')
def code_of_conduct():
    return render_template('code_of_conduct.html')

@app.route('/authenticate')
def authenticate():
    login_form = LoginForm()
    registration_form = RegistrationForm()
    next = request.args.get('next')
    return render_template('authenticate.html',
                           login_form=login_form,
                           registration_form=registration_form,
                           hide_cookie_warning=True,
                           next=next)

@app.route('/login', methods=['POST'])
def login():
    login_form = LoginForm()
    registration_form = RegistrationForm()
    next = request.args.get('next')
    if urlparse(next).netloc != '':
        # All our next redirections will be relative; if there's a netloc, that means
        # someone has tampered with the next arg and we should throw it out
        next = ''
    if login_form.validate_on_submit():

        user = User.query.filter_by(email=login_form.username.data.lower().strip()).first()
        if user is None or not user.check_password(login_form.password.data):
            flash('Incorrect username or password.')
            return render_template('authenticate.html',
                                   login_form=login_form,
                                   registration_form=registration_form,
                                   next=next)

        login_user(user, remember=login_form.remember_me.data)

        return redirect(next or url_for('index'))
    return render_template('authenticate.html',
                           login_form=login_form,
                           registration_form=registration_form,
                           next=next)


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/register', methods=['POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    next = request.args.get('next')
    login_form = LoginForm()
    registration_form = RegistrationForm()
    if registration_form.validate_on_submit():
        user = User(username=registration_form.username.data.strip(),
                    email=registration_form.email.data.lower().strip())
        user.set_password(registration_form.password.data)
        db.session.add(user)
        db.session.commit()

        login_user(user)

        return redirect(url_for('index'))
    return render_template('authenticate.html',
                           login_form=login_form,
                           registration_form=registration_form,
                           next=next)

@app.route('/my_towers')
def my_towers():
    # We need to pass in all of the users related towers, marked by the kind of relation they have
    return render_template('my_towers.html',
                           tower_props=current_user.tower_properties)

@app.route('/tower_settings/<int:tower_id>', methods=['GET','POST'])
def tower_settings(tower_id):
    tower = towers[tower_id]
    tower_db = tower.to_TowerDB()
    form = TowerSettingsForm()
    delete_form = TowerDeleteForm()
    if form.validate_on_submit():
        # Set host-mode
        tower.host_mode_enabled = form.host_mode_enabled.data
        if form.tower_name.data:
            tower.name = form.tower_name.data
            tower_db.tower_name = form.tower_name.data
            form.tower_name.data = ''
            flash('Tower name changed.')
        if form.add_host.data:
            new_host = User.query.filter_by(email=form.add_host.data).first()
            if new_host.check_permissions(tower_id, permission='host'):
                form.add_host.errors.append('User is already a host.')
            new_host.make_host(tower)
            form.add_host.data = ''
        if form.remove_host.data:
            host = User.query.filter_by(email=form.remove_host.data).first()
            if host == tower_db.creator:
                form.add_host.errors.append('Cannot remove tower creator from host list.')
            else:
                host.remove_host(tower)
            form.remove_host.data =''
        db.session.commit()
    if delete_form.delete.data and delete_form.validate_on_submit():
        rels = UserTowerRelation.query.filter_by(tower=tower_db)
        for rel in rels: db.session.delete(rel)
        db.session.delete(tower_db)
        db.session.commit()
        del tower
        towers.pop(tower_id)
        flash('Tower ' + str(tower_id) + ' deleted.')
        return redirect(url_for('my_towers'))
    form.host_mode_enabled.data = tower.host_mode_enabled
    return render_template('tower_settings.html',
                           form=form,
                           delete_form=delete_form,
                           tower=tower_db)



@app.route('/settings', methods=['GET','POST'])
@login_required
def user_settings():
    form = UserSettingsForm()
    del_form = UserDeleteForm()
    if form.submit.data and form.validate_on_submit():
        if not current_user.check_password(form.password.data):
            flash('Incorrect password.')
            return render_template('user_settings.html',form=form, del_form=del_form)
        if form.new_password.data:
            current_user.set_password(form.new_password.data)
            flash('Password updated.')
        if form.new_email.data:
            current_user.email = form.new_email.data.lower()
            flash('Email updated.')
        if form.new_username.data:
            current_user.username = form.new_username.data.strip()
            flash('Username updated.')
        db.session.commit()
        return redirect(url_for('user_settings'))
    if del_form.delete.data and del_form.validate_on_submit():
        if not current_user.check_password(del_form.delete_password.data):
            flash('Incorrect password.')
            return render_template('user_settings.html',form=form, del_form=del_form)
        current_user.clear_all_towers()
        db.session.delete(current_user)
        db.session.commit()
        logout_user()
        return redirect(url_for('index'))
    return render_template('user_settings.html', form=form, del_form=del_form, user_settings_flag=True)

@app.route('/reset_password', methods=['GET','POST'])
def request_reset_password():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = ResetPasswordRequestForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data.lower().strip()).first()
        if user:
            send_password_reset_email(user)
        flash('Check your email for the instructions to reset your password.')
        return redirect(url_for('authenticate'))
    return render_template('reset_password_request.html',
                           title='Reset Password', form=form)


@app.route('/reset_password/<token>', methods=['GET','POST'])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    user = User.verify_reset_password_token(token)
    form = ResetPasswordForm()
    if form.validate_on_submit():
        user.set_password(form.password.data)
        db.session.commit()
        flash('Your password has been reset.')
        return redirect(url_for('authenticate'))
    return render_template('reset_password.html', form=form, token_success=bool(user))


