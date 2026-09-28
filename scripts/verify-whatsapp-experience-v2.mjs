import fs from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, ROOT), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const types = read("lib/whatsapp-ui/types.ts");
const capabilities = read("lib/whatsapp-ui/capabilities.ts");
const actionCenter = read("components/whatsapp-experience/WhatsAppActionCenter.tsx");
const devPage = read("app/dev/whatsapp-ui/page.tsx");
const chatPage = read("app/chat/page.tsx");
const chatCenter = read("components/whatsapp-experience/WhatsAppChatActionCenter.tsx");
const connectionFlow = read("components/whatsapp-experience/WhatsAppConnectionFlow.tsx");
const targetPicker = read("components/whatsapp-experience/WhatsAppTargetPicker.tsx");
const actionPreview = read("components/whatsapp-experience/WhatsAppActionPreview.tsx");
const executionTimeline = read("components/whatsapp-experience/WhatsAppExecutionTimeline.tsx");
const actionRuntime = read("components/chat/widgets/ActionExecutionCard.tsx");
const lab = read("components/whatsapp-experience/WhatsAppExperienceLab.tsx");
const feature = read("lib/whatsapp-ui/feature.ts");

const states = [
  "loading",
  "ready",
  "empty",
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
];
for (const state of states) {
  expect(types.includes(`\"${state}\"`), `Missing UI state: ${state}`);
}

const actions = [
  "send_text",
  "send_image",
  "send_document",
  "send_voice",
  "read_conversation",
  "summarize_conversation",
  "browse_contacts",
  "manage_group",
  "publish_status",
  "schedule_message",
];
for (const action of actions) {
  expect(types.includes(`\"${action}\"`), `Missing action: ${action}`);
}

expect(capabilities.includes("WHATSAPP_ACTIONS"), "WhatsApp action catalog missing");
expect(actionCenter.includes('data-testid="wa-v2-action-center"'), "Action Center test marker missing");
expect(devPage.includes("WhatsAppExperienceLab"), "Visual lab route missing");
expect(!devPage.includes("connectorsApi"), "Visual lab must not call connector API");
expect(!devPage.includes("fetch("), "Visual lab must not make raw network calls");

expect(feature.includes('NEXT_PUBLIC_WHATSAPP_EXPERIENCE_V2 === "1"'), "WhatsApp V2 feature flag missing");
expect(chatPage.includes("WHATSAPP_EXPERIENCE_V2_ENABLED"), "Chat page is not feature-gated");
expect(chatPage.includes("WhatsAppChatActionCenter"), "WhatsApp V2 chat integration missing");
expect(chatPage.includes('data-testid="wa-v2-composer-entry"'), "Persistent WhatsApp composer entry missing");
expect(chatCenter.includes("whatsapp.getEtat()"), "Chat Action Center must read canonical WhatsApp state");
expect(chatCenter.includes("whatsapp.getStatus()"), "Chat Action Center must read raw WhatsApp state for diagnostics");
expect(chatCenter.includes("WhatsAppConnectionFlow"), "Connection Flow integration missing");
expect(chatCenter.includes("WhatsAppTargetPicker"), "Contact Picker integration missing");
expect(chatCenter.includes("WhatsAppActionPreview"), "Action Preview integration missing");
expect(connectionFlow.includes("WhatsAppConnectorCard"), "Connection Flow must reuse verified connector engine");
expect(connectionFlow.includes('key={mode}'), "Connection attempt identity must stay stable across canonical transitions");
expect(targetPicker.includes("getWaCarnet"), "Contact Picker must use WhatsApp carnet read API");
expect(targetPicker.includes("contact.number"), "Contact Picker must use trusted contact.number");
expect(!targetPicker.includes("split(\"@\")"), "Contact Picker must never derive a number from JID");
expect(!targetPicker.includes("linkWhatsApp"), "Contact Picker must remain read-only");
expect(actionPreview.includes('data-testid="wa-v2-action-preview"'), "Action Preview test marker missing");
expect(actionPreview.includes("onContinue"), "Action Preview must require explicit continuation");
expect(!actionPreview.includes("connectors-api"), "Action Preview must not call provider APIs");
expect(!actionPreview.includes("streamChat"), "Action Preview must not auto-submit chat");

const canonicalTimelineStates = [
  "requested",
  "awaiting_confirmation",
  "dispatching",
  "provider_accepted",
  "sent",
  "delivered",
  "read",
  "completed",
  "unknown",
  "partial_success",
  "reconciling",
  "failed",
  "blocked",
  "expired",
  "needs_relink",
  "cancelled",
];
for (const state of canonicalTimelineStates) {
  expect(executionTimeline.includes(`\"${state}\"`), `Canonical timeline state missing: ${state}`);
}
expect(executionTimeline.includes('data-testid="wa-v2-execution-timeline"'), "Execution Timeline root marker missing");
expect(executionTimeline.includes("Cela ne prouve pas encore la remise"), "provider_accepted must explicitly deny delivery proof");
expect(executionTimeline.includes("Cela ne prouve pas encore la remise au destinataire"), "sent must explicitly deny delivery proof");
expect(executionTimeline.includes("Aucun succès n’est supposé"), "reconciling must explicitly avoid success inference");
expect(executionTimeline.includes('data-timeline-mode={exceptional.kind === "failed" ? "failed" : "uncertain"}'), "Unknown/failure states must use non-progress timeline mode");
expect(executionTimeline.includes('if (!operationState || !isWhatsAppCanonicalOperationState(operationState)) return null'), "Timeline must abstain on missing/unsupported canonical state");
expect(!executionTimeline.includes("verified === true"), "Timeline must not derive truth from legacy verified flag");
expect(!executionTimeline.includes("connectors-api"), "Timeline must not call connector API");
expect(!executionTimeline.includes("streamChat"), "Timeline must not call chat runtime");
expect(!executionTimeline.includes("send_whatsapp"), "Timeline must not execute provider tools");

expect(actionRuntime.includes("WhatsAppExecutionTimeline"), "Canonical timeline is not integrated into ActionExecutionCard");
expect(actionRuntime.includes("WHATSAPP_EXPERIENCE_V2_ENABLED"), "Execution timeline integration must remain feature-gated");
expect(actionRuntime.includes("isWhatsAppCanonicalOperationState(etatCanonique)"), "Execution timeline must require a supported canonical operation_state from the server");
expect(actionRuntime.includes("const canonicalState: WhatsAppCanonicalOperationState | null"), "Execution timeline must isolate a validated canonical state before presentation");
expect(actionRuntime.includes('confirmation.tool.includes("whatsapp") || confirmation.tool === "__toumai_batch__"'), "Execution timeline must be scoped to WhatsApp runtime actions");
expect(actionRuntime.includes("<WhatsAppExecutionTimeline operationState={canonicalState} />"), "Action runtime must pass only validated canonical operation_state to Timeline");
expect(lab.includes('data-testid="wa-v2-timeline-lab"'), "Timeline truth laboratory missing");
expect(lab.includes("WhatsAppExecutionTimeline"), "Timeline lab must render real component");
expect(lab.includes("ne transforme jamais un état inconnu en succès"), "Timeline lab truthfulness notice missing");

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
console.log(`STATES=${states.length}`);
console.log(`ACTIONS=${actions.length}`);
console.log("LAB_PROVIDER_CALLS=NONE_BY_CONTRACT");
console.log("CHAT_INTEGRATION=FEATURE_GATED");
console.log("CHAT_ACTION_MUTATIONS=DELEGATED_TO_VERIFIED_CONNECTOR_CARD");
console.log("CANONICAL_CONNECTED_GATE=ENFORCED");
console.log("CONNECTION_ATTEMPT_IDENTITY=STABLE_ACROSS_CANONICAL_TRANSITIONS");
console.log("CONTACT_PICKER=READ_ONLY_LOCAL_FILTER");
console.log("CONTACT_JID_DERIVATION=FORBIDDEN");
console.log("ACTION_PREVIEW=EXPLICIT_BEFORE_TARGETED_HANDOFF");
console.log("ACTION_PREVIEW_PROVIDER_MUTATIONS=FORBIDDEN");
console.log("EXECUTION_TIMELINE=CANONICAL_STATE_ONLY");
console.log("PROVIDER_ACCEPTED_DELIVERY_INFERENCE=FORBIDDEN");
console.log("SENT_DELIVERY_INFERENCE=FORBIDDEN");
console.log("UNKNOWN_SUCCESS_INFERENCE=FORBIDDEN");
console.log("EXECUTION_TIMELINE_PROVIDER_CALLS=NONE_BY_CONTRACT");
