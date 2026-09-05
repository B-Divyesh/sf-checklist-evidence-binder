# Review 3 — Repeat checks and keep evidence

Date: 2026-09-05

Live URL: <https://checklist-evidence-binder.sociobot.in>

Implementation candidate reviewed: `fb75d9e07955183ac95802cc470f7dca5a37e115`

Documentation baseline reviewed: `c63228d4ce6ff3d5ce14900a6aec605e861509b7`

## Verdict

**PASS — zero findings and zero untested public claims.**

Severity count: zero critical, zero high, zero medium, and zero low findings.
All 15 declared claim commands passed independently.

Commits after the implementation candidate change only `.factory` reports.
The clean build and live site matched byte for byte:

- HTML: `6c179b9a7eb326244a31772937671f75cb6ed215acf4574f8c851da60a78e828`
- JavaScript: `da78c0129b5b929a5559d6d411f8e0ffa94bc745ffe5ce57846dd322948a417c`
- CSS: `63fd3be9c97c595f504c0136d8e4efbbe52fec7923d7db1c8ae79b91d60eeb51`
- Service worker: `c91efcf9c25e21fbf658af8aabbf3557e9c76938ed5f66cab30a053b2d159819`
- Manifest: `b4a7a09b274d478a3e232e4eaefd7e8fe1d586bf64f54d4017537718885fc8be`

## First screen before scrolling

Fresh 1366 × 900 desktop and 390 × 844 phone contexts started at scroll
position zero.

- Job: **Repeat checks and keep the evidence.**
- Audience: small teams that must show a client, manager, or inspector what
  was checked.
- First action: **Try it with sample data.** The adjacent text says it will
  show a completed check and one overdue check.
- Three facts: encrypted on this device, works offline after the first visit,
  and all features are free to use.

All of these were visible before scrolling on both screens. The title names
the job, the page has one H1 and a main landmark, and neither viewport had
horizontal page overflow. The cassette-era evidence-binder art is original,
useful to the subject, and consistent with `.factory/design.md`; no brand,
seal, misleading interface, or text artifact appeared in the source image.

## Live product checks

- The first action opened `/demo/` in one click with the persistent **Demo —
  sample data, nothing is saved** label, **Reset demo**, and **Start for real**.
- The initial demo showed the completed **Cold room opening check**, completion
  time, **Signed by Rae Morgan**, and direct downloads for
  `cold-room-display.txt` and `opening-log.txt`. It also showed one overdue
  **Weekly fire exit walk** and the next cold-room cycle.
- `cold-room-display.txt` downloaded with the realistic value
  `Cold room display: 3.8 C`.
- Removing a completed sample file showed its retained filename. Reset restored
  both sample files. Start for real returned to the real encrypted-binder gate.
- In a separate live context, a real encrypted binder and named procedure were
  created before demo use. Its local metadata and encrypted bytes were equal
  before and after demo edits and reset, and the real procedure reopened with
  its passphrase. Demo state did not change real data.
- The live evidence report contained one signed cold-room record and two files.
  Its exact manifest SHA-256 and first file SHA-256 recomputed correctly, and a
  changed manifest produced a different value.
- A fresh phone context reached service-worker control, went offline, and
  reloaded the populated demo with its label, completed record, and offline
  status. There were no console or page errors.
- Fresh desktop and phone WCAG 2 A/AA axe scans found no violations. The skip
  link was first in keyboard order, visible targets measured at least 44 px,
  and reduced motion changed the hero transition to `1e-05s`.
- The full clean browser suite also covered dialog entry and focus return,
  Escape, browser back, route focus, keyboard use, 200% text sizing, file-size
  and duplicate-slot boundaries, wrong passphrases, malformed backups, damaged
  vault recovery, retention, deletion, and the service-worker update action.
- All recorded live browser requests used only the Proofbook origin. Source and
  traffic inspection found no analytics, tracking, remote fonts, third-party
  scripts, account request, or record upload.

## Routes, links, metadata, and headers

- `/`, `/demo/`, `/privacy/`, and `/terms/` returned 200 with route-specific
  titles, one H1, main/header/footer structure, canonical metadata, and working
  navigation. Locked direct routes `/checks`, `/overdue`, `/history`, and
  `/settings` showed the named unlock state.
- A deliberate unknown URL returned the designed page with HTTP 404, title
  **Page not found — Proofbook**, one H1, standard structure, and a return link.
  The 404 response, including its own fragment link, is expected and is not a
  broken-page finding.
- All links collected from successful home, demo, privacy, and terms pages
  returned 200. The privacy contact is an explicit `mailto:` link.
- The manifest is served as `application/manifest+json`, has 192 and 512 px
  icons including a maskable icon, standalone display, matching theme colors,
  and a versioned start URL. The social image is 1200 × 630.
- Live headers include CSP with `frame-ancestors 'none'`, HSTS,
  Permissions-Policy, `Referrer-Policy: no-referrer`, nosniff, and
  `X-Frame-Options: DENY`. Hashed JavaScript and CSS use one-year immutable
  caching; the service worker uses no-store.
- The factory URL verifier passed: HTTPS 200, title, `lang="en"`, one H1, main
  landmark, complete image alt text, labelled buttons, and no console errors.

## Clean checkout and performance

A new remote clone at documentation baseline `c63228d` used the documented
Node.js setup. `npm ci` installed 72 packages and reported zero vulnerabilities.

| Command | Result |
| --- | --- |
| `npm test` | Pass — 5 unit tests |
| `npm run build` | Pass — `dist/index.html` produced |
| `npm run test:e2e` | Pass — 37 browser tests; 1 intentional mobile skip for the desktop-only two-version update test |

The production build is 41.48 KB JavaScript raw / 13.44 KB gzip and 12.63 KB
CSS raw / 3.67 KB gzip. The 420 px AVIF hero is 14,311 bytes and no font file
is loaded. These are below the product budgets.

Lighthouse 13.4.1 mobile results:

| Category or metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| First Contentful Paint | 1.0 s |
| Largest Contentful Paint | 1.3 s |
| Total Blocking Time | 30 ms |
| Cumulative Layout Shift | 0 |

## Claim ledger

The registry has 15 unique IDs and exactly one tagged test definition for each
ID. Every declared command was run separately from the clean checkout.

| Claim ID | Result |
| --- | --- |
| `demo-isolation` | Pass |
| `demo-completed-check` | Pass |
| `encrypted-local` | Pass |
| `private-network` | Pass |
| `offline-reload` | Pass |
| `pwa-install` | Pass |
| `recurring-required-evidence` | Pass |
| `signed-overdue-history` | Pass |
| `retention-history` | Pass |
| `backup-recovery` | Pass |
| `export-integrity` | Pass |
| `file-control` | Pass |
| `audit-trail` | Pass |
| `free-features` | Pass |
| `erase-binder` | Pass |

Landing, demo, privacy, terms, interface, and README statements were checked
against this registry. Encryption and passphrase statements map to
`encrypted-local`; network, account, analytics, and third-party-resource
statements map to `private-network`; recovery, retention, export, file control,
audit, schedule, offline, install, erase, free-use, and sample statements map
to their named tests. Compliance, legal-advice, warranty, and acceptance text
states product limits rather than capability claims. There are no unlisted or
untested public claims.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| F-01 corrupt backup recovery | Fixed; malformed nested data is rejected and damaged-vault restore passed. |
| F-02 isolated sample | Fixed; live encrypted bytes were unchanged, reset passed, and real data reopened. |
| F-03 untested claims | Fixed; 15 unique claims each have one tagged test and all commands passed. |
| F-04 export integrity | Fixed; live manifest and file hashes recomputed and mutation detection passed. |
| F-05 unavailable paid checkout | Closed; no paid offer or checkout is shown and all released features are free. |
| F-06 completed file control | Fixed; live download, remove, retained filename, and reset paths passed. |
| F-07 phone lock and target sizing | Fixed; phone coverage and the 44 px target check passed. |
| F-08 first-screen clarity | Fixed; job, audience, action, result, and three facts are visible before scrolling. |
| F-09 structure and routes | Fixed; common structure, titles, history, focus, and legal routes passed. |
| F-10 unknown URL | Fixed; the deliberate unknown URL is a designed HTTP 404. |
| F-11 phone overflow and 200% text | Fixed; normal phone and 200% browser checks have no page overflow. |
| F-12 raw invalid-backup message | Fixed; invalid input gets a safe named error without replacement. |
| F-13 asset cache policy | Fixed; live hashed assets are immutable for one year. |
| F-14 hardening headers | Fixed; live CSP and response policies are present. |
| F-15 metadata and routes | Fixed; route metadata, manifest MIME, sitemap, social image, and 404 passed. |
| F-16 review documents | Fixed; brief, design, demo, copy audit, claims, README, and handoff are present. |
| F-17 service-worker update | Fixed; the clean desktop test installed a new worker and exposed **Reload update**. |
| F-18 completed sample result | Fixed; the initial live demo displays the signed record and direct downloads. |

## Applicability and remaining dependencies

Proofbook is a static local-first PWA. It has no backend, server tenant,
shared database, health endpoint, restartable product service, or rate-limited
API. Backend tenant isolation, restart persistence, health, and
429/`Retry-After` checks do not apply.

No AI feature is warranted for this private evidence workflow. The core job is
deterministic collection, retention, and export; sending evidence to a model
would add privacy and offline costs without filling a brief requirement.

The researched one-time paid option remains deferred until factory billing
registration exists. The public release has no price or checkout promise, and
the `free-features` test confirms all shipped features are available without a
purchase. This is an external product-planning dependency, not a live defect.

## Evidence

- `/work/.evidence/review-3-live.json`
- `/work/.evidence/review-3-live-export.json`
- `/work/.evidence/review-3-desktop-home.png`
- `/work/.evidence/review-3-phone-home.png`
- `/work/.evidence/review-3-desktop-demo.png`
- `/work/.evidence/review-3-phone-demo.png`
- `/work/.evidence/review-3-phone-offline.png`
- `/work/.evidence/review-3-404.png`
- `/work/.evidence/review-3-url-verifier/verify.json`
- `/work/.evidence/review-3-lighthouse.json`
- `/work/.evidence/review-3-unit.log`
- `/work/.evidence/review-3-build.log`
- `/work/.evidence/review-3-e2e.log`
- `/work/.evidence/review-3-claims.log`
- `/work/.evidence/review-3-claims-status.tsv`
- `/work/.evidence/review-3-claim-registry-audit.json`
- `/work/.evidence/review-3-test-list.txt`
