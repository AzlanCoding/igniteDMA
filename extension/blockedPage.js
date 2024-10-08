let url;
let params;
function addInfo(){
  url = new URL(window.location.href);
  params = new URLSearchParams(url.search);
  if(params.get('profile') == null || params.get('site') == null){
    document.title = "Nothing to see here! - Ignite DMA"
    document.getElementsByTagName("body")[0].classList.remove('danger-background');
    document.getElementsByTagName("body")[0].classList.add('success-background');
    document.getElementById('moreInfo').classList.add('is-hidden');
    document.getElementsByClassName("title")[0].innerHTML = "Nothing to see here!";
    document.getElementsByClassName("subtitle")[0].innerHTML = "Insufficient or no data received to display.";
    document.getElementById("info").innerHTML = "Go look at funny cat memes!";
  }
  else if (params.get('fullURL') == null){
    document.getElementById('info').innerHTML = "The active profile <code>"+params.get('profile')+"</code> is blocking site access to <code>"+params.get('site')+"</code>";
  }
  else{
    document.getElementById('info').innerHTML = "The profile <code>"+params.get('profile')+"</code> has either just been activated or has just been updated and is now blocking site access to <code>"+params.get('site')+"</code>";
    document.getElementById('refreshBtn').classList.remove("is-hidden");
    document.getElementById('refreshBtn').addEventListener('click', checkBlocked);
  }
}

function checkBlocked(){
  document.getElementById('refreshBtn').classList.add("is-loading");
  return chrome.runtime.sendMessage("getBlockedSites").then((result) => {
    let blockedSites = Object.keys(result);
    for (let i = 0; i < blockedSites.length; i++) {
      if (params.get('fullURL').includes(blockedSites[i])){
        alert("The profile is still active and the site is still being blocked by profile `"+result[blockedSites[i]]+"`");
        document.getElementById('refreshBtn').classList.remove("is-loading");
        return null;
      }
    }
    window.location.href = params.get('fullURL');
  });
}

addInfo();

//Currently does not work because the setBlockedSites runs after chrome storage change.
// TODO: Move activeBlockedSites to chrome.session.storage
//chrome.storage.onChanged.addListener(checkBlocked);
