# RCTV 19 Amazon Fire TV review draft

Status: prepared for a new RCTV 19 Fire OS app; not submitted. The proposed application ID is `com.rctv19.tv`, version 1.0.0 (1). This build does not update the existing FrontLayer-published RCTV app. Confirm the intended new store record before uploading.

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

## Reviewer instructions — finish store declarations before using

No sign-in, activation code, payment or test account is required. The app loads its program catalog from `https://watch.rctv19.com/api/catalog.json`. Choose a show tile, then an episode. Back returns to that show's episodes; Back again returns to the home screen. Refresh programming reloads the catalog. Help and privacy is available from the home menu. When configured, the live tile opens the station's live HLS feed.

The app uses native Media3 playback, remote media keys, Android audio focus and a MediaSession. It has no analytics SDK, advertising SDK or advertising-identifier permission. Playback state can remain on the device for activity/lifecycle restoration. Cloudflare processes connection information required to deliver video; the app does not create viewer accounts or maintain a viewer-profile database.

Support: `myersgrouponline@gmail.com` and `https://watch.rctv19.com/support/`

Privacy: `https://watch.rctv19.com/privacy/`

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

## Pending release work

Live and the three on-demand programs are published, and the RCTV emulator checks above passed. Physical Fire TV testing remains unperformed. Keep the live source running during review. The current production catalog and media must remain available to reviewers.

The owner confirmed RCTV's intended audience is general audiences ages 13 and older, with sponsor logos/mentions and ordinary local/church programming. Complete the questionnaire using that confirmation and the actual RCTV content; religious or children's programming must still be classified accurately in the questions presented. Confirm distribution rights for every live and on-demand program and any included music or outside footage. Final data disclosures must match the implementation and published privacy policy. Do not submit an empty/nonworking catalog.

## Isolated emulator plan

The installed SDK has the official Android TV API 33 x86 image and API 36 TV tools. Test in a newly created RCTV-only virtual device using the installed API 33 TV image. Do not copy or wipe existing virtual-device data. Build a development APK with the same unique `com.rctv19.tv` package and the production catalog URL; its Android development signature is only for testing.

The test emulator used audio-disabled operation without saving snapshots, keeping it separate from vMix and the existing Sports broadcast. Every ADB command used its explicit serial, `emulator-5580`; physical devices were not targeted. Live and on-demand checks are complete as recorded above. With audio output disabled, these tests cannot verify audible sound on a physical Fire TV.
