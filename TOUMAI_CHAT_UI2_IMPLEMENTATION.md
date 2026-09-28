# Toumaï Chat — UI-2 implementation and certification

Date: 28 September 2026

Branch: `ui-2-chat-quality`

Base and start SHA: `4fe9330aafffda3077216e6933d6c5564a8163f4`

Certified runtime SHA: `b8be34ce5b51e8d3f5e0c77492421901c7bf05c0`

Preview alias: `https://ui-2-chat-quality.toumaiai-web.pages.dev`

Immutable preview: `https://8e4cf854.toumaiai-web.pages.dev`

Cloudflare deployment: `8e4cf854-48d0-403a-86c7-08262fde48be`, environment `Preview`, source `b8be34c`

## Implemented scope

| Finding | Reproduction | Implementation | Authenticated verification | Result |
|---|---|---|---|---|
| UX-006 | Frequent composer/header icon targets measured 36×36 CSS px on the certified UI-1 preview. | `.chat-iconbtn` dimensions increased to 44×44 px without changing icon size. | `Outils`, `Dicter`, `Parler à Toumaï AI` and `Discussion éphémère` each measured 44×44 px at 390×844. All five viewports retained exact document width. | `FIXED_AND_VERIFIED` |
| UX-007 | A real expanded source exposed navigation and sharing boilerplate, including `Skip to content` and social labels. | Added conservative snippet normalization and trimming at known editorial boilerplate while preserving useful leading context. | The same authenticated conversation retained five source links, titles, domains, state and useful excerpts. `Skip to content` and the social boilerplate were absent. | `FIXED_AND_VERIFIED` |
| UI2-A11Y-001 | Dark 11 px disclaimer measured 4.06:1 on `rgb(33,29,24)`. | Added a disclaimer-specific semantic color: dark `#8f8675`, light `#706658`. | Dark: `rgb(143,134,117)` on `rgb(33,29,24)`, 4.654:1. Light: `rgb(112,102,88)` on `rgb(250,247,242)`, 5.268:1. | `FIXED_AND_VERIFIED` |

The source cleanup is intentionally presentation-only. Retrieval, citation data, source links and backend behavior are unchanged.

## Local verification

- Behavioral suite: 4 test files, 19 tests discovered, 19 executed, 19 passed, 0 failed, 0 skipped. Vitest duration 22.13 s; command wall time 28.913 s.
- Typecheck: PASS in 13.4 s.
- Targeted lint: PASS in 86.92 s with 0 errors and 5 warnings. Four warnings in `app/chat/page.tsx` predate UI-2; the fifth says CSS is outside the configured ESLint patterns.
- Production build: PASS in 73.439 s. Next.js compiled in 23.3 s, type checking took 25.5 s, and all 41 static pages completed.
- The first full suite run exposed a timing-sensitive UI-1 empty-history fixture. The test used an artificial 30 ms delay while expecting the empty state immediately. The fixture now resolves immediately; runtime code was not changed. The focused test passed 4/4 before the final 19/19 run.

## Authenticated preview matrix

| Viewport | Dark | Light | Horizontal overflow | Composer and sources |
|---|---:|---:|---:|---:|
| 1440×900 | PASS | PASS | none, 1440/1440 | PASS |
| 1280×800 | PASS | PASS | none, 1280/1280 | PASS |
| 768×1024 | PASS | PASS | none, 768/768 | PASS |
| 390×844 | PASS | PASS | none, 390/390 | PASS |
| 360×800 | PASS | PASS | none, 360/360 | PASS |

At 360 px, the composer input retained 294.67 px of width; at 390 px it retained 324.67 px. A 1,392-character draft stayed inside the 360 px viewport, kept the send action visible and used internal scrolling.

## Interaction and accessibility verification

- Model selector: `Tab`, `Enter`, `Space`, `ArrowDown`, `ArrowUp`, `Escape` and `Shift+Tab` exercised in the authenticated runtime. The listbox opened by Enter/Space, arrow focus moved between Sao 4 and Toumaï 5, Escape closed it and restored trigger focus, and Shift+Tab moved to the prior control.
- Mobile overlay at 390×844: before opening the drawer, `listbox=1` and `dialog=0`; after opening it, `listbox=0`, `dialog=1`, and the model trigger reported `aria-expanded=false`.
- History zero result: `role=status` announced “Aucune conversation trouvée. Essayez un autre mot-clé.”
- Title regression: authenticated history retained meaningful titles and exposed no `null`, `undefined` or serialized-object titles.
- Real generation: a Sao 4 generation displayed progress and an `Arrêter la génération` control. The stop control was activated; it disappeared and the composer remained enabled.
- Semantic checks covered accessible names, button/listbox/option/dialog/status roles, focus movement, focus return, target rectangles, theme contrast and horizontal overflow.
- Screen reader: `NOT_PROVEN`; no real screen-reader session was run.
- RTL: `NOT_TESTED`; the scoped source presentation uses wrapping and truncation without direction-specific changes, and broad RTL coverage remains outside UI-2.

## UI-1 regression invariants

- `UX-003_REGRESSION = NO`
- `UX-004_REGRESSION = NO`
- `UX-005_REGRESSION = NO`
- `READING_COLUMN = PASS`
- `COMPOSER_ALIGNMENT = PASS`
- `MESSAGE_DISTINCTION = PASS`
- `GENERATION_FEEDBACK = PASS`
- `STOP_ACTION = PASS`
- `LONG_DRAFT_STABILITY = PASS`
- `NO_HORIZONTAL_OVERFLOW = PASS`
- `TOUMAI_IDENTITY = PASS`

## Console and runtime classification

No console errors, React errors or hydration errors were observed. Warnings were environment/pre-existing items: Cloudflare Turnstile `110200` and cleanup messages, repeated Google Identity initialization, and the existing `[chat-title] display fallback used` diagnostic. No warning was attributable to the UI-2 changes.

## Evidence

Before:

- `output/ui2/before-ux006-a11y-390x844-dark.png`
- `output/ui2/before-ux007-sources-1440x900-dark.png`

After:

- Five dark viewport captures: `output/ui2/after-dark-*.png`
- Five light viewport captures: `output/ui2/after-light-*.png`
- `output/ui2/after-ux006-a11y-390x844-dark.png`
- `output/ui2/after-ux007-sources-1440x900-dark.png`
- `output/ui2/after-mobile-overlay-390x844-light.png`
- `output/ui2/after-history-empty-390x844-light.png`
- `output/ui2/after-real-generation-progress-1440x900-light.png`
- `output/ui2/after-stop-generation-1440x900-light.png`
- `output/ui2/after-long-draft-360x800-light.png`

### Evidence integrity repair

- `after-light-1440x900.png` and `after-light-390x844.png` were recaptured from the authenticated certified UI-2 preview at their exact named viewport dimensions.
- `before-ux006-a11y-390x844-dark.png` was recaptured at 390 x 844 from the authenticated historical UI-1 preview in dark theme. That runtime measured the three scoped composer controls at 36 x 36 px and retained the pre-fix disclaimer colors.
- All 19 PNG evidence files were decoded and checked against the dimensions encoded in their filenames: `19 valid`, `0 invalid`.
- This evidence correction changed no runtime, test or configuration file.

## Certification

- `UX-006 = FIXED_AND_VERIFIED`
- `UX-007 = FIXED_AND_VERIFIED`
- `UI2-A11Y-001 = FIXED_AND_VERIFIED`
- `DESKTOP = PASS`
- `TABLET = PASS`
- `MOBILE = PASS`
- `LIGHT = PASS`
- `DARK = PASS`
- `KEYBOARD = PASS`
- `ACCESSIBILITY = PASS` for the scoped automated and manual checks above
- `PREVIEW_RUNTIME = VERIFIED`
- `EVIDENCE = COMPLETE`
- `UI2_GATE = PROVEN`
- `MERGE_PERFORMED = NO`
- `PRODUCTION_DEPLOYMENT = NO`

`MERGE_READINESS = READY_FOR_REVIEW`. `PRODUCTION_READINESS = READY_FOR_SEPARATE_RELEASE_DECISION`; no production action was performed as part of this certification.
