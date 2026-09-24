# RCTV 19 Apple TV

Native tvOS addition for the existing **RCTV 19** App Store Connect record, Apple ID `6759344672`. The verified bundle identifier is `com.example.rctv19App`, team `CLHYNTLNBG`. The existing iOS app remains unchanged.

Target `RCTV19TV`, version **1.0 (1)**, minimum tvOS 17.0, was uploaded successfully on **September 23, 2026 at 10:17 p.m. Central**, then processed and selected for the tvOS release. Apple confirmed **1 Item Submitted / Waiting for Review** at **10:22 p.m. Central**. It is **submitted, not approved**. Automatic release after approval is selected, with the owner's explicit authorization.

Submission: [75020b41-54e6-4530-87d5-5876d8f0f201](https://appstoreconnect.apple.com/apps/6759344672/distribution/reviewsubmissions/details/75020b41-54e6-4530-87d5-5876d8f0f201). Selected build ID: `d1b18a7d-0c7f-43bc-a319-39dcb6e07c89`.

Metadata, screenshots and reviewer information are complete. The owner explicitly approved publishing the shared App Privacy label: **Other Diagnostic Data**, used for **App Functionality**, **linked to identity**, **not used for tracking**. This describes provider connection-data processing; the app has no viewer-account database or tracking SDK. [REVIEW-NOTES.md](REVIEW-NOTES.md) records the review instructions and actual verification scope.

This directory is a separate RCTV implementation. It contains no Sports app binary, screenshots, signing files or generated Xcode workspace.

## Programming and appearance

The app reads `https://watch.rctv19.com/api/catalog.json` and requires channel ID `rctv19`. The home screen shows the station's original logo, Watch Live and an image card for each on-demand show. Categories provide stable show identifiers; each show's optional `seriesThumbnail` takes priority over its episode images. Selecting a show opens its episode gallery. Episodes keep their individual artwork and offer Resume or Start from beginning.

The initial catalog has one show, **Mt Zion Church Sermons**, and three owner-authorized items: Mt Zion Sermon — September 20, 2026; Mt Zion Sermon — August 23, 2026; Mt Zion Children — September 20, 2026. The publisher confirmed permission to stream all three; this does not claim that Mississippi News Group produced or owns the church recordings. Additional programs appear after they are published to the shared catalog and the app loads or refreshes it.

Playback uses native AVKit, pauses in the background, saves unfinished replay positions locally, releases video on exit and provides Retry/Back controls on playback failure. No login, analytics or advertising SDK is included. Sponsor mentions/logos within programming do not add an advertising SDK. The packaged privacy policy is generated from the current RCTV streaming policy and describes local, religious and community programming plus Cloudflare delivery processing. Support is `myersgrouponline@gmail.com`.

## Rebuild artwork and privacy text

From the `streaming` directory, with its Node dependencies installed:

```text
node apps/apple-tv/scripts/generate-assets.mjs
```

Only files inside this Apple TV directory are written. The script fits the station's existing `assets/source-logo.jpg` into layered app icons and top-shelf images without redrawing it. It also copies the current RCTV live/show placeholder artwork and packages `public/privacy.html` as readable text. Generated artwork is included so the Mac does not need Node to compile.

## Build and verify on the Mac

The release workspace is `/Users/jonmyers/RCTV19Build/2026-09-23-source/apple-tv`. The simulator build passed using **Xcode 26.3 (17C529)**, the **tvOS 26.2 SDK** and a tvOS 26.2 Apple TV simulator. Keep future source transfers separate from private keys, old generated projects, DerivedData and other apps' archives. Temporary SSH access was restored for the existing Windows PC at `192.168.68.54`, expiring September 25, 2026; no private key is stored here.

The script uses an existing XcodeGen on PATH, or `XCODEGEN_BIN_DIRECTORY`. The prior shared tool installation can be selected without modifying it:

```bash
export XCODEGEN_BIN_DIRECTORY="$HOME/MississippiSportsBuild/tools/xcodegen-2.46.0/xcodegen/bin"
export TVOS_SIMULATOR_ID='E781D6D7-CD23-4083-97F1-5264C39CB743'
bash scripts/mac-build.sh preflight
bash scripts/mac-build.sh build
bash scripts/mac-build.sh test
bash scripts/mac-build.sh test-playback
```

All **seven native unit tests passed**, with evidence at `build/CatalogRegression.xcresult`. They cover exact RCTV bundle/catalog resources, duplicate IDs and insecure URLs, the real three-item catalog fixture and show cover, grouping/order/fallback behavior, insecure series artwork and replay persistence/completion behavior.

The remote-driven playback UI test **passed in 116.310 seconds**, with evidence at `build/PlaybackFlow.xcresult`. It exercised live playback, the grouped gallery, replay, Back, actual Resume near a saved 42-second position, forward seeking, background pause/return and the privacy screen. Rerunning it requires the catalog and live feed to remain reachable.

Genuine 1920×1080 simulator screenshots were exported from the XCTest attachments without changing their image bytes and visually reviewed. The store images are `../../assets/store/apple-tv-home-1920x1080.png`, `apple-tv-episodes-1920x1080.png` and `apple-tv-replay-1920x1080.png`. No physical Apple TV or human listening test was performed; simulator verification does not establish audible sound quality on a physical device.

The device archive at `build/RCTV19TV.xcarchive` succeeded. Local export also succeeded with automatic signing through the existing authorized Xcode account using the team's **Cloud Managed Apple Distribution** certificate. Bundle `com.example.rctv19App`, team `CLHYNTLNBG`, version 1.0 and build 1 were verified. A separate Xcode export with destination `upload` completed successfully at the time recorded above.

For future builds, the script's `archive` mode creates an **unsigned** archive. `Configuration/ExportOptions.plist` defaults to automatic signing and local export; it does not upload by itself. Check the current platform/version/build record before signing or uploading another build.

Keep the RCTV live source running and its replay library available while Apple reviews the submission. Check App Store Connect for Apple's outcome and respond to any review findings; successful upload and submission do not establish approval. Keep the simulator-only and audio-test limitations explicit. Apple may request documentary evidence of content rights; permission stated in the conversation is not a substitute for a signed agreement if Apple requests one.

## Preparation checks

The Windows preparation step generated the resources and checked 21 asset manifests, 16 image references, expected image dimensions/opacity, plist XML, and absence of Sports branding/URLs in shipping files. Those static checks supplement the actual Mac build/test/signing/upload results above. The Apple-folder `.gitattributes` keeps shell build scripts in LF format for future Windows checkouts and Mac transfers.
