# Project Ignite
A temporary replacement Device Manager Application (DMA) for schools after [Mobile Guardian was hacked](https://www.channelnewsasia.com/singapore/mobile-guardian-application-remove-cybersecurity-incident-moe-4526676).<br>
The first version of this application was made in less than 3 days and is currently under testing.
<br>
I have always believed that Singapore needed our own internal solution for a DMA to accommodate for the various needs of studnets and teachers. Thus I plan to further develop this project after my GCE O'Level examinations.<br>
<br>
The server is based off a past project which is based off a tutorial found [here](https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login).
<br>
This project is made possible thanks to [Free DNS](https://freedns.afraid.org/).

## Important Notes
The extension checks for updates from the profile every 30 seconds. You can force a refresh by pressing `Refresh Profile` in the options page.<br>
**FOR ADMINISTRATORS:** When force installing the extension on students' devices, `Site Access` must be set to `On all sites` in order for the extensions to work properly. Please ensure you enforce this rule.<br>
Even if you cannot enforce this setting, it will by default have access to all sites. A fullscreen popup will annoy students if they attempt to try to change the setting. The extension will also switch to `legacyWebBlocking` to stop students from visiting the blocked webpage should this popup fail to launch.
## Security
This full stack application does not collect any personal data nor does it have any major control over the users' devices. Thus even if compromised, there is nothing to lose.

## TODO
- [x] Extension: Implement `declarativeNetRequest` API
- [x] Server: Configure DDNS update script
- [x] Extension (`options.html`): Add last refreshed field. (i.e. last time the extension successfully to contact the server)
- [x] Extension (`options.html`): Implement manual profile refresh button.
- [x] Server (`class.html`) & Extension (`options.html`): Restyle blockedSites field.
- [x] Extension (`options.html`): Dynamically update page.
- [x] Extension: Use tabs API. (If student opens website after sch hours and leaves it there, extension does not block yet)
- [ ] Server (`class.html`): Highlight repeated URLs
- [ ] Extension (`background.js`): Show error notification when it fails to contact Server
- [ ] Github Pages for this project (docs).
- [ ] Server: Create "Print Profile Code" feature to make it easier to share profile code with students
- [ ] Server: Create delete profile option
- [ ] Extension: Publish to Chrome Web Store (Maybe?)
- [ ] Extension (`popup.html`): Only allow one `options.html` page to be visible at all times.
- [ ] Server (`class.html`): Add Nav Bar (Relink to `base.html`)
- [ ] Server (`class.html`): Restyle `notifi` (`z-index`?, `top`?, `margin: auto`?)
- [ ] Server: Code cleanup
- [ ] App Icon
- [ ] Server: Create reset profile password feature?
- [ ] Extension (`background.js`): Implement Error Handling.
- [ ] Extension: Detect use of [pillow](https://github.com/S1monlol/pillow)
- [ ] Extension: Implement End-to-End Encryption to prevent server impersonation. (Students may fork server and bypass)
- [ ] Extension (`background.js`): Inject `checkTab.js` and call `updateDynamicRules()` only when extension/profile started and when `blockedSites` is updated. 
