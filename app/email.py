from flask import render_template

import os
from postmarker.core import PostmarkClient

def send_email(subject, recipient, text_body, html_body):
    token = os.getenv("POSTMARK_API_TOKEN")
    pm = PostmarkClient(server_token=token)
    pm.emails.send(
        From='admin@ringingroom.com',
        To=recipient,
        Subject=subject,
        HtmlBody=html_body
    )

def send_password_reset_email(user):
    token = user.get_reset_password_token()
    send_email(
        "Ringing Room Password Reset",
        recipient=user.email,
        text_body=render_template("email/reset_password.txt", user=user, token=token),
        html_body=render_template("email/reset_password.html", user=user, token=token),
    )
