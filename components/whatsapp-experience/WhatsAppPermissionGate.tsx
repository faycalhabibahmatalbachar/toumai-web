"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LockKeyhole, Settings, ShieldCheck, TriangleAlert } from "lucide-react";
import { getWaSettings, type WaSettings } from "@/lib/connectors-api";
import type { WhatsAppActionDefinition } from "@/lib/whatsapp-ui/types";

type GateState = "loading" | "denied" | "error";

export function WhatsAppPermissionGate({
  action,
  onAllowed,
  onBack,
  onManagePermissions,
}: {
  action: WhatsAppActionDefinition;
  onAllowed: () => void;
  onBack: () => void;
  onManagePermissions: () => void;
}) {
  const [state, setState] = useState<GateState>("loading");
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    const permission = action.permission;
    if (!permission) {
      onAllowed();
      return;
    }

    const current = ++generation.current;
    setState("loading");
    setError(null);

    void getWaSettings()
      .then((settings: WaSettings) => {
        if (generation.current !== current) return;
        if (settings[permission] === true) {
          onAllowed();
          return;
        }
        setState("denied");
      })
      .catch((cause) => {
        if (generation.current !== current) return;
        setState("error");
        setError(cause instanceof Error ? cause.message : "Impossible de vérifier cette permission.");
      });

    return () => {
      generation.current += 1;
    };
  }, [action.id, action.permission, onAllowed]);

  return (
    <section
      className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4"
      data-testid="wa-v2-permission-gate"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        data-testid="wa-v2-permission-back"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Actions
      </button>

      {state === "loading" ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center" data-testid="wa-v2-permission-loading">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hover)] text-[var(--text-secondary)]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Vérification de la permission</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">Toumaï vérifie l’autorisation « {action.label} » avant de continuer.</p>
          </div>
        </div>
      ) : state === "denied" ? (
        <div data-testid="wa-v2-permission-denied">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hover)] text-[var(--text-secondary)]">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">Permission désactivée</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            L’action « {action.label} » est désactivée dans vos permissions WhatsApp. Rien n’a été préparé ni envoyé.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onManagePermissions}
              data-testid="wa-v2-permission-manage"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--text-primary)] px-3.5 text-xs font-semibold text-[var(--background)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Gérer les permissions
            </button>
            <button
              type="button"
              onClick={onBack}
              className="min-h-10 rounded-xl border border-[var(--border)] px-3.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Choisir une autre action
            </button>
          </div>
        </div>
      ) : (
        <div data-testid="wa-v2-permission-error">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hover)] text-[var(--text-secondary)]">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">Permission non vérifiée</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {error || "Impossible de vérifier cette permission actuellement."} Par sécurité, Toumaï ne continue pas cette action.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 min-h-10 rounded-xl border border-[var(--border)] px-3.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Retour aux actions
          </button>
        </div>
      )}
    </section>
  );
}
