from flask import render_template
from app import app

# using SendGrid's Python Library
# https://github.com/sendgrid/sendgrid-python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def send_email(subject, recipient, text_body, html_body):
    message = Mail(
        from_email='admin@ringingroom.com',
        to_emails=recipient,
        subject=subject,
        html_content=html_body)
    sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
    response = sg.send(message)


def send_password_reset_email(user):
    token = user.get_reset_password_token()
    send_email('Ringing Room Password Reset',
               recipient=user.email,
               text_body=render_template('email/reset_password.txt',
                                         user=user, token=token),
               html_body=render_template('email/reset_password.html',
                                         user=user, token=token))
