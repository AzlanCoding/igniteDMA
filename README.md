# NOTICE
**PRODUCTION IS DOWN!!!** because my server (quite literally) stopped working. (Last log received was around 1801 hrs on 30th September 2024).<br>
idk if it's the 2V5A AC to DC adapter or if the motherboared is just not working anymore. I tried to disect a USB wire and then wire it to the board but it nearly started an electrical fire on my table **twice** (the first time because it was the wrong way around, second time because the red and black wire touched each other).<br>
It is likely that the e-waste that was running my server may no longer work and I will only be able to get production up again after my exams. Sorry for the inconvienience.
****
# Project Ignite
Project Ignite is a new Device Manager Application (DMA) for schools developed after [Mobile Guardian was hacked](https://www.channelnewsasia.com/singapore/mobile-guardian-application-remove-cybersecurity-incident-moe-4526676).
<br>
Project Ignite focuses on ensuring the **Security** and **Privacy** of students as well as being as **Fail-Proof** as possible. The chrome extension for students is **designed to work even if the server goes offline** after it has been properly set up. Moreover, the chrome extension does not collect any data from students' devices (as of current stable version).
<br>
The foundation of this application was made in less than 3 days.
<br><br>
I believe that Singapore needs our own solution for a DMA to accommodate for the various needs of students and teachers. In the future, Project Ignite be more than just a DMA. It will be an all in one software to help teachers facilitate learning through various tools and features that will keep students intrigued to conducted lessons. These features will be synced to the complex timetable schools in Singapore have. It will also come with software to help schools create these complex timetables.
<br>
Thus, I plan to further develop this project after my GCE O'Level examinations.<br>
<br>
The server is originally based off a past project which is based off a tutorial found [here](https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login).
<br>
This project is made possible thanks to [Free DNS](https://freedns.afraid.org/).

<a href="https://bulma.io">
  <img src="https://bulma.io/assets/images/made-with-bulma.png" alt="Made with Bulma" width="256" height="48">
</a>

****

## Security
This full stack application does not collect any personal data from students nor does it have any major control over the users' devices. Thus even if compromised, there is nothing much to steal or control.

## Important Notes
1. **THERE IS A LIMIT OF 5,000 BLOCKED SITES PER STUDENT** due to the usage of `declarativeNetRequest`. As stated in Chrome's [documentation](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#dynamic-rules):
  > An extension can have at least 5000 dynamic rules. This is exposed as the `MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES`.

2. The extension checks for updates from the profile every 30 seconds. You can force a refresh by pressing `Refresh Profile` in the options page.

3. **FOR ADMINISTRATORS:** When force installing the extension on students' devices, extension needs access to file URLs and `Site Access` must be set to `On all sites` in order for the extensions to work properly. Please ensure you enforce this rule.<br>
Even if you cannot enforce this setting, it will by default have access to all sites. A full screen popup will annoy students if they attempt to try to change the setting. The extension will also switch to `legacyWebBlocking` to stop students from visiting the blocked webpage should this popup fail to launch.

4. **FOR DEVELOPERS:** <ins>Do not try to make a pull request to this repository</ins> unless I explicitly give you permission to do so. The purpose of IgniteDMA being open source is to be transparent about what data we collect and process. This is to limit the number of people working on the project so as to keep IgniteDMA secure. If you would like to suggest any new feature vulnerability, feel free to open a discussion in the `Dicussions` tab. To report a vulnerability, go to the `Security` tab, press `Report a Vulnerability` and fill in the necessary fields. Thank you for your understanding.

****
## Feature Timeline
- **End of October 2024**
  - ~Multiple profile Support~ (Completed on 24th September 2024)
- **End of November 2024**
  - Ability to handle more than 5,000 blocked sites
  - "Live class" feature, which includes the following features:
    - "Look Up" mode. Temporarily locks students' devices to force them to pay attention to the teacher. Triggered by the teacher.
    - "Live Screen" mode. Streams teachers' computer screens to students, allowing them to take screenshots and rewind if needed. <br>This is especially useful when teachers are going through answers for a test. Students can take screenshot or rewind so that they can copy their corrections later and spend more time understanding what they did wrongly.<br>(Ability to rewind can be disabled)
    - "Live Management". Allows teachers, during a live class session, to see the sites students are visiting, push sites for students to visit, and, enforce a custom set of rules for which sites students are allowed to visit.
    - "Q&A". Allows students to post questions to the teacher without disrupting the entire lesson.
    - "Live Polls". Allows teachers to create multiple choice or open ended polls. This is useful when teachers show questions in their slides and ask students to answer.
- **By 3rd quarter of December 2024**
  - Documentation for Ignite DMA
- **End of June 2025**
  - Ability to manage the installation, enabling, disabling and removal of extensions from the chrome web store on students' devices.
- **Future Goals**
  - Timetable generation and ability to sync with "Live class" system
  - iPad and Windows Client for students using these devices
  - Point system linked to "Live Polls". Points can be used to claim...

****
## TODO
- [x] Extension: Implement `declarativeNetRequest` API
- [x] Server: Configure DDNS update script
- [x] Extension (`options.html`): Add last refreshed field. (i.e. last time the extension successfully to contact the server)
- [x] Extension (`options.html`): Implement manual profile refresh button.
- [x] Server (`profile.html`) & Extension (`options.html`): Restyle blockedSites field.
- [x] Extension (`options.html`): Dynamically update page.
- [x] Extension: Use tabs API. (If student opens website after sch hours and leaves it there, extension does not block yet)
- [x] Extension (`background.js`): Inject script to check tab and call `updateDynamicRules()` only when extension/profile started and when `blockedSites` is updated.
- [x] Server (`profile.html`): Restyle `notifi`
- [x] Server (`profile.html`): Add Nav Bar (Relink to `base.html`)
- [x] Server: Create delete profile option
- [x] Extension: Implement Verify Magic Packet to prevent server impersonation. (Students might fork server and bypass through DNS hijack)
- [x] Extension (`popup.html`): Only allow one `options.html` page to be visible at all times.
- [x] Extension: Support for multiple profiles
- [x] Server (`profile.html`): Highlight repeated URLs
- [x] Extension (`background.js`): Implement logs modal
- [ ] Extension (`background.js`): Use `async` and `await` instead of `.then()` so that can use `chrome.storage.session` in logs
- [ ] Extension (`background.js`): Use `chrome.storage.managed` so that admin can predefine Enrollment Code and skip set up.
- [ ] GitHub Pages for this project (docs).
- [ ] Server: Create "Print Profile Code" feature to make it easier to share profile code with students
- [ ] Server: Create delete enrollment option
- [ ] Extension: Publish to Chrome Web Store (Maybe?)
- [ ] Server: Code cleanup
- [ ] App Icon
- [ ] Server: Create reset profile password feature
- [ ] Extension: Detect use of [pillow](https://github.com/S1monlol/pillow)
- [ ] Extension: Find a way around `declarativeNetRequest` 5000 rule limit
