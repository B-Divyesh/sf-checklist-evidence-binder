# Proofbook repair 2 handoff

Date: 2026-09-05

Live URL: <https://checklist-evidence-binder.sociobot.in>

Implementation SHA deployed: `77b70aab31efb67a065f1d503ff90ca2c118ca4f`

## What changed

The one-click sample now keeps its promise on its initial Open checks view.
It shows a completed cold-room check, completion time, Rae Morgan’s sign-off,
and two direct downloadable evidence files before the visitor opens History.
The same view retains the overdue fire-exit check and the next cold-room check.

The completed sample is a view of the existing in-memory demo binder. It does
not save to, read from, or replace the encrypted real binder. Reset restores
the sample, and Start for real returns to the real binder gate. The two new
file links have 44 px touch targets on phone.

A new public claim, `demo-completed-check`, has its own outcome-based browser
test. It opens `/demo/` from a clean context, confirms the completed record,
sign-off, completion time, two file links, and an actual download without
opening History. The test also confirms that the record is in the initial
viewport on desktop and phone.

## Review history and current disposition

| Finding | Status and evidence |
| --- | --- |
| F-01 corrupt backup could block unlock | Fixed. `backup-recovery` rejects malformed nested data before replacement and restores a deliberately damaged vault. |
| F-02 no isolated sample | Fixed. `demo-isolation` proves the in-memory sample and reset leave an encrypted real vault unchanged. |
| F-03 untested claims | Fixed. There are 15 registered claims with one unique tagged browser test each. |
| F-04 unverifiable export integrity | Fixed. `export-integrity` recomputes the exact manifest and retained-file hashes. |
| F-05 unavailable paid checkout | No broken offer is shown. The free core remains available while factory billing registration is unavailable; see Known dependency. |
| F-06 completed files unavailable | Fixed. `file-control` downloads and removes a completed file while retaining its filename history. |
| F-07 phone lock hidden | Fixed and covered by `encrypted-local`, including a 44 px visible lock control. |
| F-08 unclear first screen | Fixed. Desktop and phone show the job, audience, sample action, result, and three facts before scrolling. |
| F-09 missing structure and routes | Fixed. Shared navigation/footer, legal pages, route titles, history navigation, and route focus changes are covered by browser tests. |
| F-10 unknown route returned home | Fixed. The deliberate unknown route returns the designed HTTP 404 page. |
| F-11 touch targets and zoom overflow | Fixed. Browser tests cover 390 px, 200% text, and visible interactive target sizes. |
| F-12 raw invalid-JSON message | Fixed. Invalid backups receive a plain safe error and retain the current binder. |
| F-13 unhashed short-cache assets | Fixed. Vite assets are hashed and live JavaScript has one-year immutable caching. |
| F-14 missing response hardening | Fixed. Live CSP, frame restriction, Permissions-Policy, no-referrer, nosniff, and X-Frame-Options are present. |
| F-15 missing metadata and route details | Fixed. Route titles, canonical/share metadata, manifest MIME, sitemap, and designed 404 are covered. |
| F-16 missing review documents | Fixed. Design, demo, claims, copy audit, catalog description, README, and this handoff are present. |
| F-17 untested update transition | Fixed. The browser suite serves an updated worker and observes the reload action. |
| F-18 sample did not show its completed check | Fixed. The initial demo now visibly contains the signed completed record and direct files; `demo-completed-check` tests that result. |

## Verification

A separate clean clone of implementation `77b70aa` used Node 22.23.2 and npm
10.9.8. The documented commands all passed:

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

- Unit tests: 5 passed.
- Production build: passed and produced `dist/index.html`.
- Browser suite: 37 passed across desktop and 390 × 844 phone; one intentional
  mobile skip remains for the desktop-only two-version worker update test.
- Every command declared in `.factory/claims.json` was run separately from
  that clean clone: all 15 passed.
- Built main JavaScript: 41.48 KB raw / 13.44 KB gzip. CSS: 12.63 KB raw /
  3.67 KB gzip.

The deployed build was verified against the production HTTPS asset:

- The live hashed main JavaScript SHA-256 matched the built file exactly:
  `82e2f1927ba463e4927ffb611399caaa4d954c43d28761b778e4d80c3424da3c`.
- The factory URL verifier passed: HTTPS 200, title, `lang`, one H1, main,
  image alt text, and no console errors.
- Fresh desktop and phone contexts confirmed the job, audience, and action
  before scrolling; the persistent demo label; initial completed record and
  two files; overdue item; reset; Start for real; only same-origin requests;
  and no console or page errors.
- Live axe WCAG 2 A/AA scans found no serious or critical findings on desktop
  or phone. A fresh phone context reloaded the completed demo offline after
  service-worker control.
- The deliberate unknown live URL returned HTTP 404. The manifest uses
  `application/manifest+json`; hashed assets are immutable for one year; and
  the live security headers listed above are present.
- Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 0.98 s, LCP 1.24 s, TBT 0 ms, CLS 0.

Evidence includes `/work/.evidence/repair-2-live-desktop.png`,
`/work/.evidence/repair-2-live-phone.png`,
`/work/.evidence/repair-2-verify/verify.json`, and
`/work/.evidence/repair-2-lighthouse.json`.

## Known dependency and scope

The researched brief calls for a one-time purchase, but the product billing
registration is still absent. Proofbook does not advertise or link to a
checkout that cannot work, and all currently shipped features remain free.
Factory billing registration, an exact registered price, and a verified
license path are required before adding a paid offer or
`/work/.evidence/billing-offer.json` metadata. No billing configuration,
credentials, infrastructure, or external provider was changed here.

This is a static, local-first PWA. It has no backend, shared database,
tenant boundary, health endpoint, server restart state, or rate-limited API;
the backend-specific tenant, restart, health, and 429 checks do not apply.
No AI feature was added because the local evidence workflow has no need to
send operational records to a model.
