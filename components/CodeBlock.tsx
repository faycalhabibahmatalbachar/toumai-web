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

/* ── Artefacts (mode coding) ────────────────────────────────────────────────
 * Le code HTML/SVG/JS généré par Toumaï AI s'exécute en direct dans un
 * aperçu sandboxé (iframe srcdoc, scripts isolés, aucun accès au site) —
 * l'esprit « HTML is the new markdown » : on ne lit pas le code, on le voit
 * fonctionner. */

const RUNNABLE = new Set(["html", "xml", "svg", "js", "javascript"]);

function isRunnable(language: string, code: string): boolean {
  const lang = (language || "").toLowerCase();
  if (!RUNNABLE.has(lang)) return false;
  if (lang === "xml") return /<(!DOCTYPE|html|body|svg)/i.test(code);
  return true;
}

/** Prépare le document exécutable selon le langage. */
function buildSrcDoc(language: string, code: string): string {
  const lang = (language || "").toLowerCase();
  if (lang === "svg" || (lang === "xml" && /<svg/i.test(code) && !/<html/i.test(code))) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff">${code}</body></html>`;
  }
  if (lang === "js" || lang === "javascript") {
    // Console visible dans l'aperçu : les console.log/error s'affichent.
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;font:14px/1.6 ui-monospace,Consolas,monospace;background:#111;color:#eee;padding:16px}
.log{white-space:pre-wrap;border-bottom:1px solid #2a2a2a;padding:4px 0}
.err{color:#ff7b6b}
</style></head><body>
<div id="__out"></div>
<script>
(function(){
  var out=document.getElementById('__out');
  function line(txt,cls){var d=document.createElement('div');d.className='log'+(cls?' '+cls:'');d.textContent=txt;out.appendChild(d);}
  ['log','info','warn'].forEach(function(k){var o=console[k].bind(console);console[k]=function(){o.apply(null,arguments);line(Array.prototype.map.call(arguments,function(a){try{return typeof a==='object'?JSON.stringify(a):String(a)}catch(e){return String(a)}}).join(' '));};});
  var oe=console.error.bind(console);console.error=function(){oe.apply(null,arguments);line(Array.prototype.map.call(arguments,String).join(' '),'err');};
  window.addEventListener('error',function(e){line(e.message,'err');});
})();
</script>
<script>${code.replace(/<\/script>/gi, "<\\/script>")}</script>
</body></html>`;
  }
  return code; // html complet ou fragment — le navigateur gère les deux
}

const EXT: Record<string, string> = { svg: "svg", js: "html", javascript: "html" };

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
    const ext = EXT[(language || "").toLowerCase()] ?? "html";
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
            aria-label="Relancer l'exécution"
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

export function CodeBlock({
  language,
  code,
  runnable = true,
}: {
  language: string;
  code: string;
  /** false : désactive le bouton Exécuter (ex. onglet Code de l'aperçu). */
  runnable?: boolean;
}) {
  ensureLanguages();
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const canRun = runnable && isRunnable(language, code);

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-center justify-between bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-tertiary)]">
        <span>{language || "text"}</span>
        <div className="flex items-center gap-1">
          {canRun && (
            <button
              onClick={() => setPreviewOpen(true)}
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
