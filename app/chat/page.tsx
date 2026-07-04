"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { streamChat } from "@/lib/chat-stream";
import { getHistory, deleteMessageAndAfter } from "@/lib/chat-api";
import { getProfile } from "@/lib/user-api";
import { uploadDocument, type UploadedDocument } from "@/lib/documents-api";
import { ChatMessage, type Message } from "@/components/ChatMessage";
import { ModelSelector } from "@/components/ModelSelector";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Sous-ensemble minimal de la Web Speech API (non standardisée dans lib.dom). */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onstart: (() => void) | null;
}

const DICTATION_ERROR_LABEL: Record<string, string> = {
  "not-allowed": "Accès au microphone refusé — autorisez-le dans les paramètres du navigateur.",
  "audio-capture": "Aucun microphone détecté.",
  network: "Problème réseau pendant la dictée.",
  "no-speech": "Aucune parole détectée.",
};

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `m${Date.now()}${idCounter}`;
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 18) return "Bonjour";
  return "Bonsoir";
}

export default function ChatPage() {
  const { session, loading, loginAsGuest } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState("auto");
  const [error, setError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [greeting, setGreeting] = useState("Bonjour");
  const [webSearch, setWebSearch] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<UploadedDocument | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dictationBaseRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const guestAttempted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>("");
  const stickToBottomRef = useRef(true);

  // Calculé après montage (pas au rendu serveur statique) pour éviter un
  // écart d'hydratation lié au fuseau horaire du visiteur.
  useEffect(() => {
    setGreeting(timeGreeting());
  }, []);

  // Ajoute le prénom au message d'accueil pour les comptes réels (comme
  // "À vous la parole, {NOM}" sur Gemini) — les invités gardent la version
  // générique, on n'a pas d'identité à afficher pour eux.
  useEffect(() => {
    if (!session || session.is_guest) return;
    getProfile()
      .then((p) => {
        const firstName = p.full_name?.trim().split(/\s+/)[0];
        if (firstName) setGreeting((g) => `${g}, ${firstName}`);
      })
      .catch(() => {});
  }, [session]);

  // Connexion invité automatique — parité avec "Essayer sans compte" du mobile.
  useEffect(() => {
    if (loading || session || guestAttempted.current) return;
    guestAttempted.current = true;
    loginAsGuest().catch(() => setError("Impossible de démarrer une session."));
  }, [loading, session, loginAsGuest]);

  // Scroll auto vers le bas, sauf si l'utilisateur a remonté manuellement
  // pour relire un message précédent pendant que la réponse arrive (comme
  // ChatGPT/Gemini).
  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleMainScroll(e: React.UIEvent<HTMLElement>) {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
  }

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
          imageUrls: m.metadata?.image_urls,
        })),
      );
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      lastUserMessageRef.current = lastUser?.content ?? "";
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


  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending || !session) return;
    setInput("");
    setError(null);
    stickToBottomRef.current = true;
    lastUserMessageRef.current = text;

    const isFirstMessage = messages.length === 0;
    const userMsg: Message = { id: nextId(), role: "user", content: text };
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    await runStream(text, assistantId, isFirstMessage, userMsg.id);
  }

  /** Redemande une réponse pour le dernier message utilisateur — remplace la
   * dernière réponse assistant par une nouvelle génération. */
  async function regenerate() {
    if (sending || !session || !lastUserMessageRef.current) return;
    setError(null);
    stickToBottomRef.current = true;
    const assistantId = nextId();
    setMessages((prev) => {
      // Retire la dernière réponse assistant, ajoute un nouvel emplacement en cours.
      const withoutLast = prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev;
      return [...withoutLast, { id: assistantId, role: "assistant", content: "", streaming: true }];
    });
    await runStream(lastUserMessageRef.current, assistantId, false);
  }

  /** Modifie un message utilisateur passé, tronque tout ce qui suit (côté
   * client ET côté serveur, pour que le modèle ne voie pas l'ancienne
   * branche) et relance la génération à partir de là — comme ChatGPT/Claude. */
  async function editMessage(id: string, newContent: string) {
    if (sending || !session) return;
    setError(null);
    stickToBottomRef.current = true;
    const idx = messages.findIndex((m) => m.id === id);
    if (idx === -1) return;
    const edited = messages[idx];
    const isFirstMessage = idx === 0;
    const assistantId = nextId();
    lastUserMessageRef.current = newContent;
    setMessages((prev) => [
      ...prev.slice(0, idx),
      { ...edited, content: newContent, serverId: undefined },
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    if (edited.serverId) {
      try {
        await deleteMessageAndAfter(edited.serverId);
      } catch {
        // La troncature serveur a échoué (session déjà à jour, réseau…) —
        // on continue quand même : le pire cas est un contexte légèrement
        // périmé pour ce tour, pas un blocage de l'UX.
      }
    }
    await runStream(newContent, assistantId, isFirstMessage, edited.id);
  }

  async function runStream(text: string, assistantId: string, isFirstMessage: boolean, userMsgId?: string) {
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let acc = "";
    try {
      const documentId = attachedDoc?.doc_id;
      setAttachedDoc(null);
      await streamChat(
        { message: text, sessionId: activeSessionId, modelPreference: model, webSearch, documentId },
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
            const imageUrls = evt.metadata?.image_urls;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === assistantId) {
                  return {
                    ...m,
                    streaming: false,
                    serverId: evt.message_id,
                    imageUrls: imageUrls?.length ? imageUrls : m.imageUrls,
                  };
                }
                if (userMsgId && m.id === userMsgId) return { ...m, serverId: evt.user_message_id };
                return m;
              }),
            );
            // Nouvelle conversation créée : rafraîchit la sidebar pour l'afficher.
            if (isFirstMessage) setSidebarRefreshKey((k) => k + 1);
          }
          if (evt.error) {
            throw new Error(evt.error);
          }
        },
        controller.signal,
      );
    } catch (err) {
      // Interruption volontaire (bouton Stop) : pas une erreur à afficher.
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) {
        setError(err instanceof Error ? err.message : "Erreur réseau");
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
      );
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  /** Dictée vocale (Web Speech API) — Chrome/Edge uniquement, absent sur
   * Firefox/Safari : le bouton reste alors simplement inactif. */
  function toggleDictation() {
    if (dictating) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!Ctor) {
      setError("La dictée vocale n'est pas prise en charge par ce navigateur.");
      return;
    }

    // Laisse SpeechRecognition gérer elle-même la permission micro — un
    // getUserMedia() séparé juste avant peut laisser le périphérique
    // "occupé" le temps que l'OS le libère, et faire échouer start() juste
    // après (source probable du "ça ne marche jamais" observé).
    dictationBaseRef.current = input;
    const recognition = new Ctor();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setDictating(true);
    recognition.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      const base = dictationBaseRef.current;
      setInput(base ? `${base} ${transcript}` : transcript);
    };
    recognition.onend = () => setDictating(false);
    recognition.onerror = (e) => {
      setDictating(false);
      setError(DICTATION_ERROR_LABEL[e.error] ?? `La dictée a échoué (${e.error}).`);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setDictating(false);
    }
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (10 Mo max).");
      return;
    }
    setUploadingDoc(true);
    setError(null);
    try {
      const doc = await uploadDocument(file);
      setAttachedDoc(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'import du fichier.");
    } finally {
      setUploadingDoc(false);
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
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        activeId={activeSessionId}
        onSelect={openSession}
        onNewChat={newChat}
        refreshKey={sidebarRefreshKey}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
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
          </div>
        </header>

        {/* Messages — le scroll s'applique à <main> pleine largeur pour que la
            barre de défilement reste au bord réel de la page (comme Gemini),
            pas au bord d'une colonne centrée. Le contenu se centre à
            l'intérieur via ce wrapper. */}
        <main ref={mainRef} onScroll={handleMainScroll} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-4 py-6">
            {historyLoading && <HistorySkeleton />}

            {!historyLoading && messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
                <p className="text-4xl font-light text-[var(--text-primary)]">
                  {greeting}
                </p>
              </div>
            )}

            {!historyLoading &&
              messages.map((m, i) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  editable={!sending}
                  onEdit={m.role === "user" ? (text) => editMessage(m.id, text) : undefined}
                  onRegenerate={
                    !sending && i === messages.length - 1 && m.role === "assistant" && m.content
                      ? regenerate
                      : undefined
                  }
                />
              ))}

            <div ref={bottomRef} />
          </div>
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
            {webSearch && (
              <button
                onClick={() => setWebSearch(false)}
                className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-white/5"
                style={{ border: "1px solid var(--border)" }}
              >
                <GlobeIcon /> Recherche web <span aria-hidden="true">✕</span>
              </button>
            )}
            {(attachedDoc || uploadingDoc) && (
              <div
                className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                style={{ border: "1px solid var(--border)" }}
              >
                <FileIcon />
                {uploadingDoc ? "Import en cours…" : attachedDoc?.filename}
                {attachedDoc && (
                  <button
                    onClick={() => setAttachedDoc(null)}
                    aria-label="Retirer le fichier"
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.gif"
              onChange={onFilePicked}
            />
            <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 focus-within:border-[var(--primary)]/60">
              <div className="relative">
                <button
                  onClick={() => setToolsOpen((o) => !o)}
                  aria-label="Outils"
                  title="Outils"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
                >
                  <PlusIcon />
                </button>
                {toolsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setToolsOpen(false)} />
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-xl">
                      <button
                        onClick={() => {
                          setToolsOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-white/5"
                      >
                        <FileIcon />
                        Importer des fichiers
                      </button>
                      <div className="my-1 h-px bg-[var(--border)]" />
                      <button
                        onClick={() => {
                          setWebSearch((w) => !w);
                          setToolsOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-white/5"
                      >
                        <GlobeIcon />
                        Recherche web
                        {webSearch && <CheckIcon className="ml-auto" />}
                      </button>
                      <div className="my-1 h-px bg-[var(--border)]" />
                      <Link
                        href="/agent"
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-white/5"
                      >
                        <AgentIcon />
                        Agent Navigateur
                      </Link>
                      <Link
                        href="/settings?tab=connectors"
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-white/5"
                      >
                        <PlugIcon />
                        Connecteurs
                      </Link>
                    </div>
                  </>
                )}
              </div>
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
              <ModelSelector value={model} onChange={setModel} />
              <button
                onClick={toggleDictation}
                aria-label={dictating ? "Arrêter la dictée" : "Dicter"}
                title={dictating ? "Arrêter la dictée" : "Dicter"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-white/5"
                style={{ color: dictating ? "var(--primary)" : "var(--text-tertiary)" }}
              >
                <MicIcon />
              </button>
              {sending ? (
                <button
                  onClick={stopGenerating}
                  aria-label="Arrêter la génération"
                  title="Arrêter"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90"
                  style={{ background: "var(--text-secondary)" }}
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  onClick={() => send()}
                  disabled={!canSend}
                  aria-label="Envoyer le message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-30"
                  style={{ background: "var(--primary)" }}
                >
                  <SendIcon />
                </button>
              )}
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

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 9h18M8 21h8M12 18v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M9 2v4M15 2v4M7 7h10l-1 5a4 4 0 01-4 3.5v0A4 4 0 018 12l-1-5zM12 15.5V22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0M12 19v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

