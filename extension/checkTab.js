function checkBlocked(url,iframeObj){
  let activeProfile;
  if (typeof igniteDMAInjectedScriptActiveProfile != 'undefined'){
    activeProfile = igniteDMAInjectedScriptActiveProfile;
  }else {
    activeProfile = "Unknown"
  }
  return chrome.storage.sync.get(["blockedSites"]).then((result) => {
   for (var i in result.blockedSites) {
      if (url.includes(result.blockedSites[i])){
        alert("BLOCKING SITE!!!")
        //let blockedPageUrl = "https://azlancoding.github.io/"
        let blockedPageUrl = (chrome.runtime.getURL("blocked.html")+"?profile="+encodeURI(activeProfile)+"&site="+encodeURI(result.blockedSites[i])+"&fullURL="+encodeURI(url));
        console.log(blockedPageUrl);
        if (iframeObj != null){
          iframeObj.src = blockedPageUrl;
        }
        else{
          window.location.href = blockedPageUrl;
        }
      }
    }
  });
}

function iframeScan(){
  let iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      checkBlocked(iframe.src,iframe)
  });
}

checkBlocked(window.location.href,null).then(() => {
  iframeScan()
});
