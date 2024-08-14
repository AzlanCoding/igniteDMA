function addInfo(){
  let url = new URL(window.location.href);
  let params = new URLSearchParams(url.search);
  document.getElementById('info').innerHTML = "The active profile <code>"+params.get('profile')+"</code> is blocking site access to <code>"+params.get('site')+"</code>";
}
addInfo()
