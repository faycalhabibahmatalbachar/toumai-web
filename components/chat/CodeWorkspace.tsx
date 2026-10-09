"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Monitor,
  Package,
  Rocket,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";
import type { CodingAgentEvidence, CodingArtifactEvidence, CodingProjectResult, CodingRunSnapshot } from "@/lib/chat-stream";
import { codingEvidenceStateLabel, redactSensitiveText } from "@/lib/code-evidence";

type CodeWorkspaceTab =
  | "files"
  | "diff"
  | "terminal"
  | "tests"
  | "preview"
  | "browser"
  | "security"
  | "agents"
  | "artifacts"
  | "deployments";

const TAB_DEFS = [
  { id: "files", label: "Files", icon: FileText },
  { id: "diff", label: "Diff", icon: Activity },
  { id: "terminal", label: "Terminal logs", icon: Terminal },
  { id: "tests", label: "Tests", icon: ShieldCheck },
  { id: "preview", label: "Preview", icon: Monitor },
  { id: "browser", label: "Browser screenshot", icon: ImageIcon },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "agents", label: "Agents", icon: Users },
  { id: "artifacts", label: "Artifacts", icon: Package },
  { id: "deployments", label: "Deployments", icon: Rocket },
] as const;

function safeHttpUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function EmptyEvidence({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] px-4 py-6 text-center text-[11.5px] leading-5 text-[var(--text-tertiary)]">
      {children}
    </div>
  );
}

function statusClass(state?: string | null): string {
  const normalized = (state || "").toLowerCase();
  if (["passed", "success", "done"].includes(normalized)) return "text-[var(--success)]";
  if (["failed", "error", "blocked"].includes(normalized)) return "text-[var(--error)]";
  if (normalized === "running") return "text-[var(--primary)]";
  return "text-[var(--text-tertiary)]";
}

export function CodeWorkspace({
  run,
  project,
}: {
  run?: CodingRunSnapshot;
  project?: CodingProjectResult;
}) {
  const [tab, setTab] = useState<CodeWorkspaceTab>("files");

  const files = useMemo(() => {
    const ordered = [
      run?.current_file,
      ...(run?.completed_files ?? []),
      ...(run?.failed_files ?? []),
      ...(project?.files ?? []),
    ].filter((value): value is string => Boolean(value));

    return [...new Set(ordered)].map((path) => ({
      path,
      state:
        path === run?.current_file
          ? "running"
          : run?.failed_files?.includes(path)
            ? "failed"
            : run?.completed_files?.includes(path)
              ? "passed"
              : "unknown",
    }));
  }, [project?.files, run?.completed_files, run?.current_file, run?.failed_files]);

  const agents = useMemo<CodingAgentEvidence[]>(() => {
    if (run?.agents?.length) return run.agents;

    const planned = new Set<string>();
    for (const stage of run?.agent_plan?.stages ?? []) {
      for (const agent of stage.agents ?? []) planned.add(agent);
    }
    if (run?.current_agent) planned.add(run.current_agent);

    return [...planned].map((id) => ({
      id,
      label: id,
      status: id === run?.current_agent ? "running" : "planned",
    }));
  }, [run]);

  const previewUrl = safeHttpUrl(run?.preview?.url);
  const browserScreenshot = safeHttpUrl(
    run?.preview?.screenshot_url || run?.browser_screenshot_url,
  );

  const artifacts: CodingArtifactEvidence[] = [
    ...(run?.artifacts ?? []),
    ...(run?.artifact?.download_url
      ? [
          {
            name: run.artifact.name || project?.name || "Artifact",
            kind: "bundle",
            url: run.artifact.download_url,
            size_bytes: run.artifact.zip_size_bytes,
          },
        ]
      : []),
    ...(!run?.artifact?.download_url && project?.download_url
      ? [
          {
            name: project.name || "Artifact",
            kind: "bundle",
            url: project.download_url,
            size_bytes: project.zip_size_bytes,
          },
        ]
      : []),
  ];

  const terminalCount =
    (run?.terminal_logs?.length ?? 0) +
    (run?.validation_commands?.length ?? 0) +
    (run?.current_command ? 1 : 0);
  const testCount =
    (run?.tests?.length ?? 0) +
    (run?.dynamic_validation?.commands?.length ?? 0);

  function tabCount(id: CodeWorkspaceTab): number {
    switch (id) {
      case "files": return files.length;
      case "diff": return run?.diffs?.length ?? 0;
      case "terminal": return terminalCount;
      case "tests": return testCount;
      case "preview": return previewUrl ? 1 : 0;
      case "browser": return browserScreenshot ? 1 : 0;
      case "security": return run?.security?.findings?.length ?? 0;
      case "agents": return agents.length;
      case "artifacts": return artifacts.length;
      case "deployments": return run?.deployments?.length ?? 0;
    }
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-[var(--surface)]"
      aria-label="Toumaï Code Workspace"
    >
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border)] px-3 py-2">
        {TAB_DEFS.map(({ id, label, icon: Icon }) => {
          const count = tabCount(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              data-active={tab === id}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] data-[active=true]:bg-[var(--hover)] data-[active=true]:text-[var(--text-primary)]"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
              {count ? (
                <span className="rounded-full bg-[var(--card)] px-1.5 py-0.5 text-[9.5px] text-[var(--text-tertiary)]">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {tab === "files" ? (
          files.length ? (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <FileText
                    className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]"
                    aria-hidden="true"
                  />
                  <code className="min-w-0 flex-1 break-all text-[11.5px] text-[var(--text-secondary)]">
                    {file.path}
                  </code>
                  <span className={"shrink-0 text-[10.5px] font-medium " + statusClass(file.state)}>
                    {codingEvidenceStateLabel(file.state)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyEvidence>Aucun fichier publié par l’exécuteur.</EmptyEvidence>
          )
        ) : null}

        {tab === "diff" ? (
          run?.diffs?.length ? (
            <div className="space-y-3">
              {run.diffs.map((diff, index) => (
                <article
                  key={(diff.path || "diff") + "-" + index}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]"
                >
                  <header className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-3 py-2">
                    <code className="min-w-0 flex-1 break-all text-[11px] text-[var(--text-secondary)]">
                      {diff.path}
                    </code>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {diff.status || "diff"}
                      {typeof diff.additions === "number" ? " · +" + diff.additions : ""}
                      {typeof diff.deletions === "number" ? " · -" + diff.deletions : ""}
                    </span>
                  </header>
                  {diff.patch ? (
                    <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[10.5px] leading-5 text-[var(--text-secondary)]">
                      {redactSensitiveText(diff.patch)}
                    </pre>
                  ) : (
                    <p className="p-3 text-[11px] text-[var(--text-tertiary)]">
                      Patch non publié.
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyEvidence>Aucun diff public publié pour ce run.</EmptyEvidence>
          )
        ) : null}

        {tab === "terminal" ? (
          terminalCount ? (
            <div className="space-y-2 font-mono">
              {run?.current_command ? (
                <pre className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[#0d0d0f] p-3 text-[10.5px] leading-5 text-[#c9c6be]">
                  {"$ " + redactSensitiveText(run.current_command)}
                </pre>
              ) : null}
              {(run?.validation_commands ?? []).map((command, index) => (
                <div
                  key={command.id || index}
                  className="rounded-xl border border-[var(--border)] bg-[#0d0d0f] p-3 text-[10.5px] text-[#c9c6be]"
                >
                  <pre className="overflow-x-auto whitespace-pre-wrap">
                    {"$ " + redactSensitiveText(command.command)}
                  </pre>
                  <p className="mt-2 text-[10px] text-[#8d887f]">
                    exit {command.exit_code ?? "?"} ·{" "}
                    {command.passed === true
                      ? "passed"
                      : command.passed === false
                        ? "failed"
                        : "pending"}
                  </p>
                </div>
              ))}
              {(run?.terminal_logs ?? []).map((entry, index) => (
                <pre
                  key={entry.id || index}
                  className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[#0d0d0f] p-3 text-[10.5px] leading-5 text-[#c9c6be]"
                >
                  {redactSensitiveText(entry.text)}
                </pre>
              ))}
            </div>
          ) : (
            <EmptyEvidence>Aucun log terminal public publié.</EmptyEvidence>
          )
        ) : null}

        {tab === "tests" ? (
          testCount ? (
            <div className="space-y-2">
              {(run?.tests ?? []).map((test, index) => (
                <article
                  key={test.id || index}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {test.name}
                      </p>
                      {test.command ? (
                        <code className="mt-1 block break-all text-[10.5px] text-[var(--text-tertiary)]">
                          {redactSensitiveText(test.command)}
                        </code>
                      ) : null}
                    </div>
                    <span
                      className={
                        "text-[10.5px] font-medium " +
                        statusClass(
                          test.status ||
                            (test.passed === true
                              ? "passed"
                              : test.passed === false
                                ? "failed"
                                : ""),
                        )
                      }
                    >
                      {codingEvidenceStateLabel(
                        test.status ||
                          (test.passed === true
                            ? "passed"
                            : test.passed === false
                              ? "failed"
                              : undefined),
                      )}
                    </span>
                  </div>
                  {test.output ? (
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#0d0d0f] p-2.5 font-mono text-[10px] leading-5 text-[#c9c6be]">
                      {redactSensitiveText(test.output)}
                    </pre>
                  ) : null}
                </article>
              ))}
              {(run?.dynamic_validation?.commands ?? []).map((test, index) => (
                <article
                  key={test.id || index}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <p className="text-[11.5px] font-semibold text-[var(--text-primary)]">
                    Sandbox validation
                  </p>
                  <code className="mt-1 block break-all text-[10.5px] text-[var(--text-tertiary)]">
                    {redactSensitiveText(test.command)}
                  </code>
                  <p
                    className={
                      "mt-1 text-[10.5px] " +
                      statusClass(
                        test.passed === true
                          ? "passed"
                          : test.passed === false
                            ? "failed"
                            : undefined,
                      )
                    }
                  >
                    exit {test.exit_code ?? "?"} ·{" "}
                    {test.passed === true
                      ? "Réussi"
                      : test.passed === false
                        ? "Échec"
                        : "Résultat non publié"}
                  </p>
                  {test.output ? (
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#0d0d0f] p-2.5 font-mono text-[10px] leading-5 text-[#c9c6be]">
                      {redactSensitiveText(test.output)}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyEvidence>
              Aucune exécution de test publiée. Aucun succès n’est supposé.
            </EmptyEvidence>
          )
        ) : null}

        {tab === "preview" ? (
          previewUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    "text-[10.5px] font-medium " +
                    statusClass(run?.preview?.status)
                  }
                >
                  {codingEvidenceStateLabel(run?.preview?.status)}
                </span>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--primary)]"
                >
                  Ouvrir
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
              <iframe
                title="Preview isolée Toumaï Code"
                src={previewUrl}
                sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts"
                referrerPolicy="no-referrer"
                className="h-[65vh] min-h-[28rem] w-full rounded-xl border border-[var(--border)] bg-white"
              />
            </div>
          ) : (
            <EmptyEvidence>Aucune URL de preview isolée publiée.</EmptyEvidence>
          )
        ) : null}

        {tab === "browser" ? (
          browserScreenshot ? (
            <a
              href={browserScreenshot}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={browserScreenshot}
                alt="Capture navigateur publiée par Toumaï Code"
                className="h-auto w-full rounded-xl border border-[var(--border)] object-contain"
              />
            </a>
          ) : (
            <EmptyEvidence>Aucune capture navigateur publiée.</EmptyEvidence>
          )
        ) : null}

        {tab === "security" ? (
          run?.security ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                <p
                  className={
                    "text-[11.5px] font-semibold " +
                    statusClass(run.security.status)
                  }
                >
                  {codingEvidenceStateLabel(run.security.status)}
                </p>
                {run.security.summary ? (
                  <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
                    {run.security.summary}
                  </p>
                ) : null}
              </div>
              {(run.security.checks ?? []).map((check, index) => (
                <div
                  key={check.id || index}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="flex gap-2">
                    <p className="min-w-0 flex-1 text-[11.5px] font-medium text-[var(--text-primary)]">
                      {check.label}
                    </p>
                    <span className={"text-[10.5px] " + statusClass(check.status)}>
                      {codingEvidenceStateLabel(check.status)}
                    </span>
                  </div>
                  {check.detail ? (
                    <p className="mt-1 text-[10.5px] leading-5 text-[var(--text-tertiary)]">
                      {check.detail}
                    </p>
                  ) : null}
                </div>
              ))}
              {(run.security.findings ?? []).map((finding, index) => (
                <div
                  key={finding.id || index}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <p className="text-[11.5px] font-semibold text-[var(--text-primary)]">
                    {finding.title}
                  </p>
                  <p className="mt-1 text-[10.5px] text-[var(--text-tertiary)]">
                    {[finding.severity, finding.path].filter(Boolean).join(" · ")}
                  </p>
                  {finding.detail ? (
                    <p className="mt-1 text-[10.5px] leading-5 text-[var(--text-secondary)]">
                      {finding.detail}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyEvidence>Aucun rapport Security public publié.</EmptyEvidence>
          )
        ) : null}

        {tab === "agents" ? (
          agents.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <p className="text-[11.5px] font-semibold text-[var(--text-primary)]">
                    {agent.label || agent.id}
                  </p>
                  {agent.role ? (
                    <p className="mt-0.5 text-[10.5px] text-[var(--text-tertiary)]">
                      {agent.role}
                    </p>
                  ) : null}
                  <p className={"mt-2 text-[10.5px] font-medium " + statusClass(agent.status)}>
                    {codingEvidenceStateLabel(agent.status)}
                  </p>
                  {agent.detail ? (
                    <p className="mt-1 text-[10.5px] leading-5 text-[var(--text-secondary)]">
                      {agent.detail}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyEvidence>Aucun agent public publié pour ce run.</EmptyEvidence>
          )
        ) : null}

        {tab === "artifacts" ? (
          artifacts.length ? (
            <div className="space-y-2">
              {artifacts.map((artifact, index) => {
                const url = safeHttpUrl(artifact.url);
                return (
                  <div
                    key={artifact.name + "-" + index}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <Package
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-[11.5px] font-semibold text-[var(--text-primary)]">
                          {artifact.name}
                        </p>
                        <p className="mt-1 text-[10.5px] text-[var(--text-tertiary)]">
                          {[
                            artifact.kind,
                            artifact.sha256 ? "sha256 " + artifact.sha256 : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={"Ouvrir " + artifact.name}
                          className="text-[var(--primary)]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyEvidence>Aucun artifact public publié.</EmptyEvidence>
          )
        ) : null}

        {tab === "deployments" ? (
          run?.deployments?.length ? (
            <div className="space-y-2">
              {run.deployments.map((deployment, index) => {
                const url = safeHttpUrl(deployment.url);
                return (
                  <article
                    key={deployment.id || index}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <Rocket
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-semibold text-[var(--text-primary)]">
                          {deployment.environment || "Déploiement"}
                        </p>
                        <p className={"mt-1 text-[10.5px] font-medium " + statusClass(deployment.status)}>
                          {codingEvidenceStateLabel(deployment.status)}
                        </p>
                        <p className="mt-1 break-all text-[10.5px] text-[var(--text-tertiary)]">
                          {[deployment.provider, deployment.commit_sha]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {deployment.detail ? (
                          <p className="mt-1 text-[10.5px] leading-5 text-[var(--text-secondary)]">
                            {deployment.detail}
                          </p>
                        ) : null}
                      </div>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Ouvrir le déploiement"
                          className="text-[var(--primary)]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyEvidence>
              Aucun déploiement publié. Toumaï Code ne suppose jamais qu’un déploiement a réussi.
            </EmptyEvidence>
          )
        ) : null}
      </div>
    </section>
  );
}
