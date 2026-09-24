# RCTV 19 streaming

RCTV 19's independent live and on-demand platform for the website, Roku, Amazon Fire TV and, later, Apple TV. The public watch site is deployed at https://watch.rctv19.com/. The station's main website remains https://rctv19.com/.

This `streaming/` project is separate from the parent website's build and from the Mississippi Sports installation. The new platform is being prepared alongside the existing FrontLayer service. Do not cancel FrontLayer or assume its installed apps will migrate automatically.

## Current state

- The watch website and shared catalog are deployed through Cloudflare.
- Three Mt Zion programs are publicly available, with the owner's permission confirmed. They have HLS video, episode pictures and Roku fast-forward previews.
- A separate RCTV 19 live receiver/helper is running manually on the development PC for testing. No startup or recovery task has been installed for RCTV 19 yet. Production broadcasting is intended for another local computer, with a shared rented VM possible later; no VM has been rented.
- Amazon and Roku have new draft store records. Neither RCTV 19 draft has been submitted or approved. See [STORE-STATUS.md](STORE-STATUS.md).
- Apple TV follows Amazon and Roku. The user reports an existing Apple RCTV 19 app; its ownership and update path must be checked before creating or submitting an Apple build.

## Project layout

| Folder | Purpose |
| --- | --- |
| `catalog/rctv19.json` | One public program catalog shared by the player and apps |
| `public/` | Watch page, embedded player, support/privacy pages and web artwork |
| `apps/roku/` | BrightScript/SceneGraph app |
| `apps/fire-tv/` | Native Fire OS app |
| `assets/` | Original RCTV 19 logo and store artwork |
| `lib/`, `scripts/` | HLS publishing, replay preparation, validation and build tools |
| `deploy/local/` | Isolated Windows broadcaster and desktop show-publishing workflow |
| `deploy/live/` | Unused future VM ingest template |
| `dist/` | Generated packages and website output; ignored by Git |

## Development

Run these commands from this `streaming/` directory with the supported Node.js runtime:

```sh
npm ci
npm test
npm run check:catalog
npm run build:web
npm run build:roku
```

`npm start` runs the local website development server. Building output does not publish it or submit an app. `scripts/build-web.mjs` uses an explicit file allowlist so credentials, recordings and source files are not deployed. App-specific build and signing instructions are in [apps/README.md](apps/README.md).

## Broadcast and replay isolation

The default private runtime is `%USERPROFILE%\.rctv19-streaming` on Windows, or `~/.rctv19-streaming` on other systems. `RCTV_BROADCAST_DIRECTORY` can select a dedicated absolute private folder. It must stay outside Git and OneDrive; real upload/signing keys are saved separately there, not in this repository.

| Component | RCTV 19 target |
| --- | --- |
| Local RTMP | `127.0.0.1:19360`, stream path `rctv19` |
| Local HLS | `127.0.0.1:18898` |
| Helper status | `127.0.0.1:19361` |
| Live bucket / domain | `rctv19-live` / `live.rctv19.com` |
| Replay bucket / domain | `rctv19-vod` / `vod.rctv19.com` |
| Viewer website | `watch.rctv19.com` |

The actual stream key remains in the private runtime. The live bucket has the approved one-day lifecycle rule for the `rctv19/` live-buffer prefix. The replay bucket has no automatic deletion rule. Live and replay upload credentials are separately scoped. Cloudflare usage remains metered; these settings do not guarantee a zero bill.

The uploader preserves encoded video/audio quality and suppresses unnecessary master-playlist uploads. New live segments and changing media playlists still upload continuously. See [deploy/local/README.md](deploy/local/README.md) for the local encoder workflow and [deploy/live/README.md](deploy/live/README.md) for the future VM plan.

The desktop replay workflow prepares a video, lets the operator review it, uploads complete assets, verifies them publicly, and publishes the catalog. Uploading a random file directly to a bucket does not automatically create a show entry.

## Before public app release

Finish RCTV-specific live and replay testing, capture actual app screenshots, preserve each app's signing identity, complete accurate content/privacy/rights declarations and submit each draft for review. Store approval is an external review outcome, not a result of building or uploading files. Existing Mississippi Sports test results do not establish RCTV 19 compatibility or approval.
