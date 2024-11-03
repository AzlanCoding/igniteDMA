from flask import Blueprint, render_template, send_from_directory, request, redirect, flash, jsonify, abort, url_for
from flask_login import login_required, current_user
from threading import Lock
from dotenv import load_dotenv
import json, datetime, os, random, string
from .jsonDatabase import Loader, Setter, Checker, setUpJsonDb
from . import db

setUpJsonDb()
os.makedirs("./server/storage/cache/roomData", exist_ok=True)


main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/assets/<path:path>')
def send_file(path):
    return send_from_directory('assets', path)

@main.route('/profile')
@login_required
def profile():
    #enrollId = current_user.enrollId
    #data = Loader.loadEnrollment(enrollId)
    #data['removalPin'] = Loader.getEnrollMasterPin(enrollId)
    #return render_template('profile.html', data=json.dumps(data))
    return render_template('profile.html', data=json.dumps(Loader.loadEnrollmentPriv(current_user.enrollId)))


@main.route('/profile/updateProfile', methods=['POST'])
@login_required
def profile_post():
    # NOTE: formEntries also includes 'editState', but it can be None.
    formEntries = ['profileCode','profileLastModified','profileNameEdit','profileType','editTimeStart','editTimeEnd','blockedSitesList']
    for entry in formEntries:
        if request.form.get(entry) == None:
            abort(400)#Insufficient form data
            return

    enrollData = Loader.loadEnrollmentRaw(current_user.enrollId)
    if not ((request.form.get("profileCode") == 'default') or (os.path.isfile("./server/storage/schools/"+current_user.enrollId+"/profiles/"+request.form.get("profileCode")+".json"))):
        abort(403)#User has no access to edit the profile
        return

    if ((request.form.get("profileCode") != 'default') and (not (Checker.checkNewProfileValidity(current_user.enrollId, request.form.get("profileCode"), request.form.get("profileLastModified"))))):
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
        #newProfileCode = ''.join(random.choice(string.ascii_lowercase) for i in range(8))
        #while (os.path.isfile("./server/storage/profiles/"+newProfileCode+'.json')):
        #    newProfileCode = ''.join(random.choice(string.ascii_lowercase) for i in range(8))
        profilesDir = "./server/storage/schools/"+current_user.enrollId+"/profiles/"
        newProfileCode = ''.join(random.choice(string.ascii_lowercase) for i in range(8))
        while (os.path.isfile(os.path.join(profilesDir, newProfileCode+'.json'))):
            newProfileCode = ''.join(random.choice(string.ascii_lowercase) for i in range(8))
        Setter.saveProfile(current_user.enrollId, newProfileCode, data)
        #enrollData["profiles"].append(newProfileCode)
        Setter.saveEnroll(current_user.enrollId, enrollData)#Update last modified
        flash("New profile created successfully!")
    else:
        Setter.saveProfile(current_user.enrollId, request.form.get("profileCode"), data);
        Setter.saveEnroll(current_user.enrollId, enrollData)#Update last modified
        flash("Profile updated successfully!")

    # NOTE: Setter.saveEnroll MUST be called anyway so that enroll cache is invalidated

    return redirect(url_for('main.profile'))

@main.route('/profile/changeEnrollPin', methods=['POST'])
@login_required
def changeEnrollPin():
    if request.form.get('PIN'):
        assert current_user.enrollId
        data = Loader.loadEnrollmentPriv(current_user.enrollId, privOnly=True)
        data["RemovalPin"] = request.form.get('PIN')
        Setter.saveEnrollPriv(current_user.enrollId, data)
        flash("Enrollment Removal PIN changed successfully!")
        return redirect(url_for('main.profile'))
    else:
        abort(400)

@main.route('/profile/removeProfile', methods=['POST'])
@login_required
def removeProfile():
    if request.form.get('profileCode') and request.form.get('profileCode') != "default":
        assert current_user.enrollId
        try:
            profilesDir = "./server/storage/schools/"+current_user.enrollId+"/profiles/"
            os.remove(profilesDir+request.form.get('profileCode')+".json")
            Setter.updateEnrollLastMod(current_user.enrollId)
            flash("Profile removed successfully!")
            return redirect(url_for('main.profile'))
        except FileNotFoundError:
            abort(400)
        #enrollData = Loader.loadEnrollmentRaw(current_user.enrollId)
        #try:
        #    enrollData['profiles'].remove(request.form.get('profileCode').lower())
        #    Setter.saveEnroll(current_user.enrollId, enrollData)
        #    os.remove('./server/storage/profiles/'+request.form.get('profileCode').lower()+'.json')
        #    flash("Profile removed successfully!")
        #    return redirect(url_for('main.profile'))
        #except ValueError:
        #    abort(400)
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

@main.route('/profile/getProfile')
@login_required
def getProfile():
    if request.headers.get("profileCode"):
        assert current_user.enrollId
        if (request.headers.get("profileCode") == 'default'):
            return send_from_directory('storage/schools/default/profiles', "default.json")
        else:
            return send_from_directory('storage/schools/'+current_user.enrollId+'/profiles', request.headers.get("profileCode").lower()+".json")
    else:
        abort(400)

#Signalling
connWriteLock = Lock()

def AddRoomData(room, dataType, newData):
    connWriteLock.acquire()
    fileName = room+".json"
    roomsDir = "./server/storage/cache/roomData/"
    if not os.path.isfile(roomsDir+fileName):
        data = {'offer':None, 'answer': None, 'hostICE': [], 'remoteICE': [], 'hostAttempt': 1, 'clientAttempt': 1, 'creationTime': str(datetime.datetime.now())}
    else:
        with open(roomsDir+fileName, "r") as f:
            data = json.load(f)
            f.close()
    if 'ICE' in dataType:
        data[dataType].append(newData)
    elif 'Attempt' in dataType:
        data[dataType] += 1
    else:
        data[dataType] = newData
    with open(roomsDir+fileName, 'w') as f2:
        #f2.write(json.dumps(data))
        json.dump(data, f2)
        f2.close()
        connWriteLock.release()
        return data


def GetRoomData(room):
    fileName = room+".json"
    roomsDir = "./server/storage/cache/roomData/"
    with open(roomsDir+fileName, "r") as f:
        data = json.load(f)
        f.close()
        return data


@main.route('/api/v2/signaling/newConn')
#@login_required
def newConn():
    if request.headers.get("SDP"):
        sdp = request.headers.get("SDP")
        room = ''.join(random.choice(string.digits) for i in range(10))
        while (os.path.isfile("./server/storage/cache/roomData/"+room+'.json')):
            room =  ''.join(random.choice(string.digits) for i in range(10))
        AddRoomData(room, "offer", sdp)
        return room
    else:
        abort(400)

@main.route('/api/v2/signaling/Conn/<path:path>/getData')
def getData(path):
    try:
        return jsonify(GetRoomData(path))
    except FileNotFoundError:
        abort(400)

@main.route('/api/v2/signaling/Conn/<path:path>/updateData')
def updateData(path):
    if request.headers.get('dataType') and request.headers.get('data'):
        try:
            return jsonify(AddRoomData(path, request.headers.get('dataType'), request.headers.get('data')))
        except FileNotFoundError:
            abort(400)
    else:
        abort(400)

@main.route('/api/v2/signaling/Conn/<path:path>/delete')
def delConn(path):
    fileName = path+".json"
    roomsDir = "./server/storage/cache/roomData/"
    try:
        os.remove(roomsDir+fileName)
    except FileNotFoundError:
        pass
    return "", 200




#OLD API

@main.route('/api/v1/profile/<path:path>')
def sendProfile(path):
    return send_from_directory('storage/profiles', path.lower()+".json")

@main.route('/api/v1/enrollment/<path:path>')
def getEnrollment(path):
    try:
        data = Loader.loadEnrollment(path)
        if request.headers.get("lastSync") and int(request.headers.get("lastSync")) > data["lastUpdated"]:
            return "", 304 #Resource Not Modified
        else:
            return jsonify(data)
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
        #This should not happen but if this does somehow happen, student can enter backup removal pin to remove profile.
        if request.headers.get('PIN') == os.environ["BACKUP_REMOVAL_PIN"]:
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
