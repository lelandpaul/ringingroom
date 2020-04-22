from flask import render_template, send_from_directory, abort, flash, redirect
from flask_login import login_user, logout_user, current_user, login_required
from app import app, towers, log, db
from app.models import User
from flask_login import current_user, login_user, logout_user
from app.forms import LoginForm, RegistrationForm


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
<<<<<<< HEAD
@app.route('/blog')
def blog():
    return render_template('blog.html')
=======
# Handle the login page
=======
# Logging in/out
>>>>>>> very basic log-in page

@app.route('/login', methods=['GET','POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('login'))
        login_user(user, remember=form.remember_me.data)
        return redirect(url_for('index'))
    return render_template('login.html', form=form)

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))
    
<<<<<<< HEAD
>>>>>>> basic login page with wtf
=======

@app.route('/register', methods=['GET','POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Welcome, ' + form.username.data + '!')
        return redirect(url_for('login'))
    return render_template('register.html', title='Register', form=form)
>>>>>>> very basic log-in page
