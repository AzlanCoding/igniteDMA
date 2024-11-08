import os, datetime, json
now = int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000)
for file in os.listdir("./server/storage/cache/roomData"):
    with open("./server/storage/cache/roomData/"+file, 'r') as f:
        data = json.load(f)
        #remove file if older than 2 mins
        os.remove("./server/storage/cache/roomData/"+file) if ((data['creationTime']+120000) < now) else None
