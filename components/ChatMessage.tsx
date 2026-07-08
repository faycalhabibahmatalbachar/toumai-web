"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { confirmToolAction, sendFeedback } from "@/lib/chat-api";
import type { ToolConfirmation } from "@/lib/chat-stream";
import { CodeBlock } from "./CodeBlock";
import { SiteBuildingCard, SiteArtifactCard, extractHtml } from "./SiteBuilder";
import { ProjectCard } from "./ProjectViewer";
import { parseProject } from "@/lib/project-parser";

/** Détecte un bloc ```html en cours d'écriture (ouvert mais pas encore fermé)
 * dans un message en streaming — renvoie le code déjà reçu, ou null. */
function pendingHtmlCode(content: string): string | null {
  const m = content.match(/```html[^\n]*\n?/i);
  if (!m || m.index === undefined) return null;
  const after = content.slice(m.index + m[0].length);
  if (after.includes("```")) return null; // bloc déjà fermé
  return after;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  /** Présent une fois le message persisté côté backend — nécessaire pour le feedback. */
  serverId?: string;
  imageUrls?: string[];
  /** Action sensible en attente (WhatsApp, mail…) — affiche la carte
   * Confirmer/Annuler qui déclenche la VRAIE exécution côté backend. */
  toolConfirmation?: ToolConfirmation;
}

const TOOL_LABELS: Record<string, string> = {
  send_whatsapp: "Envoyer sur WhatsApp",
  send_mail: "Envoyer l'e-mail",
  create_event: "Créer l'événement",
};

/** Carte de confirmation d'action sensible — sans elle, le modèle répondait
 * « message envoyé » sans jamais appeler le gateway (aucune vraie action). */
function ToolConfirmCard({ confirmation }: { confirmation: ToolConfirmation }) {
  const [state, setState] = useState<"pending" | "running" | "done" | "cancelled" | "error">(
    "pending",
  );
  const [resultMsg, setResultMsg] = useState("");

  async function confirm() {
    setState("running");
    try {
      const res = await confirmToolAction(confirmation.tool, confirmation.args);
      setState(res.ok ? "done" : "error");
      setResultMsg(res.message || (res.ok ? "Action exécutée." : "Échec de l'action."));
    } catch (err) {
      setState("error");
      setResultMsg(err instanceof Error ? err.message : "Échec de l'action.");
    }
  }

  const label = TOOL_LABELS[confirmation.tool] ?? "Exécuter l'action";

  return (
    <div className="mt-3 max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="px-4 pb-3 pt-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
          Action en attente de confirmation
        </p>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          {label} — cette action sera réellement exécutée.
        </p>
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-3">
        {state === "pending" && (
          <>
            <button
              onClick={confirm}
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Confirmer
            </button>
            <button
              onClick={() => setState("cancelled")}
              className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
            >
              Annuler
            </button>
          </>
        )}
        {state === "running" && (
          <span className="text-xs text-[var(--text-secondary)]">Exécution en cours…</span>
        )}
        {state === "done" && (
          <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
            ✓ {resultMsg}
          </span>
        )}
        {state === "cancelled" && (
          <span className="text-xs text-[var(--text-tertiary)]">Action annulée.</span>
        )}
        {state === "error" && (
          <span className="text-xs" style={{ color: "var(--error)" }}>
            {resultMsg}
          </span>
        )}
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThumbUpIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path
        d="M7 22V11M2 13v7a2 2 0 002 2h12.6a2 2 0 002-1.6l1.3-6.5a2 2 0 00-2-2.4H14V6a3 3 0 00-3-3l-4 8v9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path
        d="M17 2v11M22 11V4a2 2 0 00-2-2H7.4a2 2 0 00-2 1.6l-1.3 6.5a2 2 0 002 2.4H10v5a3 3 0 003 3l4-8V2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RegenerateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Indicateur "Toumaï AI réfléchit" — affiché avant le premier token, comme
 * les trois points de ChatGPT/Gemini pendant la latence initiale. */
function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v13m0 0l-4-4m4 4l4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Image générée par l'IA — bouton de téléchargement au survol. */
function ImageTile({ url }: { url: string }) {
  const [preview, setPreview] = useState(false);

  async function download(e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "toumai-ai.png";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div
        className="group/img relative cursor-zoom-in overflow-hidden rounded-2xl border border-[var(--border)]"
        onClick={() => setPreview(true)}
        role="button"
        tabIndex={0}
        aria-label="Agrandir l'image"
      >
        {/* Le watermark "Toumaï AI" est désormais incrusté dans les pixels
            côté backend (services/watermark_service.py) — plus de pastille
            CSS ici, elle doublonnait le texte et disparaissait au
            téléchargement puisqu'elle n'existait que dans le DOM. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Image générée par Toumaï AI" className="block w-full" loading="lazy" />
        <button
          onClick={download}
          title="Télécharger"
          aria-label="Télécharger l'image"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition group-hover/img:opacity-100 hover:bg-black/70"
        >
          <DownloadIcon />
        </button>
      </div>
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreview(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Image générée par Toumaï AI — aperçu"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          <button
            onClick={() => setPreview(false)}
            aria-label="Fermer l'aperçu"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Toumaï AI réfléchit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-40"
          style={{
            animation: "typing-bounce 1.1s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ChatMessage({
  message,
  onEdit,
  editable = true,
  onRegenerate,
  onSuggest,
}: {
  message: Message;
  onEdit?: (newContent: string) => void;
  editable?: boolean;
  onRegenerate?: () => void;
  /** Renvoie une demande d'amélioration dans le chat (suggestions de site). */
  onSuggest?: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  function startEdit() {
    setDraft(message.content);
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    setEditing(false);
    onEdit?.(trimmed);
  }

  async function copy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function rate(value: "up" | "down") {
    if (!message.serverId || rated) return;
    setRated(value);
    try {
      await sendFeedback(message.serverId, value);
    } catch {
      setRated(null);
    }
  }

  if (isUser) {
    if (editing) {
      return (
        <div className="flex animate-fade-in justify-end">
          <div className="flex max-w-[85%] flex-col gap-2 sm:max-w-[70%]">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  setEditing(false);
                }
              }}
              rows={Math.min(8, Math.max(2, draft.split("\n").length))}
              className="w-full resize-none rounded-2xl border border-[var(--primary)] bg-[var(--card)] px-4 py-3 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                disabled={!draft.trim()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-40"
                style={{ background: "var(--primary)" }}
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Message d'ÉDITION de site : contient une consigne + le code exact du site
    // joint. On n'affiche que la consigne, le code est résumé en une puce.
    const editMatch =
      message.content.length > 1500 && /```html\n[\s\S]*```/.test(message.content)
        ? message.content.replace(/```html\n[\s\S]*?```/g, "").trim()
        : null;
    return (
      <div className="group flex animate-fade-in justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[70%]">
          <div className="rounded-3xl px-4 py-2.5 text-[length:var(--chat-fs,15px)] leading-relaxed whitespace-pre-wrap" style={{ background: "var(--card)" }}>
            {editMatch ?? message.content}
            {editMatch && (
              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                <span aria-hidden="true">📄</span> Code du site joint pour modification
              </span>
            )}
          </div>
          {editable && onEdit && (
            <button
              onClick={startEdit}
              aria-label="Modifier le message"
              className="flex items-center gap-1 rounded p-1 text-[11px] text-[var(--text-tertiary)] opacity-0 transition hover:text-[var(--text-primary)] group-hover:opacity-100"
            >
              <EditIcon /> Modifier
            </button>
          )}
        </div>
      </div>
    );
  }

  // Pendant le streaming d'un site : on masque le code brut qui défile et on
  // affiche la carte de construction animée à sa place (le texte avant le bloc
  // reste rendu). Une fois le site terminé, on propose des améliorations.
  const pendingCode = message.streaming ? pendingHtmlCode(message.content || "") : null;
  const building = pendingCode !== null;

  // Projet multi-fichiers terminé (≥2 fichiers nommés) → IDE au lieu des blocs.
  const project = !message.streaming ? parseProject(message.content || "") : [];
  const isProject = project.length >= 2;
  // Site terminé d'une page → on affiche l'APERÇU RENDU (pas le code brut).
  const finishedHtml =
    !isProject && !message.streaming ? extractHtml(message.content || "") : null;
  const isSite = Boolean(finishedHtml);

  let visibleContent = message.content || "";
  if (building) visibleContent = visibleContent.replace(/```html[\s\S]*$/i, "").trimEnd();
  // Projet ou site terminé : on retire les blocs de code (rendus par la carte
  // d'aperçu) et on ne garde que le texte narratif.
  if (isProject || isSite) visibleContent = visibleContent.replace(/```[^\n`]*\n[\s\S]*?```/g, "").trim();

  return (
    <div className="animate-fade-in">
      <div className="max-w-[80ch] text-[length:var(--chat-fs,15px)] leading-relaxed">
        {message.streaming && !message.content ? (
          <TypingDots />
        ) : (
          <div className="prose-toumai">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre(props) {
                  // CodeBlock rend déjà son propre <pre> — évite un double wrapper.
                  return <>{props.children}</>;
                },
                code(props) {
                  const { className, children } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  const isBlock = Boolean(match);
                  const text = String(children).replace(/\n$/, "");
                  if (!isBlock) {
                    return <code className={className}>{children}</code>;
                  }
                  return <CodeBlock language={match![1]} code={text} />;
                },
              }}
            >
              {visibleContent}
            </ReactMarkdown>
            {building && <SiteBuildingCard code={pendingCode ?? ""} />}
            {isProject && <ProjectCard content={message.content || ""} onSuggest={onSuggest} />}
            {isSite && finishedHtml && <SiteArtifactCard html={finishedHtml} onSuggest={onSuggest} />}
          </div>
        )}
        {message.streaming && message.content && (
          <span className="streaming-cursor ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-current align-middle" />
        )}
      </div>
      {!message.streaming && message.toolConfirmation && (
        <ToolConfirmCard confirmation={message.toolConfirmation} />
      )}
      {!message.streaming && message.imageUrls && message.imageUrls.length > 0 && (
        <div className="mt-2 grid max-w-[420px] grid-cols-2 gap-2">
          {message.imageUrls.map((url, i) => (
            <ImageTile key={url + i} url={url} />
          ))}
        </div>
      )}
      {!message.streaming && message.content && (
        <div className="flex items-center gap-0.5 pt-1 text-[var(--text-tertiary)]">
          <button
            onClick={copy}
            title="Copier"
            aria-label="Copier la réponse"
            className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          {message.serverId && (
            <>
              <button
                onClick={() => rate("up")}
                title="Bonne réponse"
                aria-label="Bonne réponse"
                aria-pressed={rated === "up"}
                disabled={!!rated}
                className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:opacity-100"
                style={
                  rated === "up"
                    ? { color: "var(--success)", background: "rgba(16,185,129,0.14)" }
                    : undefined
                }
              >
                <ThumbUpIcon filled={rated === "up"} />
              </button>
              <button
                onClick={() => rate("down")}
                title="Mauvaise réponse"
                aria-label="Mauvaise réponse"
                aria-pressed={rated === "down"}
                disabled={!!rated}
                className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:opacity-100"
                style={
                  rated === "down"
                    ? { color: "var(--error)", background: "rgba(239,68,68,0.14)" }
                    : undefined
                }
              >
                <ThumbDownIcon filled={rated === "down"} />
              </button>
              {rated && (
                <span className="animate-fade-in pl-1 text-xs text-[var(--text-tertiary)]">
                  Merci pour votre retour !
                </span>
              )}
            </>
          )}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              title="Régénérer"
              aria-label="Régénérer la réponse"
              className="rounded-md p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              <RegenerateIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
