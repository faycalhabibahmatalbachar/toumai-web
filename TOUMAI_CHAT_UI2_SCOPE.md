# Toumaï Chat — UI-2 scope

Date: 28 September 2026  
Source audit: `TOUMAI_CHAT_UI_UX_AUDIT.md`  
Preparation branch: `ui-1-chat-accessibility`  
Certified runtime SHA: `114acd7ea84f7cc717fa849565eb9e5dd6722567`  
UI-1 evidence SHA: `883ddd3c910859b1936ce7245cca73549f59a515`

## Entry gate

- `RUNTIME_DIFF_AFTER_CERTIFICATION = NONE`
- `UI1_GATE = PROVEN`
- `MERGE_READINESS = READY_FOR_REVIEW`
- `MERGE_PERFORMED = NO`
- `PRODUCTION_DEPLOYMENT = NO`
- `UI2_IMPLEMENTATION = NOT_AUTHORIZED`

The only commit between the certified runtime and the evidence SHA changes `TOUMAI_CHAT_UI1_IMPLEMENTATION.md` and adds 15 authenticated screenshots under `output/ui1-auth/`. These files are classified as `DOCUMENTATION_ONLY` and `CERTIFICATION_ONLY`; no runtime, configuration, component, hook, service, JavaScript, TypeScript or CSS file changed.

## P2 extraction from the original audit

The original audit contains exactly five P2 findings: `UX-003`, `UX-004`, `UX-005`, `UX-006` and `UX-007`.

| Finding | UI-1 status | UI-2 decision |
|---|---|---|
| UX-003 — model menu and mobile drawer coexist | Fixed and authenticated-preview proven | Excluded from implementation; regression invariant |
| UX-004 — invalid generated conversation title | Fixed and authenticated-preview proven | Excluded from implementation; regression invariant |
| UX-005 — missing zero-result history state | Fixed and authenticated-preview proven | Excluded from implementation; regression invariant |
| UX-006 — 36 px icon touch targets | Remaining | Included |
| UX-007 — dense/noisy expanded source card | Remaining | Included |

`UI2-A11Y-001` is added from the authenticated UI-1 measurement required by the master program. It is a pre-existing P2 accessibility finding, not an inferred priority from the phase-0 audit.

## UI2-A11Y-001

**ID:** UI2-A11Y-001  
**SEVERITY:** P2  
**CATEGORY:** ACCESSIBILITY / CONTRAST  
**LOCATION:** Dark-theme disclaimer below the chat composer  
**OBSERVED:** The disclaimer is rendered at 11 px with `rgb(133, 124, 107)` on `rgb(33, 29, 24)`, measured at approximately 4.06:1.  
**USER IMPACT:** Small safety text is harder to read for users with low vision or in poor display conditions.  
**ROOT CAUSE:** `app/chat/page.tsx` applies `text-[11px] text-[var(--text-tertiary)]`; the dark chat token resolves to `#857c6b`. UI-1 scoped a stronger light token but intentionally left dark tokens unchanged.  
**PROPOSED FIX:** Adjust only the dark chat disclaimer color or its scoped semantic token to reach at least 4.5:1 against the actual background. Preserve the wider dark palette and verified light value.  
**FILES LIKELY AFFECTED:** `app/globals.css`; possibly `app/chat/page.tsx`; focused contrast test.  
**RISK:** LOW. A global tertiary-token change could affect unrelated surfaces, so the correction must remain chat/disclaimer scoped.  
**ACCEPTANCE CRITERIA:** Measured contrast is at least 4.5:1 in dark mode; light mode remains at least 4.5:1; disclaimer remains readable at 360, 390, 768, 1280 and 1440 px; no brand-palette or composer-layout regression.  
**REGRESSION RISK:** Unintended brightening of secondary chrome or metadata if the global token is changed.  
**TEST STRATEGY:** Computed-color contrast test plus authenticated dark/light screenshots at 1440×900 and 390×844; recheck the five-view baseline for overflow and composer alignment.

## UX-006

**ID:** UX-006  
**SEVERITY:** P2  
**CATEGORY:** ACCESSIBILITY / TOUCH  
**LOCATION:** Frequent icon buttons in the composer and chat header  
**OBSERVED:** `Outils`, `Dicter`, `Parler` and `Discussion éphémère` measured approximately 36×36 CSS px; the theme control measured 40×40 px.  
**USER IMPACT:** Closely spaced actions can be harder to activate reliably by touch, especially on mobile or with motor limitations.  
**ROOT CAUSE:** The shared `.chat-iconbtn` rule sets both dimensions to `2.25rem` (36 px). The same compact primitive is reused across actions with different frequency and surrounding space.  
**PROPOSED FIX:** Provide an effective target near 44×44 px for frequent touch actions while keeping the existing icon size and composer hierarchy. Use spacing or a scoped hit-area rule rather than enlarging every icon visually. Measure neighboring-target spacing before choosing the final rule.  
**FILES LIKELY AFFECTED:** `app/globals.css`, `app/chat/page.tsx`; interaction/style tests for the composer and header.  
**RISK:** MEDIUM. Increasing physical boxes can reduce composer space at 360 px, alter wrapping, or disturb the certified alignment.  
**ACCEPTANCE CRITERIA:** Frequent mobile actions have approximately 44×44 px effective targets where space permits; no overlap or accidental activation; 360×800 and 390×844 remain free of horizontal overflow; composer input retains useful width; all accessible labels and focus rings remain present. Any justified exception records its target size and spacing.  
**REGRESSION RISK:** Composer crowding, model-label truncation, vertical-height growth and header wrapping.  
**TEST STRATEGY:** DOM rectangle measurements and real pointer interaction at 360×800, 390×844 and 768×1024; keyboard focus check; full five-view visual matrix; long-draft and generation/stop regression checks.

## UX-007

**ID:** UX-007  
**SEVERITY:** P2  
**CATEGORY:** CONVERSATION / SOURCE CREDIBILITY  
**LOCATION:** Expanded Web source card  
**OBSERVED:** An expanded source presents title, domain, date/time, status and a small two-line excerpt. The audited ATPE excerpt also exposed editorial sharing terms such as `Facebook`, `X`, `Pinterest` and `LinkedIn`, making the card dense and noisy.  
**USER IMPACT:** Users need more effort to identify the source and assess its relevance; scraped editorial noise weakens perceived credibility.  
**ROOT CAUSE:** `SourcesCard` in `components/chat/widgets/kinds/ResearchWidgets.tsx` gives title, metadata and raw source snippet similar visual proximity. The frontend truncates the snippet but does not reduce common editorial boilerplate. The upstream extraction quality remains outside this phase.  
**PROPOSED FIX:** Keep title and domain as the primary scan path, make date/status secondary, and reduce or omit visibly low-value snippet text with a conservative presentation rule. Do not alter search, retrieval or citation backends.  
**FILES LIKELY AFFECTED:** `components/chat/widgets/kinds/ResearchWidgets.tsx`; source-card fixtures/tests under `components/chat/widgets/lab/` or focused component tests.  
**RISK:** MEDIUM. Aggressive cleanup could hide meaningful source context, dates or provenance; locale and RTL layouts could regress.  
**ACCEPTANCE CRITERIA:** Title and domain are immediately scannable; date and visited/found state remain available; common sharing boilerplate does not dominate the visible excerpt; source link, focus state and external-link behavior remain accessible; long titles and snippets fit desktop, tablet and mobile without global overflow.  
**REGRESSION RISK:** Loss of useful context, inconsistent truncation, inaccessible links, card-height shifts and mixed-language wrapping.  
**TEST STRATEGY:** Canonical fixtures for clean, noisy, missing and long snippets; keyboard focus/open test; authenticated source-card validation in light and dark themes at 1440×900, 768×1024 and 390×844.

## UI-2 boundaries

### Included

1. `UI2-A11Y-001` dark disclaimer contrast.
2. `UX-006` effective touch-target sizing.
3. `UX-007` source-card visual hierarchy and conservative snippet presentation.
4. Regression verification for the UI-1 fixes and KEEP-AS-IS invariants.

### Excluded

- OAuth preview configuration debt.
- Authentication architecture.
- Search/retrieval backend and source extraction pipeline.
- Citation frequency (`UX-009`, P3).
- Composer shortcut microcopy (`UX-010`, P3).
- New navigation architecture without usage evidence.
- Real-device mobile, screen-reader, RTL and broad content-rendering phases, which retain their separate program phases.
- General redesign or theoretical token expansion.

## Required regression contract

UI-2 must preserve:

- `READING_COLUMN_WIDTH`
- `COMPOSER_ALIGNMENT`
- `MESSAGE_DISTINCTION`
- `GENERATION_FEEDBACK`
- `STOP_ACTION`
- `LONG_DRAFT_STABILITY`
- `NO_HORIZONTAL_OVERFLOW`
- `TOUMAI_VISUAL_IDENTITY`
- model selector keyboard behavior and focus return
- one active mobile interactive layer
- history zero-result state and title fallback

## Release evidence required after implementation

- Behavioral tests that can fail when the corrected behavior is removed.
- Typecheck, build and targeted lint.
- Authenticated preview with verified deployed SHA.
- Five exact viewports: 1440×900, 1280×800, 768×1024, 390×844 and 360×800.
- Light and dark themes.
- Real generation and stop action.
- Model keyboard and mobile overlay regression checks.
- Measured contrast and touch-target rectangles.
- Source-card interaction with a real authenticated conversation.

## Stop gate

`UI2_IMPLEMENTATION = STOPPED_PENDING_EXPLICIT_AUTHORIZATION`

No runtime implementation, UI-2 branch, preview deployment, merge or production deployment is authorized by this scope document.
