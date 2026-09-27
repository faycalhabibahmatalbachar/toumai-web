# Toumaï WhatsApp Experience V2 — Testing Contract

This document is mandatory for every implementation step in the WhatsApp Experience V2 program.

## 1. Definition of done for one step

A step is not complete until all applicable layers pass:

1. Static/contract check
2. TypeScript check
3. Build check
4. Component/state check
5. Browser interaction check
6. Real backend/provider check when the step performs a real WhatsApp action
7. Mobile check
8. Accessibility check
9. RTL check when text/layout is affected
10. Regression check against the existing WhatsApp flows

If a real provider action cannot be executed, the step must be marked `NOT_PROVEN_E2E` rather than `PASS`.

## 2. Evidence format

Every step report must include:

```text
STEP_ID=
BRANCH=
HEAD_SHA=
FILES_CHANGED=
STATIC_CHECK=
TYPECHECK=
BUILD=
BROWSER_E2E=
REAL_PROVIDER_E2E=
MOBILE=
A11Y=
RTL=
REGRESSION=
FINAL_STATUS=PASS|PARTIAL|BLOCKED
BLOCKER=
```

No `PASS` is allowed without the underlying command/test/evidence.

## 3. User-reproducible prompt rule

For every step tested by the implementation agent, provide the user a copy/paste prompt containing:

- repository and exact branch;
- exact feature/step under test;
- prohibition on changing code unless explicitly asked;
- exact checks to perform;
- exact expected visible result;
- requirement to report discrepancies with screenshot/DOM/console/network evidence when available;
- requirement to distinguish UI success from provider success.

## 4. Standard user test prompt template

```text
SESSION: TOUMAI-WA-V2-<STEP_ID>-USER-VERIFY

Repository:
faycalhabibahmatalbachar/toumai-web

Branch:
codex/whatsapp-experience-v2

ROLE:
You are a verification session. Do not redesign, refactor, merge or silently fix anything.
Your job is to verify the exact implementation step below end-to-end and report evidence.

STEP UNDER TEST:
<STEP NAME>

MANDATORY CHECKS:
1. Confirm current branch and HEAD SHA.
2. Inspect only the files relevant to this step.
3. Run the required static/type/build tests.
4. Launch the app in a clean browser session.
5. Test desktop and mobile viewport.
6. Test keyboard navigation and visible focus.
7. Test loading, ready, success, failure and recovery states applicable to this step.
8. If the step executes a real WhatsApp action, execute it with the designated test account and verify the result on the receiving WhatsApp device/account.
9. Never infer delivered/read from UI appearance alone; use the provider/runtime evidence available.
10. Report PASS/PARTIAL/BLOCKED with exact evidence.

EXPECTED RESULT:
<EXPECTED RESULT>

OUTPUT FORMAT:
BRANCH=
HEAD_SHA=
STATIC_CHECK=
TYPECHECK=
BUILD=
DESKTOP_E2E=
MOBILE_E2E=
KEYBOARD_A11Y=
REAL_WHATSAPP_E2E=
REGRESSION=
FINAL_STATUS=
EVIDENCE=
DEFECTS=
```

## 5. Real WhatsApp action matrix

The following actions require a real-provider E2E before production rollout:

- connect by QR;
- connect by pairing code;
- reconnect after expiry;
- disconnect;
- send text to one contact;
- send text to a group;
- send image;
- send document;
- send audio/voice when supported;
- create group;
- add participant;
- remove participant;
- rename group;
- publish status when enabled;
- schedule an outbound message and observe execution;
- cancel an action before execution when supported;
- permission denied -> authorize -> retry;
- provider unavailable -> recovery;
- duplicate/retry protection;
- partial/unknown provider outcome rendering.

## 6. Truthfulness assertions

Tests must reject any UI that:

- paints an unknown result green;
- says `delivered` when only provider acceptance is known;
- says `read` without read evidence;
- says a contact list is fresh when it is cached/stale;
- says a permission is unavailable when the capability source is merely unknown;
- hides QR/code expiry;
- silently retries a destructive action without user-visible state;
- loses the recipient/action preview before confirmation.

## 7. Phase 1 verification prompt

Use this prompt to independently verify the audit currently committed on the branch:

```text
SESSION: TOUMAI-WA-V2-PHASE1-USER-VERIFY

Repository: faycalhabibahmatalbachar/toumai-web
Branch: codex/whatsapp-experience-v2

Do not modify code.
Audit the Phase 1 WhatsApp UX documentation against the actual repository.

Verify at minimum:
- app/chat/page.tsx
- components/chat/WhatsAppConnectorCard.tsx
- components/chat/widgets/ActionExecutionCard.tsx
- components/chat/widgets/kinds/ConnectorWidgets.tsx
- components/settings/WhatsAppPermissionsPanel.tsx
- components/settings/WhatsAppCarnetPanel.tsx
- components/chat/WhatsAppProtectionPanel.tsx
- app/whatsapp/page.tsx
- lib/whatsapp-intents.ts

Confirm whether every KEEP / IMPROVE / MERGE decision in docs/whatsapp-experience-v2/PHASE-1-UX-AUDIT.md is supported by the code.
Confirm that Phase 1 changed no runtime source file.
Compare the branch with main.

Return:
BRANCH=
HEAD_SHA=
AUDIT_COVERAGE=
NO_RUNTIME_CHANGE=
TRUTHFULNESS_RULES=
TARGET_ARCHITECTURE=
FINAL_STATUS=PASS|PARTIAL|BLOCKED
MISMATCHES=
```
