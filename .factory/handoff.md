# Proofbook repair 1 handoff

Date: 2026-09-05

Live URL: <https://checklist-evidence-binder.sociobot.in>

Implementation SHA deployed: `55ec495d71f48c84a66fd5d041e811bcffb3c206`

Documentation status: this handoff follows the implementation commit above.

## Outcome

The evidence-binder workflow is repaired and deployed. Users can create an
encrypted local binder, schedule repeating checks, attach required files,
sign and complete a check, review or remove completed evidence, and export a
verifiable report. A fully populated one-click demo is isolated from real
browser data.

The prior corrupt-backup defect is closed. Every nested backup field is
validated and normalized before confirmation or storage. Invalid JSON and the
previous `records: [null]` case leave the open binder unchanged. Legacy data
that decrypts but fails validation opens explicit restore and erase controls.

## Review finding disposition

| Finding | Disposition |
| --- | --- |
| F-01 corrupt backup could brick the binder | Fixed. Full schema validation precedes writes; a browser test rejects the prior payload and restores a deliberately corrupted encrypted vault. |
| F-02 missing isolated demo | Fixed. `/demo/` loads realistic data in memory with a persistent label, reset, and exit to unchanged real data. |
| F-03 untested public claims | Fixed. `.factory/claims.json` lists 14 claims, each with one unique passing `@claim:` test. |
| F-04 unverifiable export fingerprint | Fixed. The report includes the exact UTF-8 manifest and each retained file hash; tests recompute both. |
| F-05 broken paid checkout | User-facing defect removed. No sale or gate is shown, and all features are free. Product billing registration remains an external dependency. |
| F-06 completed files unavailable | Fixed. Completed files can be downloaded or removed while filename history stays visible. |
| F-07 phone lock hidden | Fixed. Lock remains visible and at least 44 px at 390 px. |
| F-08 unclear first screen | Fixed. The job, audience, sample action, result, privacy, offline behavior, and price are visible before scrolling. |
| F-09 missing structure and routes | Fixed. Added standard sections, navigation, shared footers, and history-backed app routes with route titles and focus changes. |
| F-10 unknown URLs returned home with 200 | Fixed. Unknown paths return the designed Proofbook 404 with HTTP 404. |
| F-11 small touch targets and zoom overflow | Fixed. Interactive targets meet 44 px; 390 px and 200% text checks have no horizontal overflow. |
| F-12 raw JSON parser error | Fixed. Invalid files get a plain error that confirms the current binder was not replaced. |
| F-13 short cache policy and unhashed app assets | Fixed. Vite emits hashed JS/CSS; `/assets/*` is immutable for one year; the service worker and HTML revalidate. |
| F-14 missing response hardening | Fixed. Live CSP, frame restriction, Permissions-Policy, no-referrer, and nosniff headers were verified. |
| F-15 incomplete route and share metadata | Fixed. Added canonical, Open Graph, Twitter, 1200 × 630 art, Apple icon, route titles, manifest MIME, and full sitemap. |
| F-16 missing review documents | Fixed. Added demo, claims, copy audit, catalog description, deployment documentation, and this handoff. |
| F-17 update transition untested | Fixed. A browser test installs an old worker, serves a changed build, calls update, and sees the reload action. |

All earlier verification findings map to F-01, F-07, F-12, F-13, F-14, and
F-17 above and are closed. The previously passing normal workflow, offline,
axe, console, and performance checks still pass.

## Clean verification

A new clone at implementation SHA `8837cfc` was created outside the repository.
The documented sequence completed with Node 22.23.2 and npm 10.9.8:

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Results:

- dependency audit: 0 vulnerabilities;
- unit tests: 5 passed;
- production build: passed and created `dist/index.html`;
- browser tests: 35 passed across desktop and 390 × 844 phone; the phone copy
  intentionally skips the desktop-only service-worker update test;
- built main JavaScript: 40.64 KB raw, 13.28 KB gzip;
- built CSS: 11.96 KB raw, 3.55 KB gzip; and
- all 14 commands in `.factory/claims.json`: passed individually from that
  clean clone.

The later `2dcce9d` implementation commit only corrects the detected phone
overflow and strengthens its browser assertion. That focused phone check
passed before deployment. Commit `55ec495` only updates README and terms copy.

Browser coverage includes normal, invalid, size-boundary, retention, recovery,
keyboard, dialog focus, back/forward, reduced motion, 200% text, touch targets,
offline, update, request privacy, legal pages, metadata, link crawling, and
designed 404 behavior. Playwright axe found no serious or critical WCAG 2 A/AA
violations.

## Live verification

The static build was deployed twice to the existing
`sf-checklist-evidence-binder` app; the second deployment contains the phone
overflow correction. The custom HTTPS domain returned 200 after deployment.

- Factory URL verifier: passed with one H1, `lang`, main landmark, image alt,
  and zero console errors.
- Fresh 1366 × 900 desktop and 390 × 844 phone contexts: job, audience, and
  sample action visible before scrolling; sample populated; banner persisted;
  reset worked; real vault stayed absent; no overflow; no external requests;
  no console errors; no serious or critical axe results.
- Offline demo reload: passed in its own fresh browser context.
- Unknown route: HTTP 404 with the designed page and return link.
- Live manifest: `application/manifest+json`.
- Live hashed JS: one-year immutable cache header.
- Live response: CSP, `frame-ancestors 'none'`, Permissions-Policy,
  X-Content-Type-Options, X-Frame-Options, and no-referrer policy present.
- Built and live JavaScript, CSS, service worker, and manifest SHA-256 values
  matched exactly.
- Lighthouse mobile: performance 100, accessibility 100, best practices 100,
  SEO 100; FCP 1.0 s, LCP 1.3 s, TBT 40 ms, CLS 0.

Evidence is in `/work/.evidence/`, including desktop and phone screenshots,
`live-browser-check.json`, `verify.json`, and `lighthouse.json`.

## Known dependency

The Sociobot billing endpoint for this slug is not registered and returns 404.
Repository policy does not authorize creating billing infrastructure. Until the
factory registers that product, Proofbook exposes no checkout and gates no
features. After registration, reintroduce the one-time purchase through the
documented Sociobot billing API and add a live checkout claim test.

No AI feature was added because the local evidence workflow does not benefit
from sending operational records to a model. This PWA has no backend, shared
database, tenant, process restart, health, or 429 behavior to verify.

## Independent verification 2

Date: 2026-09-05

Verification 2 reviewed implementation `55ec495d71f48c84a66fd5d041e811bcffb3c206`
and documentation `c7eb3b811af4b4629e214e431f02a260d6701685`.

**PASS — zero findings and zero untested claims.** A separate clean clone
passed `npm ci`, `npm test` (5 unit tests), `npm run build`, and
`npm run test:e2e` (35 passed, one intentional mobile skip). Every one of the
14 exact commands in `.factory/claims.json` passed when run individually.

The fresh live desktop and phone checks confirmed the job, audience, and
sample action before scrolling; a populated persistent demo label; reset and
real-data isolation; offline reload; no third-party requests or console
errors; accessibility; privacy and legal pages; route titles; designed HTTP
404; cache and security headers; and the deployed build identity. Lighthouse
12.8.2 scored 100/100/100/100 (Performance/Accessibility/Best Practices/SEO).

See `.factory/verification-2.md` for the complete evidence and the disposition
of F-01 through F-17. No product code was changed by this verification.
