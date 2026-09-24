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

Status: **draft; not submitted or approved**.

- Developer app ID: `amzn1.devportal.mobileapp.55c3e4fdbb51453aa7b582dd2a5a5640`
- Draft release ID: `3b30ff5ef8ed4b4f81e2c5a9647db0ea`
- Android package: `com.rctv19.tv`
- Uploaded and accepted APK: version `1.0.0` (1)
- Device targeting: 91 Fire TV models; 0 tablets and 0 automotive devices.
- User-confirmed programming declarations: sponsor logos/mentions only, ordinary local/church content, general intended audience ages 13 and older.
- Required store artwork includes the 1280×720 Fire TV icon and the opaque 1920×1080 background in `assets/store/`.

This is a new RCTV 19 Fire OS record. It does not automatically update or transfer the existing FrontLayer app. The draft remains incomplete: finish the rating form, actual app screenshots, review information and final submission steps. APK acceptance is not store approval. [AMAZON-REVIEW-NOTES.md](AMAZON-REVIEW-NOTES.md) contains working listing/review copy; any initial-build limitations there must be reconciled with actual later test results before use.

## Roku

Status: **draft; not submitted or approved**.

- Developer draft app ID: `883607`
- Intended version: `1.0.0`
- Development source: `apps/roku/`
- RCTV development app 1.0.0 is installed successfully on the owner's Roku TV at `192.168.68.50`; the installer reported 619,937 bytes received, matching the built package.
- The owner confirmed live picture/sound, Mt Zion replay picture/sound, and Back twice from playback through episodes to home all work.
- An actual 1280×720 Roku home screenshot is saved at `output/roku-test/home-actual-tv.jpg`. It shows the distinct live and show artwork.
- Resume, trick-play previews, deep links, screensaver checks, signing and automated validation remain pending; device playback success is not store approval.

A development ZIP is not a signed store package or an approved app. Finish physical Roku testing, screenshots, signing with the intended RCTV identity, upload and automated validation before submission. This draft does not automatically transfer FrontLayer's existing RCTV installations. Working review copy is in [ROKU-REVIEW-NOTES.md](ROKU-REVIEW-NOTES.md).

## Apple TV

Status: **deferred until Amazon and Roku are ready**.

The user reports an existing RCTV 19 Apple app. Confirm its App Store Connect record, ownership, bundle ID and signing/update path before changing it. No Apple TV submission or approval is recorded for this new streaming implementation.

## Remaining release gates

- Complete sustained playback/reconnect checks for the now-verified RCTV live feed.
- Verify RCTV replay picture and sound, seeking, remote navigation and lifecycle behavior on the intended platforms.
- Capture screenshots from the actual RCTV app builds.
- Finish accurate content, audience, privacy, advertising and rights declarations for RCTV programming.
- Submit the new Amazon/Roku drafts and record the stores' actual review outcomes here.
- Keep the existing FrontLayer service available until the replacement is ready for viewers.
