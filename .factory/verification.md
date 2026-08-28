# Verification report — FAIL

Date: 2026-08-28
Candidate: `30431363119a813f999a2c9ce4d07763ebe1129c` (`main`)
Production URL: https://checklist-evidence-binder.sociobot.in

## Verdict

**FAIL.** The normal encrypted evidence-binder flow works, but a malformed
JSON backup that passes the importer’s shallow validation overwrites the
current encrypted binder and leaves it impossible to unlock through the UI.
This is an unacceptable data-recovery failure for an evidence-retention
product.

The deployed app is the tested candidate: byte-for-byte SHA-256 comparisons
matched `dist/assets/main.js`, `dist/assets/style.css`, `public/sw.js`, and
`public/manifest.webmanifest` against the corresponding live resources.

## Reproducible blocking defect

### Critical — malformed backup can permanently brick the binder

1. Create a binder, open **Binder setup**, and import this JSON, accepting the
   replacement confirmation:

   ```json
   {"version":1,"procedures":[],"records":[null],"audit":[]}
   ```

2. The importer only verifies that `records` is an array, writes this object
   into encrypted IndexedDB, and attempts to render it. Live result:
   `Cannot read properties of null (reading 'status')`.
3. Reload, enter the correct passphrase, and unlock. The same saved binder now
   fails before the binder UI opens: `Cannot read properties of null (reading
   'completedAt')`. There is no UI recovery or erase option at this stage.

The user must manually clear browser site storage (destroying the corrupted
binder) or use an already-existing external backup. This violates the stated
data ownership/recovery and retention expectations. The import must fully
validate and normalize the complete schema before any write, and must not
replace the existing vault unless that validation succeeds.

## Other defects

### Medium — Lock binder is unavailable at the required 390 px viewport

At 390 × 844, the rendered `#lock` control is not visible. The control has
classes `quiet tiny`; the `max-width: 420px` rule hides
`.header-tools .tiny`, which includes that button. Desktop exposes it. Closing
or reloading the tab clears the in-memory key, but this is not an acceptable
substitute for an explicit privacy control in the mobile interface.

### Low — malformed JSON error is raw parser text

Importing `{not json` displays `Expected property name or '}' in JSON at
position 1 (line 1 column 2)`, rather than a clear Proofbook error explaining
that the backup is invalid and the current binder was not replaced.

### Low — deployment cache policy does not meet the PWA asset policy

The live HTML, JS, CSS, service worker, and manifest all return
`cache-control: public, must-revalidate, max-age=30`. Assets are un-hashed
paths such as `/assets/main.js`; they are not served with a long immutable
cache lifetime. The service worker makes a previously installed shell usable
offline, but normal repeat visits revalidate after 30 seconds and the
deployment does not satisfy the required long-lived immutable static-asset
policy.

### Low — response hardening policies are absent

Live responses have HSTS, `Referrer-Policy: strict-origin-when-cross-origin`,
and `X-Content-Type-Options: nosniff`, but no Content-Security-Policy,
frame-ancestors/X-Frame-Options, or Permissions-Policy. This is deployment
hardening work, especially relevant to a local sensitive-records app.

## Test evidence

Clean checkout was already exactly at the candidate with no initial worktree
changes. Ran with Node 22.23.2 / npm 10.9.8:

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

- `npm ci`: completed; audit reported 0 vulnerabilities.
- `npm test`: 3/3 Vitest tests passed.
- `npm run build`: TypeScript no-emit check and Vite production build passed;
  `dist/` was produced.
- `npm run test:e2e`: 6/6 Playwright tests passed across desktop Chromium and
  the configured 390 × 844 mobile project.
- Built payload: `main.js` 33,182 B (11.20 KB gzip), CSS 9,732 B (3.10 KB
  gzip), 420 px AVIF hero 14,311 B, and no font payload. These are within the
  requested 200 KB JS, 50 KB CSS, and 300 KB mobile-image budgets.

Independent browser runs against both the production preview and the live URL
covered the following:

- Created a passphrase-encrypted binder; added a weekly procedure with
  duplicate evidence slot labels (deduplicated); attached two files; signed;
  completed; verified completion history and both JSON/HTML downloads.
- Checked wrong-passphrase recovery (correct user-facing error), retained
  data after closing the tab and reopening/unlocking, a past-due first check
  (Overdue count became 1), an over-8-MB attachment (rejected), the two-active
  procedure free-tier boundary, and malformed JSON recovery.
- Normal first-run traffic made only same-origin requests for the document,
  JS, CSS, and hero image; source inspection finds no analytics, CDN fonts, or
  third-party requests in ordinary binder use. The optional license endpoint
  is only reached after a license is stored/restored.
- Live desktop and 390 px browser runs had no console or page errors in the
  normal workflow, no horizontal overflow, and keyboard Tab first focused the
  visible skip link. The designed 3 px teal focus outline is present.
- Axe WCAG 2 A/AA scans of the live first-run desktop and 390 px views: zero
  serious or critical findings.
- `prefers-reduced-motion` CSS disables scrolling animation and reduces UI
  animation/transition duration; no looping or flashing motion was observed.
- Live PWA service worker reached `activated` state, controlled the page, and
  reloaded the full shell offline after `context.setOffline(true)` with no
  console errors. The registered worker is versioned (`proofbook-v4`) and
  contains `skipWaiting` plus `clients.claim`; an actual two-version update
  transition could not be generated without changing the candidate/deployment.

Live mobile Lighthouse 12.8.2: Performance 100, Accessibility 100, Best
Practices 100, SEO 100. FCP 1.1 s, LCP 1.3 s, interactive 1.3 s, TBT 70 ms,
CLS 0.

## Scope notes

This is a PWA, not a library, CLI, or backend; package-consumer, API
concurrency, health, and build-identity tests do not apply. No product source
was modified during verification.
