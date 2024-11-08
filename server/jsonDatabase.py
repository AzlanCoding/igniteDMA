import json, datetime, os
#from .models import EnrollData
from . import db

def setUpJsonDb():
    assert os.path.isdir("./server/storage/schools/default"), "Unable to locate default school folder"
    os.makedirs("./server/storage/schools/default/students", exist_ok=True)
    os.makedirs("./server/storage/schools/default/teachers", exist_ok=True)
    os.makedirs("./server/storage/schools/default/classes", exist_ok=True)
    #os.makedirs("./server/storage/profiles/", exist_ok=True)
    #os.makedirs("./server/storage/schools/", exist_ok=True)
    os.makedirs("./server/storage/cache/", exist_ok=True)
    for f in os.listdir("./server/storage/cache/"):
        os.remove(os.path.join("./server/storage/cache/", f)) if f != "roomData" else None


class Cache():
    """Caching System"""
    def getFromCache(file):
        if os.path.isfile("./server/storage/cache/"+file+".json"):
            with open("./server/storage/cache/"+file+".json", 'r') as f:
                data = json.load(f)
                f.close()
                return data
        else:
            return None

    def setCache(file, data):
        with open("./server/storage/cache/"+file+".json", 'w', encoding='utf8') as f:
            f.write(json.dumps(data))
            f.close()

    def invalidateCache(file):
        try:
            os.remove("./server/storage/cache/"+file+".json")
        except FileNotFoundError:
            pass


class Loader():
    """Functions to load diffrent profiles/enroll data"""
    def loadProfile(enrollCode, profileCode):
        with open('./server/storage/schools/'+enrollCode.lower()+'/profiles/'+profileCode.lower()+'.json', 'r') as f:
            data = json.load(f)
            f.close()
            return data

    def loadClass(enrollCode, classCode):
        with open('./server/storage/schools/'+enrollCode.lower()+'/classes/'+classCode.lower()+'.json', 'r') as f:
            data = json.load(f)
            f.close()
            return data

    def loadTeacher(enrollCode, username):
        with open('./server/storage/schools/'+enrollCode.lower()+'/teachers/'+username.lower()+'.json', 'r') as f:
            data = json.load(f)
            f.close()
            return data

    def loadEnrollment(enrollCode):
        cachedFile = Cache.getFromCache('school'+enrollCode.lower())
        if cachedFile:
            return cachedFile
        enrollDir = './server/storage/schools/'+enrollCode.lower()
        with open(enrollDir+'/public.json', 'r') as f:
            base = json.load(f)
            f.close()
            base["profiles"] = {}
            for profile in os.listdir(enrollDir+'/profiles/'):
                profileCode = profile[:-5]#Remove ".json"
                base["profiles"].update({profileCode: Loader.loadProfile(enrollCode, profileCode)})
            Cache.setCache('school'+enrollCode.lower(),base)
            return base

    def loadEnrollmentRaw(enrollCode):
        with open('./server/storage/schools/'+enrollCode.lower()+'/public.json', 'r') as f:
            data = json.load(f)
            f.close()
            return data

    def loadEnrollmentPriv(enrollCode, privOnly=False):
        if privOnly:
            enrollDir = './server/storage/schools/'+enrollCode.lower()
            with open(enrollDir+'/private.json', 'r') as f:
                privData = json.load(f)
                f.close()
                return privData
        else:
            base = Loader.loadEnrollment(enrollCode)
            enrollDir = './server/storage/schools/'+enrollCode.lower()
            with open(enrollDir+'/private.json', 'r') as f:
                privData = base | json.load(f)
                f.close()
                return privData

    def loadStudent(enrollCode, email):
        enrollDir = './server/storage/schools/'+enrollCode.lower()
        if os.path.isFile(enrollDir+'/students/'+email.lower()+'.json'):
            with open(enrollDir+'/students/'+email.lower()+'.json', 'r') as f:
                data = json.load(f)
                f.close()
                classDatas = {}
                removeClasses = []
                for classCode in data['classes']:
                    try:
                        classData = Loader.loadClass(enrollCode, classCode)
                        if email in classData['students']:
                            classDatas.update({classCode: classData})
                        else:
                            raise ValueError
                    except (FileNotFoundError, ValueError):
                        removeClasses.append(classCode)
                if len(removeClass) > 0:
                    for classCode in removeClasses:
                        data['classes'].remove(classCode)
                    Setter.saveStudent(enrollCode, email, data)
                data['classes'] = classDatas
                return data
        else:
            if os.path.isdir(enrollDir):
                if Loader.loadEnrollmentPriv(enrollCode, privOnly=True)['autoAddStudents']:
                    Setter.saveStudent(enrollCode, email, {'classes': [], 'canRemove': False})
                    return Loader.loadStudent(enrollCode, email)
                else:
                    return None
            else:
                return None

    def loadStudentRaw(enrollCode, email):
        enrollDir = './server/storage/schools/'+enrollCode.lower()
        if os.path.isFile(enrollDir+'/students/'+email.lower()+'.json'):
            with open(enrollDir+'/students/'+email.lower()+'.json', 'r') as f:
                data = json.load(f)
                f.close()
                return data
        else:
            if os.path.isdir(enrollDir):
                if Loader.loadEnrollmentPriv(enrollCode, privOnly=True)['autoAddStudents']:
                    Setter.saveStudent(enrollCode, email, {'classes': [], 'canRemove': False})
                    return Loader.loadStudent(enrollCode, email)
                else:
                    return None
            else:
                return None

    #def getEnrollMasterPin(enrollCode):
    #    return EnrollData.query.get(enrollCode.lower()).masterPin

class Setter():
    """Functions to Modify profiles/enrollData"""
    def __setData(enrollCode, file, data):
        with open('./server/storage/schools/'+enrollCode+'/'+file+'.json', 'w', encoding='utf8') as f:
            f.write(json.dumps(data,indent=4))
            f.close()

    def saveProfile(enrollCode, profileCode, data):
        data["lastModified"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
        Setter.__setData(enrollCode, "profiles/"+profileCode.lower(), data)

    def saveEnroll(enrollCode, data, isUserModified=True):
        data["lastUpdated"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
        if isUserModified:
            data["lastModified"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
        Setter.__setData(enrollCode, "public", data)
        Cache.invalidateCache('school'+enrollCode.lower())

    def updateEnrollLastMod(enrollCode):
        Setter.saveEnroll(enrollCode, Loader.loadEnrollmentRaw(enrollCode))

    def saveEnrollPriv(enrollCode, data):
        Setter.__setData(enrollCode, "private", data)
        Setter.updateEnrollLastMod(enrollCode)#Invalidate Cache + Change Last modified
        #EnrollData.query.get(enrollCode.lower()).masterPin = newPin
        #db.session.commit()
    def saveStudent(enrollCode, email, data):
        data["lastModified"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
        Setter.__setData(enrollCode, "students/"+email.lower(), data)

    def updateStudentLastMod(enrollCode, email):
        Setter.saveStudent(enrollCode, email, Loader.loadStudentRaw(enrollCode, email))

    def saveClass(enrollCode, classCode, data):
        data["lastModified"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
        Setter.__setData(enrollCode, "classes/"+email.lower(), data)

    def saveTeacher(enrollCode, username, data):
        data["lastModified"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
        Setter.__setData(enrollCode, "teachers/"+username.lower(), data)

class Checker():
    def checkNewProfileValidity(enrollCode, profileCode, lastUpdated):
        return Loader.loadProfile(enrollCode, profileCode)["lastModified"] == int(lastUpdated)
