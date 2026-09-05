# Review 2 — Repeat checks and retain evidence

Date: 2026-09-05

Live URL: <https://checklist-evidence-binder.sociobot.in>

Implementation candidate reviewed: `55ec495d71f48c84a66fd5d041e811bcffb3c206`

Documentation commit reviewed: `75a1995bf0cf72643ed0d627cf979289b6cf1bb8`

## Verdict

**FAIL — 1 finding and 1 untested public claim.**

The live JavaScript, CSS, and service worker SHA-256 values exactly matched a
fresh build from the reviewed candidate. The commits after `55ec495` change
only reports and handoff documentation, so they do not require a new product
image.

## First screen

Fresh 1366 × 900 desktop and 390 × 844 phone browser contexts were opened
before scrolling.

- Job: **Repeat checks and keep the evidence**.
- Audience: small teams that need to show a client, manager, or inspector what
  was checked.
- First action: **Try it with sample data**. Its adjacent promise says,
  “See a completed check and one overdue check.”

The three stated facts were also visible: encrypted on this device, works
offline after the first visit, and all features are free to use.

## Finding

### F-18 — Medium — The sample action does not show the promised completed check

The first-screen action says **Try it with sample data** and promises, “See a
completed check and one overdue check.” README and `.factory/demo.md` likewise
say that opening `/demo/` immediately shows a completed cold-room check and
its two files.

In new desktop and phone contexts, `/demo/` instead opened on **Open checks**
with two open overdue cards: **Weekly fire exit walk** and **Cold room opening
check**. No completed card, signer, timestamp, or evidence file was shown on
that initial screen. The completed cold-room record, **Signed by Rae Morgan**,
timestamp, and two downloads did appear after the user selected **History**
and **Review record**.

The populated sample is useful and the extra navigation works, but the public
promise about what the action shows is false as written. No claim command
tests that first-screen promise: `demo-isolation` proves namespace isolation
and reset, while `signed-overdue-history` selects **History** before asserting
the signed record. This is one untested public claim as well as a false one.

Fix either the initial demo view so it visibly includes the completed record
and files, or make the action, README, and demo documentation say that the
history tab contains the completed evidence. Add a dedicated tagged claim
test for the chosen observable result.

## Checks that passed

- The live demo has the persistent **Demo — sample data, nothing is saved**
  label, **Reset demo**, and **Start for real**. Reset restored the sample.
  The existing isolation claim separately creates a real encrypted binder,
  uses and resets the demo, and reopens unchanged real data.
- The sample is otherwise realistic and populated: it has two named recurring
  procedures, two overdue open checks, one completed history item, a named
  signer, and two evidence downloads in record review.
- A fresh controlled context installed the service worker, went offline, and
  reloaded `/demo/` with the open sample and banner intact. There were no
  console or page errors in that normal flow.
- Fresh desktop and phone normal flows had no console/page/request failures,
  no horizontal overflow, only same-origin runtime requests, and zero serious
  or critical WCAG 2 A/AA axe findings. The skip link received first keyboard
  focus. Reduced motion reduced the hero transition to `1e-05s`.
- `/privacy/` and `/terms/` had their named titles, one H1, main landmark,
  shared navigation, and footer. `/checks`, `/overdue`, `/history`, and
  `/settings` opened the locked binder state with title **Unlock binder —
  Proofbook**. An unknown URL deliberately returned HTTP 404 with the designed
  return page; the corresponding browser console 404 is expected, not a
  defect.
- Live headers included CSP with `frame-ancestors 'none'`, Permissions-Policy,
  `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`. The
  manifest served as `application/manifest+json`; the hashed main JavaScript
  was immutable for one year.
- `/opt/fleet/lib/verify-url.sh` passed against the live root: HTTP 200,
  title, `lang="en"`, one H1, main landmark, image alt text, and zero console
  errors. Live Lighthouse 12.8.2 scored 100 Performance, 100 Accessibility,
  100 Best Practices, and 100 SEO (FCP 1.0 s, LCP 1.2 s, TBT 50 ms, CLS 0).

## Clean checkout and claims

A new clone at documentation SHA `75a1995` used Node 22.23.2 and npm 10.9.8.
The documented `npm ci` setup and all normal quality commands passed:

| Command | Result |
| --- | --- |
| `npm test` | Pass — 5 unit tests |
| `npm run build` | Pass — `dist/index.html` produced |
| `npm run test:e2e` | Pass — 36 tests, including one intentional mobile skip |

Every command declared in `.factory/claims.json` was run individually and
passed:

| Claim | Result |
| --- | --- |
| demo isolation | Pass |
| encrypted local binder | Pass |
| private network use | Pass |
| offline reload | Pass |
| PWA install shell | Pass |
| recurring required evidence | Pass |
| signed overdue history | Pass |
| retention history | Pass |
| backup recovery | Pass |
| export integrity | Pass |
| completed-file control | Pass |
| local audit trail | Pass |
| free features | Pass |
| erase binder | Pass |

## Earlier findings

All F-01 through F-17 from review 1 are currently fixed and covered by the
passing clean browser suite or the live checks above: backup recovery, isolated
demo, declared claims, recomputable export hashes, removal of the unavailable
checkout, completed-file control, phone lock/layout, plain first screen,
routes and 404, invalid-backup copy, asset caching, headers, metadata/docs,
and the service-worker update test. F-18 is newly found in the current
first-screen sample promise.

## Applicability

Proofbook is a static, local-first PWA. It has no backend, tenants, health
endpoint, server restart state, or rate-limited live API; backend isolation,
restart, health, and 429 checks do not apply.

Evidence is in `/work/.evidence/review-2-live/` and
`/work/.evidence/review-2-lighthouse.json`.
