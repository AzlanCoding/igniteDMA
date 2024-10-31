function checkAlreadyOpened() {
  chrome.tabs.query({url: chrome.runtime.getURL("options.html")}, function(tabs) {
    if (tabs.length > 1) {
      chrome.tabs.getCurrent((currentTab) => {
        let newTabs = tabs.filter(tab => tab.id !== currentTab.id);
        chrome.windows.update(newTabs[0].windowId, {focused: true}, () => {
          chrome.tabs.update(newTabs[0].id, {active: true}, () => {
            window.close();
          });
        });
      });
    }
  });
}
checkAlreadyOpened();

/*Page Utilities*/
function fixTimeString(timeString){
  let a = timeString.split(",");
  let mm,dd,yyyy;
  [mm,dd,yyyy] = a[0].split("/");
  a.shift();
  return [dd,mm,yyyy].join("/") + "," + a
}

let enrollData;
function loadData(){
  return chrome.storage.local.get("enrollData").then((result) => {
    //enrollData = JSON.parse(document.getElementById('userData').innerHTML);
    enrollData = result.enrollData
  });
}

function sendExternalAction(data){
  return chrome.runtime.sendMessage(data).then((result) => {
    if(!result){
      throw new Error("No response from externalAction")
    }
    else if (result.isErr){
      throw new Error(result.data);
    }
    else{
      return result.data;
    }
  });
}

function checkActive(enforceDays, enrollTime){
  let [startHour, startMin] = enrollTime.start.split(":");
  let [endHour, endMin] = enrollTime.end.split(":");
  let d = new Date();
  if (enforceDays.includes(d.getDay())){
    if (enrollTime.start == enrollTime.end){
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

function parseTime(enrollTime){
  if (enrollTime.start == enrollTime.end){
    return "24/7";
  }
  else{
    return enrollTime.start + " - " + enrollTime.end;
  }
}

function parseDays(enforceDays, shortForm){
  let days = enforceDays.split('').sort().join('');
  if (days == "0123456"){
    return "Everyday";
  }
  else if (days == "12345"){
    return "Weekdays";
  }
  else if (days == "06") {
    return "Weekends";
  }
  else if (shortForm){
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];
    return days.split('').map(char => daysOfWeek[parseInt(char)]).join(', ');
  }
  else{
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days.split('').map(char => daysOfWeek[parseInt(char)]).join(', ');
  }
}

/*---Catogory 1 UI Utilities---*/
function setupEnrollment(){
  let code = document.getElementById("enrollCodeInput").value
  if (code.length >= 7){
    document.getElementById('enrollCodeSubmit').classList.add("is-loading");
    return sendExternalAction({action: "addEnroll", enrollCode: code}).then(() => {
      notifi("is-success", "Setup Completed!", "Enrollment has been successfully set up!");
      document.getElementById("enrollCodeInput").value = "";
      document.getElementById('enrollCodeSubmit').disabled = true;
      //Dynamic Refresh enabled! Do not need code below.
      /*return loadData().then(() => {
        renderUI();
      });*/
    }).catch((e) => {
      if (e.message.includes("Cannot find profile!")){
        notifi("is-warning","Invalid Enrollment Code", "The enrollment code you entered was invalid.");
      }
      else if (e.message.includes("Status Code")){
        notifi("is-danger", "Error", e);
      }
      else{
        notifi("is-danger", "Error", "Failed to setup enrollment!<br>"+e);
      }
    }).finally(() => {
      document.getElementById('enrollCodeSubmit').classList.remove("is-loading");
    });
  }
}

function masterPin() {
  document.getElementById("removeEnrollmentBtn").classList.add("is-loading");
  return sendExternalAction({action: "rmvEnroll", headers: {'enrollCode': enrollData.enrollCode, 'PIN': document.getElementById('masterPinInput').value}}).then(() => {
    document.getElementById("enrollModal").classList.add('is-closing');
    setTimeout(() => {
      document.getElementById("enrollModal").classList.remove('is-active');
      document.getElementById("enrollModal").classList.remove('is-closing');
    }, 750);
    document.getElementById('masterPinInput').value = "";
    notifi("is-success","Success","Successfully Removed Enrollment!");
    //Dynamic Refresh Enabled! No need code below.
    /*return loadData().then(() => {
      renderUI();
    });*/
  }).catch((e) => {
    if (e.message == "Incorrect PIN"){
      notifi("is-warning","Incorrect PIN","Incorrect PIN was entered");
    }
    else{
      notifi("is-danger","Error", e.message);
    }
  }).finally(() => {
    document.getElementById("removeEnrollmentBtn").classList.remove("is-loading");
  });

}


/*---Catogory 2 UI Utilities---*/
function notifi(status, title, text){
  let notifi =  document.createElement('article');
  notifi.classList = "message "+status;
  let header = document.createElement('div')
  header.classList = "message-header"
  header.innerHTML = title;
  let closeBtn = document.createElement('button');
  closeBtn.classList = "delete";
  closeBtn.onclick = (event) => {
    event.target.parentElement.parentElement.classList.add("is-closing");
    setTimeout(()=>{
      event.target.parentElement.parentElement.remove();
    },750);
  }
  header.appendChild(closeBtn);
  notifi.appendChild(header);
  let body = document.createElement('div');
  body.classList = "message-body";
  body.innerHTML = text;
  notifi.appendChild(body);
  document.getElementById('notifications').appendChild(notifi);
}

function validateInput(event){
  const validPattern = /^[A-Z0-9]*$/;
  if (!validPattern.test(event.target.value)) {
    event.target.value = event.target.value.toUpperCase();
    event.target.value = event.target.value.replace(/[^A-Z0-9]/g, '');
  }
  if (event.target.value.length >= 7){
      document.getElementById('enrollCodeSubmit').disabled = false;
    if (event.key == 'Enter'){
      setupEnrollment();
    }
  }
  else{
    document.getElementById('enrollCodeSubmit').disabled = true;
  }
}

/*---Modal UI Functions---*/
let profileModalCode;
function openProfileModal(profileCode){
  profileModalCode = profileCode;
  renderModalData(profileCode);
  document.getElementById("profileModal").classList.add("is-active");
}

function renderModalData(profileCode){
  document.getElementById('profileModal').setAttribute('data-profileCode', profileCode);
  let profileData = enrollData.profiles[profileCode];
  document.getElementById("profileName").innerHTML = profileData.name;
  renderModalStatus(profileData);
  document.getElementById("profileDay").innerHTML = parseDays(profileData.enforceDays);
  document.getElementById("profileTime").innerHTML = parseTime(profileData.enforceTime);
  document.getElementById("profileLastUpdated").innerHTML = fixTimeString(new Date(profileData.lastUpdated).toLocaleString('en-US'));
  Array.from(document.getElementById("profileBlockedSites").children).forEach(e => e.remove());
  profileData.blockedSites.forEach((site) => {
    let input = document.createElement('input');
    input.classList = "blocked-site-entry input";
    input.readOnly = true;
    input.value = site;
    document.getElementById("profileBlockedSites").appendChild(input);
  });
  if (document.getElementById("profileBlockedSites").children.length <= 0){
    let msg = document.createElement('p');
    msg.innerHTML = "This profile does not have any blocked sites configured.";
    document.getElementById("profileBlockedSites").appendChild(msg);
  }
}

function renderModalStatus(data){
  let profileStatus = "Enabled";
  if(!data.enabled){
    profileStatus = "Disabled"
  }
  else{
    if (checkActive(data.enforceDays,data.enforceTime)){
      profileStatus += ", Active"
    }
    else{
      profileStatus += ", Inactive"
    }
  }
  document.getElementById("profileStatus").innerHTML = profileStatus;
}






/*---Render UI Functions---*/
function renderUI(){
  document.getElementById('loadingPlaceholder').classList.remove('hidden');
  let now = new Date();
  if (now.getHours() >= 18){
    document.getElementById('greeting').innerHTML = "Good Evening!";
  }
  else if (now.getHours() >= 12) {
    document.getElementById('greeting').innerHTML = "Good Afternoon!";
  }
  else{
    document.getElementById('greeting').innerHTML = "Good Morning!";
  }

  if (enrollData){
    document.getElementById('enrollName').innerHTML = enrollData.enrollName;
    document.getElementById('enrollLastUpdated').innerHTML = fixTimeString(new Date(enrollData.lastUpdated).toLocaleString('en-US'));
    document.getElementById('enrollLastSync').innerHTML = fixTimeString(new Date(enrollData.lastSync).toLocaleString('en-US'));
    document.querySelectorAll(".profileContainer .profileBox:not(.profilePlaceholder), .profileContainer .noProfilesMsg").forEach(e => e.remove());
    Object.entries(enrollData.profiles).forEach(([profileCode,profileData]) => {
      if (profileData.type == "webfilterV1"){
        let profileBox = document.getElementsByClassName("profilePlaceholder")[0].cloneNode(true)
        profileBox.classList.remove('profilePlaceholder');
        profileBox.setAttribute("data-profile", profileCode);
        profileBox.getElementsByClassName("addIcon")[0].remove();
        profileBox.querySelector('.profileInfo .title').innerHTML = profileData.name;
        profileBox.querySelector('.profileInfo .subtitle').innerHTML = parseDays(profileData.enforceDays, true)+"<br>"+parseTime(profileData.enforceTime);
        profileBox.onclick = (event) => {
          openProfileModal(profileCode);
        };
        if (!profileData.enabled){
          profileBox.querySelector('.profileBottom .is-success').classList.add('hidden');
          profileBox.querySelector('.profileBottom .is-danger').classList.remove('hidden');
        }
        else if (!checkActive(profileData.enforceDays, profileData.enforceTime)) {
          profileBox.querySelector('.profileBottom .is-success').classList.add('hidden');
          profileBox.querySelector('.profileBottom .is-warning').classList.remove('hidden');
        }
        document.getElementsByClassName("profileContainer")[0].insertBefore(profileBox,document.getElementsByClassName("profileContainer")[0].firstChild);
      }
    });
    if (document.getElementsByClassName("profileContainer")[0].children.length <= 2){
      document.getElementById('noProfilesMsg').classList.remove('hidden');
    }
    else{
      document.getElementById('noProfilesMsg').classList.add('hidden');
    }
    if (document.getElementsByClassName("profileContainer")[0].children.length <= 1) {
      let noProfilesMsg = document.createElement('p');
      noProfilesMsg.classList = "noProfilesMsg";
      noProfilesMsg.innerHTML = "No profiles to display";
      document.getElementsByClassName("profileContainer")[0].appendChild(noProfilesMsg);
    }
    document.getElementById("enrollAdd").classList.add("hidden");
    document.getElementById("enrollInfo").classList.remove("hidden");
  }
  else{
    profileModalCode = null;//Just in case
    document.getElementById("enrollInfo").classList.add("hidden");
    document.getElementById("enrollAdd").classList.remove("hidden");
  }
  document.getElementById('loadingPlaceholder').classList.add('hidden');
}

function updateUIloop(){
  try{
    renderUI()
    if (profileModalCode){
      renderModalData(profileModalCode);
    }
    let now = new Date();
    let delay = (61 - now.getSeconds()) * 1000;//Runs every minute + 1 second delay just in case
    return setTimeout(updateUIloop,delay);
  }
  catch(e){
    notifi("is-danger", "Error", e);
  }
}


function renderDebugUI(){
  return chrome.storage.session.get("runtimeLog").then((result) => {
    let data = (typeof result.runtimeLog == 'undefined') ? "There are no logs at the moment" : result.runtimeLog.join("<br>");
    let replaceFormatting = {
       "[INFO]": '<span class="has-text-info">[INFO]</span>',
       "[WARNING]": '<span class="has-text-warning">[WARNING]</span>',
       "[ERROR]": '<span class="has-text-danger">[ERROR]</span>',
       "\n": '<br>'
    };
    for (let key in replaceFormatting) {
      data = data.replaceAll(key, replaceFormatting[key]);
    }
    document.getElementById("logsContain").innerHTML = data;
    document.getElementById("logsContain").scrollTop = document.getElementById("logsContain").scrollHeight;
  });
}

function UI_Init(){
  /*---Debug UI---*/
  let extensionVersion = chrome.runtime.getManifest().version;
  document.getElementById("extVersion").innerHTML = "IgniteDMA v"+extensionVersion;
  document.getElementById("extVersionInfo").href = "https://github.com/AzlanCoding/igniteDMA/releases/tag/v"+extensionVersion;
  document.getElementById("extVersionInfo").innerHTML = "Release Notes";
  /*document.getElementById("logRefreshBtn").addEventListener("click", (event) => {
    event.target.classList.add("is-loading");
    renderDebugUI().then(() => {
      event.target.classList.remove("is-loading");
    }).catch((e) => {
      notifi("is-danger", "Error", e);
    });
  });*/

  Array.from(document.getElementsByClassName("debugModalClose")).forEach((elm) => {
    elm.addEventListener("click", () => {
      document.getElementById("debugModal").classList.add('is-closing');
      setTimeout(()=> {
        document.getElementById("debugModal").classList.remove('is-active');
        document.getElementById("debugModal").classList.remove('is-closing');
      }, 750);

    });
  });

  document.getElementById('debugBtn').addEventListener("click", () => {
    document.getElementById("debugModal").classList.add('is-active');
    //This is stupid but, we have to wait for debugModal to go from display:none
    //to display:flex, so we can't scroll `logsContain` until it's actually visible.
    setTimeout(() => {
      document.getElementById("logsContain").scrollTop = document.getElementById("logsContain").scrollHeight;
    }, 100);
    /*setTimeout(() => {
      renderDebugUI().then(() => {//Update again just in case.
        document.getElementById("logsContain").scrollTop = document.getElementById("logsContain").scrollHeight;
      }).catch((e) => {
        notifi("is-danger", "Error", e);
      });
    }, 100);*/
  });


  /*---Main UI---*/
  Array.from(document.getElementsByClassName("enrollModalClose")).forEach((elm) => {
    elm.addEventListener("click", () => {
      document.getElementById("enrollModal").classList.add('is-closing');
      setTimeout(()=>{
        document.getElementById("enrollModal").classList.remove('is-active');
        document.getElementById("enrollModal").classList.remove('is-closing');
      }, 750);

    });
  });

  document.getElementById('enrollModalOpenBtn').addEventListener("click", () => {
    document.getElementById("enrollModal").classList.add('is-active');
  });

  Array.from(document.getElementsByClassName("profileModalClose")).forEach((elm) => {
    elm.addEventListener("click", () => {
      document.getElementById("profileModal").classList.add('is-closing');
      setTimeout(()=>{
        document.getElementById("profileModal").classList.remove('is-active');
        document.getElementById("profileModal").classList.remove('is-closing');
      }, 750);
      profileModalCode = null;
    });
  });

  document.getElementById('removeEnrollmentBtn').addEventListener("click", masterPin);
  document.getElementById('masterPinInput').addEventListener("keypress", (event) => {
    if (event.key == 'Enter'){
      masterPin();
    }
  });

  document.getElementById('enrollCodeInput').addEventListener("input", validateInput);
  document.getElementById('enrollCodeInput').addEventListener("keypress", validateInput);
  document.getElementById('enrollCodeSubmit').addEventListener("click", setupEnrollment);

  document.getElementById('syncBtn').addEventListener("click", (event) => {
    event.target.classList.add("is-loading");
    sendExternalAction({action: "syncNow"}).then(() => {
      notifi('is-success','Success','Successfully synced enrollment!');
    }).catch((e) => {
      notifi('is-danger','Error','Failed to sync enrollment!<br>'+e);
    }).finally(() => {
      event.target.classList.remove("is-loading");
      event.target.disabled = true;
      setTimeout(() => {
        event.target.disabled = false;
      }, 3000);//Prevent spamming of refresh button.
    });
  });
}


/*---Dynamic Refresh---*/
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName == 'local'){
    return loadData().then(() => {
      renderUI();
    }).catch((e) => {
      notifi("is-danger", "Error", e);
    });
  }
  else{
    renderDebugUI().catch((e) => {
      notifi("is-danger", "Error", e);
    });
  }
});


/*---DOMContentLoaded Event---*/
document.addEventListener("DOMContentLoaded", () => {
  try{
    UI_Init();
    return loadData().then(renderDebugUI).then(() => {
      updateUIloop();
    }).catch((e) => {
      notifi("is-danger", "Error", e);
    });
  }
  catch(e){
    notifi("is-danger", "Error", e);
  }
});
