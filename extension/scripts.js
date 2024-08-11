import { addClass, removeClass, getUpdateHost } from "./background.js";

let updateHost = getUpdateHost();

function replaceWithDaysOfWeek(input) {
    //Generated by Bing Chat
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return input.split('').map(char => daysOfWeek[parseInt(char)]).join(', ');
}

function formatTimeRange(startHour, startMinute, endHour, endMinute) {
    //Generated by Bing Chat
    const padZero = (num) => num.toString().padStart(2, '0');

    const startTime = `${padZero(startHour)}:${padZero(startMinute)}`;
    const endTime = `${padZero(endHour)}:${padZero(endMinute)}`;

    return `${startTime} - ${endTime}`;
}

function openModal(modalId){
  document.getElementById(modalId).classList.add("is-active");
}


function closeModal(modalId){
  document.getElementById(modalId).classList.remove("is-active");
}

function addClassCode(){
  document.getElementById("addProfileBtn").classList.add("is-loading");
  let classCode = document.getElementById("classCode").value.toLowerCase();
  fetch(updateHost+"/api/v0/getClass/"+classCode,{cache: "no-cache"}).then((response) => {
      if (!response.ok) {
        alert("Invalid Class Code!");
        document.getElementById("addProfileBtn").classList.remove("is-loading");
      } else {
        addClass(classCode).then(() => {
          window.location.reload();
        });
      }
  }).catch(function(err) {
    alert(err);
  });
}

function masterPin(){
  document.getElementById("removeProfileBtn").classList.add("is-loading");
  fetch(updateHost+"/api/v0/masterPin",{cache: "no-cache", method:"post", headers: {'PIN': document.getElementById('maserPinInput').value}}).then((response) => {
    if (response.ok) {
      chrome.storage.sync.clear().then(()=>{
        alert("REMOVAL PROCESS SUCCESS!");
        window.location.reload();
      });
    } else {
      alert("Wrong PIN");
    }
    document.getElementById("removeProfileBtn").classList.remove("is-loading");
  });
}


function renderUI(){
  document.getElementById("addProfile").addEventListener("click", () => {openModal("addProfileModal")});
  document.getElementById("addProfileClose").addEventListener("click", () => {closeModal("addProfileModal")});
  document.getElementById("removeProfile").addEventListener("click", () => {openModal("removeProfileModal")});
  document.getElementById("removeProfileClose").addEventListener("click", () => {closeModal("removeProfileModal")});
  document.getElementById("addProfileBtn").addEventListener("click",addClassCode);
  document.getElementById("removeProfileBtn").addEventListener("click",masterPin);
  document.getElementById("classCode").addEventListener("keypress", () => {
    if (event.key === 'Enter') {
      document.getElementById("addProfileBtn").click();
    }
  });
  document.getElementById("maserPinInput").addEventListener("keypress", () => {
    if (event.key === 'Enter') {
      document.getElementById("removeProfileBtn").click();
    }
  });
  chrome.storage.sync.get().then((result) => {
    let classList = Object.keys(result)
      .filter(key => key.startsWith('class'))
      .reduce((obj, key) => {
        let newKey = key.replace(/^class/, '')
        obj[newKey] = result[key];
        return obj;
      }, {});
    console.dir(classList);
    if (Object.keys(classList).length > 0){
      let profile = Object.values(classList)[0];
      console.dir(profile);
      document.getElementById("noProfileMsg").classList.add("is-hidden");
      document.getElementById("addProfile").classList.add("is-hidden");
      document.getElementById("profile").classList.remove("is-hidden");
      document.getElementById("removeProfile").classList.remove("is-hidden");
      document.getElementById("refreshProfileBtn").classList.remove("is-hidden");
      document.getElementById("profileName").innerHTML = profile.className;
      document.getElementById("profileTime").innerHTML = formatTimeRange(profile.startHour, profile.startMin, profile.endHour, profile.endMin)
      document.getElementById("profileDay").innerHTML = replaceWithDaysOfWeek(profile.enforceDays);
      document.getElementById("profileLastUpdated").innerHTML = new Date(profile.lastUpdated).toLocaleString();
      document.getElementById("profileLastFetch").innerHTML = new Date(profile.lastUpdateFetch).toLocaleString();
      document.getElementById("profileBlockedSites").innerHTML = profile.blockedSites.join("<br>");

      document.getElementById("refreshProfileBtn").addEventListener("click", () => {
        document.getElementById("refreshProfileBtn").classList.add("is-loading");
        addClass(Object.keys(classList)[0]).then(() => {
          window.location.reload();
          //I will uncomment this when dynamic refresh is implemented.
          //renderUI();
          //document.getElementById("refreshProfileBtn").classList.remove("is-loading");
        }).catch((err) => {
          alert("FAILED TO CONTACT SERVER!\nERROR: "+err);
          document.getElementById("refreshProfileBtn").classList.remove("is-loading");
        });
      });
    }
    /*else {
      document.getElementById("noProfileMsg").classList.remove("is-hidden");
      document.getElementById("addProfile").classList.remove("is-hidden");
      document.getElementById("profile").classList.add("is-hidden");
      document.getElementById("removeProfile").classList.add("is-hidden");
    }*/
  });
}


renderUI();
