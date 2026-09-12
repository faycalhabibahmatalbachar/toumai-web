import fs from 'node:fs';

const source = fs.readFileSync('lib/whatsapp-intents.ts', 'utf8');

const mustContain = [
  'if (isBusinessAction(value)) return null;',
  'mentionner « WhatsApp » n\'est PAS une question de statut',
  'return { intent: "number", confidence };',
  'return { intent: "status", confidence };',
];

for (const snippet of mustContain) {
  if (!source.includes(snippet)) {
    throw new Error(`whatsapp routing invariant missing: ${snippet}`);
  }
}

const forbiddenFallbacks = [
  'if (STATUS.test(value) || explicit)',
  'if (STATUS.test(value) || explicit) return',
];
for (const snippet of forbiddenFallbacks) {
  if (source.includes(snippet)) {
    throw new Error(`dangerous WhatsApp status fallback still present: ${snippet}`);
  }
}

const card = fs.readFileSync('components/chat/WhatsAppConnectorCard.tsx', 'utf8');
if (!card.includes('const elapsed = Date.now() - asMs;')) {
  throw new Error('connector timestamps are not converted to elapsed time');
}
if (card.includes('formatDuration(etat.connecte_depuis_ms)')) {
  throw new Error('connected timestamp is still formatted as a duration directly');
}
if (!card.includes('Contacts synchronisés')) {
  throw new Error('contact count must be labelled as synchronized contacts');
}
if (!card.includes('WhatsAppProtectionPanel')) {
  throw new Error('connector card must render the real server protection panel');
}
const api = fs.readFileSync('lib/connectors-api.ts', 'utf8');
if (!api.includes('protection?: WaProtectionState;')) {
  throw new Error('WaEtat must expose the optional server protection contract');
}

console.log('WhatsApp routing regression checks: OK');
