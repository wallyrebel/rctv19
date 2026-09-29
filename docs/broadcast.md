# RCTV19 unattended broadcast

## Addresses and operation

The live channel is https://rctv19.com/broadcast/; the read-only operating dashboard is https://rctv19.com/broadcast/status/.
Use the channel URL as a 1920 × 1080 Web Browser input in vMix 28, with browser audio enabled.
Your custom RTMP output stays in vMix. Cloudflare serves the page and refreshed data, not an encoded RTMP video stream.

The `Evening Briefing` MP3 loops at 15% volume in a persistent audio element outside every slide.
Normal browser autoplay restrictions can require one click: use `?controls=1` for the player, or `?audio=off` for silence.
The page never reloads itself to refresh content. News, ad transitions and data polling do not reload the audio source.

## Editorial rotation

- Twenty recent unique stories balanced across Tippah News (category IDs 7 or 2107 only), Tippah Sports, Alcorn News MS, RCTV19, Union News MS, DeSoto County News, Prentiss News, News Tupelo and Sports Mississippi. Each publisher gets a turn before taking its next-newest story; items older than 14 days do not air.
- Original URLs, canonical URLs and normalized identical headlines remove syndicated duplicates. RCTV19 exports original source URLs from its existing article metadata. Similar stories without matching provenance are not automatically merged on guesses.
- Featured image, source, publication date, headline and supplied excerpt; missing pictures use the station background.
- Current NWS conditions at Corinth (KCRX), the first reporting station supplied by the Ripley NWS gridpoint. The station and observation time are displayed. Temperature, heat index/wind chill when available, wind, humidity and forecast rain chance appear in the sidebar. Missing values are not invented; observations older than two hours are withheld. A scrolling seven-day list names each weekday with highs, overnight lows and rain chance; the full seven-day board appears about every three minutes in the main rotation. Forecast represents Ripley / central Tippah County. Active alerts cover all Tippah County.
- Varsity boys/girls high schools in Tippah and Alcorn counties, Blue Mountain Christian and Northeast Mississippi Community College.
- Obituaries published in the past seven rolling days, with photo, dates, funeral home and original service paragraphs when available. Full notices remain linked on the website; no AI rewrites.
- A recurring “Download the RCTV 19 app on Roku, Amazon Fire or Apple TV” promotion.
- All four approved Mississippi Sports sponsors plus “Your ad here” at **662-576-1554**. Sidebar rotates every 20 seconds. Main ad break starts every 15 minutes, showing each sponsor and house ad for 15 seconds (75-second break with four sponsors).

Tippah County tornado, severe thunderstorm and flash-flood warnings interrupt all ordinary slides and advertising. Watches and other advisories appear in a banner. Warning messages are from NWS, restricted to Actual alerts; expiry is checked every second. Successful empty feeds remove canceled alerts. A failed fetch retains an active warning only until its expiry. Multiple warnings rotate.

## Collection and gaps

| Source | Collection | Notes |
|---|---|---|
| All eight WordPress news/sports publishers | 10 minutes | WordPress posts and featured media |
| RCTV19 content | 10 minutes | Includes news provenance and obituaries; site import jobs still determine when items are published |
| Tippah Sports schedule | 12 hours | Structured SportsEvent list; reversed duplicates collapsed |
| Existing Mississippi Sports collector | 12 hours | Local filtering, including Blue Mountain Christian; service binding avoids new statewide scraping |
| Northeast official composite | 12 hours | Seven days back and ahead; two numerical scores plus explicit Final required |
| NWS alerts | 1 minute | MSC139 / MSZ004 / SAME 028139; checks Mississippi active alerts |
| NWS forecast | 15 minutes | Suppressed if collection is over two hours old or forecast issuance over 24 hours old |
| NWS current observation | 10 minutes | Corinth KCRX; actual observation must be at most two hours old |

The worker runs independently of open browsers. The channel polls stored snapshots every 30 seconds, which does not increase provider fetching. Last-success times, errors and coverage gaps belong on the status page only. Unknown, conflicting, stale and unreported scores are not presented as confirmed finals. A successful sports aggregator request is not proof that every upstream provider works; upstream health is shown separately.

Known gaps: the existing cloud MaxPreps collector and the new Northeast official calendar collector receive HTTP 403; complete high-school and Northeast score coverage is unavailable. Northeast parsing succeeded locally but is not presented as verified cloud collection. AlcornSportsMS.com/schedule returns 404. Tippah's schedule includes some Alcorn opponents but is not a complete Alcorn calendar. School reporting can be late. The system does not infer scores from news prose or circumvent provider blocks. Email notifications are not configured.

## Editing and deployment

Edit `src/_data/broadcast.json` for sponsor images, phone, music and API URL. Sponsor/music files are under `src/assets/broadcast/`. All existing site pages, news import jobs and obituary import rules are preserved.

Run `npm test`, `npm run build` and `node node_modules/typescript/bin/tsc -p workers/broadcast/tsconfig.json`.
Local preview: `node scripts/broadcast-preview.mjs`, then http://127.0.0.1:4322/broadcast/.
Local-only `?slide=app`, `?slide=weather`, `?slide=sports`, `?slide=obituary` and `?slide=ad` simplify visual checks. They are ignored on public hosts.

Worker: `rctv19-broadcast`, D1: `rctv19-broadcast`, one-minute Cron Trigger.
Worker config: `workers/broadcast/wrangler.jsonc`; migrations: `workers/broadcast/migrations/`.
Deploy worker with `wrangler deploy -c workers/broadcast/wrangler.jsonc`.
RCTV19 Pages builds Eleventy from Git. A preview uses `codex/rctv19-broadcast`; promotion to main publishes `/broadcast` on the main domain.
Worker `CONTENT_URL` is https://rctv19.com/broadcast/content.json so news and obituaries follow ongoing main-branch imports. Publish the Pages content endpoint before deploying a Worker that starts using it.

No new AI calls, video encoding service or paid media API is required by this channel. Cloudflare usage remains subject to the account's existing plan and limits.
