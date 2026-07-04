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

function ThumbUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M7 22V11M2 13v7a2 2 0 002 2h12.6a2 2 0 002-1.6l1.3-6.5a2 2 0 00-2-2.4H14V6a3 3 0 00-3-3l-4 8v9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                className={`rounded-md p-1.5 transition hover:bg-white/5 hover:text-[var(--text-primary)] ${
                  rated === "up" ? "text-[var(--text-primary)]" : ""
                }`}
              >
                <ThumbUpIcon />
              </button>
              <button
                onClick={() => rate("down")}
                title="Mauvaise réponse"
                aria-label="Mauvaise réponse"
                aria-pressed={rated === "down"}
                disabled={!!rated}
                className={`rounded-md p-1.5 transition hover:bg-white/5 hover:text-[var(--text-primary)] ${
                  rated === "down" ? "text-[var(--text-primary)]" : ""
                }`}
              >
                <ThumbDownIcon />
              </button>
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
