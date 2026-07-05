"use client";

import { type ReactNode } from "react";

export type ConnectorStatus = "connected" | "disconnected" | "pending" | "loading" | "unavailable";

const STATUS_LABEL: Record<ConnectorStatus, string> = {
  connected: "Connecté",
  disconnected: "Non connecté",
  pending: "En attente",
  loading: "Vérification…",
  unavailable: "Indisponible",
};

const STATUS_COLOR: Record<ConnectorStatus, string> = {
  connected: "var(--success)",
  disconnected: "var(--text-tertiary)",
  pending: "#f59e0b",
  loading: "var(--text-tertiary)",
  unavailable: "var(--text-tertiary)",
};

function timeAgo(date: Date): string {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.round(hours / 24)}j`;
}

/** Carte de connecteur générique — statut vivant + zone d'action libre.
 * Chaque nouvel outil (Notion, Slack…) devient simplement une carte de plus. */
export function ConnectorCard({
  icon,
  name,
  description,
  status,
  lastChecked,
  children,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  status: ConnectorStatus;
  lastChecked?: Date;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition hover:border-[var(--primary)]/40">
      <div className="mb-3.5 flex items-start justify-between gap-2">
        {/* Tuile logo — fond blanc constant pour que les logos de marque
            (Google, Gmail, WhatsApp…) restent fidèles dans les deux thèmes. */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ background: "#ffffff", border: "1px solid var(--border)" }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="text-right">
          <span className="flex items-center justify-end gap-1 text-xs" style={{ color: STATUS_COLOR[status] }}>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: STATUS_COLOR[status] }}
              aria-hidden="true"
            />
            {STATUS_LABEL[status]}
          </span>
          {lastChecked && (
            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
              Vérifié {timeAgo(lastChecked)}
            </p>
          )}
        </div>
      </div>
      <p className="text-[15px] font-semibold">{name}</p>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
