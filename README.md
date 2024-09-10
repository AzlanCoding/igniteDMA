# Project Ignite
Project Ignite is a new Device Manager Application (DMA) for schools developed after [Mobile Guardian was hacked](https://www.channelnewsasia.com/singapore/mobile-guardian-application-remove-cybersecurity-incident-moe-4526676).
<br>
Project Ignite focuses on ensuring the **Security** and **Privacy** of students as well as being as **Fail-Proof** as possible. The chrome extension for students is **designed to work even if the server goes offline** after it has been properly set up. Moreover, the chrome extension does not collect any data from students' devices (as of version 0.1).
<br>
The first version of this application was made in less than 3 days and is currently under testing.
<br><br>
I believe that Singapore needs our own solution for a DMA to accommodate for the various needs of students and teachers. In the future, Project Ignite be more than just a DMA. It will be an all in one software to help teachers facilitate learning through various tools and feature that will keep student intrigued to learning. These features will be synced to the complex timetable schools in Singapore have. It will also come with software to help schools create these complex timetables.
<br>
Thus, I plan to further develop this project after my GCE O'Level examinations.<br>
<br>
The server is based off a past project which is based off a tutorial found [here](https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login).
<br>
This project is made possible thanks to [Free DNS](https://freedns.afraid.org/).

<a href="https://bulma.io">
  <img src="https://bulma.io/assets/images/made-with-bulma.png" alt="Made with Bulma" width="256" height="48">
</a>

****

## Security
This full stack application does not collect any personal data nor does it have any major control over the users' devices. Thus even if compromised, there is nothing much to steal or control.

## Feature Timeline
- **End of October 2024**
  - Multiple profile Support
<br><br>
- **End of November 2024**
  - Ability to handle more than 5,000 blocked sites
  - "Live class" feature, which includes the following features:
    - "Look Up" mode. Temporarily locks students' devices to force them to pay attention to the teacher. Triggered by the teacher.
    - "Live Screen" mode. Streams teachers' computer screens to students, allowing them to take screenshots and rewind if needed. <br>This is especially useful when teachers are going through answers for a test. Students can take screenshot or rewind so that they can copy their corrections later and spend more time understanding what they did wrongly.<br>(Ability to rewind can be disabled)
    - "Live Management". Allows teachers, during a live class session, to see the sites students are visiting, push sites for students to visit, and, enforce a custom set of rules for which sites students are allowed to visit.
    - "Q&A". Allows students to post questions to the teacher without disrupting the entire lesson.
    - "Live Polls". Allows teachers to create multiple choice or open ended polls. This is useful when teachers show questions in their slides and ask students to answer.
<br><br>
- **By 3rd quarter of December 2024**
  - Documentation for Ignite DMA
<br><br>
- **End of June 2025**
  - Documentation for Ignite DMA
<br><br>
- **Future Goals**
  - Timetable generation and ability to sync with "Live class" system
  - iPad and Windows Client for students using these devices
  - Point system linked to "Live Polls". Points can be used in...


## Important Notes
1. **THERE IS A LIMIT OF 5,000 BLOCKED SITES PER STUDENT** due to the usage of `declarativeNetRequest`. As stated in the [documentation](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#dynamic-rules):
> An extension can have at least 5000 dynamic rules. This is exposed as the `MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES`.

2. The extension checks for updates from the profile every 30 seconds. You can force a refresh by pressing `Refresh Profile` in the options page.

3. **FOR ADMINISTRATORS:** When force installing the extension on students' devices, extension needs access to `file://` URLs and `Site Access` must be set to `On all sites` in order for the extensions to work properly. Please ensure you enforce this rule.<br>
Even if you cannot enforce this setting, it will by default have access to all sites. A full screen popup will annoy students if they attempt to try to change the setting. The extension will also switch to `legacyWebBlocking` to stop students from visiting the blocked webpage should this popup fail to launch.


## TODO
- [x] Extension: Implement `declarativeNetRequest` API
- [x] Server: Configure DDNS update script
- [x] Extension (`options.html`): Add last refreshed field. (i.e. last time the extension successfully to contact the server)
- [x] Extension (`options.html`): Implement manual profile refresh button.
- [x] Server (`class.html`) & Extension (`options.html`): Restyle blockedSites field.
- [x] Extension (`options.html`): Dynamically update page.
- [x] Extension: Use tabs API. (If student opens website after sch hours and leaves it there, extension does not block yet)
- [x] Extension (`background.js`): Inject script to check tab and call `updateDynamicRules()` only when extension/profile started and when `blockedSites` is updated.
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
- [ ] Extension: Implement End-to-End Encryption to prevent server impersonation. (Students might fork server and bypass through DNS hijack)
- [ ] Extension: Find a way around `declarativeNetRequest` 5000 rule limit
- [ ] Extension: Support for multiple profiles
