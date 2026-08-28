# Proofbook

Proofbook is a private, offline evidence binder for tiny regulated or
safety-conscious teams. It turns a small operating procedure into repeatable
checks with required evidence slots, due dates, sign-off timestamps, an overdue
queue, and a read-only evidence bundle for clients, managers, or inspectors.

It is a recordkeeping tool—not a compliance certification service or source of
jurisdictional advice.

Live: https://checklist-evidence-binder.sociobot.in

## What it does

- Encrypts the complete binder in browser IndexedDB using AES-GCM and a key
  derived from the user's passphrase. The passphrase is never stored.
- Schedules daily, weekly, or monthly check cycles and carries the next cycle
  forward after completion.
- Requires each named evidence slot to have a photo/document before sign-off.
- Keeps a local audit trail and applies a selectable evidence-file retention
  policy while preserving check metadata.
- Exports/imports a portable JSON backup and exports a standalone, read-only
  HTML evidence report with a SHA-256 manifest fingerprint.
- Installs as a PWA and reloads without a network connection.

The free edition supports two active procedures and all core evidence, safety,
accessibility, and export features. A US$29 one-time Proofbook Plus license
unlocks unlimited procedures and custom retention periods through the Sociobot
billing API. No product ID or payment-provider integration lives in this repo.

## Develop and verify

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

The production build command is exactly `npm run build`; it writes the static
site to `dist/`, with `dist/index.html` at the root. Playwright is pinned to
1.58.2. If the bundled browser is unavailable, run
`npx playwright install chromium` once.

`npm run check` runs unit tests, the production build, and desktop/mobile
browser tests. Preview a build with `npm run preview`.

## Privacy and recovery

No analytics, fonts, or scripts are loaded from third parties. Ordinary binder
use makes no network requests. License purchase/verification is the only
optional remote operation. Clearing browser site data erases the binder, and a
lost passphrase cannot be recovered, so users should keep protected backups.
See the in-product [privacy notice](https://checklist-evidence-binder.sociobot.in/privacy/)
and [terms](https://checklist-evidence-binder.sociobot.in/terms/).

The researched scope is in `.factory/brief.json`; the product-specific visual
system and generated-asset provenance are in `.factory/design.md`.

## License

MIT. See `LICENSE`.
