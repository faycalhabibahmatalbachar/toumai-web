"use client";

/**
 * Résultat attesté d'un enchaînement d'actions (bloc serveur `actions`).
 *
 * L'état de chaque étape vient du journal d'exécution, jamais du texte du
 * modèle. Tant que tout s'est bien passé, une seule ligne suffit ; les étapes
 * ne se déplient d'office que s'il y a un problème ou une exécution en cours.
 * Au-delà de 5 étapes, résumé chiffré puis dépliage : 100 destinataires ne
 * doivent pas produire 100 lignes dans le fil.
 */

import { ListChecks } from "lucide-react";
import type { ActionStep } from "@/lib/chat-response";
import { displayText, normalizeStatus, summarizeSteps, type StatusKey } from "@/lib/widgets/core";
import { useWidgetText } from "@/lib/widgets/i18n";
import { Disclosure, ProgressSteps, WidgetCard, WidgetHeader, type ProgressStep } from "../primitives";

function stepStatus(step: ActionStep): StatusKey {
  const status = normalizeStatus(step.state);
  return status === "unknown" && step.state === "awaiting_confirmation" ? "awaiting_confirmation" : status;
}

/** Titre court d'une étape, formulé d'après son ÉTAT réel. */
export function stepTitle(step: ActionStep): string {
  const status = stepStatus(step);
  const done = status === "success";
  const active = ["running", "queued", "verifying"].includes(status);
  const failed = status === "failed" || status === "expired";
  const blocked = status === "blocked";
  const capability = step.capability || "";
  const pick = (success: string, running: string, notDone: string, idle: string) =>
    done ? success : active ? running : blocked || failed ? notDone : idle;

  if (capability === "whatsapp.group.create") return pick("Groupe créé", "Création du groupe…", "Groupe non créé", "Créer le groupe");
  if (capability === "whatsapp.message.send") return pick("Message envoyé", "Envoi du message…", "Message non envoyé", "Envoyer le message");
  if (capability.startsWith("whatsapp.media.")) return pick("Média envoyé", "Envoi du média…", "Média non envoyé", "Envoyer le média");
  if (capability.includes("participant.add")) return pick("Membre ajouté", "Ajout du membre…", "Membre non ajouté", "Ajouter un membre");
  if (capability.includes("participant.remove")) return pick("Membre retiré", "Retrait du membre…", "Membre non retiré", "Retirer un membre");
  if (capability.includes("admin.promote")) return pick("Administrateur nommé", "Nomination…", "Nomination non faite", "Nommer administrateur");
  if (capability.includes("admin.demote")) return pick("Droits retirés", "Retrait des droits…", "Droits non retirés", "Retirer les droits");
  if (capability.includes("rename")) return pick("Groupe renommé", "Renommage…", "Groupe non renommé", "Renommer le groupe");
  if (capability.includes("description")) return pick("Description mise à jour", "Mise à jour…", "Description inchangée", "Modifier la description");
  if (capability.startsWith("automation.")) return pick("Automatisation enregistrée", "Enregistrement…", "Automatisation non créée", "Créer l’automatisation");
  return displayText(step.label, 90) || "Action";
}

function stepDetail(step: ActionStep): string {
  const raw = step.detail || step.target || "";
  if (!raw) return stepStatus(step) === "blocked" ? "Non exécutée après l’échec d’une étape précédente." : "";
  if (/non inclus/i.test(raw)) return "Non inclus dans votre formule.";
  if (step.capability === "whatsapp.group.create" && stepStatus(step) === "success") {
    const group = raw.match(/Groupe\s+[«"]([^»"]+)[»"]/i)?.[1];
    const count = raw.match(/\((\d+)\s+membre/i)?.[1];
    return [group ? displayText(group, 54) : "", count ? `${count} participant${count === "1" ? "" : "s"}` : ""].filter(Boolean).join(" · ") || displayText(raw, 110);
  }
  return displayText(raw, 110);
}

export function ActionStepsWidget({ steps }: { steps: ActionStep[] }) {
  const { t } = useWidgetText();
  if (!steps.length) return null;
  const s = summarizeSteps(steps.map((step) => step.state));
  const problems = s.failed + s.partial;
  const unverified = steps.some((step) => step.verified === false);

  const headline = s.active
    ? "Exécution…"
    : s.overall === "success"
      ? steps.length === 1 ? stepTitle(steps[0]) : `${steps.length} actions terminées`
      : s.overall === "failed"
        ? steps.length === 1 ? stepTitle(steps[0]) : `${steps.length} actions non abouties`
        : problems || s.blocked
          ? `Terminé avec ${problems + (s.blocked ? 1 : 0)} problème${problems + (s.blocked ? 1 : 0) > 1 ? "s" : ""}`
          : "Actions terminées";

  const counts = [
    s.succeeded ? `${s.succeeded} réussie${s.succeeded > 1 ? "s" : ""}` : "",
    s.failed ? `${s.failed} échec${s.failed > 1 ? "s" : ""}` : "",
    s.blocked ? `${s.blocked} non exécutée${s.blocked > 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(" · ");

  const rows: ProgressStep[] = steps.slice(0, 200).map((step, index) => ({
    key: `${step.action_id || step.capability}-${index}`,
    label: stepTitle(step),
    detail: stepDetail(step) || undefined,
    status: stepStatus(step),
  }));

  const expandByDefault = (Boolean(s.active) || problems > 0 || s.blocked > 0) && steps.length <= 5;
  const status: StatusKey = s.overall === "empty" ? "unknown" : s.overall;

  return (
    <WidgetCard
      label="Résultat des actions"
      tone={status === "success" ? "success" : status === "failed" ? "error" : status === "partial_success" || status === "blocked" ? "warning" : "progress"}
      accent
      live
      alert={s.overall === "failed"}
      testId="actions"
      className="!max-w-[30rem]"
    >
      <WidgetHeader
        icon={ListChecks}
        title={headline}
        subtitle={steps.length > 1 ? counts || `${steps.length} actions` : stepDetail(steps[0]) || undefined}
        status={status}
      />
      {steps.length > 1 || expandByDefault ? (
        expandByDefault
          ? <ProgressSteps steps={rows} label="Étapes" />
          : <Disclosure summary={t.common.details} count={steps.length}><div className="pt-2"><ProgressSteps steps={rows} label="Étapes" /></div></Disclosure>
      ) : null}
      {unverified && !s.active ? <p className="border-t border-[var(--border)] px-3.5 py-2 text-[11.5px] text-[var(--text-tertiary)]">Certaines étapes n’ont pas pu être vérifiées auprès du connecteur.</p> : null}
    </WidgetCard>
  );
}
