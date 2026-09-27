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

export function whatsappStarterFor(actionId: WhatsAppActionId): string {
  return WHATSAPP_ACTION_STARTERS[actionId];
}
