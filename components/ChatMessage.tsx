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

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "assistant") {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
        aria-hidden="true"
      >
        T
      </div>
    );
  }
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--text-secondary)]"
      aria-hidden="true"
    >
      V
    </div>
  );
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState<"up" | "down" | null>(null);

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
    return (
      <div className="flex animate-fade-in items-start justify-end gap-2.5">
        <div
          className="max-w-[85%] rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-white sm:max-w-[70%]"
          style={{ background: "var(--primary)" }}
        >
          {message.content}
        </div>
        <Avatar role="user" />
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in items-start gap-2.5">
      <Avatar role="assistant" />
      <div className="flex min-w-0 max-w-[90%] flex-col items-start gap-1.5 sm:max-w-[80%]">
        <div className="w-full rounded-2xl rounded-tl-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[15px] leading-relaxed">
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
          {message.streaming && (
            <span className="streaming-cursor ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-current align-middle" />
          )}
        </div>
        {!message.streaming && message.content && (
          <div className="flex items-center gap-1 px-1 text-[var(--text-tertiary)]">
            <button
              onClick={copy}
              aria-label="Copier la réponse"
              className="rounded p-1.5 text-xs transition hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              {copied ? "Copié" : "Copier"}
            </button>
            {message.serverId && (
              <>
                <button
                  onClick={() => rate("up")}
                  aria-label="Bonne réponse"
                  disabled={!!rated}
                  className={`rounded p-1.5 text-xs transition hover:bg-white/5 ${
                    rated === "up" ? "text-[var(--success)]" : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  👍
                </button>
                <button
                  onClick={() => rate("down")}
                  aria-label="Mauvaise réponse"
                  disabled={!!rated}
                  className={`rounded p-1.5 text-xs transition hover:bg-white/5 ${
                    rated === "down" ? "text-[var(--error)]" : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  👎
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
