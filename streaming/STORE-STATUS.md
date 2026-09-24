# RCTV 19 store and deployment status

Development snapshot: September 23, 2026. This file records RCTV 19 only.

## Website, storage and content

- `https://watch.rctv19.com/` is deployed through Cloudflare; the main station site remains `https://rctv19.com/`.
- Verified deployment: `a4e6a478-d9c7-4a62-a59c-f70bec426bdc`. The catalog includes the verified live URL `https://live.rctv19.com/rctv19/index.m3u8`.
- The shared catalog publishes three Mt Zion programs, with permission confirmed: Mt Zion Children — September 20, 2026; Mt Zion Sermon — August 23, 2026; Mt Zion Sermon — September 20, 2026.
- Public replays use `vod.rctv19.com` and the separate `rctv19-vod` bucket, including episode images and Roku BIF previews.
- `rctv19-live` is separate. The approved one-day lifecycle rule applies only to its `rctv19/` live-buffer prefix. No automatic deletion rule is applied to the replay library.
- Upload keys are saved privately outside Git/OneDrive, separately scoped to the live and replay buckets.
- The isolated live test helper is running manually on this PC: RTMP `19360`, HLS `18898`, status `19361`, private runtime `~/.rctv19-streaming`. No RCTV 19 startup/recovery task has been installed. No rented VM exists.

## Amazon Fire TV

Status: **Submitted; not yet approved**.

- Developer app ID: `amzn1.devportal.mobileapp.55c3e4fdbb51453aa7b582dd2a5a5640`
- Submitted release ID: `3b30ff5ef8ed4b4f81e2c5a9647db0ea`
- Android package: `com.rctv19.tv`
- Uploaded and accepted APK: version `1.0.0` (1)
- Distribution: United States. Device targeting: 91 Fire TV models; 0 tablets and 0 automotive devices.
- User-confirmed programming declarations: sponsor logos/mentions only, ordinary local/church content, general intended audience ages 13 and older.
- Full listing, required store artwork and three actual app screenshots are saved, including the 1280×720 Fire TV icon and opaque 1920×1080 background in `assets/store/`.
- The 13+ intended audience, rating and privacy forms are saved. Privacy covers technical IP/device identifiers solely for functionality and security; there are no viewer accounts or tracking database. Cloudflare is disclosed as a service provider, not third-party data sharing.
- Official Android TV emulator checks passed for live/replay video, remote navigation, playback controls and lifecycle behavior. Physical Fire TV testing and audible sound verification remain unperformed.
- Reviewer instructions were saved, including the physical Fire TV/audio testing limitation. The owner explicitly approved the final export declaration and submission.
- Amazon confirmed **SUBMITTED / App Submission Successful** on **September 23, 2026, at 7:21 PM PDT**. No new action was required on the status page at that time.
- Amazon's estimated Appstore date was **September 28, 2026, at 7:30 PM PDT**. This is an estimate, not approval or a guaranteed publication date.

This is a new RCTV 19 Fire OS record. It does not automatically update or transfer the existing FrontLayer app. Await Amazon's review outcome and address any findings; submission is not store approval. [AMAZON-REVIEW-NOTES.md](AMAZON-REVIEW-NOTES.md) records the submitted reviewer instructions and completed emulator checks with their limits.

## Roku

Status: **draft; not submitted or approved**.

- Developer draft app ID: `883607`
- Intended version: `1.0.0`
- Development source: `apps/roku/`
- RCTV development app 1.0.0 is installed successfully on the owner's Roku TV at `192.168.68.50`; the installer reported 619,937 bytes received, matching the built package.
- The owner confirmed live picture/sound, Mt Zion replay picture/sound, and Back twice from playback through episodes to home all work.
- An actual 1280×720 Roku home screenshot is saved at `output/roku-test/home-actual-tv.jpg`. It shows the distinct live and show artwork.
- Store listing, app profile and monetization drafts are saved in Roku: United States, Live TV, not made for kids, Content not rated, internet required, no sign-in, and free with no in-app purchases or inserted video ads. Sponsor logos/mentions do not imply an advertising SDK.
- The English title/descriptions, official 540×405 poster and actual TV home screenshot are uploaded and saved. `output/roku-test/home-store-1920x1080.png` is the exact capture resized to Roku's required 1920×1080 dimensions, with no content changes.
- Support, privacy, terms and station URLs are saved, with the authorized business email and private reviewer contact. Roku's overview marks Listing setup, Store assets, App profile and Monetization setup complete.
- Version 1.0.0 was successfully signed on the TV as `Pfc96151bdcc055d77b1d6422aaea162b.pkg` using the existing developer identity `4002a0fc204acb05852a69a6bf7eb2ce6f404a4c`. The approved existing credential was used privately; no key reset or replacement occurred.
- Edge blocked the package download. The Codex terminal did not appear for the owner, so `output/Download RCTV Roku Package.cmd` is prepared for manual launch and private device-password entry. The signed PKG has not yet been downloaded locally or uploaded to the store portal.
- Resume, trick-play previews, deep links, screensaver checks and automated validation remain pending; device playback success is not store approval.

The signed package currently exists on the TV only. Complete its download, remaining physical Roku tests, store package upload and automated validation before submission. Schedule publishing remains disabled while Package & testing is incomplete. This draft does not automatically transfer FrontLayer's existing RCTV installations. Working review copy is in [ROKU-REVIEW-NOTES.md](ROKU-REVIEW-NOTES.md).

## Apple TV

Status: **deferred until Amazon and Roku are ready**.

The user reports an existing RCTV 19 Apple app. Confirm its App Store Connect record, ownership, bundle ID and signing/update path before changing it. No Apple TV submission or approval is recorded for this new streaming implementation.

## Remaining release gates

- A later live-feed check at 2026-09-24 02:23 UTC still passed: sequence 327 advanced to 329, video segments returned cache HIT, HTTPS and CORS were valid. Reconnect/failover testing remains pending.
- Complete Roku-specific Resume, trick-play preview, deep-link and screensaver checks, download/upload the signed package and run automated validation. Live/replay picture, sound and Back navigation are already owner-confirmed.
- Physical Fire TV testing remains unperformed; keep that limitation explicit in reviewer instructions. The official TV emulator checks and actual app screenshots are complete.
- Await Amazon's review outcome for the submitted version and address any findings.
- Submit the Roku draft when its remaining requirements are complete and record the stores' actual review outcomes here.
- Keep the existing FrontLayer service available until the replacement is ready for viewers.
