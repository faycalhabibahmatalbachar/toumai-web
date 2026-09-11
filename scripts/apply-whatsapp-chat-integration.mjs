import fs from "node:fs";

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  const index = source.indexOf(from);
  if (index === -1) throw new Error(`Patch introuvable: ${label}`);
  return source.slice(0, index) + to + source.slice(index + from.length);
}

const chatPath = "components/ChatMessage.tsx";
let chat = fs.readFileSync(chatPath, "utf8");

chat = replaceOnce(
  chat,
  'import { useSpeakText } from "@/hooks/useSpeakText";\n',
  'import { useSpeakText } from "@/hooks/useSpeakText";\nimport { WhatsAppConnectorCard } from "./chat/WhatsAppConnectorCard";\nimport type { WhatsAppChatIntent } from "@/lib/whatsapp-intents";\n',
  "imports ChatMessage",
);

chat = replaceOnce(
  chat,
  '  /** Action en cours côté serveur avant la réponse (`"web_search"`). */\n  activity?: string;\n}',
  '  /** Action en cours côté serveur avant la réponse (`"web_search"`). */\n  activity?: string;\n  /** UI live du connecteur WhatsApp. Aucun QR ni secret n’est persisté ici. */\n  whatsappConnector?: { intent: WhatsAppChatIntent };\n}',
  "type Message WhatsApp",
);

chat = replaceOnce(
  chat,
  '      {message.reasoning && (\n        <ReasoningPanel\n          reasoning={message.reasoning}\n          durationMs={message.reasoningMs}\n          streaming={message.streaming}\n        />\n      )}\n      <div className="text-[length:var(--chat-fs,15px)] leading-relaxed">',
  '      {message.reasoning && (\n        <ReasoningPanel\n          reasoning={message.reasoning}\n          durationMs={message.reasoningMs}\n          streaming={message.streaming}\n        />\n      )}\n      {message.whatsappConnector && (\n        <WhatsAppConnectorCard intent={message.whatsappConnector.intent} />\n      )}\n      <div className="text-[length:var(--chat-fs,15px)] leading-relaxed">',
  "rendu carte WhatsApp",
);

fs.writeFileSync(chatPath, chat);

const pagePath = "app/chat/page.tsx";
let page = fs.readFileSync(pagePath, "utf8");

page = replaceOnce(
  page,
  'import { SELECTABLE_MODELS } from "@/lib/models";\n',
  'import { SELECTABLE_MODELS } from "@/lib/models";\nimport { classifyWhatsAppIntent } from "@/lib/whatsapp-intents";\n',
  "import classifieur WhatsApp",
);

const legacyDetector = `/** Questions qui doivent être résolues par la passerelle WhatsApp, jamais par\n * une supposition du modèle. On reste volontairement strict pour ne pas\n * détourner les demandes d'envoi ou de rédaction d'un message WhatsApp. */\nfunction isWhatsAppConnectorIntent(text: string): boolean {\n  const mentionsWhatsApp = /(?:whats?app|واتساب)/i.test(text);\n  const asksConnection =\n    /(?:connect(?:é|e|er|ion)?|reconnect|déconnect|deconnect|statut|état|etat|qr|scanner|jumel|lier|lié|lie|mon\\s+num[eé]ro|my\\s+number|connected|status|رقم|متصل|ربط|رمز)/i.test(text);\n  return mentionsWhatsApp && asksConnection;\n}\n\n`;

if (page.includes(legacyDetector)) page = page.replace(legacyDetector, "");

page = replaceOnce(
  page,
  '    const assistantId = nextId();\n    if (!attachedDoc && isWhatsAppConnectorIntent(text)) {\n      setMessages((prev) => [\n        ...prev,\n        userMsg,\n        {\n          id: assistantId,\n          role: "assistant",\n          content: "Je vérifie directement l’état du connecteur WhatsApp.",\n          streaming: false,\n          whatsappConnector: true,\n        },\n      ]);\n      return;\n    }',
  '    const assistantId = nextId();\n    // Le statut/numéro/QR WhatsApp ne doit jamais être inventé par le modèle.\n    // On conserve un contexte court pour comprendre « et mon numéro ? » ou\n    // « reconnecte-le » juste après une interaction WhatsApp, sans détourner\n    // les demandes générales qui n’ont aucun rapport avec le connecteur.\n    const hasWhatsAppContext = [...messages]\n      .reverse()\n      .slice(0, 4)\n      .some((m) => Boolean(m.whatsappConnector) || /(?:whats?app|واتساب)/i.test(m.content));\n    const whatsappIntent = attachedDoc ? null : classifyWhatsAppIntent(text, hasWhatsAppContext);\n    if (whatsappIntent) {\n      setMessages((prev) => [\n        ...prev,\n        userMsg,\n        {\n          id: assistantId,\n          role: "assistant",\n          content: "",\n          streaming: false,\n          whatsappConnector: { intent: whatsappIntent.intent },\n        },\n      ]);\n      return;\n    }',
  "routage send WhatsApp",
);

fs.writeFileSync(pagePath, page);
console.log("WhatsApp chat integration applied.");
