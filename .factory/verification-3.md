# Verification 3 — Repeat checks and retain evidence

Date: 2026-09-05

Live URL: <https://checklist-evidence-binder.sociobot.in>

Implementation candidate reviewed: `fb75d9e07955183ac95802cc470f7dca5a37e115`

Documentation commit reviewed: `66d4ecb2f1f69d9852062996883d59a483a690d6`

## Verdict

**PASS — zero findings and zero untested public claims.**

The live hashed main script matches the clean build of the implementation
candidate exactly: `da78c0129b5b929a5559d6d411f8e0ffa94bc745ffe5ce57846dd322948a417c`.
The later documentation commit is recorded separately above.

## First screen

Fresh 1366 × 900 desktop and 390 × 844 phone contexts were opened before
scrolling.

- Job: **Repeat checks and keep the evidence.**
- Audience: small teams that need to show a client, manager, or inspector what
  was checked.
- First action: **Try it with sample data**. It says, “See a completed check
  and one overdue check.”

Both screens showed the three facts: encrypted on this device, works offline
after the first visit, and all features are free to use. Neither had horizontal
overflow, console errors, or page errors.

## Demo and live checks

- Fresh `/demo/` desktop and phone sessions showed the persistent **Demo —
  sample data, nothing is saved** label, Reset demo, and Start for real.
  The initial Open checks view visibly contained the completed cold-room check,
  Rae Morgan’s sign-off, a completion time, and two direct file downloads.
- The sample showed exactly one overdue **Weekly fire exit walk**. A direct
  download produced `cold-room-display.txt`. Reset restored both sample files,
  and Start for real opened the empty encrypted-binder gate. No real vault
  metadata appeared in either fresh demo context.
- The dedicated clean claim test separately created and byte-compared a real
  encrypted vault before and after demo use, then reopened it unchanged. This
  proves the demo does not change existing real data.
- Live desktop and phone axe WCAG 2 A/AA scans had no violations, including no
  serious or critical violations. The skip link received first keyboard focus.
  The clean browser suite also passed dialog focus return, 44 px targets,
  200% text resizing, invalid and boundary inputs, and reduced-motion behavior.
- A fresh controlled phone context received service-worker control, went
  offline, and reloaded the populated demo with its signed record and banner.
  It recorded no console errors.
- Normal live use loaded only `https://checklist-evidence-binder.sociobot.in`.
  The clean private-network claim verifies the complete sample/export flow has
  no other origin.
- `/privacy/` and `/terms/` returned 200 with their own titles, one H1, and a
  main landmark. Locked direct routes (`/checks`, `/overdue`, `/history`, and
  `/settings`) returned the named unlock state. The deliberate unknown URL
  returned the designed 404 page with HTTP 404; this is expected behavior.
- Live response headers include CSP with `frame-ancestors 'none'`,
  Permissions-Policy, HSTS, no-referrer policy, nosniff, and X-Frame-Options.
  The manifest is `application/manifest+json`; the hashed main script is
  `max-age=31536000, immutable`.
- `/opt/fleet/lib/verify-url.sh` passed when supplied its required evidence
  directory: HTTPS 200, title, `lang=en`, one H1, main landmark, image alt
  text, labelled buttons, and zero console errors.
- Lighthouse 13.4.1 mobile: Performance **100**, Accessibility **100**, Best
  Practices **100**, SEO **100**; FCP 1.0 s, LCP 1.3 s, TBT 10 ms, CLS 0.

## Clean checkout and claim ledger

A new clone at documentation SHA `66d4ecb` used `npm ci` successfully. The
documented quality commands passed:

| Command | Result |
| --- | --- |
| `npm test` | Pass — 5 unit tests |
| `npm run build` | Pass — `dist/index.html` produced |
| `npm run test:e2e` | Pass — 37 browser tests; 1 intentional mobile skip for the desktop-only worker-update test |

Every command in `.factory/claims.json` was run individually from that clone
and passed: `demo-isolation`, `demo-completed-check`, `encrypted-local`,
`private-network`, `offline-reload`, `pwa-install`,
`recurring-required-evidence`, `signed-overdue-history`,
`retention-history`, `backup-recovery`, `export-integrity`, `file-control`,
`audit-trail`, `free-features`, and `erase-binder`.

The registry has one unique tagged outcome test for each of its 15 public
claims. Landing, demo, legal-page, and README claim-like statements were
cross-checked against that registry; no unlisted public capability claim was
found.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| F-01 corrupt backup recovery | Fixed and covered by `backup-recovery`. |
| F-02 isolated sample | Fixed and covered by `demo-isolation`. |
| F-03 untested claims | Fixed: 15 declared claims, all individually passed. |
| F-04 export integrity | Fixed and covered by `export-integrity`. |
| F-05 unavailable paid checkout | Closed: no unavailable offer is displayed; all released features are free. |
| F-06 completed file control | Fixed and covered by `file-control`. |
| F-07 phone lock and target sizing | Fixed and covered by phone/target checks. |
| F-08 first-screen clarity | Fixed; job, audience, action, and facts are visible before scrolling. |
| F-09 structure and routes | Fixed; shared structure, route titles, history, focus, and legal pages passed. |
| F-10 unknown URL | Fixed; the deliberate unknown URL is a designed HTTP 404. |
| F-11 phone overflow and 200% text | Fixed and covered by browser checks. |
| F-12 raw invalid-backup message | Fixed and covered by invalid-input checks. |
| F-13 asset cache policy | Fixed; live hashed assets are immutable for one year. |
| F-14 hardening headers | Fixed; live CSP and response policies are present. |
| F-15 metadata and routes | Fixed; metadata, canonical URLs, manifest MIME, sitemap, and 404 passed. |
| F-16 review documents | Fixed; design, demo, copy audit, claims, README, and handoff are present. |
| F-17 service-worker update | Fixed and exercised by the desktop browser test. |
| F-18 completed sample result | Fixed; the initial demo visibly contains the signed completed record and direct downloads, and `demo-completed-check` verifies it. |

## Applicability and evidence

Proofbook is a static local-first PWA. It has no backend, tenants, health
endpoint, restartable product service, or rate-limited API. The backend-only
tenant isolation, persistence restart, health, and 429/Retry-After checks do
not apply.

The one-time billing registration noted in the repair handoff remains a factory
dependency, not a broken public offer: the shipped free release has no checkout
or price claim.

Evidence is under `/work/.evidence/`: `verify-3-clean-e2e.log`,
`verify-3-claims-status.tsv`, `verify-3-live-ui.json`,
`verify-3-live-a11y-offline.json`, `verify-3-routes.json`,
`verify-3-url-verifier/verify.json`, and `verify-3-lighthouse.json`.
