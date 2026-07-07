"use client";

import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import java from "highlight.js/lib/languages/java";
import yaml from "highlight.js/lib/languages/yaml";
import {
  isBrowserPython,
  isConsoleRunnable,
  isWebPreview,
  runPythonInBrowser,
  runViaBackend,
} from "@/lib/code-run";

let registered = false;
function ensureLanguages() {
  if (registered) return;
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("js", javascript);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("ts", typescript);
  hljs.registerLanguage("tsx", typescript);
  hljs.registerLanguage("jsx", javascript);
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("py", python);
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("sh", bash);
  hljs.registerLanguage("shell", bash);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("html", xml);
  hljs.registerLanguage("xml", xml);
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("sql", sql);
  hljs.registerLanguage("java", java);
  hljs.registerLanguage("yaml", yaml);
  hljs.registerLanguage("yml", yaml);
  registered = true;
}

/* ── Aperçu web (HTML/SVG) — iframe sandboxée plein écran ─────────────────── */

function buildSrcDoc(language: string, code: string): string {
  const lang = (language || "").toLowerCase();
  if (lang === "svg" || (lang === "xml" && /<svg/i.test(code) && !/<html/i.test(code))) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff">${code}</body></html>`;
  }
  return code; // html complet ou fragment — le navigateur gère les deux
}

function ArtifactPreview({
  language,
  code,
  onClose,
}: {
  language: string;
  code: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function download() {
    const ext = (language || "").toLowerCase() === "svg" ? "svg" : "html";
    const blob = new Blob([ext === "svg" ? code : buildSrcDoc(language, code)], {
      type: ext === "svg" ? "image/svg+xml" : "text/html",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toumai-artefact.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ background: "var(--primary)" }}
            aria-hidden="true"
          >
            <PlayIcon />
          </span>
          <span className="text-sm font-semibold">Artefact — {language || "html"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5">
            {(["preview", "code"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="rounded-md px-3 py-1 text-xs font-medium transition"
                style={
                  tab === t
                    ? { background: "var(--surface)", color: "var(--text-primary)" }
                    : { color: "var(--text-tertiary)" }
                }
              >
                {t === "preview" ? "Aperçu" : "Code"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRunKey((k) => k + 1)}
            title="Relancer"
            aria-label="Relancer l'aperçu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            <RefreshIcon />
          </button>
          <button
            onClick={download}
            title="Télécharger"
            aria-label="Télécharger l'artefact"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            <DownloadIcon />
          </button>
          <button
            onClick={onClose}
            title="Fermer"
            aria-label="Fermer l'aperçu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {tab === "preview" ? (
        <iframe
          key={runKey}
          title="Aperçu de l'artefact"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          srcDoc={buildSrcDoc(language, code)}
          className="w-full flex-1 border-0 bg-white"
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <CodeBlock language={language} code={code} runnable={false} />
        </div>
      )}
    </div>
  );
}

/* ── Exécuteur plein écran — code à gauche (masquable), Console à droite ──── */

interface OutLine {
  text: string;
  stream: "out" | "err" | "status";
}

function RunnerOverlay({
  language,
  code,
  onClose,
}: {
  language: string;
  code: string;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<OutLine[]>([]);
  const [running, setRunning] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function log(text: string, stream: OutLine["stream"]) {
    setLines((prev) => [...prev, { text, stream }]);
  }

  async function run() {
    if (running) return;
    setLines([]);
    setRunning(true);
    const t0 = performance.now();
    log("Exécution lancée", "status");
    try {
      if (isBrowserPython(language)) {
        log("Initialisation de l'environnement", "status");
        await runPythonInBrowser(code, (line, stream) => log(line, stream));
      } else {
        log("Exécution dans le sandbox distant", "status");
        const res = await runViaBackend(language, code);
        if (res.error) {
          log(res.error, "err");
        } else {
          if (res.output?.trim()) {
            // La sortie combinée est en erreur si SEUL stderr a produit du texte.
            const onlyErr = Boolean(res.stderr?.trim()) && res.output.trim() === res.stderr?.trim();
            log(res.output.replace(/\n$/, ""), onlyErr ? "err" : "out");
          } else {
            log("(aucune sortie)", "status");
          }
          if (typeof res.exitCode === "number" && res.exitCode !== 0) {
            log(`— code de sortie ${res.exitCode}`, "status");
          }
        }
      }
    } finally {
      log(`Exécution terminée en ${Math.round(performance.now() - t0)} ms`, "status");
      setRunning(false);
    }
  }

  // Lancement automatique à l'ouverture (une seule fois).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]">
      {/* Barre supérieure */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <button
          onClick={onClose}
          title="Fermer"
          aria-label="Fermer l'exécuteur"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
        >
          <CloseIcon />
        </button>
        <button
          onClick={() => setShowCode((s) => !s)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
        >
          <PanelIcon />
          {showCode ? "Masquer le code" : "Afficher le code"}
        </button>
        <span className="ml-auto text-xs text-[var(--text-tertiary)]">{language || "code"}</span>
      </div>

      {/* Corps : code | console */}
      <div className="flex min-h-0 flex-1">
        {showCode && (
          <div className="hidden min-w-0 flex-1 overflow-auto border-r border-[var(--border)] p-4 md:block">
            <CodeBlock language={language} code={code} runnable={false} />
          </div>
        )}
        <div className={`flex min-w-0 flex-1 flex-col p-4 ${showCode ? "md:max-w-[56%]" : ""}`}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
              <span className="text-sm font-semibold">Console</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLines([])}
                  title="Effacer la console"
                  aria-label="Effacer la console"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                >
                  <TrashIcon />
                </button>
                <button
                  onClick={run}
                  disabled={running}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-semibold transition hover:bg-[var(--hover)] disabled:opacity-50"
                >
                  <PlayIcon />
                  {running ? "Exécution…" : "Exécuter"}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
              {lines.map((l, i) => (
                <pre
                  key={i}
                  className="m-0 whitespace-pre-wrap break-words"
                  style={{
                    color:
                      l.stream === "err"
                        ? "var(--error)"
                        : l.stream === "status"
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                  }}
                >
                  {l.text}
                </pre>
              ))}
              {running && <span className="streaming-cursor" style={{ color: "var(--primary)" }}>▋</span>}
              <div ref={endRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Bloc de code ─────────────────────────────────────────────────────────── */

export function CodeBlock({
  language,
  code,
  runnable = true,
}: {
  language: string;
  code: string;
  /** false : désactive Exécuter/Aperçu (ex. onglet Code de l'aperçu). */
  runnable?: boolean;
}) {
  ensureLanguages();
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [runnerOpen, setRunnerOpen] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    try {
      const lang = language && hljs.getLanguage(language) ? language : undefined;
      const result = lang ? hljs.highlight(code, { language: lang }) : hljs.highlightAuto(code);
      ref.current.innerHTML = result.value;
    } catch {
      if (ref.current) ref.current.textContent = code;
    }
  }, [code, language]);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const webPreview = runnable && isWebPreview(language, code);
  const consoleRun = runnable && !webPreview && isConsoleRunnable(language);

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-center justify-between bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-tertiary)]">
        <span>{language || "text"}</span>
        <div className="flex items-center gap-1">
          {webPreview && (
            <button
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-1.5 rounded px-2 py-0.5 font-semibold transition hover:bg-[var(--hover)]"
              style={{ color: "var(--primary)" }}
            >
              <PlayIcon />
              Aperçu
            </button>
          )}
          {consoleRun && (
            <button
              onClick={() => setRunnerOpen(true)}
              className="flex items-center gap-1.5 rounded px-2 py-0.5 font-semibold transition hover:bg-[var(--hover)]"
              style={{ color: "var(--primary)" }}
            >
              <PlayIcon />
              Exécuter
            </button>
          )}
          <button
            onClick={copy}
            className="rounded px-2 py-0.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      </div>
      <pre className="m-0 overflow-x-auto bg-[var(--surface)] p-3">
        <code ref={ref} className={`hljs language-${language || "plaintext"} text-[13px]`}>
          {code}
        </code>
      </pre>
      {runnerOpen && (
        <RunnerOverlay language={language} code={code} onClose={() => setRunnerOpen(false)} />
      )}
      {previewOpen && (
        <ArtifactPreview language={language} code={code} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}

/* ---------- Icônes ---------- */

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5-13-7.5z" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M10 4v16" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12M6 11l6 6 6-6M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
