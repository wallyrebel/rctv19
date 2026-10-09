# RCTV19 weather hub

## Routes

- Public: `https://rctv19.com/weather/`
- Fixed vMix: `https://rctv19.com/weather/broadcast/fixed/`
- Rotating vMix: `https://rctv19.com/weather/broadcast/rotating/`
- Equivalent query modes: `/weather/?view=fixed` and `/weather/?view=rotating`.
- Same-site cached API: `/api/weather`.

Use a 1920 × 1080 vMix browser input. The broadcast canvas is exactly 1920 × 1080 with no scrollbars, navigation or ad scripts. It scales uniformly for smaller preview windows. Radar stays visible in both views. The rotating panel advances every 25 seconds: cameras, alerts, forecast, cameras, news, track. Active Mississippi warnings occupy the alert slot and stay visible in a compact warning strip during other slots; the ticker continues. Cameras appear immediately and cycle through Biloxi, Gulfport and Bay St. Louis. Official warning colors, areas, issue and expiry times are preserved.

## Architecture and deployment

The existing site is `wallyrebel/rctv19`, built with Eleventy. Its README documents Cloudflare Pages builds on pushes to `main`. `.github/workflows/build.yml` validates the site; it does not deploy the existing standalone broadcast worker. The weather API is a root Pages Function in `functions/api/weather.js`, compiled automatically by the existing Pages Git integration. It requires no new credentials, database bindings or schedules. Every other route continues to use existing static assets. The existing `/broadcast/` worker, its D1 database, one-minute cron, source intervals and all RSS/obituary workflows are unchanged.

The weather function uses Cloudflare's Cache API, a disjoint cache namespace, and source-specific collection times. Cache entries retain the last good payload and the latest failed attempt. The edge cache can be evicted; a cold cache or failed first request is explicitly unavailable. Last-good retention is not guaranteed durable storage. Active vMix/browser clients poll the same-site API every 30 seconds; polling drives collection only when a source is due. Provider requests are cached per Cloudflare location, with in-process deduplication. Provider refreshes do not reload the page or interrupt radar playback. No assistant automation is needed. Regular mode stops fetching NHC and Isaias-only news.

| Source | Minimum interval | Display checks |
| --- | --- | --- |
| NHC CurrentStorms + discovered products | 5 minutes | Exact `al092026` / Isaias / 2026 match; official issuance at most 6 hours old; no future issue time |
| NWS alerts | 60 seconds | Actual messages only; active effective/expiry windows; Mississippi first; delayed after 3 minutes |
| NOAA QCd base reflectivity capabilities | 5 minutes | Actual frame instants; latest frame at most 15 minutes old |
| NWS forecasts: Biloxi, Jackson, Tupelo, Ripley | 15 minutes | Official `updateTime` at most 24 hours old; missing measurements remain unavailable |
| Tippah News Isaias headlines | 10 minutes | Title includes Isaias; publication cannot be future-dated; dated publisher attribution |

Radar uses the official NOAA WMS `conus_bref_qcd` service, not NWS's forecast API. It preloads up to 18 actual available frames at roughly six-minute spacing, loops at 700 ms/frame, and retains the previous loop while new frames load. Failed frame/map requests show a conspicuous delayed label; fewer than two frames never masquerade as animation. Geographic bounds are identical for the Esri basemap, label layer and NOAA image and match the output aspect ratio. The official reflectivity legend, latest frame time and per-frame time remain visible. The public view offers pause/play and Mississippi-region controls. Reduced motion pauses the public radar by default. No third-party iframe is required.

NHC product URLs are discovered from the matched storm's current feed, then verified again against the storm ID. Supplementary advisory/track failures are independent of valid storm measurements. The public advisory is shown verbatim with the original NHC link; the image retains its own legend and issue time. News is attributed publisher coverage, not official measurements. Outage totals and closures are not copied from the article or invented. Satellite imagery is not included in this first implementation.

## Optional sponsors and verified launch

The intended originals are the supplied Mama Justice banner (1000 × 450) and Steven Eaton / Modern Woodmen image (500 × 500). They must be transferred through the supported Library flow, visually inspected, preserved unchanged under `src/assets/weather/sponsors/`, and named in `weather/config.mjs`. `object-fit: contain` preserves their proportions. No substitute sponsor artwork is included. The user approved publication without sponsors. Empty sponsor sections remain hidden on all views, with no placeholder or reserved gap. Adding an approved image path to the config later reveals the section without changing the launch clock.

Local Library materialization returned `library file transfer failed: download failed with HTTP status 403` for both originals, including the single bounded retry. No alternate transfer route was attempted. The smallest supported user step is to download the two original Library files on the Mac and attach the local originals to this Codex task, or provide their existing local paths. No raw credentials are needed.

`weather/config.mjs` owns `launchAt` and `modeOverride` (`auto`, `storm`, `regular`). `launchAt` remains null until the public launch has been verified. Do not replace it with a build time or preview time. Publish and verify all three public routes, source responses and browser views. Then run `node scripts/weather-launch.mjs` in the managed checkout. It verifies the public routes and radar/alerts API, stamps the first verified UTC launch and prints the exact expiry in America/Chicago. Publish that config through the same Git integration and verify API `expiresAt`. Expiry is always exactly 48 hours after that verified launch, including across time-zone changes. Subsequent builds preserve the original launch. Both server and browser transition to regular Mississippi weather without a reload. The launch helper reports the real UTC launch and Central expiry after verification.

Cloudflare's absent local CLI login is not needed for this Pages function route. Do not run `wrangler login`, create tokens, add secrets, or change permissions merely to publish this change. Use existing authenticated GitHub access and the existing main-branch Pages integration once the requested weather checks pass. Reconcile new main-branch news imports before pushing; retain all unrelated changes. Verify Cloudflare's actual deployment and live endpoints after push, rather than equating a successful Git operation with a live launch.

## Local validation

```sh
npm ci
npm test
npm run build
WRANGLER_LOG_PATH=.research/wrangler-log node node_modules/wrangler/bin/wrangler.js pages functions build functions --outdir .research/weather-function-build
node scripts/weather-preview.mjs
```

Preview: `http://127.0.0.1:4323/weather/` and the same broadcast subpaths. Source snapshots are ignored under `.research/`; they contain actual fetched source responses, not production seed data. No weather facts are hardcoded into the UI. Regular mode can be inspected with `WEATHER_PREVIEW_PORT=4325 WEATHER_PREVIEW_MODE=regular node scripts/weather-preview.mjs`, after copying actual snapshots to `.research/weather-snapshots-4325.json`. The nine weather tests cover identity/year/slot reuse, future dates, actual radar instants, exact expiry/override, unknown versus empty alerts, official alert expiry, forecast metadata, failure retention/recovery independent cache intervals and stopping storm-only collection after the transition. The existing full suite and site resource/sitemap/ad safeguards remain required.

`/weather/build.json` exposes the non-secret `CF_PAGES_COMMIT_SHA` build marker so the exact live commit can be checked independently of the Git push.

## Coastal traffic cameras

The public hub embeds FDOT’s official Panhandle camera map using the code generated by https://www.fl511.com/Map/EmbeddedMapSetup (Panhandle, Cameras). Users select a camera marker and choose Show Video when available. Snapshots are not labeled live video. Capture time is provider-owned and cannot be verified from the cross-origin viewer; the UI states it is unavailable here and directs viewers to the provider timestamp. There is no recording, proxy, stream extraction or camera freshness claim.

The public hub plays the public HLS streams referenced by MDOT’s official streamcam players for Biloxi (050303), Gulfport (050204) and Bay St. Louis (052618), discovered through the official camera list and Switch to Video control. The owner confirmed MDOT permission for Mississippi on October 9, 2026. A muted inline video starts automatically using native HLS or locally served hls.js 1.7.3. Streams are fetched directly from MDOT with public CORS support; no credentials, proxy or recording are used. Playback interruptions are labeled, retries are bounded to one per 20 seconds, and removed players release their connections. A selector uses only those reviewed player IDs. Capture time and interruptions are explicitly disclosed rather than claimed as verified fresh.

The complementary broadcast rotation includes Mississippi video even during active warnings; the warning strip and radar remain visible. Both broadcast routes support ?panel=cameras for a persistent camera panel, optionally &camera=050204 or &camera=052618. Official links cover MDOT’s Mississippi coastal presets and ALDOT’s Mobile/Baldwin coastal cameras. ALDOT’s explicit retransmission restriction (https://www.algotraffic.com/cameras) means ALDOT video remains link-only until the owner obtains permission. FDOT’s supported embedded map remains available in the public hub. All three MDOT streams have official-player fallback links. Playback progress is monitored, but source capture timestamps remain unavailable and the UI does not claim verified capture freshness.
