from flask import Blueprint, render_template, send_from_directory, request, redirect, flash, jsonify, abort, url_for
from flask_login import login_required, current_user
from dotenv import load_dotenv
import json, datetime, os, random, string
from .jsonDatabase import Loader, Setter, Checker, setUpJsonDb
from . import db

setUpJsonDb()


main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/profile')
@login_required
def profile():
    enrollId = current_user.enrollId
    data = Loader.loadEnrollment(enrollId)
    data['removalPin'] = Loader.getEnrollMasterPin(enrollId)
    return render_template('profile.html', data=json.dumps(data))

@main.route('/profile/updateProfile', methods=['POST'])
@login_required
def profile_post():
    # NOTE: formEntries also includes 'editState', but it can be None.
    formEntries = ['profileCode','profileLastUpdated','profileNameEdit','profileType','editTimeStart','editTimeEnd','blockedSitesList']
    for entry in formEntries:
        if request.form.get(entry) == None:
            abort(400)#Insufficient form data

    enrollData = Loader.loadEnrollmentRaw(current_user.enrollId)
    if not ((request.form.get("profileCode") == 'default') or (request.form.get("profileCode") in enrollData['profiles'])):
        abort(403)#User has no access to edit the profile

    if not Checker.checkNewProfileValidity(request.form.get("profileCode"), request.form.get("profileLastUpdated")):
        return "Error: Someone edited the profile while you were editing it, and then saved it before you could save it."
        # TODO: Create page to decide whether to overwrite or not.

    enforceDays = ""
    formEnforceDaysEntries = ['editSUN','editMON', 'editTUE', 'editWED', 'editTHU', 'editFRI', 'editSAT']
    for day, entry in enumerate(formEnforceDaysEntries):
        if request.form.get(entry):
            enforceDays += str(day)
    data = {
        "name": request.form.get("profileNameEdit"),
        "enabled": True if request.form.get("editState") else False,
        "type": request.form.get("profileType"),
        "enforceDays": enforceDays,
        "enforceTime": {
            "start": request.form.get("editTimeStart"),
            "end": request.form.get("editTimeEnd")
        },
        "blockedSites": list(set(filter(lambda url: url != "",request.form.get("blockedSitesList").split("\r\n"))))
    }

    if request.form.get("profileCode") == 'default':
        assert current_user.enrollId
        newProfileCode = ''.join(random.choice(string.ascii_lowercase) for i in range(8))
        while (os.path.isfile("./server/storage/profiles/"+newProfileCode+'.json')):
            newProfileCode = ''.join(random.choice(string.ascii_lowercase) for i in range(8))
        Setter.saveProfile(newProfileCode, data)
        enrollData["profiles"].append(newProfileCode)
        Setter.saveEnroll(current_user.enrollId, enrollData)#Update last modified
        flash("New profile created successfully!")
    else:
        Setter.saveEnroll(current_user.enrollId, enrollData)#Update last modified
        Setter.saveProfile(request.form.get("profileCode"), data);
        flash("Profile updated successfully!")

    return redirect(url_for('main.profile'))

@main.route('/profile/changeEnrollPin', methods=['POST'])
@login_required
def changeEnrollPin():
    if request.form.get('PIN'):
        assert current_user.enrollId
        Setter.setEnrollMasterPin(current_user.enrollId, request.form.get('PIN'))
        flash("Enrollment Removal PIN changed successfully!")
        return redirect(url_for('main.profile'))
    else:
        abort(400)

@main.route('/profile/removeProfile', methods=['POST'])
@login_required
def removeProfile():
    if request.form.get('profileCode') and request.form.get('profileCode') != "default":
        assert current_user.enrollId
        enrollData = Loader.loadEnrollmentRaw(current_user.enrollId)
        try:
            enrollData['profiles'].remove(request.form.get('profileCode').lower())
            Setter.saveEnroll(current_user.enrollId, enrollData)
            os.remove('./server/storage/profiles/'+request.form.get('profileCode').lower()+'.json')
            flash("Profile removed successfully!")
            return redirect(url_for('main.profile'))
        except ValueError:
            abort(400)
    else:
        abort(400)

@main.route('/profile/renameEnrollment', methods=['POST'])
@login_required
def renameEnroll():
    if request.form.get('enrollNewName'):
        assert current_user.enrollId
        enrollData = Loader.loadEnrollmentRaw(current_user.enrollId)
        enrollData["enrollName"] = request.form.get('enrollNewName')
        Setter.saveEnroll(current_user.enrollId, enrollData)
        flash("Enrollment renamed successfully!")
        return redirect(url_for('main.profile'))
    else:
        abort(400)






@main.route('/assets/<path:path>')
def send_file(path):
    return send_from_directory('assets', path)

@main.route('/api/v1/profile/<path:path>')
def sendProfile(path):
    return send_from_directory('storage/profiles', path.lower()+".json")

@main.route('/api/v1/enrollment/<path:path>')
def getEnrollment(path):
    try:
        return jsonify(Loader.loadEnrollment(path))
    except FileNotFoundError:
        abort(404)

@main.route('/api/v1/masterPin', methods=['POST'])
def verifyPinV2():
    try:
        if request.headers.get('PIN') == Loader.getEnrollMasterPin(request.headers.get('enrollCode')):
            return send_from_directory('storage','MagicPacket1.bin')
        else:
            abort(404)
    except AttributeError:
        #Server cannot find enrollment.
        #This should not happen but if this does somehow happen, student can enter master pin to remove profile.
        if request.headers.get('PIN') == os.environ["MASTER_PIN"]:
            return send_from_directory('storage','MagicPacket1.bin')
        else:
            abort(404)


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

@main.route('/api/v0/masterPin', methods=['GET'])
def nothing():
    abort(404)
