let updateHost = "https://ignitedma.mooo.com"//Production Server
//let updateHost = "http://127.0.0.1"//Development Server


function checkProfileActive(data){
  let d = new Date();
  let secondsNowSince2400 = ((d.getHours()*3600) + (d.getMinutes()*60));
  let secondsStartSince2400 = ((data.startHour*3600) + (data.startMin*60));
  let secondsEndSince2400 = ((data.endHour*3600) + (data.endMin*60));
  return ((data.enforceDays.includes(d.getDay())) && ((secondsStartSince2400 <= secondsNowSince2400) && (secondsEndSince2400 > secondsNowSince2400)))
}

function setBlockedSitesData(data){
  return chrome.storage.sync.set({"blockedSites": data.blockedSites }).then(() => {
    //The code below requires the setting "site access" to be set to "on all sites".
    //The setting "site access" is usually set to "on all sites" by default.
    //So, if students change it, the webfilter will not work.
    //Therefore, tabs checking must be implemented.
    let newrules = data.blockedSites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: "redirect", "redirect": { "url": encodeURI(chrome.runtime.getURL("blocked.html")+"?profile="+data.className+"&site="+site) } },
      condition: { urlFilter: site, resourceTypes: ["main_frame", "sub_frame"] }
    }));
    /*let newrules2 = data.blockedSites.map((site, index) => ({
      id: index + 1 + newrules.length,
      priority: 2,
      action: { type: "block" },
      condition: { urlFilter: site, resourceTypes: ["main_frame", "sub_frame"] }
    }));
    newrules.concat(newrules2);*/
    chrome.declarativeNetRequest.getDynamicRules((oldRules) => {
      const oldRuleIds = oldRules.map(rule => rule.id);
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: newrules
      });
    });
  });
}

function setBlockedSites(){
  return getClasses().then((classList) => {
    let hasActiveProfile = false;
    let promises = [];
    Object.entries(classList).forEach(([classId, data]) => {
      if (checkProfileActive(data)){
        hasActiveProfile = true;
        promises.push(setBlockedSitesData(data));
      }
      else{
        console.log("class "+data.className+" is not active.");
      }
    });
    if (!hasActiveProfile){
      //clear blockedSites
      chrome.storage.sync.set({"blockedSites": []});
      chrome.declarativeNetRequest.getDynamicRules((oldRules) => {
        const oldRuleIds = oldRules.map(rule => rule.id);
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: oldRuleIds,
          addRules: []
        });
      });
    }
    return Promise.all(promises);
  });
}

function getUpdates(classId){
  return fetch(updateHost+"/api/v0/getClass/"+classId, {cache: "no-cache"}).then(x => x.json()).then((data) => {
    data.lastUpdateReceive = new Date().getTime();
    data.lastUpdateFetch = new Date().getTime();
    //lastUpdateReceive is the last time the extension updated the profile.
    //lastUpdateFetch is the last time the extension checked for updates on the profile.
    let save = new Object();
    save["class"+classId] = data;
    return chrome.storage.sync.set(save).then(() => {
      console.log("Class "+classId+" is updated");
    });
  });
}


function checkUpdate(classId){
  let classKey = "class"+classId;
  return chrome.storage.sync.get([classKey]).then((result) => {
    return fetch(updateHost+"/api/v0/findClass/"+classId, {cache: "no-cache"}).then((response) => {
      if (response.ok){
        return response.json();
      }
      else if (response.status == 404){
        throw new Error("Cannot find profile!\nPlease press the `Delete Profile` button.\nStatus code: "+response.status);
        //// TODO: Make popup to decide whether to remove profile
      }
      else {
        throw new Error("ok something just went like REALLY WRONG. Status Code: " + response.status);
        //// TODO: Show this image: https://http.cat/500.jpg
      }
    }).then((data) => {
      if ((data.forceUpdateNow) || (data.lastUpdated > result["class"+classId].lastUpdateReceive)){
        return getUpdates(classId);
      }
      else{
        result["class"+classId].lastUpdateFetch = new Date().getTime();
        return chrome.storage.sync.set(result);
      }
    }).then(() => {setBlockedSites()});
  });
}

function getClasses(){
  return chrome.storage.sync.get().then((result) => {
    return Object.keys(result)
      .filter(key => key.startsWith('class'))
      .reduce((obj, key) => {
        let newKey = key.replace(/^class/, '')
        obj[newKey] = result[key];
        return obj;
      }, {});
  });
}

function syncProfiles(){
  return getClasses().then((classList) => {
    let promises = Object.entries(classList).map(([classId, data]) => {
      return checkUpdate(classId);
      //// TODO: Handle time colliding profiles/classes
      ////       Not implemented yet: multiple profiles
    });
    return Promise.all(promises);
  }).then(setBlockedSites);
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

export function syncNow(){
  return syncProfiles();
}


/*chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === 'syncProfiles') {
    syncProfiles().then(() => {sendResponse()});
    return true;
  }
});*/




setInterval(syncProfiles, 30000);
//This ^^^ needs to be on top of the other function so that if the first fetch
//to contact the server fails, system will continue to try to contact the server
syncProfiles();
