#!/usr/bin/env node
import fs from "node:fs";

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing required file: ${path}`);
  return fs.readFileSync(path, "utf8");
}

function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}

function requirePattern(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

const feature = read("lib/whatsapp-ui/feature.ts");
const chat = read("app/chat/page.tsx");

requireText(
  feature,
  'process.env.NEXT_PUBLIC_WHATSAPP_EXPERIENCE_V2 === "1"',
  "WhatsApp V2 rollout flag must remain strict opt-in: exact string 1 only",
);
requireText(
  chat,
  "WHATSAPP_EXPERIENCE_V2_ENABLED",
  "Chat must remain controlled by the WhatsApp V2 feature flag",
);
requireText(
  chat,
  'setInput("Sur WhatsApp, ")',
  "Legacy WhatsApp composer fallback must remain available with V2 disabled",
);
requireText(
  chat,
  'data-testid={WHATSAPP_EXPERIENCE_V2_ENABLED ? "wa-v2-empty-entry" : undefined}',
  "Empty-state V2 marker must be feature-gated",
);
requirePattern(
  chat,
  /\{\s*WHATSAPP_EXPERIENCE_V2_ENABLED\s*\?\s*\(\s*<WhatsAppChatActionCenter\b[\s\S]*?\)\s*:\s*null\s*\}/m,
  "V2 Action Center must remain entirely guarded by the rollout flag",
);

console.log("WHATSAPP_ROLLOUT_READINESS_CONTRACT=PASS");
console.log("FEATURE_FLAG=STRICT_EXACT_ONE");
console.log("FLAG_OFF_LEGACY_FALLBACK=PRESERVED");
console.log("FLAG_OFF_V2_MOUNT=FORBIDDEN");
console.log("ROLLBACK_PATH=ENV_FLAG_OFF");
