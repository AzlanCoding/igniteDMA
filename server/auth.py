from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import random, string, json, os, datetime
from .models import User
from . import db


def genRandomClass():
   return ''.join(random.choice(string.ascii_lowercase) for i in range(8))


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
    classId = request.form.get('classId').lower()
    password = request.form.get('password')
    remember = True if request.form.get('remember') else False
    next_url = request.form.get("next")

    user = User.query.filter_by(classId=classId).first()

    # check if the user actually exists
    # take the user-supplied password, hash it, and compare it to the hashed password in the database
    if not user or not check_password_hash(user.password, password):
        flash('Please check your login details and try again.')
        return redirect(url_for('auth.login')) # if the user doesn't exist or password is wrong, reload the page

    # if the above check passes, then we know the user has the right credentials
    login_user(user, remember=remember)
    print(next_url)
    if (next_url):
        return redirect(next_url)
    return redirect(url_for('main.profile'))

@auth.route('/signup')
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('main.profile'))
    classId = genRandomClass()
    while (os.path.isfile("./server/class/"+classId+'.json')):
      classId = genRandomClass()
    return render_template('signup.html',classId = classId.upper());

@auth.route('/signup', methods=['POST'])
def signup_post():
    if current_user.is_authenticated:
        return redirect(url_for('main.profile'))

    # code to validate and add user to database goes here
    classId = request.form.get('classId').lower()
    password = request.form.get('password')
    className = request.form.get('className')

    if request.form.get('masterPin') != os.environ['MASTER_PIN']:
        flash("Master PIN is incorrect")
        return redirect(url_for('auth.signup'))

    assert classId != ""
    user = User.query.filter_by(classId=classId).first() # if this returns a user, then the email already exists in database

    if user: # if a user is found, we want to redirect back to signup page so user can try again
        flash('classID already exists! This was not supposed to happen. Please refresh the page and contact AzlanCoding if the issue persists.')
        return redirect(url_for('auth.signup'))

    # create a new user with the form data. Hash the password so the plaintext version isn't saved.
    new_user = User(classId=classId, password=generate_password_hash(password, method='scrypt'))

    # add the new user to the database
    db.session.add(new_user)
    db.session.commit()

    with open("./server/class/default.json") as f:
      data = json.load(f)
      f.close()

    data["className"] = className
    data["lastUpdated"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)

    with open("./server/class/"+classId+'.json', 'w', encoding='utf8') as outfile:
      outfile.write(json.dumps(data,indent=4))
      outfile.close()

    flash("Account creation successful!\nYour Profile Code is "+classId.upper())

    return redirect(url_for('auth.login'))

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))
