"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { streamChat } from "@/lib/chat-stream";
import { getHistory } from "@/lib/chat-api";
import { ChatMessage, type Message } from "@/components/ChatMessage";
import { ModelSelector } from "@/components/ModelSelector";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `m${Date.now()}${idCounter}`;
}

const SUGGESTIONS = [
  { icon: "💡", label: "Explique-moi", prompt: "Explique-moi comment fonctionne le machine learning, simplement." },
  { icon: "🧑‍💻", label: "Écris du code", prompt: "Écris une fonction Python qui trie une liste de dictionnaires par une clé." },
  { icon: "✍️", label: "Rédige", prompt: "Rédige un e-mail professionnel pour reporter une réunion." },
  { icon: "🌍", label: "Traduis", prompt: "Traduis ce texte en anglais : " },
];

export default function ChatPage() {
  const { session, loading, loginAsGuest } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState("auto");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const guestAttempted = useRef(false);

  // Connexion invité automatique — parité avec "Essayer sans compte" du mobile.
  useEffect(() => {
    if (loading || session || guestAttempted.current) return;
    guestAttempted.current = true;
    loginAsGuest().catch(() => setError("Impossible de démarrer une session."));
  }, [loading, session, loginAsGuest]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-grandissement de la zone de saisie, comme Claude/ChatGPT.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Effacement automatique après quelques secondes — non bloquant.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  // Chargement de l'historique quand l'utilisateur change de conversation.
  async function openSession(id: string) {
    setActiveSessionId(id);
    setHistoryLoading(true);
    setError(null);
    try {
      const history = await getHistory(id);
      setMessages(
        history.map((m) => ({
          id: m.id,
          serverId: m.id,
          role: m.role,
          content: m.content,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger cette conversation.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function newChat() {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
  }

  const effectiveModel = thinking ? "sayibi-reflexion" : model;

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending || !session) return;
    setInput("");
    setError(null);

    const isFirstMessage = messages.length === 0;
    const userMsg: Message = { id: nextId(), role: "user", content: text };
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setSending(true);

    let acc = "";
    try {
      await streamChat(
        { message: text, sessionId: activeSessionId, modelPreference: effectiveModel },
        (evt) => {
          if (evt.chunk) {
            acc += evt.chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
            );
          }
          if (evt.session_id && evt.session_id !== activeSessionId) {
            setActiveSessionId(evt.session_id);
          }
          if (evt.done) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, streaming: false, serverId: evt.message_id }
                  : m,
              ),
            );
            // Nouvelle conversation créée : rafraîchit la sidebar pour l'afficher.
            if (isFirstMessage) setSidebarRefreshKey((k) => k + 1);
          }
          if (evt.error) {
            throw new Error(evt.error);
          }
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
      );
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const canSend = Boolean(input.trim()) && !sending && Boolean(session);

  return (
    <div className="flex flex-1">
      <Sidebar
        activeId={activeSessionId}
        onSelect={openSession}
        onNewChat={newChat}
        refreshKey={sidebarRefreshKey}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col">
        {/* Barre supérieure */}
        <header className="flex items-center justify-between border-b border-[var(--border)] px-3 py-3 md:px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir les conversations"
              className="rounded-lg p-2 transition hover:bg-white/5 md:hidden"
            >
              <MenuIcon />
            </button>
            <Link href="/" className="text-sm font-semibold">
              Toumaï AI
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <ModelSelector value={model} onChange={setModel} />
          </div>
        </header>

        {/* Messages */}
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
          {historyLoading && <HistorySkeleton />}

          {!historyLoading && messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
                aria-hidden="true"
              >
                T
              </div>
              <p className="mb-1.5 text-2xl font-semibold text-[var(--text-primary)]">
                Que puis-je faire pour vous ?
              </p>
              <p className="mb-8 text-sm text-[var(--text-secondary)]">
                Posez une question, demandez du code, ou activez « Réflexion » pour
                les tâches complexes.
              </p>
              <div className="grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    disabled={!session}
                    className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-left transition hover:border-[var(--primary)]/50 hover:bg-white/5 disabled:opacity-50"
                  >
                    <span className="text-lg" aria-hidden="true">{s.icon}</span>
                    <span>
                      <span className="block text-sm font-medium">{s.label}</span>
                      <span className="block truncate text-xs text-[var(--text-tertiary)]">
                        {s.prompt}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!historyLoading &&
            messages.map((m) => <ChatMessage key={m.id} message={m} />)}
          <div ref={bottomRef} />
        </main>

        {/* Toast d'erreur — non bloquant */}
        {error && (
          <div
            role="alert"
            className="mx-auto mb-2 w-fit max-w-[90%] rounded-lg border px-3.5 py-2 text-sm"
            style={{
              borderColor: "var(--error)",
              background: "rgba(239,68,68,0.08)",
              color: "var(--error)",
            }}
          >
            {error}
          </div>
        )}

        {/* Saisie */}
        <footer className="border-t border-[var(--border)] px-4 py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {thinking && (
              <button
                onClick={() => setThinking(false)}
                className="flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
                style={{ background: "rgba(139,92,246,0.14)", color: "var(--thinking)" }}
              >
                <BrainIcon /> Réflexion <span aria-hidden="true">✕</span>
              </button>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 focus-within:border-[var(--primary)]/60">
              <button
                onClick={() => setThinking((t) => !t)}
                aria-pressed={thinking}
                title="Mode Réflexion (Toumaï 5)"
                className="shrink-0 rounded-xl p-2.5 transition hover:bg-white/5"
                style={{ color: thinking ? "var(--thinking)" : "var(--text-tertiary)" }}
              >
                <BrainIcon />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Écrivez à Toumaï AI…"
                rows={1}
                disabled={!session}
                className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              <button
                onClick={() => send()}
                disabled={!canSend}
                aria-label="Envoyer le message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-30"
                style={{ background: "var(--primary)" }}
              >
                <SendIcon />
              </button>
            </div>
            <p className="text-center text-[11px] text-[var(--text-tertiary)]">
              Toumaï AI peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-5 py-2" aria-hidden="true">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex gap-2.5 ${i % 2 === 0 ? "" : "justify-end"}`}>
          {i % 2 === 0 && <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-[var(--card)]" />}
          <div
            className="h-14 w-2/3 animate-pulse rounded-2xl bg-[var(--card)] sm:w-1/2"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrainIcon() {
  return <span aria-hidden="true">🧠</span>;
}
