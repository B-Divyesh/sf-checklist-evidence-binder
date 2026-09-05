# Proofbook

Proofbook helps small regulated or safety-conscious teams repeat checks, attach
required evidence, and show signed records later. The PWA keeps one encrypted
binder in the browser and works offline after its first visit.

It is a recordkeeping tool. It does not certify compliance or provide legal or
jurisdictional advice.

Live product: <https://checklist-evidence-binder.sociobot.in>

One-click sample: <https://checklist-evidence-binder.sociobot.in/demo/>

## Try the sample

Open `/demo/` to see a completed cold-room check, its two evidence files, the
next daily check, and an overdue fire-exit walk. The persistent demo banner
offers **Reset demo** and **Start for real**. Demo changes stay in memory and do
not read or write the real IndexedDB vault.

## What it does

- Encrypts the binder payload in browser IndexedDB with AES-GCM. The key comes
  from the passphrase, which is not stored.
- Schedules daily, weekly, and monthly checks. Required files block completion.
- Keeps due, completion, and sign-off times with an overdue view.
- Keeps material changes in the encrypted binder activity list.
- Removes expired file contents while preserving filenames and record history.
- Downloads and restores JSON backups after full nested-schema validation.
- Downloads a standalone evidence report with its exact manifest and per-file
  SHA-256 values.
- Lets the owner download or remove completed files and erase the full binder.
- Installs as a standalone PWA and reloads offline after the first visit.

All features in this release are free to use. The researched business model is
a one-time purchase, but the external product checkout is not registered. No
dead purchase link or mock payment flow is shown.

## Privacy and recovery

Normal binder use sends no record data to a server and loads no third-party
runtime resources. There are no analytics or tracking calls. Browser storage
is the only source of truth, so keep protected JSON backups. A lost passphrase
cannot be recovered.

An invalid backup is rejected before confirmation or storage. If legacy local
data decrypts but fails validation, the unlock screen offers valid-backup
restore and full erase actions.

See the [privacy notice](https://checklist-evidence-binder.sociobot.in/privacy/)
and [terms](https://checklist-evidence-binder.sociobot.in/terms/).

## Clean setup and verification

Requires Node.js 20 or newer.

```sh
git clone https://github.com/B-Divyesh/sf-checklist-evidence-binder.git
cd sf-checklist-evidence-binder
npm ci
npm test
npm run build
npm run test:e2e
```

`npm run build` writes the complete static site to `dist/`, with
`dist/index.html` at its root. `npm run test:e2e` rebuilds before running the
desktop and 390 × 844 browser projects. Playwright is pinned to 1.58.2. If its
browser is not available, run `npx playwright install chromium` once.

Every public product claim is registered in `.factory/claims.json`. Run any
claim exactly as recorded there, or run the full Chromium claim set:

```sh
npm run test:claims
```

## Preview and deploy

```sh
npm run build
npm run preview
```

The preview server serves the same route and header behavior used by browser
tests. Factory deployment uses the product-scoped static app and generated
`dist/staticwebapp.config.json`:

```sh
/opt/fleet/lib/deploy-static.sh checklist-evidence-binder dist
```

The deployment helper owns only `sf-checklist-evidence-binder` and the product
subdomain. Infrastructure and billing registration stay outside this repo.

## Design and license

The researched scope is in `.factory/brief.json`. The visual system and image
provenance are in `.factory/design.md`. Proofbook is MIT licensed; see
`LICENSE`.
