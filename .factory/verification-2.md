# Verification 2 — Repeat checks and retain evidence

Date: 2026-09-05

Live URL: <https://checklist-evidence-binder.sociobot.in>

Implementation candidate reviewed: `55ec495d71f48c84a66fd5d041e811bcffb3c206`

Documentation commit reviewed: `c7eb3b811af4b4629e214e431f02a260d6701685`

## Verdict

**PASS — zero findings and zero untested claims.**

The live application matched the clean build of the reviewed candidate for the
HTML shell, JavaScript, CSS, service worker, and manifest. The later
documentation commit changes only `.factory/handoff.md`; it does not require a
different product image.

## First screen

On fresh 1366 × 900 desktop and 390 × 844 phone browser contexts, before
scrolling:

- Job: **Repeat checks and keep the evidence**.
- Audience: small teams that need to show a client, manager, or inspector what
  was checked.
- First action: **Try it with sample data**; it says that it will show a
  completed check and an overdue check.

The same first screen shows the three plain facts: encrypted on this device,
works offline after the first visit, and all features are free to use.

## Live product checks

- `/demo/` immediately showed the realistic cold-room and fire-exit sample.
  Its persistent **Demo — sample data, nothing is saved** label, **Reset demo**,
  and **Start for real** controls were present on desktop and phone. Reset
  restored the sample. The demo-isolation claim test created real data,
  compared its encrypted vault before and after demo use, and reopened it
  unchanged.
- Fresh desktop and phone contexts had no console or page errors, no horizontal
  overflow, and no third-party requests. Playwright axe found zero serious or
  critical WCAG 2 A/AA violations on the demo in both contexts.
- A fresh controlled browser context installed the service worker, went
  offline, and reloaded the populated demo successfully. The worker controlled
  the page and produced no console errors.
- `/privacy/` and `/terms/` returned their named titles, one H1, main landmark,
  shared navigation, and footer. Direct `/checks`, `/overdue`, `/history`, and
  `/settings` routes correctly opened the locked-binder state when no binder
  existed. The deliberate unknown URL returned HTTP 404 and the designed return
  page; this is expected behavior, not a defect.
- Live headers include CSP with `frame-ancestors 'none'`, Permissions-Policy,
  `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.
  The hashed JavaScript asset has a one-year immutable cache policy. The
  manifest was served as `application/manifest+json`.
- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title, `lang="en"`, one H1,
  main landmark, image alt text, and zero console errors. Live Lighthouse 12.8.2
  scored 100 for Performance, Accessibility, Best Practices, and SEO (FCP
  1.01 s, LCP 1.33 s, TBT 52 ms, CLS 0).

## Clean checkout and claims

A separate clean clone at documentation SHA `c7eb3b8` used Node 22.23.2 and
npm 10.9.8. `npm ci`, `npm test`, `npm run build`, and `npm run test:e2e`
passed. Results were 5 unit tests, a produced `dist/index.html`, and 35 passed
browser tests with one intentional mobile-only skip for the desktop
service-worker-update scenario.

All 14 commands declared in `.factory/claims.json` were run individually from
that clean clone and passed:

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

The browser suite exercised normal creation and completion, invalid passphrase
and backup input, attachment and viewport boundaries, malformed-backup
recovery, keyboard/focus behavior, reduced motion, links, metadata, route
history, mobile layout, 200% text sizing, privacy requests, offline reload,
and worker update notice. Every public statement on the landing page, legal
pages, and README maps to the registered claims or is a product limit rather
than a capability promise.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| F-01 corrupt backup could block unlock | Fixed and exercised by `backup-recovery`. Invalid nested data is rejected; damaged legacy data offers restore or erase. |
| F-02 no isolated sample | Fixed. `/demo/` is populated, labeled, resettable, and separately stored in memory. |
| F-03 untested public claims | Fixed. Fourteen registry entries have unique tagged passing tests. |
| F-04 unverifiable evidence integrity | Fixed and recomputed by `export-integrity`. |
| F-05 unavailable paid checkout | Closed by removing the unavailable checkout and making this release free. |
| F-06 completed files unavailable | Fixed and exercised by `file-control`. |
| F-07 mobile lock hidden | Fixed; browser phone coverage confirms the control and layout. |
| F-08 unclear first screen | Fixed; the job, audience, and sample action are visible before scrolling. |
| F-09 missing structure and routes | Fixed; shared navigation/footer, legal pages, route titles, history, and focus coverage are present. |
| F-10 unknown URL returned home | Fixed; the unknown live URL returned designed HTTP 404. |
| F-11 touch targets and 200% overflow | Fixed; phone and 200% browser checks pass without overflow. |
| F-12 raw invalid-JSON error | Fixed; browser invalid-input coverage receives the named safe error. |
| F-13 non-immutable cache assets | Fixed; Vite asset names are hashed and live assets are immutable for one year. |
| F-14 missing hardening headers | Fixed; live headers listed above are present. |
| F-15 missing route/share metadata | Fixed; titles, canonical/share metadata, manifest MIME, and sitemap routes are covered. |
| F-16 missing review documents | Fixed; demo, claims, copy audit, design, handoff, and this report are present. |
| F-17 update transition untested | Fixed; the browser suite simulates an old worker and verifies the reload notice. |

## Applicability

Proofbook is a static, local-first PWA. It has no backend, tenant boundary,
health endpoint, restart persistence service, or rate-limited live API, so the
backend-specific isolation, health, and 429 checks do not apply.

Evidence files are in `/work/.evidence/`, including the URL-verifier output,
desktop and phone screenshots, and `lighthouse-verification-2.json`.
