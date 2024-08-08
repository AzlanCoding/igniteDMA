let updateHost = "http://ignitedma.mooo.com"//Production Server
//let updateHost = "http://127.0.0.1"//Development Server


function setBlockedSites(data){
  let d = new Date();
  let secondsNowSince2400 = ((d.getHours()*3600) + (d.getMinutes()*60));
  let secondsStartSince2400 = ((data.startHour*3600) + (data.startMin*60));
  let secondsEndSince2400 = ((data.endHour*3600) + (data.endMin*60));
  if ((data.enforceDays.includes(d.getDay())) && ((secondsStartSince2400 <= secondsNowSince2400) && (secondsEndSince2400 > secondsNowSince2400))){
    chrome.storage.sync.set({"blockedSites": data.blockedSites }).then(() => {
      console.log("blockedSites is set");
    });
    return true;
  }
  else{
    console.log("class "+data.className+" is not active.");
    return false;
  }
}

function getUpdates(classId){
  return fetch(updateHost+"/api/v0/getClass/"+classId, {cache: "no-cache"}).then(x => x.json()).then((data) => {
    data.lastUpdateFetch = new Date().getTime();
    let save = new Object();
    save["class"+classId] = data;
    chrome.storage.sync.set(save).then(() => {
      console.log("Class "+classId+" is updated");
      //setBlockedSites(data);
      //syncProfiles();
    });
  });
}


function checkUpdate(classId){
  console.log("get Updates");
  fetch(updateHost+"/api/v0/findClass/"+classId, {cache: "no-cache"}).then(x => x.json()).then((data) => {
    let classKey = "class"+classId;
    chrome.storage.sync.get([classKey]).then((result) => {
      console.dir(result);
      if ((data.forceUpdateNow) || (data.lastUpdated > result["class"+classId].lastUpdateFetch)){
        getUpdates(classId);
      }
    }).catch((err) => {
      getUpdates(classId);
      console.log("ERROR: "+err)
    });
  });
}

/*function updateInterval(){
  chrome.storage.sync.get(["activeClassId"]).then((result) => {
    console.log("classId is " + result.activeClassId);
    if (result.activeClassId != null){
      checkUpdate(result.activeClassId);
    }
    else {
      console.log("waiting for registration");
    }
  });
}*/


function syncProfiles(){
  chrome.storage.sync.get().then((result) => {
    let classList = Object.keys(result)
      .filter(key => key.startsWith('class'))
      .reduce((obj, key) => {
        let newKey = key.replace(/^class/, '')
        obj[newKey] = result[key];
        return obj;
      }, {});
    console.dir(classList);
    let hasActiveProfile = false;
    Object.entries(classList).forEach(([classId, data]) => {
      console.log("Checking class "+classId);
      checkUpdate(classId);
      if (setBlockedSites(data)){
        hasActiveProfile = true;
        chrome.storage.sync.set({"activeClassId": classId});
      }
      //// TODO: Handle time colliding profiles/classes
    });
    if (!hasActiveProfile){
      chrome.storage.sync.set({"blockedSites": []});
    }
  });
}

export function addClass(className){
  return getUpdates(className);
}

export function removeClass(className){
  return chrome.storage.sync.remove(className);
}

export function getUpdateHost(){
  return updateHost;
}



/*chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    console.dir(details);
    return {cancel: details.url.indexOf("://www.evil.com/") != -1};
  },
  {urls: ["<all_urls>"]},
  ["blocking"]
);*/








//setInterval(updateInterval, 5000)
syncProfiles();
setInterval(syncProfiles, 5000);
