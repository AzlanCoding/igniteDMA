import json, datetime, os
from .models import EnrollData
from . import db

def setUpJsonDb():
    os.makedirs("./server/storage/profiles/", exist_ok=True)
    os.makedirs("./server/storage/schools/", exist_ok=True)
    os.makedirs("./server/storage/cache/", exist_ok=True)
    for f in os.listdir("./server/storage/cache/"):
        os.remove(os.path.join("./server/storage/cache/", f))


class Cache():
    """Caching System"""
    def getFromCache(file):
        if os.isfile("./server/storage/cache/"+file+".json"):
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


class Loader():
    """Functions to load diffrent profiles/enroll data"""
    def loadProfile(profileCode):
        with open('./server/storage/profiles/'+profileCode.lower()+'.json', 'r') as f:
            data = json.load(f)
            f.close()
            return data

    def loadEnrollment(enrollCode):
        cachedFile = Cache.getFromCache('school'+enrollCode.lower())
        if cachedFile:
            return cachedFile
        with open('./server/storage/schools/'+enrollCode.lower()+'.json', 'r') as f:
            base = json.load(f)
            f.close()
            profileData = {}
            for profileCode in base["profiles"]:
                profileData.update({profileCode:Loader.loadProfile(profileCode)})
            base["profiles"] = profileData
            setCache('school'+enrollCode.lower(),base)
            return base

    def loadEnrollmentRaw(enrollCode):
        with open('./server/storage/schools/'+enrollCode.lower()+'.json', 'r') as f:
            data = json.load(f)
            f.close()
            return data

    def getEnrollMasterPin(enrollCode):
        return EnrollData.query.get(enrollCode.lower()).masterPin

class Setter():
    """Functions to Modify profiles/enrollData"""
    def __setData(file, data):
        with open('./server/storage/'+file+'.json', 'w', encoding='utf8') as f:
            f.write(json.dumps(data,indent=4))
            f.close()

    def saveProfile(profileCode, data):
        data["lastUpdated"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
        Setter.__setData("profiles/"+profileCode.lower(), data)

    def saveEnroll(enrollCode, data):
        data["lastUpdated"] = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
        Setter.__setData("schools/"+enrollCode.lower(), data)

    def setEnrollMasterPin(enrollCode, newPin):
        EnrollData.query.get(enrollCode.lower()).masterPin = newPin
        db.session.commit()

class Checker():
    def checkNewProfileValidity(profileCode, lastUpdated):
        return Loader.loadProfile(profileCode)["lastUpdated"] == int(lastUpdated)
