# Toumaï WhatsApp Experience V2 — Phase 1 UX Audit

Status: ACTIVE
Branch: `codex/whatsapp-experience-v2`
Primary surface: `/chat`
Advanced management surface: `/whatsapp`

## 1. Product objective

Transform the visible WhatsApp experience inside Toumaï Chat into a premium, conversation-first SaaS AI experience while preserving the existing WhatsApp runtime, security, permission and execution semantics.

The V2 must make the user understand, in seconds:

1. whether WhatsApp is connected;
2. what actions are available;
3. who/what will be affected;
4. whether confirmation is required;
5. what is happening now;
6. what was actually proven after execution;
7. how to recover when something fails.

## 2. Non-negotiable rules

- No big-bang rewrite.
- Backend behavior is preserved by default.
- Source of truth: real backend state > optimistic UI.
- `accepted`, `sent`, `delivered` and `read` are distinct states.
- Sensitive/destructive actions keep explicit confirmation.
- Mobile is first-class, not a reduced desktop layout.
- Dark/light, keyboard, screen readers, reduced motion and RTL are required.
- No invented capability, contact, delivery state or protection state.
- Completed cards must compact to avoid chat clutter.
- `/chat` is the action surface; `/whatsapp` remains the detailed management/analytics surface.

## 3. Existing surface inventory

### A. `/chat` WhatsApp entry point

Current state:
- Generic CTA: `Faire une action sur WhatsApp`.
- WhatsApp connector lifecycle is detected separately from real WhatsApp actions.
- Rich action/runtime widgets already exist.

Decision: **IMPROVE**

Target:
- persistent compact WhatsApp status affordance in the composer/tools area;
- action center on click;
- desktop = side sheet;
- mobile = bottom drawer;
- recent actions and contextual recovery.

### B. `WhatsAppConnectorCard`

Existing capabilities include:
- status;
- connect/reconnect;
- QR;
- pairing code;
- countdown/expiration;
- linked number;
- profile;
- last activity;
- connected duration;
- contacts count;
- capabilities;
- disconnect;
- protection state.

Decision: **KEEP + REFRAME**

Target:
- split lifecycle logic from presentation;
- create dedicated connection flow UI;
- retain truthfulness and real-state polling;
- compact after successful connection.

### C. `ActionExecutionCard`

Existing strengths:
- explicit confirmation;
- preview rows;
- recipient/group extraction;
- masked phone numbers;
- canonical operation state support;
- partial/unknown outcome handling;
- group actions and batch actions.

Decision: **KEEP + UPGRADE VISUALS**

Target:
- WhatsApp-specific preview visual;
- explicit state timeline;
- compact success/result card;
- stronger difference between provider accepted/sent/delivered/read.

### D. `WhatsAppPermissionsPanel`

Existing strengths:
- granular permissions;
- optimistic update + rollback;
- declared capability awareness;
- loading/error states;
- status audience control.

Decision: **KEEP ADVANCED + MERGE CONTEXTUALLY**

Target:
- keep this panel as advanced management;
- add lightweight contextual permission gates in chat;
- direct `Autoriser` action when the requested capability is disabled;
- never duplicate the full settings panel in chat.

### E. `WhatsAppCarnetPanel`

Existing strengths:
- synchronized contact source;
- local search;
- offline/stale warning;
- resynchronization;
- truthful zero-contact result;
- up to 300 visible results.

Decision: **KEEP DATA MODEL + REUSE IN CHAT**

Target:
- build a target/contact picker from this source;
- recent contacts/groups first;
- search by name/number;
- clear stale/offline state;
- preserve masking and provenance.

### F. `WhatsAppProtectionPanel`

Existing strengths:
- anti-duplicate / anti-burst / verified execution semantics;
- prudence mode;
- truthful unknown/unavailable state;
- quotas/rate meters.

Decision: **KEEP ADVANCED + SIMPLIFY FOR CHAT**

Target:
- show only contextual safety signals in chat;
- keep detailed protection telemetry behind disclosure or `/whatsapp`.

### G. `/whatsapp` dashboard

Existing strengths:
- pro dashboard language;
- KPIs;
- activity journal;
- privacy-aware masked values;
- quick actions;
- management/analytics role.

Decision: **KEEP**

Target:
- do not duplicate it inside `/chat`;
- expose `Activité récente` and `Voir toute l’activité` from chat.

### H. Capabilities widget

Existing capability families:
- Messages;
- Médias;
- Groupes;
- Membres;
- Administrateurs;
- Statuts;
- Contacts;
- Appels.

Decision: **KEEP DATA, REORGANIZE DISCOVERY**

Target:
- user-facing actions grouped by task, not backend capability taxonomy;
- unavailable actions explain why and offer recovery when possible.

## 4. Current UX gaps

### P0

1. Entry point is too generic.
2. No persistent compact connected/disconnected indicator in the main chat interaction surface.
3. User must know what to ask instead of discovering available actions.
4. Connection flow is functional but not a dedicated guided experience.
5. Contact data exists but is not a first-class target picker in chat.
6. Execution status is technically rich but not yet presented as a simple human timeline.

### P1

7. Permissions are primarily a settings concept instead of a contextual action gate.
8. Completed cards can still consume too much vertical chat space.
9. Recent WhatsApp activity is not surfaced contextually in the action flow.
10. Detailed protection information is useful but too heavy for the primary chat flow.

### P2

11. Need a single visual grammar for loading/awaiting/running/verified/partial/failed/offline/expired.
12. Need explicit mobile/RTL/reduced-motion certification.
13. Need visual regression coverage for all WhatsApp states.

## 5. Canonical V2 flow

```text
WhatsAppEntryPoint
  -> WhatsAppActionCenter
      -> target/action selection
          -> WhatsAppActionComposer
              -> WhatsAppActionPreview
                  -> confirmation if required
                      -> WhatsAppExecutionTimeline
                          -> WhatsAppResultCard (compact when done)
```

Supporting flows:

```text
WhatsAppConnectionFlow
WhatsAppPermissionGate
WhatsAppRecentActivity
WhatsAppErrorRecovery
WhatsAppAdvancedManagement -> /whatsapp
```

## 6. Target component architecture

```text
components/whatsapp-experience/
  WhatsAppEntryPoint.tsx
  WhatsAppActionCenter.tsx
  WhatsAppAccountStatus.tsx
  WhatsAppConnectionFlow.tsx
  WhatsAppQrStep.tsx
  WhatsAppTargetPicker.tsx
  WhatsAppActionComposer.tsx
  WhatsAppMessagePreview.tsx
  WhatsAppMediaPreview.tsx
  WhatsAppConfirmation.tsx
  WhatsAppExecutionTimeline.tsx
  WhatsAppResultCard.tsx
  WhatsAppPermissionGate.tsx
  WhatsAppRecentActivity.tsx
  WhatsAppErrorRecovery.tsx
  states/
  primitives/

lib/whatsapp-ui/
  types.ts
  states.ts
  capabilities.ts
  presentation.ts
```

## 7. State model required for every visible WhatsApp flow

Every surface must explicitly handle:

- `loading`
- `ready`
- `empty`
- `awaiting_user`
- `running`
- `verifying`
- `success`
- `partial_success`
- `failed`
- `offline`
- `expired`
- `permission_denied`
- `auth_required`
- `unknown`

No state may silently collapse into green success.

## 8. Phase gates

### Gate P1-A — Audit complete

PASS only if:
- every current WhatsApp-visible surface is inventoried;
- every surface has KEEP / IMPROVE / MERGE / REMOVE decision;
- top UX gaps are prioritized;
- target architecture is documented;
- truthfulness/security rules are explicit.

### Gate P1-B — No production behavior changed

PASS only if:
- Phase 1 contains documentation/test-contract changes only;
- no runtime source file is modified;
- `main` remains untouched;
- work happens on the dedicated branch.

## 9. Next implementation order

1. Phase 2A: UI state/type contract.
2. Phase 2B: isolated WhatsApp UI Lab.
3. Phase 2C: Entry Point + Action Center.
4. Phase 2D: Connection Flow.
5. Phase 2E: Target Picker.
6. Phase 2F: Preview + Confirmation.
7. Phase 2G: Execution Timeline + Result Card.
8. Phase 2H: Contextual Permission Gate.
9. Phase 2I: Recent Activity.
10. Phase 3: integration into `/chat` behind a feature flag.
11. Phase 4: real-account E2E + visual/accessibility certification.
12. Phase 5: controlled production rollout.
