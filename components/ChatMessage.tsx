"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendFeedback } from "@/lib/chat-api";
import { CodeBlock } from "./CodeBlock";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  /** Présent une fois le message persisté côté backend — nécessaire pour le feedback. */
  serverId?: string;
  imageUrls?: string[];
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Image générée par Toumaï AI" className="block w-full" loading="lazy" />
        <div
          className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur"
          title="Généré par Toumaï AI"
          aria-hidden="true"
        >
          Toumaï AI
        </div>
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
}: {
  message: Message;
  onEdit?: (newContent: string) => void;
  editable?: boolean;
  onRegenerate?: () => void;
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
                className="rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-white/5"
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
    return (
      <div className="group flex animate-fade-in justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[70%]">
          <div className="rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap" style={{ background: "var(--card)" }}>
            {message.content}
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

  return (
    <div className="animate-fade-in">
      <div className="max-w-[80ch] text-[15px] leading-relaxed">
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
              {message.content || ""}
            </ReactMarkdown>
          </div>
        )}
        {message.streaming && message.content && (
          <span className="streaming-cursor ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-current align-middle" />
        )}
      </div>
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
            className="rounded-md p-1.5 transition hover:bg-white/5 hover:text-[var(--text-primary)]"
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
                className="rounded-md p-1.5 transition hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-100"
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
                className="rounded-md p-1.5 transition hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-100"
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
              className="rounded-md p-1.5 transition hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              <RegenerateIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
