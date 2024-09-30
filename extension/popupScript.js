function checkAlreadyOpened() {
  chrome.tabs.query({url: chrome.runtime.getURL("options.html")}, function(tabs) {
    if (tabs.length >= 1) {
      chrome.tabs.update(tabs[0].id, {active: true}, () => {
        document.getElementById('msg').style["display"] = "block";
        chrome.windows.update(tabs[0].windowId, {focused: true});
        //chrome.windows.update doesn't always work (for some reason)
        //Therefore, I put it in the callback of chrome.tabs.update
      });
    }
    else{
      chrome.tabs.create({ 'url': chrome.runtime.getURL("options.html")}, () => {
        window.close();
      });
    }
  });
}
checkAlreadyOpened();
