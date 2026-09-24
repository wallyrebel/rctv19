# RCTV 19 tvOS review notes

Build 1.0 (1) was uploaded on September 23, 2026 at 10:17 p.m. Central, processed and selected. Apple confirmed **1 Item Submitted / Waiting for Review** at **10:22 p.m. Central** after the owner explicitly approved submission and automatic release after approval. This records submission, not Apple approval.

Submission: [75020b41-54e6-4530-87d5-5876d8f0f201](https://appstoreconnect.apple.com/apps/6759344672/distribution/reviewsubmissions/details/75020b41-54e6-4530-87d5-5876d8f0f201). Selected build ID: `d1b18a7d-0c7f-43bc-a319-39dcb6e07c89`. Store metadata, genuine screenshots and reviewer information are complete.

RCTV 19 is Ripley Community Television, operated by Mississippi News Group. This native Apple TV addition uses the existing RCTV 19 listing and bundle `com.example.rctv19App`. The existing iOS app is unchanged.

The app is free to watch and requires no account, subscription or activation code. Select Watch Live for the current RCTV broadcast. Open the Mt Zion Church Sermons show tile to choose one of the three launch programs. Press Back during playback to return to that show's episodes, then Back again to return home. An unfinished replay offers Resume or Start from beginning. Refresh programming reloads the shared catalog; Help & privacy provides support information and the full streaming privacy policy.

The publisher confirmed permission to stream Mt Zion Sermon — September 20, 2026; Mt Zion Sermon — August 23, 2026; and Mt Zion Children — September 20, 2026. This statement records permission, not ownership or production of the church recordings. Live programming must likewise be limited to authorized RCTV programming. Any documentary permission requested by App Review must be attached separately; no outside agreement or signature has been fabricated.

Catalog delivery uses `watch.rctv19.com`; live video uses `live.rctv19.com`; replays use `vod.rctv19.com`. Cloudflare provides hosting and delivery. Replay position is stored only on the Apple TV. There is no viewer account, advertising identifier, tracking cookie, advertising SDK or analytics SDK. Provider connection data used for delivery/security is described in the packaged policy and at `https://watch.rctv19.com/privacy/`. The shared App Privacy label was published with the owner's explicit approval: Other Diagnostic Data, used for App Functionality, linked to identity, and not used for tracking. Support: `myersgrouponline@gmail.com`.

Verified with Xcode 26.3 (17C529), tvOS SDK 26.2 and the tvOS 26.2 Apple TV simulator: simulator build succeeded; all seven native unit tests passed; the remote-driven playback test passed in 116.310 seconds. The playback test exercised live video, show/episode navigation, replay, Back, actual Resume near a saved 42-second position, forward seeking, background pause/return and the privacy screen. Genuine 1920×1080 home, episode-gallery and replay screenshots were exported unchanged from XCTest attachments and visually inspected.

The device archive and local automatic distribution-signing export succeeded for bundle `com.example.rctv19App`, team `CLHYNTLNBG`, using the existing Cloud Managed Apple Distribution certificate. Xcode's upload export succeeded. No physical Apple TV or human listening test was performed; simulator verification does not establish audible sound quality on a physical device.

Internal evidence (not required in the reviewer-facing notes): Mac workspace `/Users/jonmyers/RCTV19Build/2026-09-23-source/apple-tv`; `build/CatalogRegression.xcresult`; `build/PlaybackFlow.xcresult`; `build/RCTV19TV.xcarchive`. Keep the RCTV live feed running and the replays available during review, then address any actual Apple findings.
