function ensureFullscreen() {
  if (!document.hasFocus() && !document.getElementById("permitBtn").classList.contains("is-loading")){
    window.close();//reopen fullscreen window
  }
  chrome.windows.getCurrent((window) => {
    if (window.state !== 'fullscreen') {
      chrome.windows.update(window.id, { state: 'fullscreen'});
    }
  });
}
setInterval(ensureFullscreen, 1000);
document.addEventListener('fullscreenchange', ensureFullscreen);
document.addEventListener('keydown', ensureFullscreen);
document.addEventListener('keyup', ensureFullscreen);
document.addEventListener('click', ensureFullscreen);
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === window.id) {
    ensureFullscreen();
  }
});
function grantPermit(){
  let resetTimeout = setTimeout(() => {window.close()},15000);//reopen fullscreen window
  document.getElementById("permitBtn").classList.add("is-loading");
  chrome.permissions.request({origins: ['*://*/*']}, (granted) => {
    clearTimeout(resetTimeout);
    if (granted) {
      alert("Permission successfully granted!");
      window.close();
    }
    else {
      alert("Permission was not granted!");
      document.getElementById("permitBtn").classList.remove("is-loading");
    }
  });
}
document.getElementById("permitBtn").addEventListener("click",grantPermit);


// NOTE: window.close() is called when window is not active so that
//       student cannot keep the window in the background and continue
//       using the device.
