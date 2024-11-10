let updateHost = "https://ignitedma.mooo.com"//Production Server
//let updateHost = "http://127.0.0.1"//Development Server

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
async function getProfiles(type){
  let result = await chrome.storage.local.get("enrollData")
  return (result.enrollData ? filterProfileTypes(result.enrollData.profiles, type) : {});
}
async function setBlockedSites(forceRefresh){
  await logData("info","Checking for blocked sites to enforce");
  let profileList = await getProfiles("webfilterV1");
  let blockedSitesCache = new Map();
  let activeProfilesCache = new Map();
  let profileEntires = Object.entries(profileList);
  for (var i = 0; i < profileEntires.length; i++) {
    let classId, data;
    [classId, data] = profileEntires[i];
    if (checkProfileActive(data)){
      activeProfilesCache.set(classId, data.name);
      data.blockedSites.forEach((site) => {
        blockedSitesCache.set(site, data.name)
      });
    }
    else{
      await logData("info","Profile "+data.name+" is not active");
    }
  }
  if (forceRefresh || !areMapsEqual(activeProfilesCache, activeProfiles)){
    activeProfiles = activeProfilesCache;
  }
  if (forceRefresh || !areMapsEqual(blockedSitesCache,activeBlockedSites)){
    activeBlockedSites = blockedSitesCache;
    return enforceBlockedSites(blockedSitesCache);
  }
}
async function syncEnrollment(){
  let result = await chrome.storage.local.get("enrollData");
  if (result.enrollData){
    if (await updateEnrollData(result.enrollData.enrollCode)){
      await setBlockedSites();//Only check for blockedSites again if got changes
    }
  }
  else{
    //User not registered in any enrollment
    //// NOTE: (TO SELF) Manage chrome policies in /etc/opt/chrome/policies/managed/test_policy.json
    let enrollCode = await chrome.storage.managed.get("EnrollCode");
    if (enrollCode.EnrollCode){
      let removedEnrollCode = await chrome.storage.local.get("rmvEnroll");
      if (enrollCode != removedEnrollCode.rmvEnroll){
        addEnrollment(enrollCode.EnrollCode);
      }
    }
    await logData("info", "User not connected to enrollment. No enrollment to sync.");
  }
}
async function setBlockedSitesLoop(){
  await setBlockedSites()
  let now = new Date();
  let delay = (61 - now.getSeconds()) * 1000;//Runs every minute + 1 second delay just in case
  return setTimeout(setBlockedSitesLoop,delay)
}

/*---Catagory 4 Utilities---*/
//Utilities that make changes to the system
async function enforceBlockedSites(data){
  await logData("info","Enforcing new set of blocked sites");
  let blockedSites = Array.from(data.keys());
  let oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  let oldRuleIds = oldRules.map(rule => rule.id);
  if (blockedSites.length == 0){
    //Remove all rules
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: []
    });
  }
  else{
    //The code below requires the setting "site access" to be set to "on all sites".
    //The setting "site access" is usually set to "on all sites" by default.
    //So, if students change it, the webfilter will not work.
    //Therefore, legacyBlocking is used when this setting is not avaliable.
    // NOTE: priority set to 2 just in case
    /// NOTE: legacyBlocking used when more than 4990 rules needed.
    //// NOTE: code repetition in this condition block meant for performace.
    let newrules = new Array();
    if (useLegacyBlocking || blockedSites.length >= 4990){
      await logData("info","Using legacy blocking method!");
      for (var i = 0; i < blockedSites.length; i++) {
        let site = blockedSites[i]
        if(checkSafeUrl(site)){
          newrules.push({
            id: i + 1,
            priority: 2,
            action: { type: "block" },
            condition: { urlFilter: "||"+site+"/", resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"] }
          })
        }
        else {
          await logData("warning","Ignoring "+site+" as it is not safe");
        }
      }
    }
    else{
      for (var i = 0; i < blockedSites.length; i++) {
        let site = blockedSites[i]
        if(checkSafeUrl(site)){
          newrules.push({
              id: i + 1,
              priority: 2,
              action: { type: "redirect", "redirect": { "url": (chrome.runtime.getURL("blocked.html")+"?profile="+encodeURI(data.get(site))+"&site="+encodeURI(site)) } },
              condition: { urlFilter: "||"+site+"/", resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"] }
            });
        }
        else {
          await logData("warning","Ignoring "+site+" as it is not safe");
        }
      }
    }
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: newrules
    });

    //Check for tabs open for any blocked sites
    let tabs = await chrome.tabs.query({});
    for (var i = 0; i < tabs.length; i++) {
      try{
        await chrome.scripting.executeScript({
          target: { tabId: tabs[i].id, allFrames: true},
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
        });
      }
      catch(err){
        if (err.message && err.message.includes("Cannot access")){
          // NOTE: if no fileAccessScheme permission, `file://` URLs cannot scan
          if (tabs[i].url.startsWith("file://")){
            await logData("warning","No fileAccessScheme permission. Removing tab!");
            chrome.tabs.remove(tab.id)
          }
          else{
            await logData("warning","Unable to inject script into tab due to error: "+err.message);
          }
        }
        else{
          await logData("warning","Unable to inject script into tab due to unknown error");
        }
      }
    }
  }
}
async function updateEnrollData(enrollCode){
  await logData("info","Checking for enrollment data updates");
  let gotChanges = true;
  let initialData = await chrome.storage.local.get("enrollData");
  try{
    let response = await fetch(updateHost+"/api/v1/enrollment/"+enrollCode.toLowerCase(), {cache: "no-cache", headers: {"lastSync": initialData.enrollData ? initialData.enrollData.lastSync : -1}});
    let data;
    if (response.ok){
      data = await response.json();
      await logData("info", "Enrollment data changes reported")
    }
    else if (response.status == 304) {//Resource Not Modified
      data = initialData.enrollData;
      gotChanges = false
      await logData("info", "No reported changes with enrollment data")
    }
    else if (response.status == 404){
      await logData("error","Server cannot find enrollment");
      if (typeof initialData.enrollData == 'undefined'){
        throw new Error("Cannot find enrollment!\nPlease check that you have entered the correct Enrollment Code.");
      }
      else {
        throw new Error("Cannot find enrollment!\nPlease press the <code>Remove Enrollment</code> button, enter the Backup Removal PIN provided by your admin and press <code>Remove Enrollment</code>.");
      }
      //// TODO: Make popup to decide whether to remove profile
    }
    else {
      await logData("error","Server responded with "+response.status+" during enrollment fetch");
      throw new Error("ok something just went like REALLY WRONG.<br>Status Code: " + response.status);
    }

    data.lastSync = new Date().getTime();
    let save = new Object();
    save.enrollData = data;
    try{
      // NOTE: QUOTA_BYTES_PER_ITEM quota when using chrome.storage.sync.set
      // Thus, must save data to local.
      await chrome.storage.local.set(save);
      return gotChanges;
    }
    catch(e){
      await logData("error","Failed to save enrollment data. Error: "+e.message);
      throw new Error("Failed to save enrollment data. Error: "+e.message);
    }
  }
  catch(e){
    if (e.message.includes("Failed to fetch")){
      await logData("error","Unable to contact server for enrollment updates");
      throw new Error("Unable to contact server");
    }
    else{
      await logData("error","Unknown error: "+e.message);
      throw e;
    }
  }
}
async function logData(level, message){
  let data = await chrome.storage.session.get("runtimeLog")
  let runtimeLog = data.runtimeLog || new Array();
  let dateTime = fixTimeString(new Date().toLocaleString("en-us",{
      hour12: false,
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
  }));
  if (runtimeLog.length >= 100){
    runtimeLog = runtimeLog.slice(50);
    runtimeLog.push(`${dateTime} [INFO]: Log cleared.`);
  }
  runtimeLog.push(`${dateTime} [${level.toUpperCase()}]: ${message}`);
  await chrome.storage.session.set({runtimeLog: runtimeLog});
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
async function blockingWindow(url, callback){
  await logData("info","BlockingWindow Initilising!");
  return chrome.windows.create({
    url: url,
    type: "popup",
    state: "fullscreen"
  }, callback)/*.then(async() => {
    logData("info","BlockingWindow Initilised!");
  })*/
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
            return setBlockedSites(true);
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
  return blockingWindow(url, (window) => {
    WindowTopRuleData = {
      windowId: window.id,
      url: url,
      creationTime: new Date().getTime()
    };
  });
}
function setWindowTopRule(url){
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
async function fileAccessSchemeCheck(){
  if(await chrome.extension.isAllowedFileSchemeAccess()){
    if (WindowTopRuleData.windowId != null){
      removeWindowTopRule();
    }
  }
  else if (WindowTopRuleData.windowId == null) {
    await logData("warning","No fileAccessScheme permission. Opening BlockingWindow");
    setWindowTopRule(chrome.runtime.getURL("fileAccessSchemeNeeded.html"));
  }
}
async function checkPermissions() {
  if (await chrome.permissions.contains({"permissions": ["storage", "unlimitedStorage", "declarativeNetRequest", "background", "tabs", "scripting"], origins: ["<all_urls>"]})) {
    if (useLegacyBlocking){
      useLegacyBlocking = false;
      await setBlockedSites(true);
    }
    // NOTE: IF YOU ARE GOING TO CHANGE ANYTHING HERE,
    //       MAKE SURE TO LOOK AT relaunchClosedEnforceWindow()
    //       I KNOW IT'S STUPID BUT JUST IN CASE
    fileAccessSchemeCheck();//Proceed with 2nd check
  }
  else {
    if (WindowTopRuleData.windowId == null){
      await logData("warning","Insufficient permissions. Opening BlockingWindow");
      setWindowTopRule(chrome.runtime.getURL("permitNeeded.html"));
    }
    if (!useLegacyBlocking){
      useLegacyBlocking = true;
      await setBlockedSites(true);
    }
  }
}



/*---Chrome Messaging Functions---*/
async function addEnrollment(enrollCode){
  await chrome.storage.local.clear()
  await updateEnrollData(enrollCode);
  await setBlockedSites();
}
function syncNow(){
  return syncEnrollment();
}
async function removeEnrollment(headers){
  try{
    let response = await fetch(updateHost+"/api/v1/masterPin",{cache: "no-cache", method:"post", headers: headers});
    if (response.ok) {
      let data = await response.blob()
      if (await verifyMagicPacket(data)){
        let enrollData = await chrome.storage.local.get("enrollData");
        await chrome.storage.local.clear()
        await chrome.storage.local.set({"rmvEnroll": enrollData.enrollData.enrollCode});
        await setBlockedSites();
      }
      else{
        await logData("error","Failed to Verify Server's Identity!");
        throw new Error("Failed to Verify Server's Identity!");
      }
    }
    else {
      throw new Error("Incorrect PIN");
    }
  }
  catch(e){
    if (e.message.includes("Failed to fetch")){
      await logData("error","Unable to contact server");
      throw new Error("Unable to contact server");
    }
    else{
      throw e;
    }
  }
}

/*---Chrome Messaging Function Utilities---*/
//The function below is used to verify the main server's identity
//How it works is that when the main server receives the correct PIN
//to remove the enrollment. A secret file is sent to the client and
//the checksum of the file is measured to verify that the server
//contacted is indeed the real server.
async function verifyMagicPacket(blob){
  let dataBuffer = await blob.arrayBuffer()
  let hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === "139531df1cac2ff1b2be3fa5afde6a904cef6583de35efe07f1ddfe6f3228da5";
}
async function handleExternalAction(sendResponse, func, args){
  try{
    let response = await func(args);
    sendResponse({isErr: false, data: response});
  }
  catch(e){
    sendResponse({isErr: true, data: e.message});
  }
}



/*---Main Startup---*/
async function initExtension(){
  let startupInfo = chrome.storage.session.get('initStarted')
  if (typeof startupInfo.initStarted == 'undefined'){
    await chrome.storage.session.set({initStarted: true})
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
    return logData("info","EXTENSION INITILISATION COMPLETE");
  }
}

if (typeof window == 'undefined') { //The javascript equivilant of `if __name__ == '__main__':` in python
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request === 'getBlockedSites') {
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

  chrome.runtime.onStartup.addListener(initExtension);
  chrome.runtime.onInstalled.addListener(initExtension);
  initExtension();
}
