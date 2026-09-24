# RCTV 19 Roku review draft

Status: **draft; not submitted or approved**. Development version 1.0.0 is installed on the owner's Roku TV at 192.168.68.50 and was successfully signed there using the existing developer identity. The owner confirmed live picture/sound, Mt Zion replay picture/sound and Back twice all work. The actual TV home screen was captured and verified. Signed-package download, remaining device checks, store package upload, automated validation and submission remain pending. This is a separate RCTV app project, not an update to Mississippi Sports or an automatic replacement of the FrontLayer-published RCTV listing.

## Listing copy

Title: **RCTV 19**

Description: **Watch Ripley Community Television live and on demand. Browse local news, sports, religious programs and community shows from Ripley and Tippah County, Mississippi. Choose a show, select an episode and watch with your Roku remote. No viewer account or subscription is required. An internet connection is required, and programming availability may change.**

## Reviewer instructions — complete testing before using

The app opens a home screen with a live tile when a live source is available, plus picture tiles for on-demand shows. Select a show with OK to browse its episodes, then select an episode to play. Back returns to the episode gallery; Back again returns to the home tiles. Press the star button on the menu to refresh programming.

Replay bookmarks are stored locally on the Roku. After watching for at least 30 seconds, return to the menu and select that episode again to choose Resume or Start from beginning. Replays can include HD and SD BIF fast-forward previews. Startup content-ID deep links and input events while the app is running use stable catalog IDs.

Published replay IDs, all with `mediaType=episode`:

- `mt-zion-children-2026-09-20`
- `mt-zion-sermon-2026-08-23`
- `mt-zion-sermon-2026-09-20`

The three programs are grouped under **Mt Zion Church Sermons**, with separate episode thumbnails and a series cover. These IDs still require Roku device deep-link verification.

Published live ID: `rctv19-live`, with `mediaType=live`. Verify this against the production catalog before entering it into Roku's testing form.

No sign-in, activation, payment or reviewer account is required. The app has no advertising SDK or advertising-identifier collection. Cloudflare processes connection information to deliver video as described in the privacy policy. The owner confirmed general-audience programming intended for ages 13 and older, with sponsor logos/mentions and ordinary local/church programming. Reflect those facts in Roku's actual questions rather than assuming every store uses the same classification.

Catalog: `https://watch.rctv19.com/api/catalog.json`

Support: `https://watch.rctv19.com/support/` and `myersgrouponline@gmail.com`

Privacy: `https://watch.rctv19.com/privacy/`

Terms: `https://watch.rctv19.com/terms/`

## Verified build facts

- BrightScript/SceneGraph compilation completed successfully.
- `dist/rctv19-roku-dev.zip` contains the RCTV manifest, catalog configuration, StationScene and all five RCTV image assets.
- Initial development ZIP size: 619,937 bytes (0.59 MiB).
- The existing signing credential was verified and used privately with approval. No signing key was generated, reset or replaced.
- The TV successfully packaged version 1.0.0 as `Pfc96151bdcc055d77b1d6422aaea162b.pkg`, using existing developer ID `4002a0fc204acb05852a69a6bf7eb2ce6f404a4c`. The installed application was 619,937 bytes.
- Edge blocked the package download. The Codex terminal did not appear for the owner, so `output/Download RCTV Roku Package.cmd` is prepared for manual launch and private device-password entry. The signed PKG is not yet downloaded locally or uploaded to Roku's store portal.
- The developer installer reported **Install Success** and **619937 bytes stored**, matching the RCTV package.
- `output/roku-test/home-actual-tv.jpg` is an unmodified 1280×720 capture downloaded from the Roku developer utilities. It visibly shows RCTV branding, the distinct Watch Live cover and the Mt Zion Church Sermons cover with three episodes.
- Only the development sideload slot was replaced. The regular installed Mississippi Sports store app was not changed.
- The owner answered **All work** when asked to verify live picture/sound, Mt Zion replay picture/sound, and Back twice from playback through the episode gallery to home.

## Saved Roku store draft

App ID `883607` now has completed Listing setup, Store assets, App profile and Monetization setup according to its overview. Saved values: United States; Live TV category; not made for kids; Content not rated; video/internet required; no viewer sign-in; free/no purchase or inserted video ads. The support, privacy, terms and station URLs above are saved. The authorized business email and private reviewer contact are entered.

The official 540×405 RCTV poster and English descriptions are saved. `output/roku-test/home-store-1920x1080.png` is uploaded as the store screenshot; it is a dimensions-only resize of the actual TV capture, with no app-content changes. No binding terms were accepted and no final submission occurred during draft preparation. The approved existing signing credential was subsequently used privately to create the package, without changing the signing identity. Store package upload, deep-link testing, static analysis and App Behavior Analysis remain incomplete.

## Pending release work

The RCTV live channel and three on-demand programs are published. Physical Roku live/replay picture, sound and Back navigation are confirmed. Resume, fast-forward previews, deep linking and idle screensaver behavior still require RCTV-specific verification. Run Roku's current automated validation for this RCTV package; the Sports package's results do not transfer. Keep the live source running during review.

Complete the signed-package download, upload it to the intended RCTV developer listing and retain the existing signing identity for updates. Confirm ownership/transfer separately if keeping the existing FrontLayer app's installations. Store artwork and core listing/profile/monetization declarations are already saved; enter and verify the real RCTV deep-link IDs, finish automated validation and complete final submission requirements. Do not submit an empty catalog or claim unperformed tests.
