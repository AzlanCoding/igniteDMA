/*Page Utilities*/
let enrollData;
function loadData(){
  return chrome.storage.sync.get("enrollData").then((result) => {
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

function parseDays(enforceDays){
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
    document.getElementById("enrollModal").classList.remove("is-active");
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
    event.target.parentElement.parentElement.remove()
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
  document.getElementById("profileLastUpdated").innerHTML = new Date(profileData.lastUpdated).toLocaleString();
  Array.from(document.getElementById("profileBlockedSites").children).forEach(e => e.remove());
  profileData.blockedSites.forEach((site) => {
    let input = document.createElement('input');
    input.classList = "blocked-site-entry input";
    input.readOnly = true;
    input.value = site;
    document.getElementById("profileBlockedSites").appendChild(input);
  });
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
    document.getElementById('enrollLastUpdated').innerHTML = new Date(enrollData.lastUpdated).toLocaleString();
    document.getElementById('enrollLastSync').innerHTML = new Date(enrollData.lastSync).toLocaleString();
    document.querySelectorAll(".profileContainer .profileBox:not(.profilePlaceholder), .profileContainer .noProfilesMsg").forEach(e => e.remove());
    Object.entries(enrollData.profiles).forEach(([profileCode,profileData]) => {
      if (profileData.type == "webfilterV1"){
        let profileBox = document.getElementsByClassName("profilePlaceholder")[0].cloneNode(true)
        profileBox.classList.remove('profilePlaceholder');
        profileBox.setAttribute("data-profile", profileCode);
        profileBox.getElementsByClassName("addIcon")[0].remove();
        profileBox.querySelector('.profileInfo .title').innerHTML = profileData.name;
        profileBox.querySelector('.profileInfo .subtitle').innerHTML = parseDays(profileData.enforceDays)+"<br>"+parseTime(profileData.enforceTime);
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

function UI_Init(){
  Array.from(document.getElementsByClassName("enrollModalClose")).forEach((elm) => {
    elm.addEventListener("click", () => {
      event.preventDefault();
      document.getElementById("enrollModal").classList.remove('is-active');
    });
  });

  document.getElementById('enrollModalOpenBtn').addEventListener("click", () => {
    document.getElementById("enrollModal").classList.add('is-active');
  });

  Array.from(document.getElementsByClassName("profileModalClose")).forEach((elm) => {
    elm.addEventListener("click", () => {
      document.getElementById("profileModal").classList.remove('is-active');
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
chrome.storage.onChanged.addListener(() => {
  loadData().then(() => {
    renderUI();
  }).catch((e) => {
    notifi("is-danger", "Error", e);
  });
});


/*---DOMContentLoaded Event---*/
document.addEventListener("DOMContentLoaded", () => {
  try{
    UI_Init();
    return loadData().then(() => {
      updateUIloop();
    }).catch((e) => {
      notifi("is-danger", "Error", e);
    });
  }
  catch(e){
    notifi("is-danger", "Error", e);
  }
});