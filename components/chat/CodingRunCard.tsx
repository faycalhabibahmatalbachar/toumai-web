"use client";

import {
  AlertTriangle,
  Check,
  Circle,
  Download,
  Loader2,
} from "lucide-react";
import type {
  CodingProjectResult,
  CodingRunSnapshot,
} from "@/lib/chat-stream";

const PHASES = [
  { id: "plan", label: "Architecture", agents: ["architect", "repo_explorer"] },
  { id: "research", label: "Recherche", agents: ["research"] },
  { id: "build", label: "Construction", agents: ["database", "backend", "frontend"] },
  { id: "verify", label: "Tests & sécurité", agents: ["tester", "security"] },
  { id: "repair", label: "Debug & Repair", agents: ["debugger", "repair"] },
  { id: "review", label: "Review", agents: ["reviewer"] },
  { id: "release", label: "Release", agents: ["release"] },
] as const;

const AGENT_LABELS: Record<string, string> = {
  architect: "Architecte",
  research: "Recherche",
  repo_explorer: "Exploration du dépôt",
  database: "Base de données",
  backend: "Backend",
  frontend: "Frontend",
  tester: "Tests & QA",
  debugger: "Debugger",
  repair: "Repair",
  security: "Sécurité",
  reviewer: "Review",
  release: "Release",
};

function phaseRank(phase?: string): number {
  if (phase === "package") return 5;
  if (phase === "done") return PHASES.length;
  return Math.max(0, PHASES.findIndex((item) => item.id === phase));
}

function stackSummary(stack?: Record<string, unknown>): string {
  if (!stack) return "";
  return Object.entries(stack)
    .filter(([, value]) => typeof value === "string" && value)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function bytesLabel(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function CodingRunCard({
  run,
  project,
  onOpenWorkspace,
}: {
  run: CodingRunSnapshot;
  project?: CodingProjectResult;
  onOpenWorkspace?: () => void;
}) {
  const completed = run.completed_files?.length ?? 0;
  const failed = run.failed_files?.length ?? 0;
  const total = run.file_count ?? project?.files?.length ?? 0;
  const rank = phaseRank(run.phase);
  const done = run.phase === "done" || Boolean(project?.download_url);
  const errored = run.phase === "error";
  const artifactUrl = run.artifact?.download_url || project?.download_url;
  const artifactSize = run.artifact?.zip_size_bytes || project?.zip_size_bytes;
  const qualityStatus = run.quality_status || project?.quality_status;
  const quality = run.quality || project?.quality;
  const debugCycle = run.debug_cycle || project?.debug_cycle;
  const currentAgent = run.current_agent
    ? AGENT_LABELS[run.current_agent] || run.current_agent
    : "Toumaï Coding Agent";
  const stack = stackSummary(run.stack || project?.stack);

  return (
    <section
      className="coding-run-card my-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
      role="status"
      aria-live="polite"
      aria-busy={Boolean(run.active)}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: errored
              ? "color-mix(in srgb, var(--error) 14%, transparent)"
              : "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: errored ? "var(--error)" : "var(--primary)",
          }}
        >
          {errored ? (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ) : run.active ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              Toumaï Coding Agent
            </p>
            {run.project || project?.name ? (
              <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                {run.project || project?.name}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11.5px] leading-[17px] text-[var(--text-secondary)]">
            {run.label || (done ? "Projet prêt" : "Travail en cours")}
          </p>
          <p className="mt-1 text-[10.5px] text-[var(--text-tertiary)]">
            Agent actif : <span className="font-medium text-[var(--text-secondary)]">{currentAgent}</span>
            {total ? ` · ${completed}/${total} fichiers terminés` : ""}
            {failed ? ` · ${failed} échec(s)` : ""}
          </p>
          {qualityStatus ? (
            <p
              className="mt-1 text-[10.5px] font-medium"
              style={{
                color:
                  qualityStatus === "verified" || qualityStatus === "static_passed"
                    ? "var(--success)"
                    : "var(--thinking)",
              }}
            >
              {qualityStatus === "verified"
                ? "Vérifié · tests dynamiques réussis"
                : qualityStatus === "static_passed"
                  ? "Audit statique validé · sandbox non exécuté"
                  : `À vérifier · ${quality?.errors ?? 0} erreur(s), ${quality?.warnings ?? 0} avertissement(s)`}
            </p>
          ) : null}
          {debugCycle?.status === "escalated" ? (
            <p className="mt-1 text-[10.5px] font-medium text-[var(--thinking)]">
              Escalade requise · {debugCycle.attempts}/{debugCycle.max_attempts} correction(s)
              {debugCycle.escalation_reason ? ` · ${debugCycle.escalation_reason}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-y border-[var(--border)] px-3 py-2.5">
        <div className="flex min-w-max gap-1.5 overflow-x-auto pb-0.5">
          {PHASES.map((phase, index) => {
            const isCurrent =
              run.phase === phase.id ||
              (run.phase === "package" && phase.id === "release");
            const isDone = done || index < rank;
            return (
              <div
                key={phase.id}
                className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 text-[10.5px] font-medium"
                style={
                  isCurrent
                    ? {
                        color: "var(--primary)",
                        background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                        borderColor: "color-mix(in srgb, var(--primary) 35%, var(--border))",
                      }
                    : isDone
                      ? { color: "var(--success)" }
                      : { color: "var(--text-tertiary)" }
                }
              >
                {isDone ? (
                  <Check className="h-3 w-3" aria-hidden="true" />
                ) : isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Circle className="h-2.5 w-2.5" aria-hidden="true" />
                )}
                {phase.label}
              </div>
            );
          })}
        </div>
      </div>

      {(run.current_file || run.current_command || stack) && (
        <div className="space-y-2 px-4 py-3">
          {run.current_file ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {run.repairing ? "Correction en cours" : "Fichier en cours"}
              </p>
              <p className="mt-1 break-all rounded-lg bg-[var(--background)] px-2.5 py-2 font-mono text-[10.5px] text-[var(--text-secondary)]">
                {run.current_file}
              </p>
            </div>
          ) : null}
          {run.current_command ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                Commande de validation
              </p>
              <p className="mt-1 break-all rounded-lg bg-[#0d0d0f] px-2.5 py-2 font-mono text-[10.5px] text-[#c9c6be]">
                {run.current_command}
              </p>
            </div>
          ) : null}
          {stack ? (
            <p className="line-clamp-2 text-[10.5px] leading-[16px] text-[var(--text-tertiary)]">
              {stack}
            </p>
          ) : null}
        </div>
      )}

      {(done || errored) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-4 py-3">
          {onOpenWorkspace ? (
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="rounded-full px-3.5 py-2 text-[11.5px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Ouvrir le Workspace
            </button>
          ) : null}
          {artifactUrl ? (
            <a
              href={artifactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-[11.5px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Télécharger{artifactSize ? ` · ${bytesLabel(artifactSize)}` : ""}
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
}
