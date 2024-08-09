# Project Ignite
A temporary replacement Device Manager Application (DMA) for schools after [Mobile Guardian was hacked](https://www.channelnewsasia.com/singapore/mobile-guardian-application-remove-cybersecurity-incident-moe-4526676).<br>
The first version of this application was made in less than 3 days and is currently under testing.
<br>
I have always believed that Singapore needed our own internal solution for a DMA to accommodate for the various needs of studnets and teachers. Thus I plan to further develop this project after my GCE O'Level examinations.<br>
<br>
The server is based off a past project which is based off a tutorial found [here](https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login).

## Important Notes
The extension checks for updates from the profile every 30 seconds. Manual refresh is not implemented yet but it can still be done by restarting the device.<br>
**FOR ADMINISTRATORS:** When force installing the extension on students' devices, `Site Access` must be set to `On all sites` in order for the extensions to work properly. Please ensure you enforce this rule.
## Security
This full stack application does not collect any personal data nor does it have any major control over the users' devices. Thus even if compromised, there is nothing to lose.

## TODO
- [x] Extension: Migrate to use `declarativeNetRequest` API
- [ ] Extension: Show error message when it fails to contact Server
- [ ] Extension: Implement manual profile refresh button.
- [ ] Github Pages for this repo.
- [ ] Server: Configure DDNS update script
- [ ] Server: Create "Print Profile Code" feature to make it easier to share profile code with students
- [ ] Extension: Publish to Chrome Web Store (Maybe?)
- [ ] Server: Create delete profile option
- [ ] Extension (`popup.html`): Only allow one `options.html` page to be visible at all times.
- [ ] Extension (`options.html`): Dynamically refresh page.
- [ ] Extension (`options.html`): Add last checked field. (i.e. last time the extension successfully to contact the server)
- [ ] Server (`class.html`): Add Nav Bar (Relink to `base.html`)
- [ ] Server (`class.html`): Restyle `notifi` (`z-index`?, `top`?, `margin: auto`?)
- [ ] Server: Code cleanup
- [ ] App Icon
- [ ] Server: Create reset profile password feature?
