function addInfo(){
  let url = new URL(window.location.href);
  let params = new URLSearchParams(url.search);
  if(params.get('profile') == null || params.get('site') == null){
    document.title = "Nothing to see here! - Ignite DMA"
    document.getElementsByTagName("section")[0].classList.remove('is-danger');
    document.getElementsByTagName("section")[0].classList.add('is-success');
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
    document.getElementById('refreshBtn').addEventListener('click', () => {
      document.getElementById('refreshBtn').classList.add("is-loading");
      return chrome.storage.sync.get(["blockedSites"]).then((result) => {
       for (var i in result.blockedSites) {
          if (params.get('fullURL').includes(result.blockedSites[i])){
            alert("The profile is still active and the site is still blocked.");
            document.getElementById('refreshBtn').classList.remove("is-loading");
            return null;
          }
        }
        window.location.href = params.get('fullURL');
      });
    });
  }
}
addInfo()
