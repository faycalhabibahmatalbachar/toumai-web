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

## FINAL AUTHENTICATED CERTIFICATION — pending local sign-in

Certification attempt: 27 September 2026, branch `ui-1-chat-accessibility`, UI-1 commit `611b36797d2487aad5c0f4c09bbb2567634ae49d`. Local frontend: `http://localhost:3210`, running the branch code with the configured `https://api.toumaiai.com/api/v1` backend. No merge or deployment was performed.

The local `/chat/` route redirected to `/login/?next=%2Fchat%2F`. The existing authenticated Edge tab on `toumaiai.com` runs the production frontend and cannot certify this branch. Google login from localhost was rejected by Google with `origin_mismatch` for `http://localhost:3210`. GitHub login returned to `https://toumaiai.com/chat/`, leaving the local origin unauthenticated. An Edge tab is ready for the account owner to complete the normal email/password login locally; no credentials or session tokens were copied.

| Required scenario | Result | Reason |
|---|---|
| Authenticated new chat, five exact viewports | NOT_PROVEN | Local patched frontend has no authenticated session. |
| Real generation, progress and stop | NOT_PROVEN | Cannot send a real local chat message before sign-in. |
| Long draft and long conversation | NOT_PROVEN | Cannot enter authenticated chat. |
| Real model keyboard and mobile drawer | NOT_PROVEN | Component tests pass, but authenticated route is unavailable. |
| History search and title regression | NOT_PROVEN | Real account history is inaccessible on local frontend. |
| Light and dark theme on authenticated chat | NOT_PROVEN | Prior visual preview is not authenticated evidence. |
| Console and network behavior of authenticated chat | NOT_PROVEN | No authenticated local traversal. Google `origin_mismatch` is a login configuration error, not a UI-1 runtime error. |

KEEP_AS_IS statuses: `READING_COLUMN_WIDTH`, `COMPOSER_ALIGNMENT`, `MESSAGE_DISTINCTION`, `GENERATION_FEEDBACK`, `STOP_ACTION`, `LONG_DRAFT_STABILITY`, `NO_GLOBAL_HORIZONTAL_OVERFLOW` and `TOUMAI_VISUAL_IDENTITY` are all **NOT_TESTABLE** in the required authenticated local chat at this point. The earlier local visual preview and accepted production audit remain separate evidence.

Final automated rerun: `npm run test:ui1 -- --pool=threads --maxWorkers=1` passed (17/17, exit 0); `npm run typecheck` passed (exit 0); `npm run build` passed (exit 0, 41 routes); targeted ESLint passed with 0 errors and the same 4 existing warnings (exit 0). An initial default Vitest run failed because a fork worker did not start; one threads run had a timeout on the empty-history test under load. That test passed alone and the full 17-test suite passed on rerun.

Authenticated screenshots: none. The requested `auth-*.png` files cannot be truthfully captured before local sign-in. No UI-1 regression has been observed on the patched authenticated route, and none can be ruled out. **UI1_GATE = NOT_PROVEN**. Next step: start the local dev server again (`npm run dev -- -p 3210`), complete normal sign-in on localhost, or provide an authenticated staging URL that runs commit `611b367`; then execute the scenario and viewport matrix above.
