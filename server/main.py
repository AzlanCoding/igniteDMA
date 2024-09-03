from flask import Blueprint, render_template, send_from_directory, request, redirect, flash, jsonify, abort, url_for
from flask_login import login_required, current_user
from dotenv import load_dotenv
import json, datetime, os
from . import db
#from cryptography.fernet import Fernet

#key = ''
#fernet = Fernet(key)
main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/profile2')
def profile2():
    return render_template('profile.html')

@main.route('/profile')
@login_required
def profile():
    classId = current_user.classId
    with open("./server/storage/class/"+classId+".json") as f:
      data = json.load(f)
      f.close()
    data["classId"] = classId.upper()
    return render_template('class.html',data=json.dumps(data))

@main.route('/profile', methods=['POST'])
def profile_post():
    classId = current_user.classId
    className = request.form.get("profileNameEdit")
    blockedSites = [website for website in request.form.get("blockedSitesList").split("\r\n") if website != ""]
    startHour, startMin =  request.form.get("editTimeStart").split(":")
    endHour, endMin =  request.form.get("editTimeEnd").split(":")

    enforceDays = ""
    dayList = ['editSUN','editMON', 'editTUE', 'editWED', 'editTHU', 'editFRI', 'editSAT']
    for i in range(len(dayList)):
        if request.form.get(dayList[i]):
            enforceDays += str(i)

    data = {
        "className": className,
        "blockedSites": blockedSites,
        "startHour": startHour,
        "startMin": startMin,
        "endHour": endHour,
        "endMin": endMin,
        "enforceDays": enforceDays,
        "lastUpdated": int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
    }

    with open("./server/storage/class/"+classId+'.json', 'w', encoding='utf8') as outfile:
      outfile.write(json.dumps(data,indent=4))
      outfile.close()

    flash("Profile updated successfully!")

    return redirect(url_for('main.profile'))





@main.route('/assets/<path:path>')
def send_file(path):
    return send_from_directory('assets', path)

@main.route('/api/v0/getClass/<path:path>')
def getClass(path):
    return send_from_directory('storage/class', path+".json")

@main.route('/api/v0/findClass/<path:path>')
def findClass(path):
    classId = path
    try:
        with open("./server/storage/class/"+classId+".json") as f:
          data = json.load(f)
          f.close()
        return jsonify({"lastUpdated": data["lastUpdated"],"forceUpdateNow": False})
    except FileNotFoundError:
        abort(404)

@main.route('/api/v0/masterPin', methods=['POST'])
def verifyPin():
    if request.headers.get('PIN') == os.environ["MASTER_PIN"]:
        return 'OK'
    else:
        abort(404)
    # TODO: Handle attemptCount
    '''elif request.headers.get('masterPin') == None && request.headers.get('attemptCount') == None:
        abort(404)
    else:
        if request.headers.get('attemptCount') == 10:
            return ""'''

@main.route('/api/v0/masterPin', methods=['GET'])
def nothing():
    abort(404)
