document.getElementById("permitBtn").addEventListener("click", () => {
  document.getElementById("permitBtn").classList.add("is-loading");
  chrome.runtime.sendMessage("fileAccessSchemeExtPageSwitch").then((result) => {
    window.close();
  });
  //chrome.tabs.create({ url: "chrome://extensions/?id="+chrome.runtime.id });
});
