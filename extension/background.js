let updateHost = "https://ignitedma.mooo.com"//Production Server
//let updateHost = "http://127.0.0.1"//Development Server

let runtimeLog = new Array();
let useLegacyBlocking = false;
let activeBlockedSites;//Will be an Map but currently null
let activeProfiles;//Will be an Map but currently null
//set as null so that areMapsEqual will return false
//Forces enforceBlockedSites to run on startup.

/*---Catagory 1 Utilities---*/
//Low level Utilities that handle simple data
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
function fixTimeString(timeString){
  let a = timeString.split(",");
  let mm,dd,yyyy;
  [mm,dd,yyyy] = a[0].split("/");
  a.shift();
  return [dd,mm,yyyy].join("/") + "," + a
}

/*---Catagory 2 Utilities---*/
//Utilities that parse application data
function checkProfileActive(data){
  if (!data.enabled){
    return false;
  }
  //console.dir(data);
  let [startHour, startMin] = data.enforceTime.start.split(":");
  let [endHour, endMin] = data.enforceTime.end.split(":");
  let d = new Date();
  if (data.enforceDays.includes(d.getDay())){
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
//Utilities that get data and call other Utilities that make changes to the system
function getProfiles(type){
  return chrome.storage.local.get("enrollData").then((result) => {
    return (result.enrollData ? filterProfileTypes(result.enrollData.profiles, type) : {});
  });
}
function setBlockedSites(){
  //console.log("checking blocked sites changes");
  logData("info","Checking for blocked sites to enforce");
  return getProfiles("webfilterV1").then((classList) => {
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
        //console.log("profile "+data.name+" is not active.");
        logData("info","Profile "+data.name+" is not active");
      }
    });
    if (!areMapsEqual(activeProfilesCache, activeProfiles)){
      activeProfiles = activeProfilesCache;
    }
    if (!areMapsEqual(blockedSitesCache,activeBlockedSites)){
      //console.log("activeBlockedSites Set!")
      activeBlockedSites = blockedSitesCache;
      return enforceBlockedSites(blockedSitesCache);
    }
  });
}
function syncEnrollment(){
  return chrome.storage.local.get("enrollData").then((result) => {
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
//Utilities that make changes to the system
function enforceBlockedSites(data){
  //console.log("Enforcing new blockedSites");
  logData("info","Enforcing new set of blocked sites");
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
          //console.warn("Ignoring site "+site+" as it is not safe.");
          logData("warning","Ignoring "+site+" as it is not safe");
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
          //console.warn("Ignoring site "+site+" as it is not safe.");
          logData("warning","Ignoring "+site+" as it is not safe");
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
            //console.log("Checking: "+window.location.href);
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
              logData("warning","No fileAccessScheme permission. Removing tab!");
              chrome.tabs.remove(tab.id)
            }
            else{
              logData("warning","Unable to inject script into tab due to error: "+err.message);
              //console.log("Skipping inaccesible webpage\n"+err.message);
            }
          }
          else{
            //console.error("Failed to inject script into tab");
            logData("warning","Unable to inject script into tab due to unknown error");
          }
        });
      });
      return Promise.all(promises);
    });
  }
}
function updateEnrollData(enrollCode){
  logData("info","Checking for enrollment data updates");
  return chrome.storage.local.get("enrollData").then((result) => {
    return fetch(updateHost+"/api/v1/enrollment/"+enrollCode.toLowerCase(), {cache: "no-cache"}).then((response) => {
      if (response.ok){
        return response.json();
      }
      else if (response.status == 404){
        logData("error","Server cannot find enrollment");
        throw new Error("Cannot find profile!\nPlease press the `Delete Profile` button.<br>Status code: "+response.status);
        //// TODO: Make popup to decide whether to remove profile
      }
      else {
        logData("error","Server responded with "+response.status+" during enrollment fetch");
        throw new Error("ok something just went like REALLY WRONG.<br>Status Code: " + response.status);
      }
    }).then((data) => {
      /*if ((!result.enrollData) || (data.lastUpdated > result.enrollData.lastUpdateFetch)){
        data.lastSync = new Date().getTime();
        data.lastUpdateFetch = new Date().getTime();
        let save = new Object();
        save.enrollData = data;
        return chrome.storage.local.set(save);
      }
      else{
        result.enrollData.lastSync = new Date().getTime();
        return chrome.storage.local.set(result);
      }*/
      data.lastSync = new Date().getTime();
      //data.lastUpdateFetch = new Date().getTime();
      let save = new Object();
      save.enrollData = data;
      return chrome.storage.local.set(save).catch((e) => {
        // NOTE: QUOTA_BYTES_PER_ITEM quota when using chrome.storage.sync.set
        logData("error","Failed to save enrollment data");
        throw new Error("Failed to save enrollment data");
      })
    }).catch((e) => {
      if (e.message.includes("Failed to fetch")){
        logData("error","Unable to contact server for enrollment updates");
        throw new Error("Unable to contact server");
      }
      else{
        throw e;
      }
    });
  });
}
function logData(level, message){
  if (runtimeLog.length >= 100){
    runtimeLog = runtimeLog.slice(50);
    logData("info", "cleared log");
  }
  let dateTime = fixTimeString(new Date().toLocaleString("en-us",{
      hour12: false,
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
  }));
  runtimeLog.push(`${dateTime} [${level.toUpperCase()}]: ${message}`);
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
  logData("info","BlockingWindow Initilised!");
  //console.log("blockingWindow launched");
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
      chrome.permissions.contains({"permissions": ["storage", "unlimitedStorage", "declarativeNetRequest", "background", "tabs", "scripting"], origins: ["<all_urls>"]}, (result) => {
        if (result) {
          removeWindowTopRule();
          if (useLegacyBlocking){
            useLegacyBlocking = false;
            return setBlockedSites();
          }
        }
        else{
          //console.log("No permits, relaunching...")
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
      //console.log("launching fileAccessScheme")
      logData("warning","No fileAccessScheme permission. Opening BlockingWindow");
      setWindowTopRule(chrome.runtime.getURL("fileAccessSchemeNeeded.html"));
    }
  });
}
function checkPermissions() {
  return chrome.permissions.contains({"permissions": ["storage", "unlimitedStorage", "declarativeNetRequest", "background", "tabs", "scripting"], origins: ["<all_urls>"]}, (result) => {
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
        logData("warning","Insufficient permissions. Opening BlockingWindow");
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
  return syncEnrollment();
}
function removeEnrollment(headers){
  return fetch(updateHost+"/api/v1/masterPin",{cache: "no-cache", method:"post", headers: headers}).then((response) => {
    if (response.ok) {
      return response.blob().then((data) => {
        return verifyMagicPacket(data).then((outcome) => {
          if (outcome){
            return chrome.storage.local.clear().then(setBlockedSites);
          }
          else{
            logData("error","Failed to Verify Server's Identity!");
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
      logData("error","Unable to contact server");
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
      sendResponse(Object.fromEntries(activeBlockedSites));
    }
    else if(request === 'getRuntimeLog'){
      sendResponse(runtimeLog.join("<br>"));
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
    if (typeof syncEnrollmentInterval == 'undefined'){
      syncEnrollment();
      let syncEnrollmentInterval = setInterval(syncEnrollment, 30000);
    }
    if (typeof syncEnrollmentInterval == 'undefined'){
      let setBlockedSitesInterval = setBlockedSitesLoop();
    }
    if (typeof permissionsCheckInterval == 'undefined'){
      checkPermissions();
      let permissionsCheckInterval = setInterval(checkPermissions, 1000);
    }
  });

  if (typeof syncEnrollmentInterval == 'undefined'){
    syncEnrollment();
    let syncEnrollmentInterval = setInterval(syncEnrollment, 30000);
  }
  if (typeof syncEnrollmentInterval == 'undefined'){
    let setBlockedSitesInterval = setBlockedSitesLoop();
  }
  if (typeof permissionsCheckInterval == 'undefined'){
    checkPermissions();
    let permissionsCheckInterval = setInterval(checkPermissions, 1000);
  }
  logData("info","INITILISATION COMPLETE");
}
