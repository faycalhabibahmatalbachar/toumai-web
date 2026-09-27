"use client";

import { AlertTriangle, Check, Circle, LoaderCircle } from "lucide-react";

export type WhatsAppCanonicalOperationState =
  | "requested"
  | "dispatching"
  | "provider_accepted"
  | "sent"
  | "delivered"
  | "read"
  | "completed"
  | "unknown"
  | "partial_success"
  | "reconciling"
  | "failed"
  | "blocked"
  | "expired"
  | "needs_relink"
  | "cancelled";

type TimelineStatus = "done" | "current" | "pending";

type TimelineStep = {
  id: Exclude<WhatsAppCanonicalOperationState, "unknown" | "partial_success" | "reconciling" | "failed" | "blocked" | "expired" | "needs_relink" | "cancelled">;
  label: string;
  detail: string;
};

const PROGRESS_STEPS: TimelineStep[] = [
  { id: "requested", label: "Demandée", detail: "Toumaï a enregistré la demande d’action." },
  { id: "dispatching", label: "Transmission", detail: "L’action est en cours de transmission au connecteur." },
  { id: "provider_accepted", label: "Acceptée par WhatsApp", detail: "Le connecteur a accepté la demande. Cela ne prouve pas encore la remise." },
  { id: "sent", label: "Envoyée", detail: "Le connecteur signale l’envoi. Cela ne prouve pas encore la remise au destinataire." },
  { id: "delivered", label: "Remise", detail: "La remise au destinataire a été constatée." },
  { id: "read", label: "Lue", detail: "La lecture a été constatée lorsque cette preuve est disponible." },
  { id: "completed", label: "Vérifiée", detail: "Le serveur a terminé la réconciliation avec une preuve suffisante." },
];

const PROGRESSION = new Map(PROGRESS_STEPS.map((step, index) => [step.id, index]));
const UNCERTAIN = new Set<WhatsAppCanonicalOperationState>(["unknown", "partial_success", "reconciling"]);
const FAILED = new Set<WhatsAppCanonicalOperationState>(["failed", "blocked", "expired", "needs_relink"]);

export function isWhatsAppCanonicalOperationState(value: string): value is WhatsAppCanonicalOperationState {
  return PROGRESSION.has(value as TimelineStep["id"])
    || UNCERTAIN.has(value as WhatsAppCanonicalOperationState)
    || FAILED.has(value as WhatsAppCanonicalOperationState)
    || value === "cancelled";
}

export function timelineStatusFor(
  operationState: WhatsAppCanonicalOperationState,
  stepId: TimelineStep["id"],
): TimelineStatus {
  const current = PROGRESSION.get(operationState as TimelineStep["id"]);
  const target = PROGRESSION.get(stepId);
  if (current === undefined || target === undefined) return "pending";
  if (target < current) return "done";
  if (target === current) return "current";
  return "pending";
}

function exceptionalCopy(operationState: WhatsAppCanonicalOperationState): { label: string; detail: string; kind: "warning" | "failed" } | null {
  if (operationState === "unknown") {
    return { label: "Résultat inconnu", detail: "Aucune preuve suffisante ne permet encore d’affirmer le résultat.", kind: "warning" };
  }
  if (operationState === "reconciling") {
    return { label: "Vérification en cours", detail: "Toumaï réconcilie l’état avec le connecteur. Aucun succès n’est supposé.", kind: "warning" };
  }
  if (operationState === "partial_success") {
    return { label: "Résultat partiel", detail: "Une partie seulement de l’opération est prouvée. Les étapes non confirmées restent inconnues.", kind: "warning" };
  }
  if (operationState === "needs_relink") {
    return { label: "Reconnexion requise", detail: "La session WhatsApp doit être reconnectée avant de poursuivre.", kind: "failed" };
  }
  if (operationState === "expired") {
    return { label: "Opération expirée", detail: "L’opération a expiré avant qu’un résultat final puisse être confirmé.", kind: "failed" };
  }
  if (operationState === "blocked") {
    return { label: "Opération bloquée", detail: "Le serveur a bloqué l’opération. Aucun résultat réussi n’est annoncé.", kind: "failed" };
  }
  if (operationState === "failed") {
    return { label: "Échec confirmé", detail: "Le serveur a confirmé l’échec de l’opération.", kind: "failed" };
  }
  if (operationState === "cancelled") {
    return { label: "Annulée", detail: "L’opération a été annulée. Aucune exécution réussie n’est annoncée.", kind: "warning" };
  }
  return null;
}

function StepIcon({ status }: { status: TimelineStatus }) {
  if (status === "done") return <Check className="h-3.5 w-3.5" aria-hidden="true" />;
  if (status === "current") return <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />;
  return <Circle className="h-3 w-3" aria-hidden="true" />;
}

export function WhatsAppExecutionTimeline({
  operationState,
}: {
  operationState: string | null | undefined;
}) {
  if (!operationState || !isWhatsAppCanonicalOperationState(operationState)) return null;

  const exceptional = exceptionalCopy(operationState);
  if (exceptional) {
    return (
      <section
        className="border-t border-[var(--border)] px-3.5 py-3"
        data-testid="wa-v2-execution-timeline"
        data-operation-state={operationState}
        data-timeline-mode={exceptional.kind === "failed" ? "failed" : "uncertain"}
        aria-label="État d’exécution WhatsApp"
      >
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-[var(--text-primary)]" data-testid="wa-v2-operation-state">{exceptional.label}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-tertiary)]">{exceptional.detail}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="border-t border-[var(--border)] px-3.5 py-3"
      data-testid="wa-v2-execution-timeline"
      data-operation-state={operationState}
      data-timeline-mode="progress"
      aria-label="Progression de l’exécution WhatsApp"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Exécution WhatsApp</p>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[9.5px] text-[var(--text-tertiary)]" data-testid="wa-v2-operation-state">
          {operationState}
        </span>
      </div>
      <ol className="space-y-1" aria-label="Étapes d’exécution">
        {PROGRESS_STEPS.map((step) => {
          const status = timelineStatusFor(operationState, step.id);
          return (
            <li
              key={step.id}
              data-testid={`wa-v2-timeline-step-${step.id}`}
              data-step-status={status}
              className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 ${status === "current" ? "bg-[var(--hover)]" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${status === "done" ? "border-[var(--tmw-success)] text-[var(--tmw-success)]" : status === "current" ? "border-[var(--text-primary)] text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-tertiary)]"}`}
                aria-hidden="true"
              >
                <StepIcon status={status} />
              </span>
              <div className="min-w-0">
                <p className={`text-[11.5px] font-semibold ${status === "pending" ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}>{step.label}</p>
                {status === "current" ? <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--text-tertiary)]">{step.detail}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
