# RCTV 19 Roku review submission

Status: **submitted, under review and scheduled for September 28, 2026 at 10:00 AM Pacific / noon Central; not yet approved**. The corrected development version 1.0.0 is installed on the owner's Roku TV at 192.168.68.50 and signed using the existing developer identity. Live/replay playback, Back, Resume, BIF previews and idle screensaver have owner confirmation; corrected deep-link paths have actual-device evidence below. All four App Behavior Analysis tests passed, and fresh static analysis has zero errors. The owner explicitly approved the schedule and final certifications; Submit succeeded and Roku displayed PUBLISHING. This is a separate RCTV app project, not an update to Mississippi Sports or an automatic replacement of the FrontLayer-published RCTV listing.

## Listing copy

Title: **RCTV 19**

Description: **Watch Ripley Community Television live and on demand. Browse local news, sports, religious programs and community shows from Ripley and Tippah County, Mississippi. Choose a show, select an episode and watch with your Roku remote. No viewer account or subscription is required. An internet connection is required, and programming availability may change.**

## Reviewer instructions

The app opens a home screen with a live tile when a live source is available, plus picture tiles for on-demand shows. Select a show with OK to browse its episodes, then select an episode to play. Back returns to the episode gallery; Back again returns to the home tiles. Press the star button on the menu to refresh programming.

Replay bookmarks are stored locally on the Roku. After watching for at least 30 seconds, return to the menu and select that episode again to choose Resume or Start from beginning. Replays can include HD and SD BIF fast-forward previews. Startup content-ID deep links and input events while the app is running use stable catalog IDs.

Published replay IDs, all with `mediaType=episode`:

- `mt-zion-children-2026-09-20`
- `mt-zion-sermon-2026-08-23`
- `mt-zion-sermon-2026-09-20`

The three programs are grouped under **Mt Zion Church Sermons**, with separate episode thumbnails and a series cover. `mt-zion-sermon-2026-09-20` is the replay sample saved in the portal and verified by a cold-launch deep-link test on the actual TV; the other two IDs have not each received a separate device deep-link test.

Published live ID: `rctv19-live`. The portal's observed Live option is saved as `mediaType=live`; the app also supports `mediaType=liveFeed`. Both aliases were verified through running-app input tests. The portal's live and episode samples are saved with indefinite availability. Invalid, missing or mismatched media types return to the home screen. An unknown content ID refreshes the catalog once, then returns home if still unavailable.

No sign-in, activation, payment or reviewer account is required. The app has no advertising SDK or advertising-identifier collection. Cloudflare processes connection information to deliver video as described in the privacy policy. The owner confirmed general-audience programming intended for ages 13 and older, with sponsor logos/mentions and ordinary local/church programming. Reflect those facts in Roku's actual questions rather than assuming every store uses the same classification.

Catalog: `https://watch.rctv19.com/api/catalog.json`

Support: `https://watch.rctv19.com/support/` and `myersgrouponline@gmail.com`

Privacy: `https://watch.rctv19.com/privacy/`

Terms: `https://watch.rctv19.com/terms/`

## Verified build facts

- BrightScript/SceneGraph compilation completed successfully for the corrected 1.0.0 build.
- Current `dist/rctv19-roku-dev.zip` is **620,671 bytes** and contains the RCTV manifest, catalog configuration, StationScene, the new deep-link resolver and all five RCTV image assets. It includes the existing 540×405 image as `mm_icon_focus_fhd`. The test fixture is excluded from the ZIP.
- The minimal correction forwards content ID and media type together, validates the item/type combination, and routes invalid requests home. Normal menu playback and the manifest version remain unchanged.
- The existing signing credential was verified and used privately with approval. No signing key was generated, reset or replaced.
- The original signed package was downloaded as **622,944 bytes**, uploaded with minimum Roku OS **15.1**, and backed up at `output/roku-test/rctv19-1.0.0-before-deep-link-fix.pkg`.
- The corrected 620,671-byte development ZIP was installed successfully, then version 1.0.0 was signed as `P98335841fe86604b42176d807c2e9039.pkg`, using existing developer ID `4002a0fc204acb05852a69a6bf7eb2ce6f404a4c`.
- The owner downloaded the corrected **623,680-byte** signed package. SHA-256: `6BBC19243D9EB709E2D07DFF5560CCE8BF9B24F17B5B56CAE5CEBE7FE9252CE8`. It is saved locally and has replaced the earlier package in Roku's portal.
- `output/roku-test/home-actual-tv.jpg` is an unmodified 1280×720 capture downloaded from the Roku developer utilities. It visibly shows RCTV branding, the distinct Watch Live cover and the Mt Zion Church Sermons cover with three episodes.
- Only the development sideload slot was replaced. The regular installed Mississippi Sports store app was not changed.
- The owner answered **All work** when asked to verify live picture/sound, Mt Zion replay picture/sound, and Back twice from playback through the episode gallery to home.
- The owner separately confirmed Resume, fast-forward preview pictures and idle screensaver all work.
- The real BrightScript resolver passed **28 behavioral checks** with pinned development-only interpreter `brs@0.45.0`, covering valid replay, both live aliases, invalid/missing/wrong/non-string media types, and unknown-ID refresh/fallback.
- Actual TV ECP cold replay returned HTTP 200 and recorded `VODStartComplete` at 545 ms. Warm live inputs recorded playback starts at 945 ms for `live` and 703 ms for `liveFeed`.
- A warm input with a valid content ID and invalid media type returned HTTP 200; a screenshot of the actual TV verified return to the home screen. ECP response codes alone were not treated as playback proof.

## Saved Roku store draft

App ID `883607` now has completed Listing setup, Store assets, App profile and Monetization setup according to its overview. Saved values: United States; Live TV category; not made for kids; Content not rated; video/internet required; no viewer sign-in; free/no purchase or inserted video ads. The support, privacy, terms and station URLs above are saved. The authorized business email and private reviewer contact are entered.

The official 540×405 RCTV poster and English descriptions are saved. `output/roku-test/home-store-1920x1080.png` is uploaded as the store screenshot; it is a dimensions-only resize of the actual TV capture, with no app-content changes. Final submission succeeded with owner-approved certifications and release notes summarizing the tested behavior. The approved existing signing credential was used privately without changing the signing identity.

The corrected 623,680-byte package is uploaded with minimum OS 15.1. Its fresh static analysis returned **zero errors and one conditional AppDialog warning**. There is no pre-home login or selection dialog; Resume appears only after a viewer selects an unfinished replay. Indefinite deep-link samples are saved for `rctv19-live` / `live` and `mt-zion-sermon-2026-09-20` / `episode`. App Behavior Analysis for this corrected package is **Done, 4/4 passed**: launch performance, deep linking, screensaver policy and playback performance, using Roku Ultra 4640X on firmware 15.3.4.02402.

## Pending release work

The RCTV live channel and three on-demand programs are published. Physical Roku playback/navigation, Resume, BIF and screensaver checks are owner-confirmed; corrected replay/live/invalid deep-link device checks are recorded above. Static analysis and all App Behavior Analysis checks are complete. Await review and keep the live source running.

Retain the existing signing identity for updates. Confirm ownership/transfer separately if keeping the existing FrontLayer app's installations. Store artwork, core listing/profile/monetization declarations and deep-link samples are submitted. Record approval or any requested corrections when the store provides them.
