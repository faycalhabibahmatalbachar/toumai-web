import type { WhatsAppActionDefinition } from "./types";

/**
 * User-facing discovery model for the WhatsApp Action Center.
 *
 * This is deliberately not a backend capability registry. It only describes
 * tasks that the product may expose visually. Runtime capability/permission
 * checks still decide whether an action can actually execute.
 */
export const WHATSAPP_ACTIONS: readonly WhatsAppActionDefinition[] = [
  {
    id: "send_text",
    group: "send",
    label: "Message",
    description: "Envoyer un message à un contact ou un groupe.",
    icon: "message",
    permission: "send_text",
    sensitive: true,
  },
  {
    id: "send_image",
    group: "send",
    label: "Image",
    description: "Envoyer une image avec une légende facultative.",
    icon: "image",
    permission: "send_image",
    sensitive: true,
  },
  {
    id: "send_document",
    group: "send",
    label: "Document",
    description: "Envoyer un document à un contact ou un groupe.",
    icon: "document",
    permission: "send_document",
    sensitive: true,
  },
  {
    id: "send_voice",
    group: "send",
    label: "Vocal",
    description: "Envoyer une note vocale ou un fichier audio.",
    icon: "voice",
    permission: "send_voice",
    sensitive: true,
  },
  {
    id: "read_conversation",
    group: "read",
    label: "Conversation",
    description: "Consulter une conversation autorisée.",
    icon: "conversation",
    permission: "read_messages",
  },
  {
    id: "summarize_conversation",
    group: "read",
    label: "Résumer",
    description: "Résumer une conversation ou un groupe.",
    icon: "summary",
    permission: "summaries",
  },
  {
    id: "manage_group",
    group: "manage",
    label: "Groupes",
    description: "Créer ou gérer un groupe WhatsApp.",
    icon: "group",
    permission: "manage_groups",
    sensitive: true,
  },
  {
    id: "publish_status",
    group: "manage",
    label: "Statut",
    description: "Préparer une publication de statut.",
    icon: "status",
    permission: "post_status",
    sensitive: true,
  },
  {
    id: "schedule_message",
    group: "automation",
    label: "Programmer",
    description: "Préparer un message à envoyer plus tard.",
    icon: "schedule",
    permission: "send_text",
    sensitive: true,
  },
  {
    id: "browse_contacts",
    group: "read",
    label: "Contacts",
    description: "Rechercher dans le carnet synchronisé.",
    icon: "contacts",
    permission: "sync_contacts",
  },
] as const;

export const WHATSAPP_ACTION_GROUP_LABELS = {
  send: "Envoyer",
  read: "Consulter",
  manage: "Gérer",
  automation: "Automatiser",
} as const;
