# Toumaï Chat — UI-1 implementation evidence

Date: 27 September 2026. Baseline: `TOUMAI_CHAT_UI_UX_AUDIT.md`. Branch: `ui-1-chat-accessibility`; start commit: `b364f481bca26023570a8055d5d36e7b1d2839d7`. No deployment.

## Findings addressed

| Finding | Root cause and previous behavior | Change and files | Verification | Result |
|---|---|---|---|---|
| UX-001, model keyboard | The visual listbox did not move focus into options or support arrow selection. | `components/ModelSelector.tsx`, `lib/models.ts`: native option buttons in a listbox, roving focus, disabled option handling, Home/End, Escape, focus return, visible focus. | TC-UI-MODEL-01–06 plus Space, Shift+Tab and outside click tests; desktop/mobile screenshots. | Fixed in component tests and local preview. |
| UX-002, light contrast | `--text-tertiary: #98907f` was 2.96:1 on the page background. | `app/globals.css`: scoped light chat token `#706658`; model descriptions use `--text-secondary` in `components/ModelSelector.tsx`. No dark token changed. | Calculated 5.27:1 on `#faf7f2` and 4.91:1 on `#f2ede5`; light/dark screenshots. | Fixed for the audited chat text token. |
| UX-003, overlay collision | The model menu stayed open after the mobile drawer opened; tool menu backdrop could consume a click. | `app/chat/page.tsx`, `components/Sidebar.tsx`, `components/ModelSelector.tsx`: drawer opening and conversation changes dismiss transient menus; mobile background is inert; drawer focus is contained and restored; tool menu closes on outside pointerdown/Escape. | TC-UI-OVERLAY-01/02, mobile drawer focus test, mobile preview screenshots. | Fixed in component tests; full authenticated route remains unverified. |
| UX-005, search no result | A populated history filtered to zero displayed nothing. | `components/Sidebar.tsx`, `lib/chat-title.ts`: localized no-result status distinct from loading, error and empty history. | TC-UI-HISTORY-EMPTY-01 and empty-history test. | Fixed in component tests. |
| UX-004, generated title | An incomplete English instruction fragment was rendered as a French conversation title. | `lib/chat-title.ts`, `components/Sidebar.tsx`: conservative display fallback for empty, malformed, placeholder, incomplete and generic assistant-instruction titles; fetched invalid title counts/reasons are warned without logging conversation text. Stored title is not changed. | TC-UI-TITLE-01–03 and rendered history test. | Fixed for detected patterns; unknown bad titles still need service-side diagnosis. |
| UX-008, model description | A capability description was truncated. | `components/ModelSelector.tsx`: complete compact secondary line with wrapping and stronger text token. | Desktop and mobile model menu screenshots. | Fixed in local preview. |

## Verification

- `npm run test:ui1 -- --maxWorkers=1`: 17 passed, 0 failed, 3 files.
- `npm run build`: passed, 41 static routes; temporary preview route removed before final build.
- `npm run typecheck`: passed after clearing a stale generated dev route reference.
- Targeted ESLint: 0 errors, 4 existing warnings in `app/chat/page.tsx` outside the UI-1 edits.
- `git diff --check` for UI-1 source and report: passed. The baseline audit uses intentional Markdown hard line breaks, which Git reports as trailing whitespace when first added.

The visual checks used a local temporary preview with the production CSS and actual `ModelSelector`, plus representative chat content. It was removed before the final build. The preview is a partial visual harness; it is not an authenticated end-to-end test of `app/chat/page.tsx` or the real `Sidebar`. Its static no-result mock is visual evidence only; the actual `Sidebar` behavior is covered by a component test.

| Viewport | Light | Dark | Document scroll width | Composer width |
|---|---|---|---:|---:|
| 1440×900 | `output/playwright/ui1/light-1440x900.png` | `output/playwright/ui1/dark-1440x900.png` | 1440 | 736 |
| 1280×800 | `output/playwright/ui1/light-1280x800.png` | `output/playwright/ui1/dark-1280x800.png` | 1280 | 736 |
| 768×1024 | `output/playwright/ui1/light-768x1024.png` | `output/playwright/ui1/dark-768x1024.png` | 768 | 448 |
| 390×844 | `output/playwright/ui1/light-390x844.png` | `output/playwright/ui1/dark-390x844.png` | 390 | 358 |
| 360×800 | `output/playwright/ui1/light-360x800.png` | `output/playwright/ui1/dark-360x800.png` | 360 | 328 |

Focused captures: `desktop-model-light-1440.png`, `desktop-model-keyboard-focus-1440.png`, `history-zero-result-light-1440.png`, `mobile-model-light-360.png`, `mobile-drawer-light-360.png`, `mobile-dark-360.png` under `output/playwright/ui1/`.

The representative message distinction, reading column, composer alignment and lack of global horizontal overflow were inspected at the five exact viewport sizes in both themes. Generation feedback appeared in a local preview state; the real stop action, long draft, real history interaction and authenticated route rendering were not rechecked after these edits. The visual identity and dark palette were unchanged. Therefore the full KEEP_AS_IS and UI-1 exit gates remain **NOT_PROVEN**, despite green tests and local visual checks.

## Limits and rollback

No real screen reader, physical mobile keyboard, Arabic/RTL rendering, uploads or network failure path was tested. The title fallback is intentionally conservative and does not repair the title generation service. The local preview raised a hydration warning from existing caret-color manipulation during first load; its screenshots were captured after reload, and the temporary route was removed.

Rollback: revert the UI-1 commit on this branch, or discard the branch before merge. Production was not changed.
