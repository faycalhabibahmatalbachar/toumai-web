"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, MessageCircle, XCircle } from "lucide-react";
import type { WhatsAppCanonicalOperationState } from "./WhatsAppExecutionTimeline";

export type WhatsAppResultTone = "success" | "neutral" | "warning" | "error";

export type WhatsAppResultPresentation = {
  label: string;
  detail: string;
  tone: WhatsAppResultTone;
  verified: boolean;
  terminal: boolean;
};

const PRESENTATIONS: Record<WhatsAppCanonicalOperationState, WhatsAppResultPresentation> = {
  requested: {
    label: "Action demandée",
    detail: "La demande est enregistrée, mais pas encore transmise.",
    tone: "neutral",
    verified: false,
    terminal: false,
  },
  dispatching: {
    label: "Transmission en cours",
    detail: "Le connecteur traite la demande. Aucun résultat final n’est encore affirmé.",
    tone: "neutral",
    verified: false,
    terminal: false,
  },
  provider_accepted: {
    label: "Acceptée par WhatsApp",
    detail: "L’acceptation du connecteur ne prouve ni l’envoi final ni la remise.",
    tone: "neutral",
    verified: false,
    terminal: false,
  },
  sent: {
    label: "Envoyée",
    detail: "L’envoi est signalé, mais la remise au destinataire n’est pas confirmée.",
    tone: "neutral",
    verified: false,
    terminal: false,
  },
  delivered: {
    label: "Remise",
    detail: "La remise au destinataire a été constatée.",
    tone: "success",
    verified: true,
    terminal: true,
  },
  read: {
    label: "Lue",
    detail: "La lecture par le destinataire a été constatée.",
    tone: "success",
    verified: true,
    terminal: true,
  },
  completed: {
    label: "Action vérifiée",
    detail: "Le serveur a terminé la réconciliation avec une preuve suffisante.",
    tone: "success",
    verified: true,
    terminal: true,
  },
  unknown: {
    label: "Résultat inconnu",
    detail: "Aucune preuve suffisante ne permet encore d’affirmer le résultat.",
    tone: "warning",
    verified: false,
    terminal: false,
  },
  partial_success: {
    label: "Résultat partiel",
    detail: "Une partie seulement de l’opération est prouvée.",
    tone: "warning",
    verified: false,
    terminal: false,
  },
  reconciling: {
    label: "Vérification en cours",
    detail: "Toumaï vérifie l’état sans supposer de succès.",
    tone: "warning",
    verified: false,
    terminal: false,
  },
  failed: {
    label: "Échec confirmé",
    detail: "Le serveur a confirmé l’échec de l’opération.",
    tone: "error",
    verified: false,
    terminal: true,
  },
  blocked: {
    label: "Opération bloquée",
    detail: "Le serveur a bloqué l’opération. Aucun succès n’est annoncé.",
    tone: "error",
    verified: false,
    terminal: true,
  },
  expired: {
    label: "Opération expirée",
    detail: "L’opération a expiré avant confirmation d’un résultat final.",
    tone: "error",
    verified: false,
    terminal: true,
  },
  needs_relink: {
    label: "Reconnexion requise",
    detail: "La session WhatsApp doit être reconnectée avant de poursuivre.",
    tone: "error",
    verified: false,
    terminal: true,
  },
  cancelled: {
    label: "Annulée",
    detail: "L’opération a été annulée. Aucune exécution réussie n’est annoncée.",
    tone: "neutral",
    verified: false,
    terminal: true,
  },
};

export function whatsappResultPresentation(operationState: WhatsAppCanonicalOperationState): WhatsAppResultPresentation {
  return PRESENTATIONS[operationState];
}

function ResultIcon({ tone }: { tone: WhatsAppResultTone }) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  if (tone === "error") return <XCircle className="h-4 w-4" aria-hidden="true" />;
  if (tone === "warning") return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
  return <CircleHelp className="h-4 w-4" aria-hidden="true" />;
}

export function WhatsAppResultCard({
  operationState,
  detailsOpen,
  onToggleDetails,
  issueCount = 0,
}: {
  operationState: WhatsAppCanonicalOperationState;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  issueCount?: number;
}) {
  const result = whatsappResultPresentation(operationState);
  const issueSuffix = issueCount > 0
    ? ` · ${issueCount} problème${issueCount > 1 ? "s" : ""}`
    : "";

  return (
    <section
      className="px-3.5 py-3"
      data-testid="wa-v2-result-card"
      data-operation-state={operationState}
      data-result-tone={result.tone}
      data-result-verified={result.verified ? "true" : "false"}
      data-result-terminal={result.terminal ? "true" : "false"}
      aria-label="Résultat WhatsApp"
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
            result.tone === "success"
              ? "border-[var(--tmw-success)] text-[var(--tmw-success)]"
              : result.tone === "error"
                ? "border-red-500/30 text-red-600 dark:text-red-400"
                : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
          aria-hidden="true"
        >
          <ResultIcon tone={result.tone} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
            <p className="truncate text-[12.5px] font-semibold text-[var(--text-primary)]" data-testid="wa-v2-result-label">
              {result.label}{issueSuffix}
            </p>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-tertiary)]" data-testid="wa-v2-result-detail">
            {result.detail}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleDetails}
          data-testid="wa-v2-result-details-toggle"
          aria-expanded={detailsOpen}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[var(--text-tertiary)] outline-none transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Détails
          <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${detailsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
