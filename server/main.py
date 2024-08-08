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

@main.route('/profile')
@login_required
def profile():
    classId = current_user.classId
    with open("./server/class/"+classId+".json") as f:
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

    with open("./server/class/"+classId+'.json', 'w', encoding='utf8') as outfile:
      outfile.write(json.dumps(data,indent=4))
      outfile.close()

    flash("Profile updated successfully!")

    return redirect(url_for('main.profile'))





@main.route('/assets/<path:path>')
def send_file(path):
    return send_from_directory('assets', path)

@main.route('/api/v0/getClass/<path:path>')
def getClass(path):
    return send_from_directory('class', path+".json")

@main.route('/api/v0/findClass/<path:path>')
def findClass(path):
    classId = path
    try:
        with open("./server/class/"+classId+".json") as f:
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


#code from past project
'''class Encryptor:
    def save(dictionary,file):
        """
        Saves a dictionary of data as an encrypted JSON file.
        It can also be used overwrite existing JSON files.
        Returns the file variable
        """
        # Serializing json
        data = json.dumps(dictionary, indent=4)
        #Converting to Encrypted
        encrypted = fernet.encrypt(bytes(data,'UTF-8'))
        #Open File
        with open(file, 'wb') as encrypted_file:
            #Write to file
            encrypted_file.write(encrypted)
            #close file
            encrypted_file.close()
        return file

    def read(file):
        """
        Opens an encrypted JSON file and reads it.
        Returns a dictionary from the JSON
        """
        #Open file
        with open(file, 'rb') as enc_file:
            #Read file
            encrypted = enc_file.read()
            #Close file
            enc_file.close()
        #Convert string to a dictionary and return
        return json.loads(fernet.decrypt(encrypted))

    def getPoints(file):
        return Encryptor.read(file)["Points"]

    def getName(file):
        return Encryptor.read(file)["name"]

@main.route('/scan')
def a():
    return render_template('UPC_AScanner.html')

@main.route('/card/<path:path>')
def sendPoints(path):
    try:
        cardPath = './cards/'+path+".json"
        name = Encryptor.getName(cardPath)
        points = Encryptor.getPoints(cardPath)
        return render_template('points.html',name=name, points=points)
    except FileNotFoundError:
        return "Card not found!"

@main.route('/getcard/<path:path>')
@login_required
def sendCard(path):
    try:
        return Encryptor.read('./cards/'+path+".json")
    except FileNotFoundError:
        return "Card not found!"

@main.route('/EditCard/<path:path>/addCard/', methods=['POST'])
@login_required
def updateCard(path):
    print(path)
    points = request.form.get('points')
    flash('Added '+str(points)+' points to card')
    return redirect('/EditCard/'+path)

@main.route('/EditCard/<path:path>')
@login_required
def sendEditPage(path):
    try:
        cardPath = './cards/'+path+".json"
        name = Encryptor.getName(cardPath)
        points = Encryptor.getPoints(cardPath)
        return render_template('cardEdit.html',name=name, points=points)
    except FileNotFoundError:
        return "Card not found!"
@main.route('/slider')
@login_required
def test():
    return render_template('Slider.html')
'''
