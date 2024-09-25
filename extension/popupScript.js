function checkAlreadyOpened() {
  chrome.tabs.query({url: chrome.runtime.getURL("options.html")}, function(tabs) {
    if (tabs.length >= 1) {
      chrome.windows.update(tabs[0].windowId, {focused: true}, () => {
        chrome.tabs.update(tabs[0].id, {active: true}, () => {
          document.getElementById('msg').style["display"] = "block";
        });
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
