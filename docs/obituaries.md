# Obituaries

RCTV19 publishes obituaries from the funeral homes serving Ripley and Tippah County, with their permission, at `/obituaries/`.

## The one rule

**Obituaries are never rewritten.** Not by a person, not by a model. A name, a date, a survivor's relationship or a service time that has been paraphrased is an error printed under a family's worst week. The text is republished exactly as the funeral home wrote it, with attribution and a link back to their notice, which stays the authority on service times.

No model is involved anywhere in this pipeline. `scripts/obituary-sources.js` extracts; it does not summarize. A test asserts the published body is byte-for-byte identical to the source text.

## Current status: all three sources are blocked

Every funeral home site sits behind Cloudflare bot protection, so a server-side request is refused:

| Funeral home | Platform | Listing page | Obituary sitemap |
| --- | --- | --- | --- |
| McBride Funeral Home | funeralOne | HTTP 403 | HTTP 403 |
| Ripley Funeral and Cremation Services | CFS / Tribute | HTTP 403 | HTTP 403 |
| Foster & Son Funeral Home | CFS / Tribute | HTTP 403 | HTTP 403 |

McBride occasionally lets a request through — one individual obituary page returned 200 while the listing returned 403 in the same minute — but that is inconsistent and not something to schedule a daily job against.

`robots.txt` on all three **allows** crawling the obituary pages. The block is the platform's bot protection, not the funeral home's stated wishes, and RCTV19 already has permission to republish. So this is a settings problem, and it is fixed by asking rather than by engineering.

**What this repository will not do:** rotate user agents or IPs, solve or bypass the Cloudflare interstitial, or drive a headless browser to look like a person. The fetcher identifies itself honestly as `RCTV19-ObitBot/1.0`, waits three seconds between requests, and stops when it is refused.

## What to ask each funeral home for

Any one of these turns the daily job on. The first is the least work for them.

**1. Allow our crawler (easiest).** Ask their website contact to allow the user agent `RCTV19-ObitBot` on the obituary pages. For CFS/Tribute sites, that is a support ticket to Tribute Technology. For funeralOne, a ticket to funeralOne support. Wording that usually works:

> We have given RCTV19 (rctv19.com), our local television station, permission to republish our obituaries. Their crawler identifies itself as "RCTV19-ObitBot" and reads only our public obituary pages, twice a day. Please allow it through the site's bot protection.

**2. An obituary feed.** Both platforms can syndicate obituaries to media partners — this is a product they sell, not a favor. Ask for "an obituary RSS feed or syndication feed for our media partner." If you get a feed URL, add it to `SOURCES` in `scripts/obituary-sources.js`.

**3. Email (works regardless of platform).** Funeral homes already email obituaries to newspapers and radio. Ask to be added to that distribution list at a dedicated address such as `obits@rctv19.com`. This is the most durable option because it survives any platform change, and it is how most local stations actually receive obituaries.

**4. Manual entry (works today).** The CMS at `/admin/` has an **Obituaries** collection. Paste the obituary, pick the funeral home, add the link, publish. Three minutes each, a handful a week, and it needs nothing from anybody else.

## Running the fetcher

```
node scripts/fetch-obituaries.js                  # report what it can reach, write nothing
node scripts/fetch-obituaries.js --apply          # publish anything new
node scripts/fetch-obituaries.js --source mcbride # one source only
```

`.github/workflows/obituaries.yml` runs it twice daily at 7am and 4pm Central. A blocked source is reported and skipped, so the workflow stays green while the access questions are being sorted out; it starts publishing the day a source opens up. Published URLs are recorded in `scripts/published_obituaries.json` so nothing is posted twice.

An extraction that is missing a name, or whose body is under 40 words, is reported rather than published — "services pending" is not an obituary.

## Advertising on obituary pages

Obituary pages carry the top banner only. No advertisement is placed inside a notice, and a test enforces that. Obituaries are exempt from the 250-word ad-eligibility bar that applies to articles, because they are licensed service content rather than aggregated briefs.

## What obituaries do and do not do for AdSense

Obituaries are usually the most-read pages on a small-town news site, and they bring back readers daily. That traffic is real and worth having.

They do **not** strengthen an AdSense application. Republished verbatim with permission, they are by definition duplicate content — the funeral home's page is the original, and Google knows it. They are not evidence of original reporting, which is the thing the application actually turns on. Publish them because readers want them, and keep building original local coverage separately.
