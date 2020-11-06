# coding: utf-8

from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired, ValidationError, Email, EqualTo, Optional
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

class EmailIf(Email):
    # A validator which checks that something is an email only if it's not empty

    def __call__(self, form, field):
        if not field.data:
            return True
        super(EmailIf, self).__call__(form,field)

class LoginForm(FlaskForm):
    username = StringField('Email Address', validators=[
        DataRequired(),
        Email(message="Please use your email address to log in, not your username.")
    ])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Keep me logged in')
    submit = SubmitField('Log In')

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = StringField('Email', validators=[
        DataRequired(),
        Email(message='Please log in with your email address (not your username).')
    ])
    password = PasswordField('Password', validators=[DataRequired()])
    password2 = PasswordField('Repeat Password', validators = [DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')
    accept_privacy = BooleanField('I have read and accept the Privacy Policy', \
                  validators=[DataRequired(message='Please accept our Privacy Policy to continue.')])

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data.lower().strip()).first()
        if user is not None:
            raise ValidationError('There is already a username associated with that email address.')

class UserSettingsForm(FlaskForm):
    password = PasswordField('Current Password', validators=[RequiredIf('submit'),
                                                             RequiredIf('new_username'),
                                                             RequiredIf('new_email'),
                                                             RequiredIf('new_password'),
                                                             RequiredIf('new_password2')])
    submit = SubmitField('Save changes')


    new_username = StringField('New Username', validators=[])
    new_email = StringField('New Email', validators=[EmailIf()])
    new_password = PasswordField('New Password', validators=[])
    new_password2 = PasswordField('Repeat New Password', validators=[EqualTo('new_password'),
                                                                     RequiredIf('new_password')])

    def validate_new_email(self, new_email):
        user = User.query.filter_by(email=new_email.data).first()
        if user is not None:
            raise ValidationError('There is already a username associated with that email address.')

class UserDeleteForm(FlaskForm):
    delete_password = PasswordField('Enter your password to delete', validators=[DataRequired('delete')])
    delete = SubmitField('Delete account')



class ResetPasswordRequestForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(),Email()])
    submit = SubmitField('Request Password Reset')

class ResetPasswordForm(FlaskForm):
    password = PasswordField('Password', validators=[DataRequired()])
    password2 = PasswordField(
        'Repeat Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Reset Password')

class TowerSettingsForm(FlaskForm):
    tower_name = StringField('Change name',validators=[Optional()])
    add_host = StringField('Add host by email', validators=[Optional(),Email()])
    remove_host = StringField('Remove host', validators=[Optional(),Email()])
    host_mode_enabled = BooleanField('Host Mode Enabled', validators=[Optional()])
    additional_sizes_enabled = BooleanField('Additional Sizes Enabled', validators=[Optional()])
    half_muffled = BooleanField('Half-muffled Tower Bells', validators=[Optional()])
    wheatley_enabled = BooleanField('Wheatley Enabled', validators=[Optional()])
    submit = SubmitField('Save Changes')

    def validate_add_host(self, new_host_email):
        user = User.query.filter_by(email=new_host_email.data).first()
        if user is None:
            raise ValidationError('Unknown user: ' + new_host_email.data)

class TowerDeleteForm(FlaskForm):
    delete = SubmitField('Delete Tower')

