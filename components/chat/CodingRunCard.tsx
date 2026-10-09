"use client";

import {
  AlertTriangle,
  Check,
  Circle,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type {
  CodingProjectResult,
  CodingRunSnapshot,
} from "@/lib/chat-stream";
import { codingEvidenceStateLabel, redactSensitiveText } from "@/lib/code-evidence";

const PHASES = [
  { id: "plan", label: "Plan", agents: ["architect", "repo_explorer"] },
  { id: "research", label: "Recherche", agents: ["research"] },
  { id: "build", label: "Build", agents: ["database", "backend", "frontend"] },
  { id: "verify", label: "Tests", agents: ["tester", "security"] },
  { id: "repair", label: "Repair", agents: ["debugger"] },
  { id: "review", label: "Review", agents: ["reviewer"] },
  { id: "release", label: "Deploy", agents: ["release"] },
] as const;

const AGENT_LABELS: Record<string, string> = {
  architect: "Architecte",
  research: "Recherche",
  repo_explorer: "Exploration du dépôt",
  database: "Base de données",
  backend: "Backend",
  frontend: "Frontend",
  tester: "Tests & QA",
  debugger: "Debug",
  security: "Sécurité",
  reviewer: "Review",
  release: "Release",
};

function phaseRank(phase?: string): number {
  if (phase === "package") return 5;
  if (phase === "done") return PHASES.length;
  const index = PHASES.findIndex((item) => item.id === phase);
  return index < 0 ? 0 : index;
}

function stackSummary(stack?: Record<string, unknown>): string {
  if (!stack) return "";
  return Object.entries(stack)
    .filter(([, value]) => typeof value === "string" && value)
    .map(([key, value]) => key + ": " + String(value))
    .join(" · ");
}

function bytesLabel(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes)) return "";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

function ProofLine({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state?: string;
}) {
  const normalized = (state || "").toLowerCase();
  const stateClass = ["passed", "success", "done"].includes(normalized)
    ? "text-[var(--success)]"
    : ["failed", "error", "blocked"].includes(normalized)
      ? "text-[var(--error)]"
      : normalized === "running"
        ? "text-[var(--primary)]"
        : "text-[var(--text-tertiary)]";

  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--hover)]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">{label}</span>
      <span className={"min-w-0 break-words text-[10.5px] leading-4 " + stateClass}>{value}</span>
    </div>
  );
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
  const currentAgent = run.current_agent
    ? AGENT_LABELS[run.current_agent] || run.current_agent
    : "Aucun agent actif publié";
  const stack = stackSummary(run.stack || project?.stack);

  const stage =
    run.agent_plan?.stages?.find((item) => item.id === run.phase) ||
    run.agent_plan?.stages?.[0];
  const plannedAgents = new Set<string>();
  for (const item of run.agent_plan?.stages ?? []) {
    for (const agent of item.agents ?? []) plannedAgents.add(agent);
  }
  for (const agent of run.agents ?? []) plannedAgents.add(agent.label || agent.id);
  if (run.current_agent) {
    plannedAgents.add(AGENT_LABELS[run.current_agent] || run.current_agent);
  }

  const tasks = run.tasks ?? [];
  const tasksDone = tasks.filter((task) =>
    ["passed", "success", "done"].includes((task.status || "").toLowerCase()),
  ).length;
  const tasksFailed = tasks.filter((task) =>
    ["failed", "error", "blocked"].includes((task.status || "").toLowerCase()),
  ).length;
  const latestValidation = run.validation_commands?.[run.validation_commands.length - 1];
  const latestTest = run.tests?.[run.tests.length - 1];
  const deployment = run.deployments?.[run.deployments.length - 1];

  const testValue = latestTest
    ? latestTest.name +
      " · " +
      codingEvidenceStateLabel(
        latestTest.status ||
          (latestTest.passed === true
            ? "passed"
            : latestTest.passed === false
              ? "failed"
              : undefined),
      )
    : run.dynamic_validation?.executed
      ? "Sandbox · " +
        (run.dynamic_validation.passed === true
          ? "Réussi"
          : run.dynamic_validation.passed === false
            ? "Échec"
            : "Résultat non publié")
      : latestValidation
        ? redactSensitiveText(latestValidation.command) +
          " · exit " +
          (latestValidation.exit_code ?? "?")
        : "Aucune exécution de test publiée";

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
              Toumaï Code
            </p>
            {run.project || project?.name ? (
              <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                {run.project || project?.name}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11.5px] leading-[17px] text-[var(--text-secondary)]">
            {run.label || (done ? "Run terminé" : "Run en cours")}
          </p>
          <p className="mt-1 text-[10.5px] text-[var(--text-tertiary)]">
            Agent actif :{" "}
            <span className="font-medium text-[var(--text-secondary)]">{currentAgent}</span>
            {total ? " · " + completed + "/" + total + " fichiers terminés" : ""}
            {failed ? " · " + failed + " échec(s)" : ""}
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
                ? "Vérifié · tests dynamiques publiés comme réussis"
                : qualityStatus === "static_passed"
                  ? "Audit statique publié comme validé · sandbox non exécuté"
                  : "À vérifier · " +
                    (quality?.errors ?? 0) +
                    " erreur(s), " +
                    (quality?.warnings ?? 0) +
                    " avertissement(s)"}
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
                        borderColor:
                          "color-mix(in srgb, var(--primary) 35%, var(--border))",
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

      <div className="space-y-0.5 px-2 py-2.5">
        <ProofLine
          label="Plan"
          value={
            stage?.goal ||
            (run.agent_plan?.stages?.length
              ? run.agent_plan.stages.length + " étape(s) publiée(s)"
              : "Aucun plan structuré publié")
          }
          state={run.phase === "plan" ? "running" : undefined}
        />
        <ProofLine
          label="Agents"
          value={plannedAgents.size ? [...plannedAgents].join(" · ") : "Aucun agent publié"}
          state={run.current_agent ? "running" : undefined}
        />
        <ProofLine
          label="Tâches"
          value={
            tasks.length
              ? tasksDone +
                "/" +
                tasks.length +
                " terminée(s)" +
                (tasksFailed ? " · " + tasksFailed + " en échec" : "")
              : "Aucune tâche structurée publiée"
          }
          state={
            tasksFailed
              ? "failed"
              : tasks.length && tasksDone === tasks.length
                ? "passed"
                : tasks.length
                  ? "running"
                  : undefined
          }
        />
        <ProofLine
          label="Fichier actif"
          value={run.current_file || "Aucun fichier actif publié"}
          state={run.current_file ? "running" : undefined}
        />
        <ProofLine
          label="Commands"
          value={
            run.current_command
              ? redactSensitiveText(run.current_command)
              : latestValidation?.command
                ? redactSensitiveText(latestValidation.command)
                : "Aucune commande publique publiée"
          }
          state={
            run.current_command
              ? "running"
              : latestValidation?.passed === true
                ? "passed"
                : latestValidation?.passed === false
                  ? "failed"
                  : undefined
          }
        />
        <ProofLine
          label="Tests"
          value={testValue}
          state={
            latestTest?.status ||
            (latestTest?.passed === true
              ? "passed"
              : latestTest?.passed === false
                ? "failed"
                : run.dynamic_validation?.passed === true
                  ? "passed"
                  : run.dynamic_validation?.passed === false
                    ? "failed"
                    : undefined)
          }
        />
        <ProofLine
          label="Repair loop"
          value={
            run.repairing || run.repair_loop
              ? "Tentative " +
                (run.repair_loop?.attempt ?? "?") +
                (run.repair_loop?.max_attempts
                  ? "/" + run.repair_loop.max_attempts
                  : "") +
                (run.repair_loop?.reason ? " · " + run.repair_loop.reason : "")
              : "Aucune réparation active publiée"
          }
          state={run.repair_loop?.status || (run.repairing ? "running" : undefined)}
        />
        <ProofLine
          label="Security"
          value={
            run.security
              ? run.security.summary || codingEvidenceStateLabel(run.security.status)
              : "Aucun rapport sécurité publié"
          }
          state={run.security?.status}
        />
        <ProofLine
          label="Review"
          value={
            run.review
              ? run.review.summary || codingEvidenceStateLabel(run.review.status)
              : "Aucune review publiée"
          }
          state={run.review?.status}
        />
        <ProofLine
          label="Deployment"
          value={
            deployment
              ? [
                  deployment.environment,
                  deployment.provider,
                  codingEvidenceStateLabel(deployment.status),
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Aucun déploiement publié"
          }
          state={deployment?.status}
        />
      </div>

      {stack ? (
        <p className="border-t border-[var(--border)] px-4 py-2 text-[10.5px] leading-[16px] text-[var(--text-tertiary)]">
          {stack}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-4 py-3">
        {onOpenWorkspace ? (
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="rounded-full px-3.5 py-2 text-[11.5px] font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Ouvrir Workspace Code
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
            Télécharger{artifactSize ? " · " + bytesLabel(artifactSize) : ""}
          </a>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[9.5px] text-[var(--text-tertiary)]">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Actions et preuves publiques uniquement
        </span>
      </div>
    </section>
  );
}
