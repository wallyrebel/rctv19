# Twice-daily obituary publishing

The user confirmed permission to republish full text and photos from all three funeral homes on September 11, 2026. Publish wording, punctuation, spelling, names and paragraph breaks exactly as displayed. Do not summarize or correct the source. Exclude website navigation, flower-store advertising, condolences and tribute-wall comments.

## Schedule and destination

A Codex task checks sources at 7:00 a.m. and 7:00 p.m. America/Chicago using Edge (or Chrome if available). The user approved this schedule and a rolling 48-hour window on October 8, 2026, replacing the former daily/24-hour policy and the proposed hourly catch-up plan. Keep this computer awake, Codex running, and the browser connection available. The GitHub server-side publishing schedule has been retired to prevent duplicate runs and unfiltered historical imports. Its workflow now only validates on manual dispatch.

Local repository: `C:/Users/myers/Documents/Codex/rctv19`.
Remote: `https://github.com/wallyrebel/rctv19.git`, branch `main`.

## Browser collection

- McBride: https://www.mcbridefuneralhome.com/obituaries/
- Ripley: https://www.ripleyfuneralhome.com/listings
- Foster & Son: https://www.fosterandsonfuneralhome.com/listings

Check listing pages and open their actual obituary links in the browser. Read all JSON-LD blocks for publication timestamps; McBride places Person and NewsArticle in separate blocks. Do not assume death-sorted listings are sorted by publication date. On the initial run inspect the first listing page per source; subsequent runs compare listing URLs with prior observations, paginate as necessary to cover new entries, and never claim complete coverage if pages fail to load.

Use source publication time first; death date is a fallback only when publication evidence is absent. A stale, future or invalid publication date must not be overridden with a death date. Eligibility is strictly within the rolling 48 hours ending at import time, including the lower bound and excluding future times. Date-only evidence may use today's or yesterday's Central date when the entire calendar day is within the window; two days ago is ambiguous and skipped. On the fall DST transition, the importer conservatively rejects a date whose earliest possible time exceeds 48 hours. Never substitute service dates, update timestamps or discovery times. Missing or ambiguous dates are reported, not guessed. Do not backfill notices older than 48 hours after an outage.

Keep captures and observations in `work/obituaries` with unique timestamped filenames; preserve earlier files. Read the latest observations and publication log at the start of every run. Reconsider previously observed but unpublished notices while still eligible: observation is not publication. Revisit already-published notices still within 48 hours to capture expanded text or newly available portraits.

For McBride open the Obituary & Service tab and read `.obituary-text` after it loads. Preserve its displayed paragraphs. For Ripley/CFS inspect `#obtext .obit-text-container`, keeping every original obituary paragraph and excluding the separate flower-store promotion. Check Foster's current structure before extracting: its layout may differ. CFS JSON-LD articleBody may be only a short search description; never publish it instead of the full visible body. Expand any Read More control first. Select the person's actual portrait, not a generic background or logo.

## Import and verify

Save a JSON array to an ignored/scratch location. Each record contains `sourceId` (`mcbride`, `ripley`, `foster`), `url`, `name`, `published` (full timestamp when available), `birthDate`, `deathDate`, `paragraphs` (exact visible strings), optional `imageUrl`, and `complete: true` only after verifying the full body. Never rewrite or retype from memory. Compare the saved strings or a text fingerprint with the browser extraction before publication.

Run `node scripts/import-browser-obituaries.js <capture.json> --update-existing` to preview eligibility, then add `--apply` to save. It preserves text in escaped HTML paragraphs, disables Nunjucks evaluation in the obituary body, downloads and validates original portraits when available, uses source-URL-based identifiers, and records duplicate prevention and text fingerprints in `scripts/published_obituaries.json`. Verified changes to an existing eligible notice retain its filename, public URL, original date and import time; unchanged captures produce no writes. Manual text changes that differ from the logged fingerprint require review. An unavailable image does not prevent the exact text from publishing; report the missing portrait and retry on the next eligible run.

Before each run verify the expected remote, main branch, clean working tree and no merge in progress. Fetch and fast-forward main. Never discard, stash, commit or publish unrelated user changes; if they prevent a safe update, report the blocker. Run `npm.cmd test` and `npm.cmd run build`, then compare built obituary text to captured paragraphs and confirm local portraits render. Use `npm.cmd ci` if locked dependencies need restoration. Stage only obituary Markdown, portraits and the publication log. Never force push. If push fails after a local commit, report it and retry that pending obituary commit before importing more; do not duplicate notices. A source/browser failure is not evidence that no new notices exist.

For scheduled Git operations use only the fixed helper: `& 'C:/Program Files/nodejs/node.exe' 'C:/Users/myers/Documents/Codex/rctv19/.codex/rctv-git.cjs' <operation>`. Operations are `check`, `sync`, `stage`, `commit`, `push`, and `push-check`; no extra arguments. Each must be a separate exact command with shell `C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`, `login=false`, and `sandbox_permissions=require_escalated`. Do not modify the helper, permission settings or rules. Stop on permission denial; report approval-service capacity failures specifically. After a successful push verify the live obituary page and index on https://rctv19.com; a matching GitHub hash alone does not verify deployment.

Notify on published notices, failures or required user action. Stay quiet when a successful check finds nothing eligible.

## Repair completion and recovery

Code repairs must be reviewed, tested, committed and pushed as part of the repair session before declaring the automation fixed. The scheduled content-only Git helper cannot publish code repairs and refuses to synchronize while tracked repair files remain modified. Leave the registered checkout clean; never leave an unfinished repair for scheduled runs to resolve.

The importer retains the original eligibility evidence when updating a notice, rejects invalid calendar timestamps, retries transient portrait downloads at most twice, and does not rewrite an unchanged notice when only its portrait download failed. Failed portraits remain retryable within the original window.

If repository synchronization is blocked, stop publication but still perform independent browser checks and save timestamped observations and captures. Report the publication blocker separately from source-check results. When access is restored, recheck eligibility and browser text before applying any saved capture; expired captures must never be backfilled.
