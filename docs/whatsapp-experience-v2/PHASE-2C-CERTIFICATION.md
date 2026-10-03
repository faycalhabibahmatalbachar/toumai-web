# Phase 2C — Certification gate

Scope: integration of WhatsApp Experience V2 into the real `/chat` surface behind `NEXT_PUBLIC_WHATSAPP_EXPERIENCE_V2=1`.

This file intentionally triggers the branch certification workflow on the corrected integration HEAD. The gate is considered PASS only if all automated checks succeed on the resulting commit:

- static WhatsApp Experience contract
- TypeScript
- production/static build with the feature flag enabled
- visual lab export
- `/chat` export
- Chromium E2E for the isolated lab
- Chromium E2E for the real `/chat` integration
- read-only WhatsApp network contract during chat E2E
- no automatic `/chat/stream` submission from action selection
- deterministic focus handoff to the composer immediately on action selection, with a next-frame reaffirmation after React rerender
- opener focus restoration preserved for Escape, backdrop and explicit-close dismissals

Certification attempt: deterministic composer-focus handoff generated from `scripts/apply-whatsapp-experience-v2-chat.mjs` and applied to the real `/chat` surface.

No provider mutation is part of Phase 2C. Real QR/pairing, connection mutation, expiry and reconnect are Phase 3 and must have their own E2E evidence.
