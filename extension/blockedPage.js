function addInfo(){
  let url = new URL(window.location.href);
  let params = new URLSearchParams(url.search);
  document.getElementById('info').innerHTML = "The active profile \""+params.get('profile')+"\" is blocking site access to \""+params.get('site')+"\"";
}
addInfo()
