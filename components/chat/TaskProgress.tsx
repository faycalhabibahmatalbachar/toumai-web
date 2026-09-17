"use client";

import {
  CalendarClock,
  ContactRound,
  LoaderCircle,
  MessageCircle,
  Radio,
  Search,
  Send,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

type ActivityVisual = {
  activity: string;
  label: string;
  icon: LucideIcon;
};

function targetFrom(text: string): string {
  const phone = text.match(/(?<!\d)(\+?\d[\d\s().-]{5,}\d)(?!\d)/)?.[1]?.trim();
  if (phone) return phone;
  const group = text.match(/(?:groupe|group)\s+[«\"]?([^«»\"?,.!]{2,45})/i)?.[1]?.trim();
  return group || "";
}

/**
 * Indice UX immédiat avant que le serveur ait commencé à streamer ses propres
 * métadonnées. Il ne prétend JAMAIS qu'une étape est réussie : il décrit
 * uniquement la famille de travail demandée à partir du message utilisateur.
 */
export function inferTaskActivity(prompt?: string): ActivityVisual | null {
  const raw = (prompt || "").trim();
  if (!raw) return null;
  const value = raw.toLowerCase();
  const target = targetFrom(raw);
  const whatsapp = /whats?app|groupe|group|statut|status/i.test(raw) || /(?<!\d)\+?\d[\d\s().-]{5,}\d(?!\d)/.test(raw);
  if (!whatsapp) return null;

  if (/\b(programm|planifi)/i.test(raw)) {
    return {
      activity: "whatsapp_schedule",
      label: target ? `Préparation de la programmation pour ${target}…` : "Préparation de la programmation WhatsApp…",
      icon: CalendarClock,
    };
  }
  if (/\b(lis|lire|lecture|résum|resum|analyse|messages?\s+non\s+lus?|conversations?|discussions?)\b/i.test(raw)) {
    if (/\b(groupe|group)\b/i.test(raw)) {
      return {
        activity: "whatsapp_group_read",
        label: target ? `Lecture du groupe ${target}…` : "Lecture du groupe WhatsApp…",
        icon: UsersRound,
      };
    }
    return { activity: "whatsapp_read", label: "Lecture de WhatsApp…", icon: MessageCircle };
  }
  if (/\b(contact|contacts|cherche|recherche|trouve)\b/i.test(raw)) {
    return {
      activity: "whatsapp_contact",
      label: target ? `Recherche du contact ${target}…` : "Recherche du contact WhatsApp…",
      icon: ContactRound,
    };
  }
  if (/\b(statut|status|story|publie|poste|mets?\s+en\s+statut)\b/i.test(raw)) {
    return { activity: "whatsapp_status", label: "Publication du statut WhatsApp…", icon: Radio };
  }
  if (/\b(cr[ée]e|renomme|description|ajoute|retire|supprime|admin|membre)\b/i.test(raw) && /\b(groupe|group)\b/i.test(raw)) {
    return {
      activity: "whatsapp_group_action",
      label: target ? `Action sur le groupe ${target}…` : "Modification du groupe WhatsApp…",
      icon: UsersRound,
    };
  }
  if (/\b(envoie|envoyer|envoyez|réponds|reponds|transf[eè]re|partage)\b/i.test(raw)) {
    return {
      activity: "whatsapp_send",
      label: target ? `Envoi du message à ${target}…` : "Envoi du message WhatsApp…",
      icon: Send,
    };
  }
  if (/\b(v[ée]rifie|contr[oô]le|check)\b/i.test(raw)) {
    return { activity: "whatsapp_check", label: "Vérification de WhatsApp…", icon: Search };
  }
  return { activity: "whatsapp_action", label: "Action WhatsApp en cours…", icon: MessageCircle };
}

export function TaskProgress({ activity, label, icon: Icon }: ActivityVisual) {
  return (
    <div
      className="tmw-enter mt-2 flex max-w-[var(--tmw-max)] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/55 px-3 py-2.5 text-[12.5px] text-[var(--text-secondary)]"
      role="status"
      aria-live="polite"
      data-activity={activity}
    >
      <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--card)] text-[var(--primary)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--surface)] bg-[var(--surface)]">
          <LoaderCircle className="h-3 w-3 animate-spin text-[var(--primary)] motion-reduce:animate-none" aria-hidden="true" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[var(--text-primary)]">{label}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--text-tertiary)]">WhatsApp · exécution en cours</span>
      </span>
    </div>
  );
}
