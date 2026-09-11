# RCTV19 SEO and AdSense audit — September 8, 2026

## Assessment

The site needed technical and content-quality fixes before an AdSense application. These changes improve readiness; they do not promise approval. Google evaluates original value, navigation, policy compliance and the account itself. No fixed article count or traffic threshold guarantees approval. See [Google's eligibility requirements](https://support.google.com/adsense/answer/9724?hl=en).

The owner confirmed that the automated sources and RCTV19 share a parent company and that editors review automated articles. Ownership resolves the stated permission concern, but simply rewriting the same content does not establish added value for AdSense. Review shared articles for useful RCTV19-specific reporting, context or commentary. See [Google's replicated-content policy](https://support.google.com/publisherpolicies/answer/11190248?hl=en).

## Findings and changes

| Area | Finding | Resolution |
| --- | --- | --- |
| Failed content | One remaining article was titled “Unable to Generate Article: Insufficient Content Data.” | Deleted it; expanded source/output rejection; generation and repository regression tests now reject failure notices and incomplete output. |
| Crawling | Nonexistent URLs and `/ads.txt` returned homepage HTML with HTTP 200. | Added root `404.html`, noindex on errors, and real plain-text `/ads.txt`. Verify the deployment returns 404, not homepage fallback. |
| AdSense | Live layout hardcoded a publisher ID while ad configuration had a placeholder. | Reused existing `ca-pub-3245500092050206` consistently; added account verification meta tag and ads.txt. Confirm this ID in the owner's account. |
| Ad safety | Global AdSense code ran on every page, including utility pages; slot template contained placeholders. | Separated verification from serving. Global serving is off. Only explicitly eligible pages with valid slots can serve ads after activation. Local sponsors remain active. |
| Privacy | Generic policy referred to nonexistent newsletter behavior and inconsistent contact addresses; Analytics loaded immediately. | Updated policy to actual current behavior and a single published contact address; removed automatic Analytics loading pending consent setup. |
| Transparency | Article bylines and source provenance were missing. | Added visible station byline, editorial/corrections page, and source URLs plus AI-assistance disclosure on future feed imports. Existing source URLs cannot be reconstructed reliably from the stored articles; editors should supply them. |
| Search metadata | Articles reused the site description and reported Open Graph website type. JSON-LD interpolated unsafe quoted strings. | Article excerpts feed descriptions, article type is explicit, and structured values are serialized safely. |
| Headings | Home had no H1; many article bodies repeated an H1 already supplied by the layout. | Added descriptive home H1 and removed repeated article body headline while keeping section headings. |
| Archives | Pagination shared titles and was missing from sitemap. | Added page numbers to archive titles and included archive URLs in sitemap. |
| Speed | 113 images exceeded 100 KB; some homepage images were approximately 2–3 MB. | Generated 480/960px WebP variants, prioritized article hero images, and reduced banner height. Original large images total 28.6 MB versus 11.2 MB for the 960px derivatives (about 61% smaller); this is an asset-size comparison, not a measured Core Web Vitals score. |
| Accessibility | Unnamed advertising link, nonclickable contact details, unnecessary animation. | Named/labeled ad link, added phone/email links, and respected reduced-motion preferences. |
| Build security | Initial npm audit reported 10 advisories, including two critical. | Updated Eleventy to 3.1.6 and patched dependency lockfile; npm audit reported zero remaining vulnerabilities at audit time. These dependencies run during builds, not as a public application server. |

## Owner/account actions before serving Google ads

1. In AdSense, verify `rctv19.com` using the account meta tag or ads.txt option. Confirm publisher ID `pub-3245500092050206` is yours. [ads.txt is recommended, not mandatory](https://support.google.com/adsense/answer/12171612?hl=en), and is not an approval guarantee.
2. Set up and publish a Google-certified consent management platform in AdSense **Privacy & messaging**, including applicable European and US messages. A homemade cookie banner is not a substitute for Google's certified-CMP requirement. Review [Google's publisher consent requirements](https://support.google.com/adsense/answer/13554116?hl=en) and [CMP setup](https://support.google.com/adsense/answer/7670013?hl=en).
3. Review shared articles and images, add source links to existing stories, and strengthen distinct local reporting. Review repeated event announcements and generic articles that lack concrete dates, locations, links or facts. Do not mass-generate filler to reach an arbitrary word count. Original reporting is an editorial task that these code changes cannot establish.
4. Configure a Cloudflare **Bulk Redirect** from `https://www.rctv19.com/` to `https://rctv19.com/`, preserving paths and query strings, including subpaths. Both currently serve HTTP 200. This needs Cloudflare account configuration: Pages `_redirects` does not support domain-level redirects. See [Cloudflare's www-to-apex guide](https://developers.cloudflare.com/pages/how-to/www-redirect/) and [redirect limitations](https://developers.cloudflare.com/pages/configuration/redirects/). Existing canonicals already point to the apex.
5. Confirm Cloudflare uses Node 22 or 24, build command `npm run build`, and output `_site`. Submit `/sitemap.xml` in Search Console and check indexing, manual actions and field Core Web Vitals. No Search Console or AdSense account status was available for this audit.
6. Request AdSense review after those checks. Once approved and consent is configured, set `adsenseEnabled: true` in `src/_data/ads.json`, and create actual numeric AdSense slot IDs for the slots you want to serve (type `adsense`). Page eligibility is now computed at build time (see below), so no per-page flag needs setting. Review Auto ads exclusions in the account as well. Update the privacy policy to reflect activation. Restore Google Analytics ID `G-Q2R3SL5N1Z` only through an appropriate consent-aware integration.

## Validation

Run `npm ci`, `npm test`, and `npm run build`. Eleventy's awaited after-build hook generates image variants and validates every output page for local resources (including responsive image candidates), H1, unique title, description, canonical and parseable JSON-LD. It also checks ads.txt, sitemap uniqueness, paginated archive inclusion and the error-page noindex setting. Direct `eleventy` builds and development rebuilds run the same hook; image generation cannot be skipped by bypassing npm scripts. A regression test builds into a fresh output directory and decodes the homepage's optimized images, including sponsor ads.

The audit does not establish advertising approval, account eligibility, video rights, every historical article's factual accuracy, or measured Google field performance. Live deployment status and response codes must be verified after merge.

---

# Content-depth follow-up — September 11, 2026

The September 8 audit closed the technical gaps. This pass addresses the remaining and most likely reason for rejection: **article depth and volume of thin, AI-assisted aggregation.**

## Measured state of the archive

Of 184 published articles (git history: 174 auto-published by the RSS bot, 10 written by hand in the CMS):

| Body length | Articles |
| --- | --- |
| Under 250 words | 168 |
| 250–399 words | 15 |
| 400+ words | 1 |

Median 209 words, mean 203. Every bot article is a rewrite of a short third-party item — a `tippahsports.com` post or a Facebook page post pulled through FetchRSS. Most source items are shorter than the articles generated from them, which means the model was expanding, not reporting.

This is the profile Google's [scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content-abuse) and Low value content policies describe. No template or metadata change fixes it; it is an editorial problem.

## Changes in this pass

| Area | Change |
| --- | --- |
| Ad eligibility | `src/_data/eleventyComputed.js` computes `adsEligible` per page from the rendered body word count. Articles need 250+ words; policy pages (`/privacy/`, `/terms/`, `/editorial/`, `/contact/`), `404.html`, and anything `noindex` or marked `noAds: true` never qualify. The blanket `adsEligible: false` in `src/blog/blog.json` is removed. At present 14 of 184 articles clear the bar. |
| Source gate | The pipeline skips feed items carrying fewer than 60 words of substance (`insufficientSource` in `scripts/content-filter.js`) instead of inflating them into articles. |
| Output gate | Generated articles under 150 words are skipped rather than published (`MIN_ARTICLE_WORDS` in `scripts/post-output.js`). A short item is a routine skip, not a batch failure. |
| Prompt | The rewrite prompt now forbids padding, generic civic commentary and invented detail, requires length to follow the source, and returns `{"skip":true}` when the source cannot support 150 words of specific reporting. |
| AI disclosure | All 174 bot-published articles carry `aiAssisted: true` and render a visible provenance line. The 10 hand-written articles are deliberately unlabeled. Provenance now renders with or without a source URL. |
| Terms of Use | Added `/terms/`, covering third-party material, AI assistance, takedown contact and advertising separation. Linked in the footer and sitemap. |
| Editorial standards | Updated to state that AI-assisted articles are labeled, that padding is prohibited, and that thin sources do not get a page. |

## What these changes do not do

They stop the thin-content pile from growing and keep ads off pages that should not carry them. They do not make the existing 168 short articles substantial. Expect the bot to publish considerably less once the gates are live — that is the intended effect.

## Editorial work still required before applying

1. **Publish original reporting.** Aim for 20–30 articles of 600+ words carrying something no other outlet has: a quote from a coach or business owner, your own photographs, a school board or city meeting write-up, a game story from someone who attended. This is what an AdSense reviewer looks for, and it is the only remaining blocker of substance.
2. **Attribute bylines to people.** Articles carry "By RCTV19". Real names on original reporting materially help E-E-A-T.
3. **Prune or consolidate.** Roughly 18 near-duplicate daily "Tippah County sports happening today" schedule posts and similar one-line event notices go stale within a day. Merge them into weekly roundups or remove them; each is a separate thin indexed page today.
4. **Confirm image rights.** The pipeline downloads and rehosts images from the source feeds, including Facebook posts. Same-parent-company material from Tippah Sports is fine; third-party photographs are not automatically licensed. Spot-check what is being rehosted.
5. Only after the above: flip `adsenseEnabled`, add real slot IDs, and request review.
