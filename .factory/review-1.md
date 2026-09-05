# Review recurring checks and evidence — review 1

Date: 2026-09-05

Live URL: https://checklist-evidence-binder.sociobot.in

Implementation candidate: `30431363119a813f999a2c9ce4d07763ebe1129c`

Documentation commit reviewed: `12698cb79e22f35561a7ad9ee453becdb3c863a9`

## Verdict

**FAIL — 17 findings and 16 untested public claims.**

Severity count: 1 critical, 4 high, 6 medium, and 6 low. A passing test suite
does not override the open data-recovery defect, missing demo, absent claim
registry, broken paid checkout, or incomplete export integrity.

`3043136` is the last implementation candidate. `12698cb` only adds the prior
verification report and handoff. A clean build at `12698cb` matched the live
HTML, JavaScript, CSS, service worker, and manifest byte for byte, so the live
runtime is the implementation candidate named above.

## First screen before scrolling

- Job: repeat operational checks, attach evidence, and give the record to
  someone later.
- Audience: tiny regulated or safety-conscious teams. The first screen does
  not name this audience.
- First action shown: **Open your binder**. The required **Try it with sample
  data** action is absent.
- The `<title>` names an offline evidence binder. The H1, “Checks happen.
  Proof stays.”, is a slogan rather than the job in plain words.

The phone action is visible without scrolling. No sample action is present on
desktop or phone.

## Findings

### F-01 — Critical — An accepted backup can make the binder unrecoverable

The prior critical finding is still open and was reproduced on the live site
in a fresh browser profile.

1. Create a binder and open **Binder setup**.
2. Import this file and accept replacement:

   ```json
   {"version":1,"procedures":[],"records":[null],"audit":[]}
   ```

3. Reload and enter the correct passphrase.

The live error is `Cannot read properties of null (reading 'completedAt')`.
The screen offers only another unlock attempt. It has no restore, erase, or
new-binder recovery action. The importer must validate the full schema before
writing and keep the existing encrypted binder when validation fails.

Evidence: `/work/.evidence/live-corrupt-import-recovery.png`.

### F-02 — High — There is no one-click sample or isolated demo

The landing page has no sample action. `/demo` returns the same empty first-run
screen and title as `/`. There is no populated sample, persistent demo label,
**Reset demo**, **Start for real**, or separate demo storage namespace.
`.factory/demo.md` is also absent. The required sample, reset, and proof that
demo actions never change real data cannot be tested because demo mode does
not exist.

### F-03 — High — All 16 public claims lack declared claim tests

`.factory/claims.json` is absent and the repository contains zero
`@claim:<id>` tags. Therefore there are no declared claim commands to run.
The ordinary unit and browser tests pass, but they do not meet the claim
contract. The complete claim ledger appears below.

### F-04 — High — The exported integrity fingerprint cannot be checked

The live evidence download contains a 64-character “Manifest SHA-256” value,
but it does not contain the exact manifest that was hashed. It also omits the
per-file SHA-256 values calculated in `src/export.ts`. The hashed object
contains record IDs, procedure IDs, exact ISO timestamps, and content hashes
that are absent from the report. A recipient cannot recompute the fingerprint
or detect a changed attachment. The brief explicitly requires export
integrity, and the report tells users to compare a fingerprint that they
cannot independently reproduce.

Evidence: `/work/.evidence/proofbook-review-evidence.html`.

### F-05 — High — The advertised paid checkout is broken

The live binder advertises **Buy Plus — US$29** and links to the documented
product checkout URL. A direct GET to that exact URL returned HTTP 404 with
`{"error":"enabled factory product","status":404}`. A visitor cannot buy the
advertised one-time license. No payment or credential was submitted.

### F-06 — Medium — Completed evidence cannot be opened or removed

After completing a realistic check, **Review record** showed filenames but
zero links for opening or downloading either attachment and zero **Remove**
controls. Exporting the whole evidence bundle is the only way to retrieve a
file. The privacy page also says a user can “remove individual files,” which
is false for completed evidence. This weakens the main job of showing stored
proof later and leaves the stated deletion control incomplete.

### F-07 — Medium — The lock action is hidden on a 390 px phone

The prior medium finding is still open. `#lock` exists but is not visible at
390 × 844 because `.header-tools .tiny` is hidden below 420 px. Closing or
reloading clears the in-memory key, but there is no explicit phone lock action.

### F-08 — Medium — The first screen does not meet the plain-words contract

The H1 is a slogan, the audience is absent, and the primary action is not the
required sample entry. The labels “Private records · ready when asked” and
“Evidence / rewind / repeat” add theme but do not state who the product is for
or what to do first. The first screen needs a job-naming H1, one short audience
sentence, a sample action with its result, and three short facts.

### F-09 — Medium — Required site structure and route behavior are missing

The landing page omits **How it works**, product limits/privacy, and paid-tier
sections. The header has no navigation. Privacy and terms use a different
header and have no footer. The footer lacks “Built by Param Factory” and a
version/build ID. Binder sections are button-only state: they have no URLs,
do not update the title, and browser back/forward cannot restore them.

### F-10 — Medium — Unknown URLs return the home page with HTTP 200

A deliberate request to `/review-missing-route-404` was expected to produce a
404. Instead it returned the full home screen with HTTP 200 and the home title.
There is no designed 404 page or route back. The defect is the missing status
and required page structure, not the deliberate unknown request.

### F-11 — Medium — Phone touch targets and 200% text resizing fail

At 390 px, the wordmark is about 130 × 20 px and the Privacy and Terms links
are about 58 × 21 px and 41 × 21 px. They do not meet the 44 px target size.
At 200% page text zoom, the document was 250 CSS px wider than the viewport,
requiring horizontal scrolling. The normal 390 px layout has no overflow.

### F-12 — Low — Invalid JSON exposes a parser error

The prior low finding is still open. Importing `{not json` shows
`Expected property name or '}' in JSON at position 1 (line 1 column 2)` instead
of saying the backup is invalid and the binder was not replaced.

### F-13 — Low — Live asset caching does not meet the PWA policy

The prior low finding is still open. HTML, `/assets/main.js`, CSS, service
worker, and manifest use `cache-control: public, must-revalidate, max-age=30`.
The JS and CSS names are not content hashed. They do not receive long-lived
immutable caching.

### F-14 — Low — Response hardening headers remain incomplete

The prior low finding is still open. Live responses have HSTS,
`Referrer-Policy`, and `X-Content-Type-Options`, but no Content-Security-Policy,
frame restriction, or Permissions-Policy.

### F-15 — Low — Route and sharing metadata are incomplete

No inspected route has a canonical link, Open Graph metadata, Twitter card,
or 1200 × 630 social image metadata. Privacy and terms have no description.
`/demo` does not set `Demo — Proofbook`. The sitemap omits demo and a 404
destination. The manifest is served as `application/octet-stream`.

### F-16 — Low — Required review documents are absent

`.factory/demo.md` and `.factory/copy-audit.md` are absent. README documents
run and test commands but no sample URL and no deployment procedure. The
missing files leave demo isolation and plain-word sentence checks without
recorded evidence.

### F-17 — Low — The update transition still has no end-to-end evidence

The service worker contains versioned caching, `skipWaiting`, and
`clients.claim`, and offline reload passes. The existing browser suite does
not exercise an old worker receiving a new build or assert the update notice.
The earlier verifier also recorded this as untested. No second live version
was introduced during this read-only review, so the gap remains open.

## Public claim ledger

All 16 rows count as untested claims because there is no claim registry or
tagged command. “Direct result” records independent review evidence; it does
not replace the required repeatable claim test.

| # | Public claim | Where | Direct result |
| ---: | --- | --- | --- |
| 1 | Binder payload is encrypted with AES-GCM at rest | Landing, privacy, README | Source and persisted unlock are consistent; no claim test |
| 2 | Passphrase is not stored or sent and cannot be recovered | App, privacy, README | Source and same-origin request log are consistent; no claim test |
| 3 | No account, cloud upload, or remote binder storage | Landing, README | Normal workflow sent only same-origin asset requests; no claim test |
| 4 | No analytics, tracking, third-party fonts, or scripts | Footer, privacy, README | Normal traffic and source are consistent; no claim test |
| 5 | Works offline after the first visit | Landing, README, offline page | Fresh phone context reloaded offline; no claim test |
| 6 | Installs as a PWA | README | Manifest and active service worker present; no claim test |
| 7 | Schedules daily, weekly, and monthly cycles and creates the next check | README, app | Weekly completion created the next open check; no claim test |
| 8 | Required evidence blocks completion | README, app | Missing files produced a named error; no claim test |
| 9 | Keeps sign-off/completion timestamps and an overdue view | README, app | Completed history displayed signer and timestamp; no claim test |
| 10 | Keeps a local encrypted audit trail | README, app | Populated activity list observed; no claim test |
| 11 | Retention removes old files but preserves record history | README, app | Unit test passes; live time boundary not exercised; no claim test |
| 12 | Exports and imports a portable JSON backup | Landing, README, app | Normal export parsed; malformed import is destructive; no claim test |
| 13 | Exports a read-only evidence report with verifiable SHA-256 integrity | Landing, README, app | Download works; integrity cannot be recomputed; no claim test |
| 14 | Free edition supports two active procedures and all core features | README, app | Third procedure was blocked; no claim test |
| 15 | US$29 once buys unlimited procedures and custom retention | Terms, README, app | Checkout returns HTTP 404; no claim test |
| 16 | Users can remove individual files or erase the binder | Privacy, app | Completed files cannot be removed; no claim test |

Untested public claim count: **16**.

## Earlier finding disposition

| Earlier item | Current disposition | Evidence |
| --- | --- | --- |
| Malformed accepted backup bricks binder | Open | Reproduced live; F-01 |
| Lock binder hidden at 390 px | Open | Live `#lock` not visible; F-07 |
| Raw malformed JSON error | Open | Reproduced live; F-12 |
| Short, non-immutable cache policy | Open | Live headers; F-13 |
| Missing hardening policies | Open | Live headers; F-14 |
| Live candidate identity | Pass | Five built/live SHA-256 pairs matched |
| Normal full workflow | Pass | Fresh live phone workflow and downloads |
| Offline reload | Pass | Fresh controlled phone context |
| Desktop and phone axe/console checks | Pass | No axe violations or normal-flow errors |
| Lighthouse | Pass | 100/100/100/100; current run |
| Two-version update transition | Open evidence gap | F-17 |

## Test results

Clean checkout and documented prerequisites:

| Command or check | Result |
| --- | --- |
| `npm ci` | Pass; 72 packages, 0 vulnerabilities |
| `npm test` | Pass; 3/3 |
| `npm run build` | Pass; `dist/index.html` produced |
| `npm run test:e2e` | Pass; 6/6 desktop and phone tests |
| Declared claim commands | None; `.factory/claims.json` missing |
| Factory `verify-url.sh` | Pass; HTTP 200, title, lang, main, alt, no console errors |
| Playwright axe, desktop/phone/legal/demo/unknown route | Zero WCAG 2 A/AA violations |
| Lighthouse 12.8.2 mobile | Performance 100, Accessibility 100, Best Practices 100, SEO 100 |

Current Lighthouse metrics: FCP 1.0 s, LCP 1.3 s, TBT 60 ms, CLS 0, and
interactive 1.3 s. Built payload: 33,182 B JS, 9,732 B CSS, 14,311 B mobile
AVIF, and no font payload. These meet the size and performance budgets.

## Paths checked

- Normal: created a binder; added a realistic weekly procedure; attached two
  files; signed and completed; saw the next cycle and history; exported JSON
  and HTML; reloaded and unlocked retained data.
- Invalid: mismatched setup passphrases, wrong unlock passphrase, missing
  evidence, malformed JSON, and malformed accepted backup.
- Boundary: file over 8 MB, duplicate evidence slot, two-procedure free limit,
  390 × 844 phone, 200% zoom, reduced motion, and an unknown URL.
- Recovery: correct unlock after wrong passphrase passed. Recovery after a
  corrupt accepted import failed with no usable control.
- Keyboard: skip link is first, native dialogs keep focus, Escape closes, and
  focus returns to **New procedure**. The dialog initially focuses its close
  button rather than the first field documented in the visual system.
- Privacy: the normal workflow made only same-origin document, JS, CSS, and
  hero requests. No analytics or third-party runtime script was observed.
- Offline: service worker controlled the page and reloaded the app shell with
  the context offline; the offline badge appeared.
- Legal and links: privacy and terms returned 200 with route-specific titles.
  The paid checkout returned 404. The deliberate unknown path incorrectly
  returned home with 200.
- Static-product scope: backend tenant isolation, health, restart persistence,
  429/Retry-After, CLI, library, and desktop artifact checks do not apply.

## Evidence files

- `/work/.evidence/verify.json`
- `/work/.evidence/lighthouse.json`
- `/work/.evidence/live-desktop-home.png`
- `/work/.evidence/live-phone-home.png`
- `/work/.evidence/live-phone-populated.png`
- `/work/.evidence/live-demo-route.png`
- `/work/.evidence/live-corrupt-import-recovery.png`
- `/work/.evidence/live-404.png`
- `/work/.evidence/proofbook-review-backup.json`
- `/work/.evidence/proofbook-review-evidence.html`

No product source, deployment, infrastructure, DNS, billing configuration,
or user data was changed. Every browser workflow used a fresh disposable
profile, and each profile was discarded after the check.
