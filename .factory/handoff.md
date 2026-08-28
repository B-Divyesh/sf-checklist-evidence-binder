# Proofbook verification handoff — FAIL

Verification work order: `checklist-evidence-binder-verify-1`
Verified candidate: `30431363119a813f999a2c9ce4d07763ebe1129c`
Verified live URL: https://checklist-evidence-binder.sociobot.in
Date: 2026-08-28

**Do not release this candidate.** A malformed but accepted JSON backup can
overwrite the encrypted binder and make it impossible to unlock through the
product UI. See `.factory/verification.md` for the exact payload and
reproduction. The report also records the hidden 390 px Lock binder action,
short deployment cache lifetime, and missing response-hardening policies.

Verification completed without product-code changes. `npm ci`, `npm test`
(3/3), the exact `npm run build`, and `npm run test:e2e` (6/6) pass, and the
live static files exactly match the candidate. The normal full workflow,
offline PWA reload, mobile/desktop axe scans, privacy/outbound-request check,
keyboard/focus check, and Lighthouse audit were also run. Passing gates do not
override the critical recovery/data-integrity failure.

---

# Original build handoff (superseded by verification result)

Work order: `checklist-evidence-binder-build-1`
Completed: 2026-08-28

## What shipped

- A Vite + vanilla TypeScript offline PWA with a product-specific cassette-era
  zine visual system at desktop and 390 px mobile widths.
- Passphrase onboarding and AES-GCM encrypted IndexedDB storage. The encryption
  key is derived with PBKDF2 (SHA-256, 250,000 iterations) and is held only for
  the open session.
- Daily, weekly, and monthly procedures; named required evidence slots;
  photo/document attachment; draft notes; operational sign-off; completion
  timestamps; automatic next-cycle scheduling; overdue view; completion
  history; and a local encrypted activity trail.
- Retention choices of 30/90/365 days or manual deletion, with custom periods
  in Plus. Expiry removes file payloads while preserving record metadata.
- Readable JSON backup/import and standalone read-only HTML evidence bundles.
  The bundle includes SHA-256 content hashes for each retained evidence file
  and a SHA-256 fingerprint for the exported manifest.
- PWA manifest, maskable icons, versioned service-worker app-shell cache,
  network-first navigation, cache-first assets, offline fallback, and an update
  notice. Offline reload is exercised in Chromium at desktop and 390 px.
- Free edition with two active procedures and ungated core evidence/export;
  US$29 one-time Plus unlock for unlimited procedures and custom retention.
  Checkout, return-token capture, once-daily verification caching, optimistic
  offline unlock, invalid-license downgrade, and paste-to-restore follow the
  Sociobot billing contract. No payment provider is embedded.
- Privacy and terms pages, MIT license, sitemap/robots, reduced-motion support,
  designed focus states, skip link, semantic landmarks, and mobile-safe dialog
  behavior.

## Visual asset

The original generated source, prompt metadata, and review are in
`assets/src/`. Shipping variants are responsive AVIF (16/48 KB) and WebP
(24/84 KB), all below the 300 KB hero budget. The asset was reviewed for
pseudo-text, object errors, brands, seals, and misleading UI; none were found.
Full palette, typography, spacing, interaction, motion, prompt, provenance, and
the single-mode rationale are documented in `.factory/design.md`.

## Verification

From a clean checkout:

```sh
npm ci
npm run check
```

Verified locally:

- `npm test`: 3/3 unit tests pass.
- `npm run build`: passes; output is `dist/` with `dist/index.html` at root.
- Production payload: 33.1 KB JS / 9.7 KB CSS uncompressed; zero font bytes;
  16 KB mobile AVIF hero.
- `npm run test:e2e`: 6/6 Playwright tests pass across desktop Chromium and a
  390 × 844 mobile viewport. The flow creates/unlocks the encrypted vault,
  creates a recurring procedure, attaches both required files, signs and
  completes it, and verifies history. Both first-run and populated binder views
  have no serious/critical axe findings and no console/page errors.
- Offline test: after initial install, both desktop and mobile reload the full
  app with `context.setOffline(true)`.
- Lighthouse 12.8.2 mobile/default audit against the production preview:
  Performance 100, Accessibility 100, Best Practices 100, SEO 100. FCP 0.9 s,
  LCP 1.6 s, TBT 0 ms, CLS 0, time to interactive 1.6 s.
- Visual inspection performed on the generated hero and a full-page 390 px
  first-run screenshot. No overflow, clipping, text collision, accidental
  marks, or undersized primary controls observed.

## Known boundaries and next steps

- Proofbook intentionally has no sync, shared accounts, enterprise roles,
  jurisdiction templates, or certification advice. Moving devices requires a
  backup import and, for Plus, pasting the license.
- A forgotten passphrase cannot be recovered. JSON backups and exported HTML
  are readable by design, so the UI warns users to protect exported files.
- Browser storage quotas vary; each evidence file is capped at 8 MB. A future
  version could show estimated binder storage before users reach quota.
- The factory must register/switch the paid product configuration at release;
  the app contains only the slug-based Sociobot API contract and no product ID.
- Deployment, DNS, billing registration, and external production smoke tests
  remain factory responsibilities and were not changed from this repository.
