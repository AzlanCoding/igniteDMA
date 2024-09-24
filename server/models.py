from flask_login import UserMixin
from . import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True) # primary keys are required by SQLAlchemy
    email = db.Column(db.String(100), unique=True)
    accountType = db.Column(db.String(100))
    accountStatus = db.Column(db.String(100))
    enrollId = db.Column(db.String(100))
    password = db.Column(db.String(100))

class EnrollData(db.Model):
    id = db.Column(db.String(100),primary_key=True)
    masterPin = db.Column(db.String(100))
