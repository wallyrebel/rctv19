# Daily obituary publishing

The user confirmed permission to republish full text and photos from all three funeral homes on September 11, 2026. Publish wording, punctuation, spelling, names and paragraph breaks exactly as displayed. Do not summarize or correct the source. Exclude website navigation, flower-store advertising, condolences and tribute-wall comments.

## Schedule and destination

A Codex daily task in the originating conversation checks sources at 7:00 a.m. America/Chicago using Edge (or Chrome if available). Keep this computer awake, Codex running, and the browser connection available. The GitHub server-side publishing schedule has been retired to prevent duplicate runs and unfiltered historical imports. Its workflow now only validates on manual dispatch.

Local repository: `C:/Users/myers/OneDrive/Desktop/Clients/Projects/RCTV/rctv19 site`.
Remote: `https://github.com/wallyrebel/rctv19.git`, branch `main`.

## Browser collection

- McBride: https://www.mcbridefuneralhome.com/obituaries/
- Ripley: https://www.ripleyfuneralhome.com/listings
- Foster & Son: https://www.fosterandsonfuneralhome.com/listings

Check listing pages and open their actual obituary links in the browser. Read all JSON-LD blocks for publication timestamps; McBride places Person and NewsArticle in separate blocks. Do not assume death-sorted listings are sorted by publication date. On the initial run inspect the first listing page per source; subsequent runs compare listing URLs with prior observations, paginate as necessary to cover new entries, and never claim complete coverage if pages fail to load.

Use source publication time first; death date is an authorized fallback. Eligibility is strictly within the rolling 24 hours ending at import time, including the lower bound and excluding future times. A date without a time qualifies only when it is today's Central date; yesterday alone is ambiguous and is skipped. Never substitute service dates, update timestamps or the time the page was discovered. Missing or ambiguous dates are reported, not guessed. Do not backfill older notices after an outage.

For McBride open the Obituary & Service tab and read `.obituary-text` after it loads. Preserve its displayed paragraphs. For Ripley/CFS inspect `#obtext .obit-text-container`, keeping every original obituary paragraph and excluding the separate flower-store promotion. Check Foster's current structure before extracting: its layout may differ. CFS JSON-LD articleBody may be only a short search description; never publish it instead of the full visible body. Expand any Read More control first. Select the person's actual portrait, not a generic background or logo.

## Import and verify

Save a JSON array to an ignored/scratch location. Each record contains `sourceId` (`mcbride`, `ripley`, `foster`), `url`, `name`, `published` (full timestamp when available), `birthDate`, `deathDate`, `paragraphs` (exact visible strings), optional `imageUrl`, and `complete: true` only after verifying the full body. Never rewrite or retype from memory. Compare the saved strings or a text fingerprint with the browser extraction before publication.

Run `node scripts/import-browser-obituaries.js <capture.json>` to preview eligibility, then add `--apply` to save. It preserves text in escaped HTML paragraphs, disables Nunjucks evaluation in the obituary body, downloads and validates original portraits when available, uses source-URL-based identifiers, and records duplicate prevention and text fingerprints in `scripts/published_obituaries.json`. An unavailable image does not prevent the exact text from publishing; report the missing portrait.

Before each run verify the expected remote, main branch, clean working tree and no merge in progress. Fetch and fast-forward main. Never discard, stash, commit or publish unrelated user changes; if they prevent a safe update, report the blocker. Run `npm test` and `npm run build`, then compare built obituary text to the captured paragraphs and confirm local portraits render. Stage only the new obituary files, their portraits and the publication log. Commit and `git push origin main`; verify the remote commit. Never force push. If push fails after a local commit, report it and retry that pending obituary commit before collecting more; do not duplicate the notices. A source/browser failure is not evidence that no new notices exist.

Notify on published notices, failures or required user action. Stay quiet when a successful check finds nothing eligible.
