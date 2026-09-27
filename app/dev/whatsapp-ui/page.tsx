"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FlaskConical, Info, X } from "lucide-react";
import Link from "next/link";
import { WhatsAppActionCenter } from "@/components/whatsapp-experience/WhatsAppActionCenter";
import {
  WhatsAppExecutionTimeline,
  type WhatsAppCanonicalOperationState,
} from "@/components/whatsapp-experience/WhatsAppExecutionTimeline";
import { WHATSAPP_ACTIONS } from "@/lib/whatsapp-ui/capabilities";
import type {
  WhatsAppActionDefinition,
  WhatsAppConnectionStatus,
  WhatsAppExperienceState,
} from "@/lib/whatsapp-ui/types";

const STATES: Array<{ status: WhatsAppConnectionStatus; state: WhatsAppExperienceState; label: string }> = [
  { status: "connected", state: "ready", label: "Connecté" },
  { status: "disconnected", state: "ready", label: "Déconnecté" },
  { status: "expired", state: "expired", label: "Expiré" },
  { status: "offline", state: "offline", label: "Hors ligne" },
  { status: "connecting", state: "loading", label: "Chargement" },
  { status: "unknown", state: "unknown", label: "Inconnu" },
];

const TIMELINE_STATES: WhatsAppCanonicalOperationState[] = [
  "requested",
  "dispatching",
  "provider_accepted",
  "sent",
  "delivered",
  "read",
  "completed",
  "reconciling",
  "unknown",
  "failed",
];

export default function WhatsAppUiLabPage() {
  const [selectedState, setSelectedState] = useState(0);
  const [selectedAction, setSelectedAction] = useState<WhatsAppActionDefinition | null>(null);
  const [timelineState, setTimelineState] = useState<WhatsAppCanonicalOperationState>("provider_accepted");
  const current = STATES[selectedState];

  const connection = useMemo(() => ({
    status: current.status,
    maskedNumber: current.status === "connected" ? "+235 66•••123" : null,
    profileName: current.status === "connected" ? "Compte de démonstration" : null,
    stale: current.status === "offline",
  }), [current.status]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]" data-testid="wa-v2-lab">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Laboratoire isolé
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">WhatsApp Experience V2</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Cette route ne déclenche aucune action WhatsApp réelle. Elle sert uniquement à certifier les états visuels et les interactions avant intégration dans le chat.
            </p>
          </div>
          <Link href="/chat" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour au chat
          </Link>
        </div>

        <section className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5" aria-label="Sélecteur d'état du laboratoire">
          <div className="flex flex-wrap gap-2">
            {STATES.map((entry, index) => (
              <button
                key={entry.label}
                type="button"
                aria-pressed={selectedState === index}
                onClick={() => {
                  setSelectedState(index);
                  setSelectedAction(null);
                }}
                className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${selectedState === index ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)]"}`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,36rem)_minmax(260px,1fr)]">
          <WhatsAppActionCenter
            connection={connection}
            state={current.state}
            actions={WHATSAPP_ACTIONS}
            onAction={setSelectedAction}
            onConnect={() => setSelectedState(4)}
            onOpenAdvanced={() => setSelectedAction(null)}
          />

          <aside className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Inspection</h2>
              {selectedAction ? (
                <button
                  type="button"
                  aria-label="Fermer l'inspection de l'action"
                  onClick={() => setSelectedAction(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {selectedAction ? (
              <div className="mt-4" data-testid="wa-v2-selected-action">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-1 text-[10.5px] font-semibold text-[var(--text-tertiary)]">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Sélection locale uniquement
                </span>
                <h3 className="mt-4 text-lg font-semibold">{selectedAction.label}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{selectedAction.description}</p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <dt className="text-[var(--text-tertiary)]">ID UI</dt>
                    <dd className="font-mono text-xs">{selectedAction.id}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <dt className="text-[var(--text-tertiary)]">Permission</dt>
                    <dd className="font-mono text-xs">{selectedAction.permission || "aucune"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-tertiary)]">Confirmation sensible</dt>
                    <dd>{selectedAction.sensitive ? "Oui" : "Non"}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-4">
                <Info className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  En état connecté, sélectionnez une action pour vérifier son contrat de présentation. Aucun appel réseau WhatsApp n'est effectué depuis ce laboratoire.
                </p>
              </div>
            )}
          </aside>
        </div>

        <section className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5" data-testid="wa-v2-timeline-lab">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Phase 6 · vérité d’exécution</p>
              <h2 className="mt-1 text-sm font-semibold">Timeline depuis l’état canonique serveur</h2>
              <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[var(--text-secondary)]">
                Le laboratoire change uniquement la valeur d’état. La Timeline ne contacte ni WhatsApp ni le chat et ne transforme jamais un état inconnu en succès.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border)] px-2 py-1 font-mono text-[10px] text-[var(--text-tertiary)]">{timelineState}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="État canonique simulé">
            {TIMELINE_STATES.map((entry) => (
              <button
                key={entry}
                type="button"
                data-testid={`wa-v2-timeline-select-${entry}`}
                aria-pressed={timelineState === entry}
                onClick={() => setTimelineState(entry)}
                className={`rounded-xl border px-2.5 py-2 font-mono text-[10.5px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${timelineState === entry ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)]"}`}
              >
                {entry}
              </button>
            ))}
          </div>
          <div className="mt-4 max-w-[480px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <WhatsAppExecutionTimeline operationState={timelineState} />
          </div>
        </section>
      </div>
    </main>
  );
}
