from flask import render_template, send_from_directory, abort, flash, redirect
from flask_login import login_user, logout_user, current_user, login_required
from app import app, towers, log, db
from app.models import User
from flask_login import current_user, login_user, logout_user, login_required
from app.forms import LoginForm, RegistrationForm, UserSettingsForm


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

@app.route('/blog')
def blog():
    return render_template('blog.html')

@app.route('/authenticate')
def authenticate():
    login_form = LoginForm()
    registration_form = RegistrationForm()
    return render_template('authenticate.html', 
                           login_form=login_form,
                           registration_form=registration_form)

@app.route('/login', methods=['POST'])
def login():
    login_form = LoginForm()
    registration_form = RegistrationForm()
    if login_form.validate_on_submit():
        user = User.query.filter_by(email=login_form.username.data).first() or \
               User.query.filter_by(username=login_form.username.data).first()
        if user is None or not user.check_password(login_form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('authenticate'))
        login_user(user, remember=login_form.remember_me.data)
        return redirect(url_for('index'))
    return redirect(url_for('authenticate'))


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
        current_user.display_name = form.display_name.data or current_user.display_name
        if form.new_password.data and current_user.check_password(form.password.data):
            current_user.set_password(form.new_password.data)
            flash('Password updated.')
        db.session.commit()
    return render_template('user_settings.html', form=form)

