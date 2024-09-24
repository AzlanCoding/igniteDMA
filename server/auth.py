from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import random, string, json, os, datetime, secrets
from .jsonDatabase import Loader, Setter
from .models import User, EnrollData
from . import db


def genRandomEnrollCode():
    letters = ''.join(random.choice(string.ascii_lowercase) for i in range(5))
    numbers = ''.join(random.choice(string.digits) for i in range(3))
    code = list(letters+numbers)
    random.shuffle(code)
    return ''.join(code)

def genRandomProfileCode():
   return ''.join(random.choice(string.ascii_lowercase) for i in range(8))

def genRandomPassword():
    return ''.join(secrets.choice(string.ascii_letters + string.digits + "!@#$%^&*") for i in range(12))


auth = Blueprint('auth', __name__)

@auth.route('/login')
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.profile'))
    return render_template('login.html')

@auth.route('/login', methods=['POST'])
def login_post():
    if current_user.is_authenticated:
        return redirect(url_for('main.profile'))
    # login code goes here
    email = request.form.get('email')
    password = request.form.get('password')
    remember = True if request.form.get('remember') else False
    next_url = request.form.get("next")

    user = User.query.filter_by(email=email).first()

    # check if the user actually exists
    # take the user-supplied password, hash it, and compare it to the hashed password in the database
    if not user or not check_password_hash(user.password, password):
        flash('Please check your login details and try again.')
        return redirect(url_for('auth.login')) # if the user doesn't exist or password is wrong, reload the page

    # if the above check passes, then we know the user has the right credentials
    login_user(user, remember=remember)
    if (next_url):
        return redirect(next_url)
    return redirect(url_for('main.profile'))

@auth.route('/signup')
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('main.profile'))
    return render_template('signup.html');

@auth.route('/signup', methods=['POST'])
def signup_post():
    if current_user.is_authenticated:
        return redirect(url_for('main.profile'))

    email = request.form.get('email').lower()
    password = request.form.get('passwordConfirm')

    if request.form.get('masterPin') != os.environ['MASTER_PIN']:
        flash("Master PIN is incorrect")
        return redirect(url_for('auth.signup'))

    if User.query.filter_by(email=email).first():
        flash('The email you entered already exists. Go to the Login page to login.')
        return redirect(url_for('auth.signup'))

    with open("./server/storage/schools/default.json", 'r', encoding='utf8') as f:
        data = json.load(f)
        f.close()

    enrollCode = genRandomEnrollCode()
    while (os.path.isfile("./server/storage/schools/"+enrollCode+'.json')):
        enrollCode = genRandomEnrollCode()

    data["enrollCode"] = enrollCode

    newProfiles = []

    for profileCode in data["profiles"]:
        newProfileCode = genRandomProfileCode()
        while (os.path.isfile("./server/storage/profiles/"+newProfileCode+'.json')):
            newProfileCode = genRandomProfileCode()
        Setter.saveProfile(newProfileCode, Loader.loadProfile(profileCode));
        newProfiles.append(newProfileCode)

    data["profiles"] = newProfiles

    Setter.saveEnroll(enrollCode,data)

    newUser = User(email=email, accountType="enrollAdmin", enrollId=enrollCode, password=generate_password_hash(password, method='scrypt'), accountStatus="unlocked")
    db.session.add(newUser)
    db.session.commit()

    newEnrollPassword = EnrollData(id=enrollCode, masterPin=genRandomPassword())
    db.session.add(newEnrollPassword)
    db.session.commit()

    flash("Account creation successful!\nLogin to get started!")

    return redirect(url_for('auth.login'))

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))
