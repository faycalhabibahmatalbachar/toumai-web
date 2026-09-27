import fs from "node:fs";

const files = {
  types: "lib/whatsapp-ui/types.ts",
  actions: "lib/whatsapp-ui/capabilities.ts",
  center: "components/whatsapp-experience/WhatsAppActionCenter.tsx",
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

console.log("WHATSAPP_EXPERIENCE_V2_CONTRACT=PASS");
console.log(`STATES=${requiredStates.length}`);
console.log(`ACTIONS=${requiredActions.length}`);
console.log("LAB_PROVIDER_CALLS=NONE_BY_CONTRACT");
