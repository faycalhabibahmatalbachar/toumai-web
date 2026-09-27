import fs from "node:fs";

const files = {
  types: "lib/whatsapp-ui/types.ts",
  actions: "lib/whatsapp-ui/capabilities.ts",
  center: "components/whatsapp-experience/WhatsAppActionCenter.tsx",
  chatCenter: "components/whatsapp-experience/WhatsAppChatActionCenter.tsx",
  feature: "lib/whatsapp-ui/feature.ts",
  presentation: "lib/whatsapp-ui/presentation.ts",
  chat: "app/chat/page.tsx",
  lab: "app/dev/whatsapp-ui/page.tsx",
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing required file: ${path}`);
  return fs.readFileSync(path, "utf8");
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const types = read(files.types);
const actions = read(files.actions);
const center = read(files.center);
const chatCenter = read(files.chatCenter);
const feature = read(files.feature);
const presentation = read(files.presentation);
const chat = read(files.chat);
const lab = read(files.lab);

const requiredStates = [
  "loading",
  "ready",
  "awaiting_user",
  "running",
  "verifying",
  "success",
  "partial_success",
  "failed",
  "offline",
  "expired",
  "permission_denied",
  "auth_required",
  "unknown",
];

for (const state of requiredStates) {
  expect(types.includes(`\"${state}\"`), `Missing WhatsApp UI state: ${state}`);
}

expect(
  types.includes('return state === "success"'),
  "Truthfulness invariant missing: only proven success may map to success treatment",
);

const requiredActions = [
  "send_text",
  "send_image",
  "send_document",
  "send_voice",
  "read_conversation",
  "summarize_conversation",
  "manage_group",
  "publish_status",
  "schedule_message",
  "browse_contacts",
];

for (const action of requiredActions) {
  expect(actions.includes(`id: \"${action}\"`), `Missing WhatsApp action definition: ${action}`);
  expect(presentation.includes(`${action}:`), `Missing safe chat starter: ${action}`);
}

expect(center.includes('data-testid="wa-v2-action-center"'), "Action Center test marker missing");
expect(center.includes("disabled={!usable}"), "Disconnected actions must be disabled");
expect(center.includes("Les actions sensibles demandent une confirmation"), "Sensitive action notice missing");
expect(center.includes("focus-visible:ring-2"), "Keyboard focus treatment missing from Action Center");

expect(lab.includes('data-testid="wa-v2-lab"'), "UI lab root marker missing");
expect(lab.includes("ne déclenche aucune action WhatsApp réelle"), "UI lab must explicitly declare no real provider execution");
expect(lab.includes("WhatsAppActionCenter"), "UI lab must render the real Action Center component");
expect(!lab.includes("connectors-api"), "UI lab must not call the WhatsApp connector API directly");
expect(!lab.includes("streamChat"), "UI lab must not call the chat runtime");
expect(!lab.includes("send_whatsapp"), "UI lab must not embed a provider send action");

expect(feature.includes("NEXT_PUBLIC_WHATSAPP_EXPERIENCE_V2"), "Explicit WhatsApp V2 feature flag missing");
expect(feature.includes('=== "1"'), "WhatsApp V2 must be opt-in rather than enabled by default");

expect(chat.includes("WhatsAppChatActionCenter"), "Chat integration component missing");
expect(chat.includes("WHATSAPP_EXPERIENCE_V2_ENABLED"), "Chat integration is not feature-gated");
expect(chat.includes('data-testid="wa-v2-composer-entry"'), "Persistent WhatsApp composer entry missing");
expect(chat.includes('data-testid={WHATSAPP_EXPERIENCE_V2_ENABLED ? "wa-v2-empty-entry"'), "Empty-state WhatsApp entry is not feature-gated");
expect(chat.includes('setInput("Sur WhatsApp, ")'), "Legacy fallback must remain available with the flag disabled");
expect(chat.includes("onPrepare={prepareWhatsAppStarter}"), "Action Center must prepare the existing composer instead of executing directly");
expect(chat.includes("field.selectionStart = field.selectionEnd = starter.length"), "Prepared WhatsApp starter must restore caret at the end");

expect(chatCenter.includes("whatsapp.getEtat()"), "Chat Action Center must read canonical WhatsApp state");
expect(chatCenter.includes("whatsapp.getStatus()"), "Chat Action Center must read raw WhatsApp status as fallback");
expect(chatCenter.includes("handoffToComposer(whatsappStarterFor(action.id))"), "Action selection must only hand off a safe starter to the composer");
expect(chatCenter.includes('handoffToComposer(connection.status === "expired" ? "Reconnecte mon compte WhatsApp" : "Connecte mon compte WhatsApp")'), "Connect/reconnect entry must hand off a request rather than mutate provider state");
expect(chatCenter.includes("restorePreviousFocus.current = false"), "Action handoff must explicitly suppress opener focus restoration");
expect(chatCenter.includes("if (restorePreviousFocus.current) previousFocus.current?.focus()"), "Normal dismissals must still restore focus to the opener");
expect(chatCenter.includes('role="dialog"'), "Responsive WhatsApp sheet must expose dialog semantics");
expect(chatCenter.includes('aria-modal="true"'), "Responsive WhatsApp sheet must be modal to assistive technologies");
expect(chatCenter.includes('event.key === "Escape"'), "WhatsApp sheet must support Escape closure");

const forbiddenMutationFragments = [
  "whatsapp.linkQr(",
  "whatsapp.refreshCode(",
  "whatsapp.disconnect(",
  "send_whatsapp",
  "/whatsapp/link",
  "/whatsapp/disconnect",
  "/whatsapp/send",
  "streamChat",
];
for (const fragment of forbiddenMutationFragments) {
  expect(!chatCenter.includes(fragment), `Read-only chat Action Center contains forbidden mutation/runtime fragment: ${fragment}`);
}

console.log("WHATSAPP_EXPERIENCE_V2_CONTRACT=PASS");
console.log(`STATES=${requiredStates.length}`);
console.log(`ACTIONS=${requiredActions.length}`);
console.log("LAB_PROVIDER_CALLS=NONE_BY_CONTRACT");
console.log("CHAT_INTEGRATION=FEATURE_GATED");
console.log("CHAT_WHATSAPP_MUTATIONS=NONE_BY_CONTRACT");
