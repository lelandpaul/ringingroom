# coding: utf-8

from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired, ValidationError, Email, EqualTo
from app.models import User

class RequiredIf(DataRequired):
    # a validator which makes a field required if
    # another field is set and has a truthy value

    def __init__(self, other_field_name, *args, **kwargs):
        self.other_field_name = other_field_name
        super(RequiredIf, self).__init__(*args, **kwargs)

    def __call__(self, form, field):
        other_field = form._fields.get(self.other_field_name)
        if other_field is None:
            raise Exception('no field named "%s" in form' % self.other_field_name)
        if bool(other_field.data):
            super(RequiredIf, self).__call__(form, field)

class LoginForm(FlaskForm):
    username = StringField('Username or Email Address', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember me')
    submit = SubmitField('Sign In')

    def validate_username(self, username):
        user = User.query.filter_by(email=username.data).first() or \
               User.query.filter_by(username=username.data).first()
        if user is None or not user.check_password(self.password.data):
            raise ValidationError('Incorrect username or password.')


class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    password2 = PasswordField(
        'Repeat Password', validators = [DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Please choose a different username.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('There is already a username associated with that email addresss.')

class UserSettingsForm(FlaskForm):
    password = PasswordField('Current Password', validators=[RequiredIf('new_password'),
                                                     RequiredIf('new_password2'),
                                                     RequiredIf('new_username'),
                                                     RequiredIf('new_email')])
    submit = SubmitField('Save changes')

    new_username = StringField('Username', validators=[DataRequired()])
    new_email = StringField('Email', validators=[DataRequired(), Email()])
    new_password = PasswordField('New Password', validators=[])
    new_password2 = PasswordField('Repeat New Password', validators=[EqualTo('new_password'),
                                                                     RequiredIf('new_password')])

    def validate_new_username(self, new_username):
        users = User.query.filter_by(username=new_username.data).all()
        if len(users) > 1:
            raise ValidationError('That username is already taken.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('There is already a username associated with that email addresss.')
