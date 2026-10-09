import fs from "node:fs";

const path = "app/chat/page.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`[${label}] anchor not found`);
  const second = source.indexOf(before, first + before.length);
  if (second !== -1) throw new Error(`[${label}] anchor is not unique`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

// Migration guards keep this deterministic patch safe to rerun on an already
// integrated branch. They repair previously generated shapes before the
// ALREADY_APPLIED fast path, so the source of truth cannot drift from the
// generated chat surface.
let migrated = false;
const normalized = source.replaceAll("setWhatsappExperienceOpen", "setWhatsAppExperienceOpen");
if (normalized !== source) {
  source = normalized;
  migrated = true;
  console.log("WHATSAPP_CHAT_V2_SETTER_CASE=REPAIRED");
}

const oldPrepareHelper = `  function prepareWhatsAppStarter(starter: string) {\n    setInput(starter);\n    requestAnimationFrame(() => {\n      const field = textareaRef.current;\n      if (!field) return;\n      field.focus();\n      field.selectionStart = field.selectionEnd = starter.length;\n    });\n  }`;
const deterministicPrepareHelper = `  function prepareWhatsAppStarter(starter: string) {\n    setInput(starter);\n    const field = textareaRef.current;\n    if (field) {\n      field.focus();\n      field.selectionStart = field.selectionEnd = starter.length;\n    }\n    requestAnimationFrame(() => {\n      const nextField = textareaRef.current;\n      if (!nextField) return;\n      nextField.focus();\n      nextField.selectionStart = nextField.selectionEnd = starter.length;\n    });\n  }`;
if (source.includes(oldPrepareHelper)) {
  source = source.replace(oldPrepareHelper, deterministicPrepareHelper);
  migrated = true;
  console.log("WHATSAPP_CHAT_V2_COMPOSER_FOCUS=REPAIRED");
}

if (migrated) fs.writeFileSync(path, source);

if (source.includes('data-testid="wa-v2-composer-entry"')) {
  console.log("WHATSAPP_CHAT_V2_PATCH=ALREADY_APPLIED");
  process.exit(0);
}

replaceOnce(
  "imports",
  'import { ChatContextPanel } from "@/components/chat/ChatContextPanel";\n',
  'import { ChatContextPanel } from "@/components/chat/ChatContextPanel";\n' +
    'import { WhatsAppChatActionCenter } from "@/components/whatsapp-experience/WhatsAppChatActionCenter";\n' +
    'import { WhatsAppIcon } from "@/components/settings/BrandIcons";\n' +
    'import { WHATSAPP_EXPERIENCE_V2_ENABLED } from "@/lib/whatsapp-ui/feature";\n',
);

replaceOnce(
  "state",
  '  const [toolsOpen, setToolsOpen] = useState(false);\n',
  '  const [toolsOpen, setToolsOpen] = useState(false);\n' +
    '  const [whatsappExperienceOpen, setWhatsAppExperienceOpen] = useState(false);\n',
);

replaceOnce(
  "prepare helper",
  `  function syncPalette(value: string, caret: number) {\n    const found = detectTrigger(value, caret);\n    setPalette(found);\n    setPaletteIndex(0);\n  }\n\n  function onKeyDown`,
  `  function syncPalette(value: string, caret: number) {\n    const found = detectTrigger(value, caret);\n    setPalette(found);\n    setPaletteIndex(0);\n  }\n\n${deterministicPrepareHelper}\n\n  function onKeyDown`,
);

replaceOnce(
  "empty-state entry",
  `                        onClick={() => {\n                          setInput("Sur WhatsApp, ");\n                          requestAnimationFrame(() => textareaRef.current?.focus());\n                        }}\n                        className="rounded-full border border-[var(--border)] px-3.5 py-2 text-[12.5px] text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"`,
  `                        onClick={() => {\n                          if (WHATSAPP_EXPERIENCE_V2_ENABLED) {\n                            setWhatsAppExperienceOpen(true);\n                            return;\n                          }\n                          setInput("Sur WhatsApp, ");\n                          requestAnimationFrame(() => textareaRef.current?.focus());\n                        }}\n                        data-testid={WHATSAPP_EXPERIENCE_V2_ENABLED ? "wa-v2-empty-entry" : undefined}\n                        className="rounded-full border border-[var(--border)] px-3.5 py-2 text-[12.5px] text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"`,
);

replaceOnce(
  "composer entry",
  `              </div>\n              {/* LE SELECTEUR RESTE A DROITE. Je l'avais deplace a gauche le`,
  `              </div>\n              {WHATSAPP_EXPERIENCE_V2_ENABLED ? (\n                <button\n                  type="button"\n                  onClick={() => setWhatsAppExperienceOpen(true)}\n                  aria-label="Actions WhatsApp"\n                  title="Actions WhatsApp"\n                  data-testid="wa-v2-composer-entry"\n                  className="chat-iconbtn"\n                >\n                  <WhatsAppIcon size={17} />\n                </button>\n              ) : null}\n              {/* LE SELECTEUR RESTE A DROITE. Je l'avais deplace a gauche le`,
);

replaceOnce(
  "responsive overlay",
  `      </div>\n      {contextMessage ? (`,
  `      </div>\n      {WHATSAPP_EXPERIENCE_V2_ENABLED ? (\n        <WhatsAppChatActionCenter\n          open={whatsappExperienceOpen}\n          onClose={() => setWhatsAppExperienceOpen(false)}\n          onPrepare={prepareWhatsAppStarter}\n        />\n      ) : null}\n      {contextMessage ? (`,
);

fs.writeFileSync(path, source);
console.log("WHATSAPP_CHAT_V2_PATCH=APPLIED");
