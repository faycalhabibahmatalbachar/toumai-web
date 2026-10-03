import type { WhatsAppActionId } from "./types";

/**
 * Safe chat starters used by the V2 action center.
 *
 * Selecting an action NEVER executes it. It only prepares an explicit request
 * in the existing Toumaï composer. The normal chat/tool confirmation path
 * remains the only way an external WhatsApp mutation can execute.
 */
export const WHATSAPP_ACTION_STARTERS: Record<WhatsAppActionId, string> = {
  send_text: "Sur WhatsApp, envoie un message à ",
  send_image: "Sur WhatsApp, envoie une image à ",
  send_document: "Sur WhatsApp, envoie un document à ",
  send_voice: "Sur WhatsApp, envoie un message vocal à ",
  read_conversation: "Sur WhatsApp, lis la conversation avec ",
  summarize_conversation: "Sur WhatsApp, résume la conversation avec ",
  manage_group: "Sur WhatsApp, gère le groupe ",
  publish_status: "Sur WhatsApp, publie un statut : ",
  schedule_message: "Sur WhatsApp, programme un message pour ",
  browse_contacts: "Sur WhatsApp, recherche le contact ",
};

export const WHATSAPP_CONTACT_ACTIONS: readonly WhatsAppActionId[] = [
  "send_text",
  "send_image",
  "send_document",
  "send_voice",
  "read_conversation",
  "summarize_conversation",
  "schedule_message",
  "browse_contacts",
] as const;

export function whatsappActionNeedsContact(actionId: WhatsAppActionId): boolean {
  return WHATSAPP_CONTACT_ACTIONS.includes(actionId);
}

export function whatsappStarterFor(actionId: WhatsAppActionId): string {
  return WHATSAPP_ACTION_STARTERS[actionId];
}

function normalizedContactNumber(number: string): string {
  const clean = number.trim().replace(/[^+\d]/g, "");
  if (!clean) return "";
  return clean.startsWith("+") ? clean : `+${clean}`;
}

function trustedContactLabel(contact: { name: string; number: string }): string {
  const number = normalizedContactNumber(contact.number);
  const name = contact.name.trim();
  return name ? `${name} (${number})` : number;
}

/**
 * Prepare a request with the exact number returned by the synchronized carnet.
 * We never derive a phone number from a WhatsApp JID: some JIDs are opaque and
 * can look numeric while not being a routable phone number.
 */
export function whatsappStarterForContact(
  actionId: WhatsAppActionId,
  contact: { name: string; number: string },
): string {
  const target = trustedContactLabel(contact);
  switch (actionId) {
    case "send_text":
      return `Sur WhatsApp, envoie un message à ${target} : `;
    case "send_image":
      return `Sur WhatsApp, envoie une image à ${target} : `;
    case "send_document":
      return `Sur WhatsApp, envoie un document à ${target} : `;
    case "send_voice":
      return `Sur WhatsApp, envoie un message vocal à ${target} : `;
    case "read_conversation":
      return `Sur WhatsApp, lis la conversation avec ${target}`;
    case "summarize_conversation":
      return `Sur WhatsApp, résume la conversation avec ${target}`;
    case "schedule_message":
      return `Sur WhatsApp, programme un message pour ${target} : `;
    case "browse_contacts":
      return `Sur WhatsApp, utilise le contact ${target} pour `;
    default:
      return `${WHATSAPP_ACTION_STARTERS[actionId]}${target}`;
  }
}
