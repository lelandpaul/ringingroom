import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
from app.models import User
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir,'.env'))

BADGE_MAPPING = { 'Tower bell': 'badge-tower.png', 'Handbell': 'badge-hand.png'}

def create_gsheet_client():
    scope = ['https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name('secrets/' + os.getenv('RR_GSHEETS_API'), scope)
    client = gspread.authorize(creds)
    return client.open(os.getenv('RR_PATRON_GSHEET')).sheet1


def update_db_badges():
    sheet = create_gsheet_client()
    # Load data and dedup
    badges = {}
    for row in sheet.get_all_values()[1:]:
        email = row[1]
        badge = BADGE_MAPPING[row[3]] if row[3] in BADGE_MAPPING else None
        badges[email] =  badge

    # Update the database
    for email, badge in badges.items():
        user = User.query.filter_by(email=email).first()
        if user is None:
            # No such user
            continue
        if badge:
            user.donation_badge = badge
        db.session.commit()

def get_patron_thank_yous():
    sheet = create_gsheet_client()
    accounts = {}
    for row in sheet.get_all_values()[1:]:
        email = row[1]
        thank_you = row[2]
        if not thank_you:
            continue
        badge = BADGE_MAPPING[row[3]] if row[3] in BADGE_MAPPING else None
        accounts[email] = (thank_you, badge)
    return accounts.values()


