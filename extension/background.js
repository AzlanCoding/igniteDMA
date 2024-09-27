let updateHost = "https://ignitedma.mooo.com"//Production Server
//let updateHost = "http://127.0.0.1"//Development Server

let useLegacyBlocking = false;
let activeBlockedSites;//Will be an Map but currently null
let activeProfiles;//Will be an Map but currently null
//set as null so that areMapsEqual will return false
//Forces enforceBlockedSites to run on startup.
//// TODO: migrate activeProfiles to chrome.storage.session

/*---Catagory 1 Utilities---*/
function areMapsEqual(map1, map2) {
  if (map1 == null || map2 == null){
    return false;
  }
  else if (map1.size !== map2.size) {
    return false;
  }
  for (let [key, value] of map1) {
    if (!map2.has(key) || map2.get(key) !== value) {
      return false;
    }
  }
  return true;
}

/*---Catagory 2 Utilities---*/
function checkProfileActive(data){
  console.dir(data);
  let enforceDays = data.enforceDays
  let [startHour, startMin] = data.enforceTime.start.split(":");
  let [endHour, endMin] = data.enforceTime.end.split(":");
  let d = new Date();
  if (enforceDays.includes(d.getDay())){
    if (data.enforceTime.start == data.enforceTime.end){
      return true;
    }
    let secondsNowSince2400 = ((d.getHours()*3600) + (d.getMinutes()*60));
    let secondsStartSince2400 = ((startHour*3600) + (startMin*60));
    let secondsEndSince2400 = ((endHour*3600) + (endMin*60));
    if (secondsStartSince2400 >= secondsEndSince2400){
      secondsEndSince2400 += 86400;//Overnight profile. Add 24hrs
    }
    return ((secondsStartSince2400 <= secondsNowSince2400) && (secondsEndSince2400 > secondsNowSince2400))
  }
  else {
    return false
  }
}
function filterProfileTypes(data, filter){
  if (filter == undefined){
    filter = "";
  }
  return Object.keys(data).reduce(function(accumulator, currentProfile) {
    if (data[currentProfile].type.includes(filter) && data[currentProfile].enabled == true){
      accumulator[currentProfile] = data[currentProfile]
    }
    return accumulator;
  }, {});
}
function checkSafeUrl(url){
  //Checks if the URL given is not the update host of the extension
  return !(url == "com" || url == ".com" || url == "mooo.com" || url == ".mooo.com" || url == "ignitedma.mooo.com")
}

/*---Catagory 3 Utilities---*/
function getClasses(type){// TODO: Rename to getProfiles
  // TODO: Set profile type
  return chrome.storage.sync.get("enrollData").then((result) => {
    return (result.enrollData ? filterProfileTypes(result.enrollData.profiles, type) : {});
  });
}
function setBlockedSites(){
  console.log("checking blocked sites changes");
  return getClasses("webfilterV1").then((classList) => {
    let blockedSitesCache = new Map();
    let activeProfilesCache = new Map();
    Object.entries(classList).forEach(([classId, data]) => {
      if (checkProfileActive(data)){
        activeProfilesCache.set(classId, data.name);
        data.blockedSites.forEach((site) => {
          blockedSitesCache.set(site, data.name)
          /*if (checkSafeUrl(site)){
          }
          else{
            console.warn("Skipping "+site+" as it is an unsafe URL.")
          }*/
        });
      }
      else{
        console.log("profile "+data.name+" is not active.");
      }
    });
    if (!areMapsEqual(activeProfilesCache, activeProfiles)){
      activeProfiles = activeProfilesCache;
    }
    if (!areMapsEqual(blockedSitesCache,activeBlockedSites)){
      console.log("activeBlockedSites Set!")
      activeBlockedSites = blockedSitesCache;
      return enforceBlockedSites(blockedSitesCache);
    }
  });
}
function syncProfiles(){// TODO: Rename to syncEnrollment
  return chrome.storage.sync.get("enrollData").then((result) => {
    if (result.enrollData){
      return updateEnrollData(result.enrollData.enrollCode)
    }
    /*else {
      throw new Error("No enrollData to start sync!")
    }*/
  }).then(setBlockedSites);
}
function setBlockedSitesLoop(){
  return setBlockedSites().then(() => {
    let now = new Date();
    let delay = (61 - now.getSeconds()) * 1000;//Runs every minute + 1 second delay just in case
    return setTimeout(setBlockedSitesLoop,delay)
  });
}

/*---Catagory 4 Utilities---*/
function enforceBlockedSites(data){
  console.log("Enforcing new blockedSites");
  let blockedSites = Array.from(data.keys());
  if (blockedSites.length == 0){
    //Remove all rules
    return chrome.declarativeNetRequest.getDynamicRules((oldRules) => {
      const oldRuleIds = oldRules.map(rule => rule.id);
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: []
      });
    });
  }
  else{
    //The code below requires the setting "site access" to be set to "on all sites".
    //The setting "site access" is usually set to "on all sites" by default.
    //So, if students change it, the webfilter will not work.
    //Therefore, legacyBlocking is used when this setting is not avaliable.
    // NOTE: priority set to 2 for future whiteLists
    let newrules;
    if (useLegacyBlocking){
      newrules = blockedSites.reduce((accumulator, site, index) => {
        if (index == 1){
          accumulator = new Array();
        }
        if(checkSafeUrl(site)){
          accumulator.push({
            id: index + 1,
            priority: 2,
            action: { type: "block" },
            condition: { urlFilter: "||"+site+"/", resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"] }
          })
        }
        else {
          console.warn("Ignoring site "+site+" as it is not safe.");
        }
        return accumulator
      });
    }
    else{
      newrules = blockedSites.reduce((accumulator, site, index) => {
        if (index == 1){
          accumulator = new Array();
        }
        if(checkSafeUrl(site)){
          accumulator.push({
              id: index,
              priority: 2,
              action: { type: "redirect", "redirect": { "url": (chrome.runtime.getURL("blocked.html")+"?profile="+encodeURI(data.get(site))+"&site="+encodeURI(site)) } },
              condition: { urlFilter: "||"+site+"/", resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"] }
            });
        }
        else {
          console.warn("Ignoring site "+site+" as it is not safe.");
        }
        return accumulator;
      });
    }
    chrome.declarativeNetRequest.getDynamicRules((oldRules) => {
      const oldRuleIds = oldRules.map(rule => rule.id);
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: newrules
      });
    });
    //Check for tabs open for any blocked sites
    return chrome.tabs.query({}, (tabs) => {
      let promises = tabs.map(tab => {
        return chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true},
          func: (data) => {
            console.log("Checking: "+window.location.href);
            let blocked = false;
            Object.keys(data).forEach((site,i) => {
              if (!blocked && window.location.href.includes(site) && !window.location.href.startsWith(chrome.runtime.getURL("blocked.html"))){
                let blockedPageUrl = (chrome.runtime.getURL("blocked.html")+"?profile="+encodeURI(data[site])+"&site="+encodeURI(site)+"&fullURL="+encodeURI(window.location.href));
                window.onbeforeunload = null;// TODO: Warn user first
                window.location.href = blockedPageUrl;
                blocked = true;
              }
            });
          },
          args: [Object.fromEntries(data)]//It won't work if I send a map and idk why
        }).catch((err) => {
          if (err.message && err.message.includes("Cannot access")){
            // NOTE: if no fileAccessScheme permission, `file://` URLs cannot scan
            if (tab.url.startsWith("file://")){
              chrome.tabs.remove(tab.id)
            }
            else{
              console.log("Skipping inaccesible webpage\n"+err.message);
            }
          }
          else{
            console.error("Failed to inject script into tab");
          }
        });
      });
      return Promise.all(promises);
    });
  }
}
function updateEnrollData(enrollCode){
  return chrome.storage.sync.get("enrollData").then((result) => {
    return fetch(updateHost+"/api/v1/enrollment/"+enrollCode.toLowerCase(), {cache: "no-cache"}).then((response) => {
      if (response.ok){
        return response.json();
      }
      else if (response.status == 404){
        throw new Error("Cannot find profile!\nPlease press the `Delete Profile` button.<br>Status code: "+response.status);
        //// TODO: Make popup to decide whether to remove profile
      }
      else {
        throw new Error("ok something just went like REALLY WRONG.<br>Status Code: " + response.status);
      }
    }).then((data) => {
      /*if ((!result.enrollData) || (data.lastUpdated > result.enrollData.lastUpdateFetch)){
        data.lastSync = new Date().getTime();
        data.lastUpdateFetch = new Date().getTime();
        let save = new Object();
        save.enrollData = data;
        return chrome.storage.sync.set(save);
      }
      else{
        result.enrollData.lastSync = new Date().getTime();
        return chrome.storage.sync.set(result);
      }*/
      data.lastSync = new Date().getTime();
      //data.lastUpdateFetch = new Date().getTime();
      let save = new Object();
      save.enrollData = data;
      return chrome.storage.sync.set(save);
    }).catch((e) => {
      if (e.message.includes("Failed to fetch")){
        throw new Error("Unable to contact server");
      }
      else{
        throw e;
      }
    });
  });
}



/*---Blocking Window Utilities---*/
let WindowTopRuleData = {
  windowId: null,
  url: null,
  creationTime: null
};
let fileAccessSchemeExtPage = false;
function fileAccessSchemeExtPageSwitch(){
  fileAccessSchemeExtPage = true;
}
function blockingWindow(url, callback){
  console.log("blockingWindow launched");
  return chrome.windows.create({
    url: url,
    type: "popup",
    state: "fullscreen"
  }, callback);
}
function relaunchEnforceWindow(windowId) {
  let timenow = new Date().getTime();
  //Give 1 second for window to come into focus after creation
  if (WindowTopRuleData.creationTime && WindowTopRuleData.creationTime + 1000 < timenow){
    try{
      return chrome.windows.get(WindowTopRuleData.windowId, (window) => {
        if (window && !window.focused){
          chrome.windows.remove(window.id);
        }
      })
    }
    catch(err){
      //probably can't find the window
      console.log(err);
    }
  }
  else{
    return setTimeout(() => {
      relaunchEnforceWindow(windowId)
    }, 1000);
  }
}
function fulllscreenEnforceWindow(windowId){
  if (windowId === WindowTopRuleData.windowId) {
    try{
      return chrome.windows.update(windowId, { state: 'fullscreen'});
    }
    catch(err){
      //probably can't find the window
      console.log(err);
    }
  }
}
function relaunchClosedEnforceWindow(windowId) {
  if (windowId === WindowTopRuleData.windowId) {
    if (WindowTopRuleData.url == chrome.runtime.getURL("permitNeeded.html")){
      chrome.permissions.contains({"permissions": ["storage", "declarativeNetRequest", "background", "tabs", "scripting"], origins: ["<all_urls>"]}, (result) => {
        if (result) {
          removeWindowTopRule();
          if (useLegacyBlocking){
            useLegacyBlocking = false;
            return setBlockedSites();
          }
        }
        else{
          console.log("No permits, relaunching...")
          updateWindowTopRule(WindowTopRuleData.url);
        }
      });
    }
    else if (WindowTopRuleData.url == chrome.runtime.getURL("fileAccessSchemeNeeded.html") || WindowTopRuleData.url == ("chrome://extensions/?id="+chrome.runtime.id)){
      chrome.extension.isAllowedFileSchemeAccess((result) => {
        if (!result){
          if (fileAccessSchemeExtPage){
            fileAccessSchemeExtPage = false;
            updateWindowTopRule("chrome://extensions/?id="+chrome.runtime.id);
          }
          else{
            updateWindowTopRule(chrome.runtime.getURL("fileAccessSchemeNeeded.html"));
          }
        }
        else{
          removeWindowTopRule();
        }
      });
    }
    /*else{
      updateWindowTopRule(WindowTopRuleData.url);
      //blockingWindow(WindowTopRuleData.url,WindowTopRuleData.callback);
    }*/
  }
}
function updateWindowTopRule(url){
  //console.log("updateCalled");
  return blockingWindow(url, (window) => {
    WindowTopRuleData = {
      windowId: window.id,
      url: url,
      creationTime: new Date().getTime()
    };
  });
}
function setWindowTopRule(url){
  //console.log("windowSet")
  if (url != WindowTopRuleData.url){
    return blockingWindow(url, (window) => {
      /*if (WindowTopRuleData.windowId != null){
        removeWindowTopRule();
      }*/
      WindowTopRuleData = {
        windowId: window.id,
        url: url,
        creationTime: new Date().getTime()
      };
      enforceWindowTopRule();
    });
  }
  /*else{
    console.log("rule already enforcing");
  }*/
}
function enforceWindowTopRule(){
  if (WindowTopRuleData.url == chrome.runtime.getURL("fileAccessSchemeNeeded.html") || WindowTopRuleData.url == "chrome://extensions/?id="+chrome.runtime.id){
    chrome.windows.onFocusChanged.addListener(relaunchEnforceWindow);
    chrome.windows.onBoundsChanged.addListener(fulllscreenEnforceWindow);
    chrome.windows.onRemoved.addListener(relaunchClosedEnforceWindow);
  }
  else{
    chrome.windows.onBoundsChanged.addListener(fulllscreenEnforceWindow);
    chrome.windows.onRemoved.addListener(relaunchClosedEnforceWindow);
  }
}
function removeWindowTopRule(){
  //close window first?
  if (WindowTopRuleData.url == chrome.runtime.getURL("fileAccessSchemeNeeded.html") || WindowTopRuleData.url == ("chrome://extensions/?id="+chrome.runtime.id)){
    chrome.windows.onFocusChanged.removeListener(relaunchEnforceWindow);
    chrome.windows.onBoundsChanged.removeListener(fulllscreenEnforceWindow);
    chrome.windows.onRemoved.removeListener(relaunchClosedEnforceWindow);
  }
  else{
    chrome.windows.onBoundsChanged.removeListener(fulllscreenEnforceWindow);
    chrome.windows.onRemoved.removeListener(relaunchClosedEnforceWindow);
  }
  WindowTopRuleData = {
    windowId: null,
    url: null,
    creationTime: null
  };
}



/*---Permission Checking Utilities---*/
function fileAccessSchemeCheck(){
  return chrome.extension.isAllowedFileSchemeAccess((result) => {
    if(result){
      if (WindowTopRuleData.windowId != null){
        removeWindowTopRule();
      }
    }
    else if (WindowTopRuleData.windowId == null) {
      console.log("launching fileAccessScheme")
      setWindowTopRule(chrome.runtime.getURL("fileAccessSchemeNeeded.html"));
    }
  });
}
function checkPermissions() {
  return chrome.permissions.contains({"permissions": ["storage", "declarativeNetRequest", "background", "tabs", "scripting"], origins: ["<all_urls>"]}, (result) => {
    if (result) {
      if (useLegacyBlocking){
        useLegacyBlocking = false;
        return setBlockedSites();
      }
      // NOTE: IF YOU ARE GOING TO CHANGE ANYTHING HERE,
      //       MAKE SURE TO LOOK AT relaunchClosedEnforceWindow()
      //       I KNOW IT'S STUPID BUT JUST IN CASE
      fileAccessSchemeCheck();//Proceed with 2nd check
    }
    else {
      if (WindowTopRuleData.windowId == null){
        setWindowTopRule(chrome.runtime.getURL("permitNeeded.html"));
      }
      if (!useLegacyBlocking){
        useLegacyBlocking = true;
        return setBlockedSites();
      }
    }
  });
}



/*---Chrome Messaging Functions---*/
function addEnrollment(enrollCode){
  return updateEnrollData(enrollCode).then(setBlockedSites);
}
function syncNow(){
  return syncProfiles();
}
function removeEnrollment(headers){
  return fetch(updateHost+"/api/v1/masterPin",{cache: "no-cache", method:"post", headers: headers}).then((response) => {
    if (response.ok) {
      return response.blob().then((data) => {
        return verifyMagicPacket(data).then((outcome) => {
          if (outcome){
            return chrome.storage.sync.clear().then(setBlockedSites);
          }
          else{
            throw new Error("Failed to Verify Server's Identity!");
          }
        });
      });
    }
    else {
      throw new Error("Incorrect PIN");
    }
  }).catch((e) => {
    if (e.message.includes("Failed to fetch")){
      throw new Error("Unable to contact server");
    }
    else{
      throw e;
    }
  });
}

/*---Chrome Messaging Function Utilities---*/
//The function below is used to verify the main server's identity
//How it works is that when the main server receives the correct PIN
//to remove the enrollment. A secret file is sent to the client and
//the checksum of the file is measured to verify that the server
//contacted is indeed the real server.
function verifyMagicPacket(blob){
  return blob.arrayBuffer().then((dataBuffer) => {
    return crypto.subtle.digest('SHA-256', dataBuffer).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const expectedChecksum = "139531df1cac2ff1b2be3fa5afde6a904cef6583de35efe07f1ddfe6f3228da5";
      return hashHex === expectedChecksum;
    });
  });
}
function handleExternalAction(sendResponse, func, args){
  func(args).then((response) => {
    sendResponse({isErr: false, data: response});
  }).catch((e) => {
    sendResponse({isErr: true, data: e.message});
  });
}



/*---Main Startup---*/
if (typeof window == 'undefined') { //The javascript equivilant of `if __name__ == '__main__':` in python
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request === 'getBlockedSites') {
      console.dir(activeBlockedSites);
      sendResponse(Object.fromEntries(activeBlockedSites));
    }
    else if (request === 'fileAccessSchemeExtPageSwitch') {
      fileAccessSchemeExtPageSwitch();
      sendResponse(true);
    }
    else if (request.action == 'syncNow'){
      handleExternalAction(sendResponse, syncNow);
      return true;
    }
    else if (request.action == 'rmvEnroll') {
      handleExternalAction(sendResponse, removeEnrollment, request.headers);
      return true;
    }
    else if (request.action == 'addEnroll' && request.enrollCode){
      handleExternalAction(sendResponse, addEnrollment, request.enrollCode);
      return true;
    }
    else{
      sendResponse(true);//Should not happen but idk lol
    }
  });

  chrome.runtime.onStartup.addListener(function() {
    if (typeof syncProfilesInterval == 'undefined'){
      syncProfiles();
      let syncProfilesInterval = setInterval(syncProfiles, 30000);
    }
    if (typeof syncProfilesInterval == 'undefined'){
      let setBlockedSitesInterval = setBlockedSitesLoop();
    }
    if (typeof permissionsCheckInterval == 'undefined'){
      checkPermissions();
      let permissionsCheckInterval = setInterval(checkPermissions, 1000);
    }
  });

  if (typeof syncProfilesInterval == 'undefined'){
    syncProfiles();
    let syncProfilesInterval = setInterval(syncProfiles, 30000);
  }
  if (typeof syncProfilesInterval == 'undefined'){
    let setBlockedSitesInterval = setBlockedSitesLoop();
  }
  if (typeof permissionsCheckInterval == 'undefined'){
    checkPermissions();
    let permissionsCheckInterval = setInterval(checkPermissions, 1000);
  }
}
