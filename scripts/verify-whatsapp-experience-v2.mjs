import fs from "node:fs";

const files = {
  types: "lib/whatsapp-ui/types.ts",
  actions: "lib/whatsapp-ui/capabilities.ts",
  center: "components/whatsapp-experience/WhatsAppActionCenter.tsx",
  chatCenter: "components/whatsapp-experience/WhatsAppChatActionCenter.tsx",
  connectionFlow: "components/whatsapp-experience/WhatsAppConnectionFlow.tsx",
  contactPicker: "components/whatsapp-experience/WhatsAppContactPicker.tsx",
  actionPreview: "components/whatsapp-experience/WhatsAppActionPreview.tsx",
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
const connectionFlow = read(files.connectionFlow);
const contactPicker = read(files.contactPicker);
const actionPreview = read(files.actionPreview);
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
expect(chatCenter.includes("WhatsAppConnectionFlow"), "Chat Action Center must embed the verified connection flow");
expect(chatCenter.includes("window.setInterval(() => void refresh(), 2500)"), "Connection flow must periodically re-read canonical state");
expect(chatCenter.includes('connectionFlowOpen && connection.status === "connected"'), "Connection flow may close automatically only after canonical connected state is observed");
expect(chatCenter.includes("restorePreviousFocus.current = false"), "Action handoff must explicitly suppress opener focus restoration");
expect(chatCenter.includes("if (restorePreviousFocus.current) previousFocus.current?.focus()"), "Normal dismissals must still restore focus to the opener");
expect(chatCenter.includes('role="dialog"'), "Responsive WhatsApp sheet must expose dialog semantics");
expect(chatCenter.includes('aria-modal="true"'), "Responsive WhatsApp sheet must be modal to assistive technologies");
expect(chatCenter.includes('event.key === "Escape"'), "WhatsApp sheet must support Escape closure");

expect(connectionFlow.includes('data-testid="wa-v2-connection-flow"'), "Connection flow test marker missing");
expect(connectionFlow.includes("WhatsAppConnectorCard"), "Phase 3 must reuse the existing verified connector engine");
expect(connectionFlow.includes('data-testid="wa-v2-connection-mode-qr"'), "QR connection mode missing");
expect(connectionFlow.includes('data-testid="wa-v2-connection-mode-pairing"'), "Pairing-code connection mode missing");
expect(connectionFlow.includes('mode === "qr"'), "Connection flow must choose its connector intent from the selected mode");
expect(connectionFlow.includes('intent={intent}'), "Connection flow must delegate connection behavior to the connector card");
expect(connectionFlow.includes("<WhatsAppConnectorCard key={mode} intent={intent} />"), "Connection attempt identity must change only when the user changes connection method");
expect(!connectionFlow.includes('key={`${mode}-${expired'), "Canonical expired -> connecting transitions must not remount and regenerate the connection attempt");

expect(presentation.includes("WHATSAPP_CONTACT_ACTIONS"), "Contact-targeting action registry missing");
expect(presentation.includes("whatsappActionNeedsContact"), "Contact routing predicate missing");
expect(presentation.includes("whatsappStarterForContact"), "Trusted contact composer starter missing");
expect(presentation.includes("We never derive a phone number from a WhatsApp JID"), "JID non-derivation invariant missing");
expect(!presentation.includes("contact.jid"), "Presentation layer must never derive or inject recipient identity from contact JID");

expect(chatCenter.includes("WhatsAppContactPicker"), "Chat Action Center must embed the contact picker");
expect(chatCenter.includes("whatsappActionNeedsContact(action.id)"), "Contact-targeted actions must route through the picker");
expect(chatCenter.includes("setPendingAction(action)"), "Selected contact-targeted action must be retained until recipient choice");
expect(chatCenter.includes("if (!pendingAction || !contact.number) return"), "Unroutable contacts must be rejected before preview");
expect(chatCenter.includes("number: selectedContact.number"), "Preview confirmation must pass the selected carnet number explicitly");

expect(contactPicker.includes('data-testid="wa-v2-contact-picker"'), "Contact picker root marker missing");
expect(contactPicker.includes("getWaCarnet()"), "Contact picker must read the synchronized carnet");
expect(contactPicker.includes("contact.name.toLocaleLowerCase"), "Contact picker must filter names locally");
expect(contactPicker.includes('contact.number || ""'), "Contact picker must filter trusted contact numbers locally");
expect(contactPicker.includes("disabled={!usable}"), "Contacts without a routable number must be disabled");
expect(contactPicker.includes('data-testid="wa-v2-contact-stale-warning"'), "Stale/base carnet warning missing");
expect(contactPicker.includes('data-contact-number={contact.number || ""}'), "Picker must expose only the carnet number to selection tests");

const forbiddenPickerFragments = [
  "syncWaCarnet",
  "send_whatsapp",
  "/whatsapp/send",
  "streamChat",
  "linkWhatsApp",
  "refreshWhatsAppCode",
  "disconnectWhatsApp",
];
for (const fragment of forbiddenPickerFragments) {
  expect(!contactPicker.includes(fragment), `Read-only contact picker contains forbidden mutation/runtime fragment: ${fragment}`);
}

expect(chatCenter.includes("WhatsAppActionPreview"), "Phase 5 Action Preview is not integrated in /chat");
expect(chatCenter.includes("setSelectedContact(contact)"), "Contact choice must enter Preview rather than handing off immediately");
expect(chatCenter.includes("pendingAction && selectedContact ?"), "Preview must sit between contact choice and composer handoff");
expect(chatCenter.includes("onModify={modifyPreview}"), "Preview must allow recipient modification");
expect(chatCenter.includes("onConfirm={confirmPreview}"), "Preview must require an explicit confirmation before composer handoff");
expect(chatCenter.includes("if (!pendingAction || !selectedContact?.number) return"), "Preview confirmation must reject missing/unroutable target");

expect(actionPreview.includes('data-testid="wa-v2-action-preview"'), "Action Preview root marker missing");
expect(actionPreview.includes('data-testid="wa-v2-preview-recipient"'), "Action Preview recipient section missing");
expect(actionPreview.includes('data-testid="wa-v2-preview-number"'), "Action Preview trusted number marker missing");
expect(actionPreview.includes('data-testid="wa-v2-preview-starter"'), "Action Preview prepared request marker missing");
expect(actionPreview.includes('data-testid="wa-v2-preview-modify"'), "Action Preview modify control missing");
expect(actionPreview.includes('data-testid="wa-v2-preview-confirm"'), "Action Preview explicit confirmation control missing");
expect(actionPreview.includes("Rien n’est encore envoyé."), "Action Preview must explicitly state that nothing was sent");
expect(actionPreview.includes("parcours normal de confirmation et de permissions"), "Action Preview must preserve downstream confirmation/permission truthfulness");
expect(!actionPreview.includes("contact.jid"), "Action Preview must not derive or display recipient identity from JID");

const forbiddenPreviewFragments = [
  "send_whatsapp",
  "/whatsapp/send",
  "streamChat",
  "getWaCarnet(",
  "linkWhatsApp",
  "refreshWhatsAppCode",
  "disconnectWhatsApp",
];
for (const fragment of forbiddenPreviewFragments) {
  expect(!actionPreview.includes(fragment), `Action Preview contains forbidden provider/runtime fragment: ${fragment}`);
}

const forbiddenDirectMutationFragments = [
  "whatsapp.linkQr(",
  "whatsapp.refreshCode(",
  "whatsapp.disconnect(",
  "send_whatsapp",
  "/whatsapp/link",
  "/whatsapp/disconnect",
  "/whatsapp/send",
  "streamChat",
];
for (const fragment of forbiddenDirectMutationFragments) {
  expect(!chatCenter.includes(fragment), `Chat Action Center must delegate provider mutations rather than invoke them directly: ${fragment}`);
}

console.log("WHATSAPP_EXPERIENCE_V2_CONTRACT=PASS");
console.log(`STATES=${requiredStates.length}`);
console.log(`ACTIONS=${requiredActions.length}`);
console.log("LAB_PROVIDER_CALLS=NONE_BY_CONTRACT");
console.log("CHAT_INTEGRATION=FEATURE_GATED");
console.log("CHAT_ACTION_MUTATIONS=DELEGATED_TO_VERIFIED_CONNECTOR_CARD");
console.log("CANONICAL_CONNECTED_GATE=ENFORCED");
console.log("CONNECTION_ATTEMPT_IDENTITY=STABLE_ACROSS_CANONICAL_TRANSITIONS");
console.log("CONTACT_PICKER=READ_ONLY_LOCAL_FILTER");
console.log("CONTACT_JID_DERIVATION=FORBIDDEN");
console.log("ACTION_PREVIEW=EXPLICIT_BEFORE_TARGETED_HANDOFF");
console.log("ACTION_PREVIEW_PROVIDER_MUTATIONS=FORBIDDEN");
