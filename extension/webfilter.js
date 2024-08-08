function checkBlocked(url,iframeObj){
  chrome.storage.sync.get(["blockedSites"]).then((result) => {
   for (var i in result.blockedSites) {
      if (url.includes(result.blockedSites[i])){
        if (iframeObj != null){
          iframeObj.src = "https://azlancoding.github.io/igniteDMA/blocked.html"
        }
        else{
          window.location.href = "https://azlancoding.github.io/igniteDMA/blocked.html";
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

setInterval(iframeScan,5000)
checkBlocked(window.location.href,null);
