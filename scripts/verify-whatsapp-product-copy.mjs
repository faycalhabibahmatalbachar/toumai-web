import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Protect the public WhatsApp surfaces, including adjacent connector panels.
const files = [
  "app/whatsapp/page.tsx",
  "app/whatsapp/conversations/page.tsx",
  "app/whatsapp/automations/page.tsx",
  "app/whatsapp/ai/page.tsx",
  "components/whatsapp/WhatsAppMessageInfoModal.tsx",
  "components/whatsapp/WhatsAppMessageMedia.tsx",
  "components/whatsapp/WhatsAppVoiceNotePlayer.tsx",
  "components/whatsapp/WhatsAppAttachmentModal.tsx",
  "components/whatsapp/WhatsAppComposeModal.tsx",
  "components/whatsapp/WhatsAppContactShareModal.tsx",
  "components/whatsapp/WhatsAppForwardMessageModal.tsx",
  "components/whatsapp/WhatsAppConversationActionModal.tsx",
  "components/settings/WhatsAppCarnetPanel.tsx",
  "components/settings/WhatsAppPermissionsPanel.tsx",
  "components/chat/WhatsAppConnectorCard.tsx",
  "components/chat/WhatsAppProtectionPanel.tsx",
  "components/settings/ConnectorsTab.tsx",
];
const sources = Object.fromEntries(files.map((file) => [file, readFileSync(file, "utf8")]));
const text = Object.values(sources).join("\n");
for (const forbidden of [
  "WhatsApp n’a pas fourni d’historique exploitable",
  "redémarrage de la passerelle",
  "La passerelle ne répond pas :",
  "Aucun mode, chiffre ou permission n’est simulé",
  "Chargement des accusés…",
  "Chargement de la pièce jointe…",
  "Le connecteur ne fournit pas actuellement un registre fiable",
  "Mutation cache Toumaï :",
]) {
  if (forbidden === "Mutation cache Toumaï :") {
    // Internal media research is kept for developers, never enabled in production.
    assert.match(sources["app/whatsapp/conversations/page.tsx"],
      /process\.env\.NODE_ENV === "development" && params\.get\("research"\)/,
      "The diagnostic media lab must not be opened in production");
    continue;
  }
  assert(!text.includes(forbidden), `Old public diagnostic leaked: ${forbidden}`);
}
assert.match(sources["app/whatsapp/page.tsx"], /useCached<WhatsAppOverview>/,
  "Overview must keep cached state during background validation");
assert.match(sources["app/whatsapp/conversations/page.tsx"], /cacheSeed<WaConversationMessages>/,
  "Threads must keep cache-first display");
assert.match(sources["app/whatsapp/automations/page.tsx"], /useCached<\{ tasks: WhatsAppAutomation\[\]/,
  "Automations must revalidate while retaining cached data");
assert.match(sources["components/whatsapp/WhatsAppContactShareModal.tsx"],
  /\{contacts\.map\(\(contact\)/,
  "Contact selection must not disappear while a refresh runs");
assert.match(sources["components/whatsapp/WhatsAppMessageInfoModal.tsx"],
  /\{!error && status\?\.known && \(/,
  "Message receipts should render as available without being blocked by a refresh");
assert.match(sources["components/whatsapp/WhatsAppMessageMedia.tsx"],
  /mediaType === "voice"\) \{/,
  "Voice notes must keep the same waveform shape in every state");
assert.match(sources["components/whatsapp/WhatsAppMessageMedia.tsx"],
  /<WhatsAppVoiceNotePlaceholder/,
  "Voice loading and failures must use the same player shell");
assert.match(sources["components/whatsapp/WhatsAppVoiceNotePlayer.tsx"],
  /export function WhatsAppVoiceNotePlaceholder/,
  "The non-blocking voice shell must exist");
assert.match(sources["components/whatsapp/WhatsAppMessageMedia.tsx"],
  /data-testid="whatsapp-media-loading"/,
  "Media keeps a compact placeholder before the first binary is ready");

const compiled = ts.transpileModule(readFileSync("lib/whatsapp-ui-copy.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: (id) => {
    assert.equal(id, "./errors");
    return { errorMessage: (err) => String(err?.message || err || "") };
  },
  Error, RegExp, String,
});
const { whatsappUiCopy, whatsappUiError, whatsappHistoryEntryDetail } = exports;
for (const payload of [
  "Gateway reconnecting / cache stale",
  "Backend API HTTP 502",
  "La passerelle WhatsApp vient de redémarrer.",
  "Erreur source: server_ack_confirmed=false",
  '{"detail":"Internal Server Error"}',
]) {
  const result = whatsappUiCopy(payload);
  assert(!/passerelle|gateway|backend|cache|server_ack|json|http\s*502/i.test(result),
    `Technical diagnostics must never render: ${result}`);
}
assert.equal(whatsappUiCopy("Ce fichier est trop lourd. Essayez une version plus légère."),
  "Ce fichier est trop lourd. Essayez une version plus légère.",
  "Actionable customer guidance is preserved");
assert.equal(whatsappHistoryEntryDetail({ success: true, source: "gateway" }), "Effectuée");
assert.equal(whatsappHistoryEntryDetail({ success: false, error: "HTTP 502 backend" }), "Non effectuée");
assert(!whatsappUiError(new Error("backend error payload"), "history").includes("backend"));
console.log("WhatsApp copy and background refresh regression: PASS");
