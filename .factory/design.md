# Proofbook visual system

## Direction: cassette-era field zine

Proofbook should feel like the dependable evidence binder found beside a label
maker and a tape deck: tactile, legible, a little improvised, and built to be
used with work-worn hands. The interface borrows index tabs, fluorescent
inspection stickers, photocopy grain, ruled log sheets, and cassette windows.
It does not borrow nostalgia at the expense of clarity: evidence and due state
always dominate the decoration.

The experience is intentionally single-mode. A warm paper ground is part of
the evidence-binder metaphor and is painted explicitly throughout the app,
including the install splash.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#F2EBD8` | main ground, like an old procedure sheet |
| `sheet` | `#FFFDF5` | primary work surface |
| `ink` | `#171814` | body and structural lines |
| `muted-ink` | `#56594D` | secondary copy (7.0:1 on paper) |
| `oxide` | `#B93E27` | primary action, recording-light red |
| `oxide-dark` | `#7E2819` | hover/action contrast |
| `signal` | `#D9ED4B` | selected tabs and due-soon labels |
| `teal` | `#176B68` | complete state and focus support |
| `warning` | `#8C4A08` | overdue state |
| `danger` | `#A12628` | deletion and error |

Status is always paired with words, symbols, or counts. All text combinations
meet WCAG AA; white is used on oxide-dark, and ink on signal.

## Typography

- Display: `Arial Black`, `Franklin Gothic Heavy`, system sans-serif. Compact,
  uppercase titles echo hand-set zine headlines without a font download.
- Working text: `Courier New`, `Liberation Mono`, monospace. It reads as a
  field log and gives dates and counts stable tabular rhythm.
- Scale: 14 / 16 / 18 / 24 / clamp(32–56) px. Body is never below 16 px.

No web fonts are fetched. The system pairing keeps the offline shell immediate
and the initial font payload at zero.

## Spacing and shape

An 8 px base rhythm: 4, 8, 12, 16, 24, 32, 48, 64. Main content is capped at
1180 px. Corners are clipped or lightly rounded (0–6 px), never pill-heavy.
Two-pixel ink rules, offset shadows, rough registration marks, and tab-like
labels create depth. Every target is at least 44 × 44 px. At 390 px, sidebar
navigation becomes a horizontal tab strip, multi-column fields stack, and
secondary explanatory copy yields before controls do.

## Interaction grammar

- “Record” actions use oxide and a small circular REC mark.
- Binder navigation uses numbered paper tabs. Selection uses signal yellow,
  a dark underline, and `aria-current`.
- Independent repeatable checks appear as clipped cards; required evidence is
  shown as physical “slots” inside a check.
- Dialogs arrive like a sheet placed on top of the binder. Focus enters the
  first field and returns to the invoking control.
- Save, complete, import, and delete actions always announce a plain-language
  result. Destructive actions name what will be removed and require consent.

## Motion

State changes use 180 ms opacity/translate transitions: sheets lift by 4 px,
toasts slide from their edge, and progress bars grow from the left. Nothing
loops or flashes. With `prefers-reduced-motion: reduce`, scrolling is instant,
animations are removed, and state changes rely on color plus text/icon changes.

## Original asset plan and provenance

Hero asset: a square editorial still life of an unbranded compact cassette,
inspection checklist, paper clips, date stamp, and evidence photo contact
sheets. It clarifies “repeatable checks with proof” at a glance. The source PNG
is retained under `assets/src/`; shipping variants are WebP/AVIF, with a
hand-authored geometric poster fallback in CSS. App icons are hand-authored SVG
using the cassette-window motif, then rasterized locally.

Prompt sheet:

> Use case: stylized-concept. Asset type: Proofbook PWA editorial hero.
> Top-down still life of a blank unbranded compact cassette used as an evidence
> archive, an inspection checklist with empty square marks, two instant-photo
> contact sheets showing abstract equipment details, paper clips and a small
> date stamp. Cassette-era DIY zine, cut-paper collage, risograph ink,
> photocopied halftone grain, imperfect registration, tactile off-white paper.
> Strong graphic composition with the cassette centered and clean negative
> space around the edges. Oxide red, fluorescent chartreuse, deep teal, black,
> warm cream. No readable text, no people, no hands, no logos, no brands, no
> watermark, no compliance seals, no gradients, no glossy 3D render.

Generated with the factory image deployment via
`/opt/fleet/lib/gen-image.sh`, 2026-08-28. Generated imagery is original to
Proofbook and used under the product's MIT license. Candidate review checks:
no legible pseudo-text, accidental brands, official seals, misleading UI, or
broken object geometry.

