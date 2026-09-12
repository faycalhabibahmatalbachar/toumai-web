"use client";

import { Activity, BadgeCheck, Gauge, ShieldAlert, ShieldCheck, Waves } from "lucide-react";
import type { WaProtectionState } from "@/lib/connectors-api";

type Props = {
  protection?: WaProtectionState;
  connected: boolean;
};

function duration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return `${Math.ceil(seconds)} s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function Meter({ value, max }: { value: number; max: number }) {
  const finiteMax = Number.isFinite(max) && max > 0 ? max : 0;
  const finiteValue = Number.isFinite(value) && value > 0 ? value : 0;
  const pct = finiteMax ? Math.min(100, Math.max(0, (finiteValue / finiteMax) * 100)) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]/65" aria-hidden="true">
      <div
        className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function WhatsAppProtectionPanel({ protection, connected }: Props) {
  if (!connected) return null;

  // Backend plus ancien : on ne prétend pas connaître un état live. On montre
  // seulement l'invariant déjà vrai dans le registre serveur.
  if (!protection) {
    return (
      <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--background)]/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <ShieldCheck className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">Protection des actions</p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">
              Les mutations passent par les contrôles serveur. Le backend actuel ne publie pas encore son état de protection détaillé, donc aucun compteur n’est inventé ici.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sensitive = protection.classes?.sensible;
  const writes = protection.classes?.ecriture;
  const prudence = protection.mode === "prudence" || protection.prudence?.active;
  const unavailable = !protection.available || protection.mode === "unknown";
  const sourceLabel = protection.shared === true
    ? "Synchronisée entre serveurs"
    : protection.shared === false
      ? "Protection locale"
      : "État non vérifiable";

  const title = unavailable
    ? "Protection non vérifiable"
    : prudence
      ? "Mode prudence actif"
      : "Protection active";

  const description = unavailable
    ? "L’état du régulateur n’a pas pu être lu. Les actions sensibles doivent rester bloquées côté serveur plutôt que partir sans contrôle."
    : prudence
      ? `Les écritures et modifications sont temporairement arrêtées${protection.prudence?.reste_s ? ` encore ${duration(protection.prudence.reste_s)}` : ""}. La lecture peut rester disponible.`
      : "Cadence, anti-doublon et preuve d’exécution sont appliqués avant et après chaque mutation WhatsApp.";

  return (
    <div className={`mt-4 overflow-hidden rounded-[22px] border ${
      unavailable
        ? "border-amber-500/20 bg-amber-500/[0.055]"
        : prudence
          ? "border-amber-500/20 bg-amber-500/[0.055]"
          : "border-emerald-500/15 bg-emerald-500/[0.045]"
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              unavailable || prudence
                ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}>
              {unavailable || prudence ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">{title}</p>
              <p className="mt-1 max-w-[410px] text-[11px] leading-5 text-[var(--text-secondary)]">{description}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)]/70 px-2 py-1 text-[9px] font-semibold text-[var(--text-tertiary)]">
            {sourceLabel}
          </span>
        </div>

        {!unavailable && (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {sensitive ? (
              <div className="rounded-2xl border border-[var(--border)]/80 bg-[var(--card)]/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                    <Gauge className="h-3.5 w-3.5" /> Actions sensibles · 24 h
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {sensitive.dernier_jour}/{sensitive.plafond_jour || "—"}
                  </span>
                </div>
                <div className="mt-2"><Meter value={sensitive.dernier_jour} max={sensitive.plafond_jour} /></div>
                <p className="mt-2 text-[9px] leading-4 text-[var(--text-tertiary)]">
                  {sensitive.en_repos ? "Pause de sécurité en cours" : `${sensitive.echecs_consecutifs} échec(s) consécutif(s)`}
                </p>
              </div>
            ) : null}

            {writes ? (
              <div className="rounded-2xl border border-[var(--border)]/80 bg-[var(--card)]/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                    <Activity className="h-3.5 w-3.5" /> Écritures · dernière heure
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {writes.derniere_heure}
                  </span>
                </div>
                <p className="mt-2 text-[9px] leading-4 text-[var(--text-tertiary)]">
                  {writes.en_repos ? "Pause de sécurité en cours" : `${writes.dernier_jour} action(s) sur 24 h`}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {protection.policies?.anti_duplicate ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)]/65 px-2 py-1 text-[9px] font-medium text-[var(--text-tertiary)]">
              <BadgeCheck className="h-3 w-3" /> Anti-doublon
            </span>
          ) : null}
          {protection.policies?.burst_control ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)]/65 px-2 py-1 text-[9px] font-medium text-[var(--text-tertiary)]">
              <Waves className="h-3 w-3" /> Anti-rafale
            </span>
          ) : null}
          {protection.policies?.verified_execution ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)]/65 px-2 py-1 text-[9px] font-medium text-[var(--text-tertiary)]">
              <ShieldCheck className="h-3 w-3" /> Exécution vérifiée
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
