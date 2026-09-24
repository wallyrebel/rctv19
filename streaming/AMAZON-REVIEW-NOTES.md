# RCTV 19 Amazon Fire TV review record

Status: **Submitted; not yet approved**. Amazon confirmed a successful submission on **September 23, 2026, at 7:21 PM PDT**, for `com.rctv19.tv`, version 1.0.0 (1). The listing, artwork, three actual app screenshots, audience, rating, privacy and reviewer instructions were included. The owner explicitly approved the final export declaration and submission. This build does not update the existing FrontLayer-published RCTV app.

Amazon displayed an estimated Appstore date of **September 28, 2026, at 7:30 PM PDT**. This is an estimate, not approval or a guaranteed publication date. Its status page showed **SUBMITTED** and **App Submission Successful**, with no new action required at that time.

Developer app ID: `amzn1.devportal.mobileapp.55c3e4fdbb51453aa7b582dd2a5a5640`

Submitted release ID: `3b30ff5ef8ed4b4f81e2c5a9647db0ea`

## Listing copy

Title: **RCTV 19**

Short description: **Watch Ripley Community Television live and on demand.**

Full description:

RCTV 19 brings Ripley Community Television to your TV. Watch local news, sports, religious programs and community shows from Ripley and Tippah County, Mississippi.

Browse show artwork, select a series and choose an episode from its on-demand library. Watch the live channel when it is available. Use your TV remote to control playback and return to the show menu. No viewer account or subscription is required.

Programming and availability may change. An internet connection is required.

Features:

- One local live channel and on-demand programming.
- Picture tiles for shows and individual episodes.
- TV remote navigation and native video controls.
- Help, privacy information and catalog refresh in the app.

## Submitted reviewer instructions

No sign-in, activation code, payment or reviewer account is required. The app loads its catalog from https://watch.rctv19.com/api/catalog.json. Select RCTV 19 Live to watch the live channel. Select Mt Zion Church Sermons to browse three published programs, then select an episode to play. Back returns to episodes; Back again returns to home. Refresh programming reloads the catalog. Help and privacy is available from the home menu.

The app uses native Media3 playback and TV remote controls. It has no analytics SDK, advertising SDK or advertising-identifier permission. Cloudflare processes technical connection information as a service provider for video delivery and security, as described at https://watch.rctv19.com/privacy/. Viewers do not create accounts, and the app does not maintain a tracking database. Sponsor content consists of logos and mentions.

Testing used a fresh official Android TV API 33 emulator with the production catalog. Live and replay video, remote navigation, pause/seek, Back navigation and activity lifecycle behavior were checked. Physical Fire TV testing and audible sound verification have not been performed; emulator audio was disabled. The catalog includes the live channel and three Mt Zion programs with permission confirmed.

Support: myersgrouponline@gmail.com and https://watch.rctv19.com/support/.

## Verified build facts

- Unsigned release APK built successfully; package is `com.rctv19.tv`, version 1.0.0 (1), minimum API 23, target API 35.
- Release lint passed with no errors or fatal findings. Nonblocking warnings remain for inherited Android/UI conventions.
- Current unsigned release size: 4,545,294 bytes (4.33 MiB). Development test APK: 5,735,833 bytes (5.47 MiB).
- RCTV logo and covers are included; the Sports title, catalog, package ID and series-specific artwork overrides were removed.
- This Android APK targets Fire OS. Vega is not supported by this build.

## Emulator test evidence

The development APK was tested on a fresh official Android TV API 33 x86 emulator, separate from existing devices and app data. It used the production catalog at `watch.rctv19.com` and the published RCTV HLS files at `vod.rctv19.com`.

- The home screen displayed Mt Zion Church Sermons with the series-specific cover and a three-episode count.
- Selecting the show displayed all three episode titles and their individual thumbnails.
- Mt Zion Children — September 20, 2026 rendered moving video; MediaSession reported Playing, position 11.943 seconds with 63.584 seconds buffered, then position 32.620 seconds.
- Pause changed MediaSession to Paused; Fast Forward advanced from 32.620 to 47.635 seconds.
- Home released the app's MediaSession. Returning restored a paused position of 64.567 seconds.
- Back returned from playback to the episode gallery, and Back again returned to home. Refresh programming reloaded the catalog; Help and the full privacy dialog opened through remote navigation.
- Both full sermon episodes also entered Playing with buffered video during short spot checks.
- After live activation, Refresh added the RCTV 19 Live tile alongside Mt Zion Church Sermons. Selecting Live entered Playing and displayed the actual live broadcast. Two screenshots taken at different times showed changing video frames; Back returned cleanly to the home screen and released its MediaSession.
- No app-scoped AndroidRuntime or ExoPlayerImplInternal error output was returned during these checks.

Actual 1920×1080 emulator captures are in `output/fire-tv-test/home-final.png` (live and shows), `episodes.png`, `playback.png`, `sermon-playback.png` and `live-playback-later.png`; UI snapshots are beside them. The earlier `home.png` predates live activation and should not be used for the final store listing. Audio output was deliberately disabled to avoid interfering with the broadcaster. These results do not establish audible sound or compatibility on a physical Fire TV.

## Saved store setup

The complete listing, required store artwork and three actual app screenshots were submitted. Distribution is the United States, targeting 91 Fire TV models, with no tablets or automotive devices. The intended audience is ages 13 and older. The rating form reflects the owner's confirmation of ordinary local/church programming and sponsor logos/mentions only. The privacy form classifies technical IP/device-identifier processing solely under functionality and security, with no viewer accounts or tracking database and Cloudflare acting as a service provider rather than third-party data sharing.

The selected Mt Zion programs have permission confirmed. These declarations describe the current catalog; future programming must remain within the declared content and rights scope or the declarations must be revised.

## Pending release work

Live and the three on-demand programs are published, and the RCTV emulator checks above passed. Physical Fire TV testing remains unperformed and was disclosed in the submitted reviewer instructions. Await Amazon's review outcome and address any findings; submission is not approval. Keep the live source running during review, and keep the production catalog and media available to reviewers.

## Isolated emulator execution

Testing used a newly created RCTV-only virtual device with the official Android TV API 33 x86 image. Existing virtual-device data was not copied or wiped. The development APK used the unique `com.rctv19.tv` package and the production catalog URL; its Android development signature was used only for testing.

The test emulator used audio-disabled operation without saving snapshots, keeping it separate from vMix and the existing Sports broadcast. Every ADB command used its explicit serial, `emulator-5580`; physical devices were not targeted. Live and on-demand checks are complete as recorded above. With audio output disabled, these tests cannot verify audible sound on a physical Fire TV.
