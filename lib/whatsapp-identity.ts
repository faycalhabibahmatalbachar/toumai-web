import type { WaLiveConversation } from "./whatsapp-enterprise-api";

/** Only exact-JID matches are allowed. A LID is not a telephone number. */
export type ChatNameSource = NonNullable<WaLiveConversation["name_source"]>;
export type WhatsAppGroupIdentity = { id: string; name: string; name_source: "group" };

const GENERIC = /^(?:whatsapp|groupe whatsapp|whatsapp group|group whatsapp|contact whatsapp|whatsapp contact|contact|group|groupe|unknown|undefined|null)$/i;
const JID = /@(lid|s\.whatsapp\.net|g\.us)$/i;

export function actualWhatsAppName(value: string | null | undefined, jid = ""): string | null {
  const name = (value || "").trim();
  if (!name || name === jid || GENERIC.test(name) || JID.test(name) || /^\d{16,}$/.test(name)) return null;
  if (jid.endsWith("@lid") && name.replace(/^\+/, "") === jid.split("@", 1)[0]) return null;
  if (jid.endsWith("@g.us") && /^\+?\d{7,16}$/.test(name)) return null;
  return name;
}
function priority(row: WaLiveConversation): number {
  if (!actualWhatsAppName(row.name, row.id)) return 0;
  if (row.kind === "group") return 5;
  if (row.name_source === "saved_contact") return 5;
  if (row.name_source === "profile") return 4;
  // Legacy gateway has no source marker; a readable nickname is better than generic.
  if (!row.name_source || row.name_source === "group") return 3;
  return row.name_source === "phone" ? 1 : 2;
}

/** Polling must preserve the best verified identity and avatar, not reset labels. */
export function reconcileWhatsAppConversation(
  previous: WaLiveConversation | undefined,
  incoming: WaLiveConversation,
): WaLiveConversation {
  if (!previous || previous.id !== incoming.id || previous.kind !== incoming.kind) return incoming;
  const oldQuality = priority(previous);
  const newQuality = priority(incoming);
  const useOld = oldQuality > newQuality;
  return {
    ...incoming,
    name: useOld ? previous.name : incoming.name,
    name_source: useOld ? previous.name_source : incoming.name_source,
    picture_url: incoming.picture_url || previous.picture_url,
  };
}

export function applyVerifiedContactName(
  conversation: WaLiveConversation,
  contact: { jid: string; name: string; name_source?: string } | undefined,
): WaLiveConversation {
  if (conversation.kind !== "contact" || !contact || contact.jid !== conversation.id) return conversation;
  const name = actualWhatsAppName(contact.name, contact.jid);
  if (!name || !["saved_contact", "profile", undefined].includes(contact.name_source)) return conversation;
  const next: WaLiveConversation = {
    ...conversation, name,
    name_source: (contact.name_source || "profile") as ChatNameSource,
  };
  return reconcileWhatsAppConversation(conversation, next);
}

export function applyVerifiedGroupName(
  conversation: WaLiveConversation,
  record: WhatsAppGroupIdentity | undefined,
): WaLiveConversation {
  if (conversation.kind !== "group" || !record || record.id !== conversation.id) return conversation;
  const name = actualWhatsAppName(record.name, record.id);
  return name ? { ...conversation, name, name_source: "group" } : conversation;
}
