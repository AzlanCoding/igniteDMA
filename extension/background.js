let updateHost = "https://ignitedma.mooo.com"//Production Server
//let updateHost = "http://127.0.0.1"//Development Server


function setBlockedSites(data){
  let d = new Date();
  let secondsNowSince2400 = ((d.getHours()*3600) + (d.getMinutes()*60));
  let secondsStartSince2400 = ((data.startHour*3600) + (data.startMin*60));
  let secondsEndSince2400 = ((data.endHour*3600) + (data.endMin*60));
  if ((data.enforceDays.includes(d.getDay())) && ((secondsStartSince2400 <= secondsNowSince2400) && (secondsEndSince2400 > secondsNowSince2400))){
    chrome.storage.sync.set({"blockedSites": data.blockedSites }).then(() => {
      console.log("blockedSites is set");
      let newrules = data.blockedSites.map((site, index) => ({
        id: index + 1,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: site, resourceTypes: ["main_frame", "sub_frame"] }
      }));
      //The code below requires the setting "site access" to be set to "on all sites".
      //The setting "site access" is usually set to "on all sites" by default.
      //Thus, if students change it, the webfilter will not work.
      //Therefore, it is not implemented yet.
      /*let newrules = data.blockedSites.map((site, index) => ({
        id: index + 1,
        priority: 1,
        action: { type: "redirect", "redirect": { "url": encodeURI(chrome.runtime.getURL("blocked.html")+"?profile="+data.className+"&site="+site) } },
        condition: { urlFilter: site, resourceTypes: ["main_frame", "sub_frame"] }
      }));*/
      chrome.declarativeNetRequest.getDynamicRules((oldRules) => {
        const oldRuleIds = oldRules.map(rule => rule.id);
        console.log(oldRuleIds);
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: oldRuleIds,
          addRules: newrules
        });
      });
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
    data.lastUpdateReceive = new Date().getTime();
    data.lastUpdateFetch = new Date().getTime();
    //lastUpdateReceive is the last time the extension updated the profile.
    //lastUpdateFetch is the last time the extension checked for updates on the profile.
    let save = new Object();
    save["class"+classId] = data;
    chrome.storage.sync.set(save).then(() => {
      console.log("Class "+classId+" is updated");
    });
  });
}


function checkUpdate(classId){
  console.log("get Updates");
  return fetch(updateHost+"/api/v0/findClass/"+classId, {cache: "no-cache"}).then(x => x.json()).then((data) => {
    let classKey = "class"+classId;
    chrome.storage.sync.get([classKey]).then((result) => {
      if ((data.forceUpdateNow) || (data.lastUpdated > result["class"+classId].lastUpdateReceive)){
        getUpdates(classId);
      }
      else{
        result["class"+classId].lastUpdateFetch = new Date().getTime();
        chrome.storage.sync.set(result);
      }
    }).catch((err) => {
      getUpdates(classId);
      console.error("ERROR: "+err)
    });
  });
}

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




setInterval(syncProfiles, 30000);
//This ^^^ needs to be on top of the other function so that if the first fetch
//to contact the server fails, system will continue to try to contact the server
syncProfiles();
