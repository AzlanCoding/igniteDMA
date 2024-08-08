# Project Ignite
A temporary replacement Device Manager Application (DMA) for schools ever since [Mobile Guardian was hacked](https://www.channelnewsasia.com/singapore/mobile-guardian-application-remove-cybersecurity-incident-moe-4526676).<br>
The first version of this application was made in less than 3 days and is currently under testing.
<br>
I have always believed that Singapore needed our own internal solution for a DMA to accommodate for the various needs of studnets and teachers. Thus I plan to further develop this project after my GCE O'Level examinations.<br>
<br>
The server was based off a past project which was based off a tutorial found [here](https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login).

## Security
This full stack application does not collect any personal data nor does it have any major control over the users' devices. Thus even if compromised, there is nothing to lose.

## TODO
- [ ] Github Pages for this repo (Including `blocked.html`)
- [ ] Extension: Migrate to use `declarativeNetRequest` API
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
