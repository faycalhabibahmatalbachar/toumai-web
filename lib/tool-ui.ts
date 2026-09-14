export type ToolRisk = "read" | "write" | "admin" | "destructive" | "mass";

export interface ToolUiDescriptor {
  title: string;
  awaiting: string;
  running: string;
  verifying: string;
  success: string;
  cancelled: string;
  risk: ToolRisk;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function first(args: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = text(args[key]);
    if (value) return value;
  }
  return "";
}

function firstArrayString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (!Array.isArray(value)) return "";
  const item = value.find((entry) => typeof entry === "string" && entry.trim());
  return typeof item === "string" ? item.trim() : "";
}

function shortPhone(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (!compact) return "";
  if (compact.includes("@g.us")) return compact;
  const digits = compact.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 7) return value;
  const normalized = digits.startsWith("+") ? digits : `+${digits}`;
  return `${normalized.slice(0, 7)}•••${normalized.slice(-3)}`;
}

function target(args: Record<string, unknown>): string {
  const group = first(args, "group_name", "group", "group_subject", "chat_name");
  const recipient = first(args, "to_name", "contact_name", "participant_name", "to", "participant", "phone");
  if (group && !group.endsWith("@g.us")) return group;
  if (recipient) return shortPhone(recipient);
  if (group) return "ce groupe";
  return "";
}

function withTarget(base: string, args: Record<string, unknown>, prep = "dans"): string {
  const t = target(args);
  return t ? `${base} ${prep} ${t}` : base;
}

const EXACT: Record<string, ToolUiDescriptor> = {
  send_whatsapp: {
    title: "Envoyer un message WhatsApp",
    awaiting: "Message prêt à être envoyé",
    running: "Envoi du message WhatsApp…",
    verifying: "Vérification de l’envoi…",
    success: "Message envoyé",
    cancelled: "Envoi annulé",
    risk: "write",
  },
  whatsapp_send_media: {
    title: "Envoyer un média WhatsApp",
    awaiting: "Média prêt à être envoyé",
    running: "Envoi du média…",
    verifying: "Vérification de l’envoi…",
    success: "Média envoyé",
    cancelled: "Envoi annulé",
    risk: "write",
  },
  whatsapp_send_quoted: {
    title: "Répondre sur WhatsApp",
    awaiting: "Réponse prête à être envoyée",
    running: "Envoi de la réponse…",
    verifying: "Vérification de la réponse…",
    success: "Réponse envoyée",
    cancelled: "Réponse annulée",
    risk: "write",
  },
  whatsapp_schedule: {
    title: "Programmer un message WhatsApp",
    awaiting: "Programmation prête",
    running: "Enregistrement de la programmation…",
    verifying: "Vérification de la programmation…",
    success: "Message programmé",
    cancelled: "Programmation annulée",
    risk: "write",
  },
  whatsapp_set_status: {
    title: "Publier un statut WhatsApp",
    awaiting: "Statut prêt à être publié",
    running: "Publication du statut…",
    verifying: "Vérification du statut…",
    success: "Statut publié",
    cancelled: "Publication annulée",
    risk: "write",
  },
  whatsapp_group_create: {
    title: "Créer un groupe WhatsApp",
    awaiting: "Création du groupe prête",
    running: "Création du groupe…",
    verifying: "Vérification du groupe…",
    success: "Groupe créé",
    cancelled: "Création annulée",
    risk: "admin",
  },
  whatsapp_create_group: {
    title: "Créer un groupe WhatsApp",
    awaiting: "Création du groupe prête",
    running: "Création du groupe…",
    verifying: "Vérification du groupe…",
    success: "Groupe créé",
    cancelled: "Création annulée",
    risk: "admin",
  },
  whatsapp_group_manage: {
    title: "Modifier le groupe WhatsApp",
    awaiting: "Modification prête",
    running: "Modification du groupe…",
    verifying: "Vérification du groupe…",
    success: "Groupe mis à jour",
    cancelled: "Modification annulée",
    risk: "admin",
  },
  whatsapp_group_participants: {
    title: "Gérer les membres du groupe",
    awaiting: "Modification des membres prête",
    running: "Modification des membres…",
    verifying: "Vérification des membres…",
    success: "Membres mis à jour",
    cancelled: "Modification annulée",
    risk: "admin",
  },
  whatsapp_add_participant: {
    title: "Ajouter un membre",
    awaiting: "Ajout du membre prêt",
    running: "Ajout du membre au groupe…",
    verifying: "Vérification du membre…",
    success: "Membre ajouté",
    cancelled: "Ajout annulé",
    risk: "admin",
  },
  whatsapp_remove_participant: {
    title: "Retirer un membre",
    awaiting: "Retrait du membre prêt",
    running: "Retrait du membre du groupe…",
    verifying: "Vérification du retrait…",
    success: "Membre retiré",
    cancelled: "Retrait annulé",
    risk: "destructive",
  },
  whatsapp_promote_participant: {
    title: "Nommer un administrateur",
    awaiting: "Promotion prête",
    running: "Attribution des droits administrateur…",
    verifying: "Vérification des droits…",
    success: "Administrateur nommé",
    cancelled: "Promotion annulée",
    risk: "admin",
  },
  whatsapp_demote_participant: {
    title: "Retirer les droits administrateur",
    awaiting: "Retrait des droits prêt",
    running: "Retrait des droits administrateur…",
    verifying: "Vérification des droits…",
    success: "Droits administrateur retirés",
    cancelled: "Modification annulée",
    risk: "destructive",
  },
  whatsapp_deconnecter: {
    title: "Déconnecter WhatsApp",
    awaiting: "Déconnexion prête",
    running: "Déconnexion de WhatsApp…",
    verifying: "Vérification de la déconnexion…",
    success: "WhatsApp déconnecté",
    cancelled: "Déconnexion annulée",
    risk: "destructive",
  },
  send_email: {
    title: "Envoyer un e-mail",
    awaiting: "E-mail prêt à être envoyé",
    running: "Envoi de l’e-mail…",
    verifying: "Vérification de l’envoi…",
    success: "E-mail envoyé",
    cancelled: "Envoi annulé",
    risk: "write",
  },
  send_mail: {
    title: "Envoyer un e-mail",
    awaiting: "E-mail prêt à être envoyé",
    running: "Envoi de l’e-mail…",
    verifying: "Vérification de l’envoi…",
    success: "E-mail envoyé",
    cancelled: "Envoi annulé",
    risk: "write",
  },
  calendar_create_event: {
    title: "Créer un événement",
    awaiting: "Événement prêt à être créé",
    running: "Création de l’événement…",
    verifying: "Vérification dans l’agenda…",
    success: "Événement créé",
    cancelled: "Création annulée",
    risk: "write",
  },
  create_event: {
    title: "Créer un événement",
    awaiting: "Événement prêt à être créé",
    running: "Création de l’événement…",
    verifying: "Vérification dans l’agenda…",
    success: "Événement créé",
    cancelled: "Création annulée",
    risk: "write",
  },
};

function memberLabel(args: Record<string, unknown>): string {
  const direct = first(args, "participant", "participant_name", "phone", "to");
  const fromList = firstArrayString(args, "participants");
  const raw = direct || fromList;
  return raw ? shortPhone(raw) : "";
}

function descriptorForGroupManage(args: Record<string, unknown>): ToolUiDescriptor | null {
  const action = first(args, "action", "operation").toLowerCase();
  if (!action) return null;
  const who = memberLabel(args);

  if (["create", "creer", "créer"].includes(action)) {
    const name = first(args, "value", "group", "group_name");
    return {
      title: "Créer un groupe WhatsApp",
      awaiting: name ? `Création de « ${name} » prête` : "Création du groupe prête",
      running: name ? `Création de « ${name} »…` : "Création du groupe…",
      verifying: "Vérification du groupe et de ses membres…",
      success: name ? `Groupe « ${name} » créé` : "Groupe créé",
      cancelled: "Création annulée",
      risk: "admin",
    };
  }
  if (["add", "ajouter", "invite", "participant_add"].includes(action)) {
    return {
      title: "Ajouter un membre",
      awaiting: who ? `Ajout de ${who} prêt` : "Ajout du membre prêt",
      running: who ? `Ajout de ${who} au groupe…` : "Ajout du membre au groupe…",
      verifying: "Vérification de la liste des membres…",
      success: who ? `${who} ajouté au groupe` : "Membre ajouté au groupe",
      cancelled: "Ajout annulé",
      risk: "admin",
    };
  }
  if (["remove", "retirer", "kick", "participant_remove"].includes(action)) {
    return {
      title: "Retirer un membre",
      awaiting: who ? `Retrait de ${who} prêt` : "Retrait du membre prêt",
      running: who ? `Retrait de ${who} du groupe…` : "Retrait du membre du groupe…",
      verifying: "Vérification de la liste des membres…",
      success: who ? `${who} retiré du groupe` : "Membre retiré du groupe",
      cancelled: "Retrait annulé",
      risk: "destructive",
    };
  }
  if (["promote", "admin", "promouvoir"].includes(action)) {
    return {
      title: "Nommer un administrateur",
      awaiting: who ? `Promotion de ${who} prête` : "Promotion du membre prête",
      running: who ? `Attribution des droits administrateur à ${who}…` : "Attribution des droits administrateur…",
      verifying: "Vérification des administrateurs…",
      success: who ? `${who} est administrateur` : "Administrateur nommé",
      cancelled: "Promotion annulée",
      risk: "admin",
    };
  }
  if (["demote", "retrograder", "rétrograder"].includes(action)) {
    return {
      title: "Retirer les droits administrateur",
      awaiting: who ? `Retrait des droits de ${who} prêt` : "Retrait des droits administrateur prêt",
      running: who ? `Retrait des droits administrateur de ${who}…` : "Retrait des droits administrateur…",
      verifying: "Vérification des administrateurs…",
      success: who ? `Droits administrateur retirés à ${who}` : "Droits administrateur retirés",
      cancelled: "Modification annulée",
      risk: "destructive",
    };
  }
  if (["subject", "rename", "name", "nom"].includes(action)) {
    return {
      title: "Renommer le groupe",
      awaiting: "Nouveau nom prêt",
      running: "Modification du nom du groupe…",
      verifying: "Vérification du nom…",
      success: "Groupe renommé",
      cancelled: "Modification annulée",
      risk: "admin",
    };
  }
  if (["description", "describe", "desc"].includes(action)) {
    return {
      title: "Modifier la description du groupe",
      awaiting: "Nouvelle description prête",
      running: "Mise à jour de la description…",
      verifying: "Vérification de la description…",
      success: "Description mise à jour",
      cancelled: "Modification annulée",
      risk: "admin",
    };
  }
  if (["picture", "photo", "icon"].includes(action)) {
    return {
      title: "Modifier la photo du groupe",
      awaiting: "Nouvelle photo prête",
      running: "Mise à jour de la photo du groupe…",
      verifying: "Vérification de la photo…",
      success: "Photo du groupe mise à jour",
      cancelled: "Modification annulée",
      risk: "admin",
    };
  }
  if (["settings", "access"].includes(action)) {
    return {
      title: "Modifier les règles du groupe",
      awaiting: "Nouveau réglage prêt",
      running: "Mise à jour des règles du groupe…",
      verifying: "Vérification des règles…",
      success: "Règles du groupe mises à jour",
      cancelled: "Modification annulée",
      risk: "admin",
    };
  }
  if (["ephemeral"].includes(action)) {
    return {
      title: "Modifier les messages éphémères",
      awaiting: "Durée prête à être appliquée",
      running: "Mise à jour des messages éphémères…",
      verifying: "Vérification de la durée…",
      success: "Messages éphémères mis à jour",
      cancelled: "Modification annulée",
      risk: "admin",
    };
  }
  if (["approve"].includes(action)) {
    return {
      title: "Accepter une demande d’adhésion",
      awaiting: "Demande prête à être acceptée",
      running: "Acceptation de la demande…",
      verifying: "Vérification des membres…",
      success: "Demande d’adhésion acceptée",
      cancelled: "Action annulée",
      risk: "admin",
    };
  }
  if (["reject"].includes(action)) {
    return {
      title: "Refuser une demande d’adhésion",
      awaiting: "Demande prête à être refusée",
      running: "Refus de la demande…",
      verifying: "Vérification de la demande…",
      success: "Demande d’adhésion refusée",
      cancelled: "Action annulée",
      risk: "destructive",
    };
  }
  if (["revoke_invite"].includes(action)) {
    return {
      title: "Révoquer le lien d’invitation",
      awaiting: "Révocation du lien prête",
      running: "Révocation du lien d’invitation…",
      verifying: "Vérification du nouveau lien…",
      success: "Lien d’invitation révoqué",
      cancelled: "Révocation annulée",
      risk: "destructive",
    };
  }
  if (["join"].includes(action)) {
    return {
      title: "Rejoindre le groupe",
      awaiting: "Demande prête",
      running: "Connexion au groupe…",
      verifying: "Vérification de l’adhésion…",
      success: "Groupe rejoint",
      cancelled: "Action annulée",
      risk: "admin",
    };
  }
  if (["leave", "quitter"].includes(action)) {
    return {
      title: "Quitter le groupe",
      awaiting: "Sortie du groupe prête",
      running: "Sortie du groupe…",
      verifying: "Vérification de la sortie…",
      success: "Groupe quitté",
      cancelled: "Sortie annulée",
      risk: "destructive",
    };
  }
  return null;
}

export function describeTool(tool: string, args: Record<string, unknown> = {}): ToolUiDescriptor {
  if (tool === "__toumai_batch__") {
    const actions = Array.isArray(args.actions)
      ? args.actions.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
    const destructive = actions.some((item) => item.risk === "destructive" || String(item.capability || "").includes("remove"));
    const count = actions.length;
    return {
      title: count ? `${count} actions à exécuter` : "Plusieurs actions à exécuter",
      awaiting: count ? `${count} actions à confirmer` : "Actions à confirmer",
      running: count ? `Exécution de ${count} actions…` : "Exécution des actions…",
      verifying: "Vérification des actions…",
      success: count ? `${count} actions terminées` : "Actions terminées",
      cancelled: "Actions annulées",
      risk: destructive ? "destructive" : "mass",
    };
  }

  if (tool === "whatsapp_group_manage" || tool === "whatsapp_group_participants") {
    const specific = descriptorForGroupManage(args);
    if (specific) return specific;
  }

  const exact = EXACT[tool];
  if (exact) {
    const t = target(args);
    if (tool === "send_whatsapp" && t) {
      return { ...exact, running: `Envoi du message à ${t}…`, success: `Message envoyé à ${t}` };
    }
    return exact;
  }

  const lower = tool.toLowerCase();
  if (lower.includes("delete") || lower.includes("remove") || lower.includes("deconnect") || lower.includes("disconnect") || lower.includes("leave")) {
    return {
      title: "Action sensible",
      awaiting: "Action prête",
      running: "Exécution de l’action…",
      verifying: "Vérification du résultat…",
      success: "Action terminée",
      cancelled: "Action annulée",
      risk: "destructive",
    };
  }
  if (lower.includes("group") || lower.includes("admin") || lower.includes("participant")) {
    return {
      title: "Modifier WhatsApp",
      awaiting: "Modification prête",
      running: withTarget("Modification", args) + "…",
      verifying: "Vérification du résultat…",
      success: "Modification terminée",
      cancelled: "Modification annulée",
      risk: "admin",
    };
  }
  if (lower.startsWith("whatsapp_") || lower.includes("send") || lower.includes("create") || lower.includes("update") || lower.includes("set_")) {
    return {
      title: "Exécuter l’action",
      awaiting: "Action prête",
      running: "Exécution de l’action…",
      verifying: "Vérification du résultat…",
      success: "Action terminée",
      cancelled: "Action annulée",
      risk: "write",
    };
  }
  return {
    title: "Exécuter l’action",
    awaiting: "Action prête",
    running: "Exécution de l’action…",
    verifying: "Vérification du résultat…",
    success: "Action terminée",
    cancelled: "Action annulée",
    risk: "write",
  };
}

export function activityLabel(activity: string, detail?: string): string {
  const labels: Record<string, string> = {
    web_search: "Recherche sur le Web…",
    deep_web_search: "Recherche approfondie sur le Web…",
    document_analysis: "Analyse du document…",
    document_read: "Lecture du document…",
    file_read: "Lecture du fichier…",
    image_analysis: "Analyse de l’image…",
    audio_transcription: "Transcription de l’audio…",
    whatsapp_read: "Lecture de WhatsApp…",
    whatsapp_sync: "Synchronisation de WhatsApp…",
    whatsapp_send: "Envoi sur WhatsApp…",
    mail_read: "Lecture des e-mails…",
    calendar_read: "Lecture de l’agenda…",
    generating_image: "Génération de l’image…",
    generating_file: "Création du fichier…",
    executing_tool: "Exécution de l’action…",
    verifying_tool: "Vérification du résultat…",
  };
  return detail || labels[activity] || "Traitement en cours…";
}

export function riskLabel(risk: ToolRisk): string {
  switch (risk) {
    case "destructive": return "Action sensible";
    case "mass": return "Action multiple";
    case "admin": return "Modification du compte";
    case "write": return "Action externe";
    default: return "Lecture";
  }
}
