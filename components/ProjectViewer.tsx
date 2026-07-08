"use client";

import { useEffect, useMemo, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { publishSite } from "@/lib/sites-api";
import {
  assembleForPreview,
  buildTree,
  entryHtml,
  parseProject,
  type ProjectFile,
  type TreeNode,
} from "@/lib/project-parser";

/** Carte compacte affichée dans le fil de conversation quand l'IA a produit un
 * projet multi-fichiers. Un clic ouvre l'IDE plein écran. */
export function ProjectCard({ content, onSuggest }: { content: string; onSuggest?: (t: string) => void }) {
  const files = useMemo(() => parseProject(content), [content]);
  const [open, setOpen] = useState(false);
  if (files.length < 2) return null;

  const langs = [...new Set(files.map((f) => f.lang))];
  return (
    <div className="my-2">
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--primary)]/50"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
          aria-hidden="true"
        >
          <FolderIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Projet — {files.length} fichiers</p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {langs.join(" · ")} · cliquez pour ouvrir l&apos;éditeur et l&apos;aperçu
          </p>
        </div>
        <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
          Ouvrir
        </span>
      </button>
      {open && <ProjectIDE files={files} onClose={() => setOpen(false)} onSuggest={onSuggest} />}
    </div>
  );
}

/** IDE plein écran : explorateur (arborescence) · éditeur · aperçu assemblé. */
function ProjectIDE({
  files,
  onClose,
  onSuggest,
}: {
  files: ProjectFile[];
  onClose: () => void;
  onSuggest?: (t: string) => void;
}) {
  const tree = useMemo(() => buildTree(files), [files]);
  const entry = entryHtml(files);
  const [activePath, setActivePath] = useState<string>(entry?.path || files[0].path);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Page HTML actuellement affichée dans l'aperçu (navigation entre sous-pages).
  const [previewPage, setPreviewPage] = useState<string>(entry?.path || "");

  // Navigation entre sous-pages : l'aperçu poste le chemin cliqué, on l'affiche.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const nav = (e.data && (e.data as { __toumaiNav?: string }).__toumaiNav) || "";
      if (!nav) return;
      const target = files.find(
        (f) => f.path === nav || f.path.endsWith("/" + nav) || f.path.split("/").pop() === nav,
      );
      if (target) setPreviewPage(target.path);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [files]);

  const active = files.find((f) => f.path === activePath) || files[0];
  const assembled = useMemo(() => assembleForPreview(files, previewPage), [files, previewPage]);

  async function publish() {
    setPublishing(true);
    try {
      const title = (assembled.match(/<title>([^<]{1,80})<\/title>/i)?.[1] || "Mon projet").trim();
      const { path } = await publishSite(assembled, title);
      setPublishedUrl(`${window.location.origin}${path}`);
    } catch {
      /* silencieux : bouton reste dispo */
    } finally {
      setPublishing(false);
    }
  }

  function download() {
    const blob = new Blob([assembled], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "toumai-projet.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyUrl() {
    if (!publishedUrl) return;
    await navigator.clipboard.writeText(publishedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]">
      {/* Barre supérieure */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <button
          onClick={onClose}
          aria-label="Fermer l'éditeur"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
        >
          <CloseIcon />
        </button>
        <span className="text-sm font-semibold">Projet Toumaï AI</span>
        <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--text-tertiary)]">
          {files.length} fichiers
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5">
            {(["preview", "code"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="rounded-md px-3 py-1 text-xs font-medium transition"
                style={tab === t ? { background: "var(--surface)", color: "var(--text-primary)" } : { color: "var(--text-tertiary)" }}
              >
                {t === "preview" ? "Aperçu" : "Code"}
              </button>
            ))}
          </div>
          {publishedUrl ? (
            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium transition hover:bg-[var(--hover)]"
              style={{ color: "var(--success)" }}
            >
              <LinkIcon />
              {copied ? "Lien copié" : "En ligne"}
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={publishing}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              <GlobeIcon />
              {publishing ? "Publication…" : "Publier"}
            </button>
          )}
          <button
            onClick={download}
            title="Télécharger (HTML autonome)"
            aria-label="Télécharger"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            <DownloadIcon />
          </button>
        </div>
      </div>

      {publishedUrl && (
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-4 py-2 text-xs">
          <GlobeIcon />
          <span className="text-[var(--text-secondary)]">En ligne :</span>
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="truncate font-semibold" style={{ color: "var(--primary)" }}>
            {publishedUrl.replace(/^https?:\/\//, "")}
          </a>
        </div>
      )}

      {/* Corps : explorateur | contenu */}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 overflow-auto border-r border-[var(--border)] bg-[var(--surface)] py-2 sm:block">
          <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Explorateur
          </p>
          <FileTree nodes={tree} activePath={activePath} onSelect={setActivePath} depth={0} />
        </aside>

        <div className="min-w-0 flex-1">
          {tab === "preview" ? (
            <iframe
              title="Aperçu du projet"
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              srcDoc={assembled}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="h-full overflow-auto p-3">
              <p className="mb-2 font-mono text-xs text-[var(--text-tertiary)]">{active.path}</p>
              <CodeBlock language={active.lang} code={active.content} runnable={false} />
            </div>
          )}
        </div>
      </div>

      {onSuggest && (
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--border)] px-4 py-2">
          {[
            { l: "🎨 Autre palette", p: "adopte une palette de couleurs plus premium." },
            { l: "📱 Responsive", p: "améliore le responsive mobile de tout le projet." },
            { l: "✨ Animations", p: "ajoute des animations et transitions fluides." },
            { l: "➕ Nouvelle page", p: "ajoute une nouvelle page cohérente." },
          ].map((raw) => ({
            l: raw.l,
            p:
              "Reprends EXACTEMENT le projet multi-fichiers que tu viens de créer et modifie-le SANS repartir de zéro (garde tous les fichiers existants). Modification : " +
              raw.p +
              " Renvoie TOUS les fichiers du projet mis à jour (chaque bloc avec son title=\"chemin\").",
          })).map((s) => (
            <button
              key={s.l}
              onClick={() => {
                onSuggest(s.p);
                onClose();
              }}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--primary)]/60 hover:text-[var(--text-primary)]"
            >
              {s.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FileTree({
  nodes,
  activePath,
  onSelect,
  depth,
}: {
  nodes: TreeNode[];
  activePath: string;
  onSelect: (p: string) => void;
  depth: number;
}) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.path}>
          {n.isDir ? (
            <>
              <div
                className="flex items-center gap-1.5 px-3 py-1 text-[13px] text-[var(--text-secondary)]"
                style={{ paddingLeft: 12 + depth * 12 }}
              >
                <FolderIcon small />
                {n.name}
              </div>
              {n.children && <FileTree nodes={n.children} activePath={activePath} onSelect={onSelect} depth={depth + 1} />}
            </>
          ) : (
            <button
              onClick={() => onSelect(n.path)}
              className="flex w-full items-center gap-1.5 px-3 py-1 text-left text-[13px] transition hover:bg-[var(--hover)]"
              style={{
                paddingLeft: 12 + depth * 12,
                background: activePath === n.path ? "color-mix(in srgb, var(--primary) 12%, transparent)" : undefined,
                color: activePath === n.path ? "var(--primary)" : "var(--text-secondary)",
              }}
            >
              <FileIcon />
              {n.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Icônes ---------- */
function FolderIcon({ small }: { small?: boolean }) {
  const s = small ? 14 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" strokeLinejoin="round" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
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
function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" strokeLinecap="round" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" strokeLinecap="round" strokeLinejoin="round" />
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
