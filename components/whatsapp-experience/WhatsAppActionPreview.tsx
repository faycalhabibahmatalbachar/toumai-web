"use client";

import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import type { WaContact } from "@/lib/connectors-api";
import type { WhatsAppActionDefinition } from "@/lib/whatsapp-ui/types";

function normalizedDisplayNumber(number?: string | null): string | null {
  if (!number) return null;
  const clean = number.trim().replace(/[^+\d]/g, "");
  if (!clean) return null;
  return clean.startsWith("+") ? clean : `+${clean}`;
}

export function WhatsAppActionPreview({
  action,
  contact,
  starter,
  onModify,
  onConfirm,
}: {
  action: WhatsAppActionDefinition;
  contact?: WaContact | null;
  starter: string;
  onModify: () => void;
  onConfirm: () => void;
}) {
  const number = normalizedDisplayNumber(contact?.number);

  return (
    <section className="w-full" data-testid="wa-v2-action-preview" aria-label={`Vérifier ${action.label}`}>
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
        <button
          type="button"
          onClick={onModify}
          data-testid="wa-v2-preview-modify"
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Modifier
        </button>
        <div className="min-w-0 text-right">
          <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">Vérifier avant de continuer</p>
          <p className="truncate text-[10.5px] text-[var(--text-tertiary)]">{action.label} · confirmation requise</p>
        </div>
      </div>

      <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4" data-testid="wa-v2-preview-summary">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--hover)] text-[var(--text-secondary)]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">Action</p>
            <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]" data-testid="wa-v2-preview-action">{action.label}</p>
          </div>
        </div>

        {contact ? (
          <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2" data-testid="wa-v2-preview-recipient">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Destinataire</p>
              <p className="mt-1 truncate text-[13px] font-medium text-[var(--text-primary)]">{contact.name}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Numéro du carnet</p>
              <p className="mt-1 truncate text-[13px] text-[var(--text-secondary)]" data-testid="wa-v2-preview-number">{number || "Indisponible"}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 border-t border-[var(--border)] pt-4" data-testid="wa-v2-preview-scope">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Portée</p>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Cette action concerne votre compte WhatsApp, sans destinataire individuel sélectionné.
            </p>
          </div>
        )}

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Ce qui sera préparé dans le chat</p>
          <p className="mt-1.5 whitespace-pre-wrap break-words rounded-2xl bg-[var(--hover)] px-3 py-2.5 text-[12px] leading-5 text-[var(--text-secondary)]" data-testid="wa-v2-preview-starter">
            {starter}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5" data-testid="wa-v2-preview-not-sent">
        <p className="text-[11px] font-semibold text-[var(--text-primary)]">Rien n’est encore envoyé.</p>
        <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--text-secondary)]">
          Cette étape prépare seulement votre demande dans Toumaï. L’exécution WhatsApp restera soumise au parcours normal de confirmation et de permissions.
        </p>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        data-testid="wa-v2-preview-confirm"
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--text-primary)] px-4 py-3 text-[12px] font-semibold text-[var(--background)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        Préparer dans le chat
      </button>
    </section>
  );
}
