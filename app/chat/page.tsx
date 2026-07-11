"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { streamChat } from "@/lib/chat-stream";
import { getHistory, deleteMessageAndAfter } from "@/lib/chat-api";
import { getProfile } from "@/lib/user-api";
import { getPreferences } from "@/lib/preferences-api";
import { transcribeAudio } from "@/lib/voice-api";
import { uploadDocument, type UploadedDocument } from "@/lib/documents-api";
import { ChatMessage, type Message } from "@/components/ChatMessage";
import { ModelSelector } from "@/components/ModelSelector";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Waveform } from "@/components/Waveform";
import { VoiceModeOverlay } from "@/components/VoiceModeOverlay";
import { LiveAvatarOverlay } from "@/components/LiveAvatarOverlay";
import { ShareDialog } from "@/components/ShareDialog";
import { BrowserAgentOverlay, detectBrowserGoal } from "@/components/BrowserAgentOverlay";
import { cacheSeed, cacheWrite, useCacheSeed } from "@/lib/swr-cache";
import { applyChatFontSize } from "@/lib/ui-prefs";

/** Synchronise l'URL avec la conversation active (/chat?c=<id>) — chaque
 * conversation a son adresse, ouvrable/partageable comme sur Gemini. */
function setUrlConversation(id: string | null) {
  const url = id ? `/chat?c=${encodeURIComponent(id)}` : "/chat";
  window.history.replaceState(null, "", url);
}

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

/** Pool de suggestions — 4 tirées au hasard à chaque visite, libellés
 * complets (jamais tronqués). */
const SUGGESTION_POOL = [
  "Explique-moi un concept simplement",
  "Génère une image créative",
  "Écris une fonction Python",
  "Traduis ce texte en arabe",
  "Résume-moi mes messages WhatsApp",
  "Rédige un e-mail professionnel",
  "Aide-moi à préparer un CV",
  "Donne-moi la météo à N'Djamena",
  "Propose des idées de business au Tchad",
  "Corrige ce texte en français",
];

function pickSuggestions(): string[] {
  const pool = [...SUGGESTION_POOL];
  const out: string[] = [];
  while (out.length < 4 && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/** Bref signal sonore (deux notes montantes) au démarrage de la dictée —
 * indique à l'utilisateur qu'il peut parler, comme les assistants vocaux. */
function playDictationChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    gain.connect(ctx.destination);
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.1);
    });
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    // Pas d'audio disponible — la dictée fonctionne quand même.
  }
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
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [liveAvatarOpen, setLiveAvatarOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // Tâche de navigation web détectée → fenêtre dédiée de l'Agent Navigateur.
  const [browserGoal, setBrowserGoal] = useState<string | null>(null);
  const urlConvAttempted = useRef(false);
  const [attachedDoc, setAttachedDoc] = useState<UploadedDocument | null>(null);
  // Langue de réponse définie dans les préférences ("fr", "en", "ar"… ou
  // "auto") — envoyée à chaque tour pour que l'IA réponde TOUJOURS dans la
  // langue choisie, pas dans celle détectée du message.
  const preferredLangRef = useRef<string>("auto");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const whisperRecRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dictationBaseRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const guestAttempted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>("");
  const stickToBottomRef = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Calculé après montage (pas au rendu serveur statique) pour éviter un
  // écart d'hydratation lié au fuseau horaire du visiteur.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    setGreeting(timeGreeting());
    // Après montage (pas au rendu statique) — Math.random casserait l'hydratation.
    setSuggestions(pickSuggestions());
  }, []);

  // Prénom affiché dans l'accueil pour les comptes réels (comme
  // "À vous la parole, {NOM}" sur Gemini) — les invités gardent la version
  // générique, on n'a pas d'identité à afficher pour eux.
  // Hydration-safe : état neutre au rendu (identique au HTML pré-rendu),
  // seed du cache appliqué avant peinture par useCacheSeed.
  const [firstName, setFirstName] = useState<string | null>(null);
  useCacheSeed<{ full_name?: string | null }>("user:profile", (p) => {
    const name = p.full_name?.trim().split(/\s+/)[0];
    if (name) setFirstName(name);
  });
  useEffect(() => {
    if (!session || session.is_guest) return;
    getProfile()
      .then((p) => {
        cacheWrite("user:profile", p);
        const name = p.full_name?.trim().split(/\s+/)[0];
        if (name) setFirstName(name);
      })
      .catch(() => {});
  }, [session]);

  // Charge la langue préférée + applique la taille de texte (seedée depuis le
  // cache pour un rendu correct dès le premier écran).
  useEffect(() => {
    applyChatFontSize(cacheSeed<{ font_size?: string }>("user:prefs")?.font_size);
    if (!session) return;
    getPreferences()
      .then((p) => {
        if (p.ai_language) preferredLangRef.current = p.ai_language;
        applyChatFontSize(p.font_size);
        cacheWrite("user:prefs", p);
      })
      .catch(() => {});
  }, [session]);

  // Connexion invité automatique — parité avec "Essayer sans compte" du mobile.
  useEffect(() => {
    if (loading || session || guestAttempted.current) return;
    guestAttempted.current = true;
    loginAsGuest().catch(() => setError("Impossible de démarrer une session."));
  }, [loading, session, loginAsGuest]);

  // Ouverture directe d'une conversation par son URL (/chat?c=<id>).
  useEffect(() => {
    if (!session || urlConvAttempted.current) return;
    urlConvAttempted.current = true;
    const id = new URLSearchParams(window.location.search).get("c");
    if (id) openSession(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Scroll auto vers le bas, sauf si l'utilisateur a remonté manuellement
  // pour relire un message précédent pendant que la réponse arrive (comme
  // ChatGPT/Gemini).
  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollDown(false);
    } else {
      // Nouveau contenu arrivé (réponse en cours) pendant que l'utilisateur a
      // remonté lire un message précédent — signale qu'il y a du texte plus bas.
      setShowScrollDown(true);
    }
  }, [messages]);

  function handleMainScroll(e: React.UIEvent<HTMLElement>) {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 120;
    stickToBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
  }

  function scrollToBottom() {
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
  // Cache persistant : la conversation s'affiche instantanément depuis le
  // localStorage (zéro squelette au retour), puis se revalide en arrière-plan.
  async function openSession(id: string) {
    setActiveSessionId(id);
    setUrlConversation(id);
    const cached = cacheSeed<Message[]>(`chat:history:${id}`);
    if (cached && cached.length) {
      setMessages(cached);
      setHistoryLoading(false);
    } else {
      setHistoryLoading(true);
    }
    setError(null);
    try {
      const history = await getHistory(id);
      const mapped: Message[] = history.map((m) => ({
        id: m.id,
        serverId: m.id,
        role: m.role,
        content: m.content,
        imageUrls: m.metadata?.image_urls,
      }));
      setMessages(mapped);
      // On borne à 60 messages en cache : assez pour un retour instantané,
      // sans saturer le quota localStorage sur les longues conversations.
      cacheWrite(`chat:history:${id}`, mapped.slice(-60));
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      lastUserMessageRef.current = lastUser?.content ?? "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Conversation inexistante ou appartenant à une autre session (ancien
      // lien, compte changé) : on repart proprement sur un nouveau chat au
      // lieu de laisser une erreur 404 « Session introuvable » à l'écran.
      if (/introuvable|404/i.test(msg)) {
        setActiveSessionId(null);
        setUrlConversation(null);
        setMessages([]);
        setError("Cette conversation n'est plus accessible avec ce compte — nouvelle conversation ouverte.");
      } else {
        setError(msg || "Impossible de charger cette conversation.");
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  function newChat() {
    setActiveSessionId(null);
    setUrlConversation(null);
    setMessages([]);
    setError(null);
  }


  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending || !session) return;
    // Demande de navigation web → l'Agent Navigateur prend le relais dans sa
    // fenêtre dédiée (l'utilisateur n'a plus à le lancer manuellement).
    if (detectBrowserGoal(text)) {
      setInput("");
      setBrowserGoal(text);
      return;
    }
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

  async function runStream(
    text: string,
    assistantId: string,
    isFirstMessage: boolean,
    userMsgId?: string,
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let acc = "";
    try {
      const documentId = attachedDoc?.doc_id;
      setAttachedDoc(null);
      await streamChat(
        {
          message: text,
          sessionId: activeSessionId,
          modelPreference: model,
          language: preferredLangRef.current,
          webSearch,
          documentId,
        },
        (evt) => {
          if (evt.chunk) {
            acc += evt.chunk;
            onChunk?.(evt.chunk);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
            );
          }
          if (evt.session_id && evt.session_id !== activeSessionId) {
            setActiveSessionId(evt.session_id);
            setUrlConversation(evt.session_id);
          }
          // La confirmation peut arriver dans un événement metadata
          // intermédiaire OU dans l'événement final — on capte les deux.
          if (evt.metadata?.tool_confirmation && !evt.done) {
            const tc = evt.metadata.tool_confirmation;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, toolConfirmation: tc } : m)),
            );
          }
          if (evt.done) {
            const imageUrls = evt.metadata?.image_urls;
            const toolConfirmation = evt.metadata?.tool_confirmation;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === assistantId) {
                  return {
                    ...m,
                    streaming: false,
                    serverId: evt.message_id,
                    imageUrls: imageUrls?.length ? imageUrls : m.imageUrls,
                    // Action sensible (WhatsApp/mail) : la carte
                    // Confirmer/Annuler déclenche la vraie exécution.
                    toolConfirmation: toolConfirmation ?? m.toolConfirmation,
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
    return acc;
  }

  /** Envoie un texte (transcrit depuis la voix) et attend la réponse complète
   * — utilisé par le mode vocal. `onChunk` reçoit chaque fragment dès qu'il
   * arrive, pour permettre une synthèse vocale phrase par phrase en temps
   * réel plutôt que d'attendre la réponse entière avant de parler. */
  async function voiceSend(text: string, onChunk?: (chunk: string) => void): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed || sending || !session) return "";
    stickToBottomRef.current = true;
    lastUserMessageRef.current = trimmed;
    const isFirstMessage = messages.length === 0;
    const userMsg: Message = { id: nextId(), role: "user", content: trimmed };
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    return runStream(trimmed, assistantId, isFirstMessage, userMsg.id, onChunk);
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  /** Dictée vocale — écrit en temps réel dans le champ de saisie.
   *
   * 1) Web Speech API quand elle marche (Chrome/Edge) : transcription
   *    instantanée mot à mot.
   * 2) Sinon (Firefox/Safari, ou erreur réseau de la Web Speech API qui
   *    passe par les serveurs Google) : bascule automatique sur notre
   *    Whisper backend — enregistrement par tranches, transcription
   *    cumulative toutes les ~4 s, orthographe soignée. Plus d'erreur
   *    sèche pour l'utilisateur. */
  function toggleDictation() {
    if (dictating) {
      recognitionRef.current?.stop();
      stopWhisperDictation();
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!Ctor) {
      startWhisperDictation();
      return;
    }

    dictationBaseRef.current = input;
    const recognition = new Ctor();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setDictating(true);
      playDictationChime();
    };
    recognition.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      const base = dictationBaseRef.current;
      setInput(base ? `${base} ${transcript}` : transcript);
    };
    recognition.onend = () => setDictating(false);
    recognition.onerror = (e) => {
      setDictating(false);
      if (e.error === "not-allowed" || e.error === "audio-capture") {
        setError(DICTATION_ERROR_LABEL[e.error]);
        return;
      }
      // Erreur réseau/service de la Web Speech API → fallback Whisper
      // transparent au lieu d'afficher une erreur.
      startWhisperDictation();
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setDictating(false);
      startWhisperDictation();
    }
  }

  /** Fallback Whisper : enregistre le micro et transcrit l'audio CUMULÉ
   * toutes les ~4 s — le texte apparaît progressivement dans le champ et se
   * corrige au fil de la dictée (meilleure orthographe que la Web Speech). */
  async function startWhisperDictation() {
    if (whisperRecRef.current) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(DICTATION_ERROR_LABEL["not-allowed"]);
      return;
    }
    dictationBaseRef.current = input;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    whisperRecRef.current = recorder;
    let transcribing = false;

    async function transcribeSoFar(final = false) {
      if (transcribing && !final) return; // pas de transcriptions concurrentes
      if (!chunks.length) return;
      transcribing = true;
      try {
        const { text } = await transcribeAudio(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        const clean = text.trim();
        if (clean) {
          const base = dictationBaseRef.current;
          setInput(base ? `${base} ${clean}` : clean);
        }
      } catch {
        // Tranche illisible — la suivante réessaie avec plus d'audio.
      } finally {
        transcribing = false;
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
      if (recorder.state === "recording") void transcribeSoFar();
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      whisperRecRef.current = null;
      setDictating(false);
      await transcribeSoFar(true); // passe finale = orthographe la plus fiable
      textareaRef.current?.focus();
    };

    setDictating(true);
    playDictationChime();
    recorder.start(4000); // livre une tranche toutes les 4 s
    // Garde-fou : jamais plus de 90 s d'enregistrement continu.
    setTimeout(() => {
      if (whisperRecRef.current === recorder && recorder.state === "recording") recorder.stop();
    }, 90_000);
  }

  function stopWhisperDictation() {
    const rec = whisperRecRef.current;
    if (rec && rec.state === "recording") rec.stop();
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
        <header className="flex select-none items-center justify-between px-3 py-3 md:px-4">
          <div className="flex items-center gap-2">
            {/* Mobile : le logo Toumaï ouvre le menu latéral (comme Gemini) —
                plus de hamburger ni de texte de marque dans le header. */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir les conversations"
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--hover)] md:hidden"
            >
              <Logo size={24} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {activeSessionId && messages.length > 0 && (
              <button
                onClick={() => setShareOpen(true)}
                aria-label="Partager la conversation"
                title="Partager la conversation"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
              >
                <ShareIcon />
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Messages — le scroll s'applique à <main> pleine largeur pour que la
            barre de défilement reste au bord réel de la page (comme Gemini),
            pas au bord d'une colonne centrée. Le contenu se centre à
            l'intérieur via ce wrapper. */}
        <main ref={mainRef} onScroll={handleMainScroll} className="relative flex-1 overflow-y-auto">
          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              aria-label="Aller au dernier message"
              title="Aller au dernier message"
              className="absolute bottom-4 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border shadow-lg transition hover:scale-105"
              style={{
                borderColor: "var(--border)",
                background: "var(--card)",
                color: "var(--text-secondary)",
              }}
            >
              <ChevronDownIcon />
            </button>
          )}
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-4 py-6">
            {historyLoading && <HistorySkeleton />}

            {!historyLoading && messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
                <p className="landing-serif text-4xl tracking-tight text-[var(--text-primary)] sm:text-[40px]">
                  {greeting}
                  {firstName && (
                    <>
                      ,{" "}
                      <em style={{ color: "var(--primary)" }}>{firstName}.</em>
                    </>
                  )}
                </p>
                <p className="mt-3 text-sm text-[var(--text-tertiary)]">
                  Comment puis-je vous aider ?
                </p>
                <div className="mt-8 flex max-w-xl flex-wrap justify-center gap-2.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        textareaRef.current?.focus();
                      }}
                      className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!historyLoading &&
              messages.map((m, i) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  // Message précédent : sert de base HTML pour appliquer un
                  // patch d'édition (SEARCH/REPLACE) renvoyé par l'IA.
                  prevContent={i > 0 ? messages[i - 1].content : undefined}
                  editable={!sending}
                  onEdit={m.role === "user" ? (text) => editMessage(m.id, text) : undefined}
                  onRegenerate={
                    !sending && i === messages.length - 1 && m.role === "assistant" && m.content
                      ? regenerate
                      : undefined
                  }
                  onSuggest={!sending ? (text) => send(text) : undefined}
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
        <footer className="px-4 py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {webSearch && (
              <button
                onClick={() => setWebSearch(false)}
                className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
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
            {dictating && (
              <div
                className="flex items-center justify-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
              >
                <Waveform active bars={40} height={30} color="var(--primary)" />
                <span className="shrink-0 text-sm font-medium" style={{ color: "var(--primary)" }}>
                  Je vous écoute…
                </span>
              </div>
            )}
            {/* Composer en DEUX rangées : la zone de texte occupe toute la
                largeur (elle ne se coince plus entre les icônes), les
                contrôles vivent sur leur propre ligne en dessous. */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 focus-within:border-[var(--primary)]/60">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={dictating ? "Je vous écoute…" : "Écrivez à Toumaï AI…"}
                rows={1}
                disabled={!session}
                className="max-h-[200px] w-full resize-none bg-transparent px-2 pb-1 pt-1.5 text-[15px] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  onClick={() => setToolsOpen((o) => !o)}
                  aria-label="Outils"
                  title="Outils"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
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
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-[var(--hover)]"
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
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-[var(--hover)]"
                      >
                        <GlobeIcon />
                        Recherche web
                        {webSearch && <CheckIcon className="ml-auto" />}
                      </button>
                      <div className="my-1 h-px bg-[var(--border)]" />
                      <Link
                        href="/settings?tab=connectors"
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-[var(--hover)]"
                      >
                        <PlugIcon />
                        Connecteurs
                      </Link>
                      <Link
                        href="/automations"
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-[var(--hover)]"
                      >
                        <BoltIcon />
                        Automatisation IA
                      </Link>
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1" />
              <ModelSelector value={model} onChange={setModel} />
              <button
                onClick={toggleDictation}
                aria-label={dictating ? "Arrêter la dictée" : "Dicter"}
                title={dictating ? "Arrêter la dictée" : "Dicter"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--hover)]"
                style={{ color: dictating ? "var(--primary)" : "var(--text-tertiary)" }}
              >
                {dictating ? <StopIcon /> : <MicIcon />}
              </button>
              <button
                onClick={() => setVoiceModeOpen(true)}
                aria-label="Mode vocal"
                title="Mode vocal"
                disabled={!session}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-30"
                style={{ background: "var(--thinking)" }}
              >
                <VoiceModeIcon />
              </button>
              <button
                onClick={() => setLiveAvatarOpen(true)}
                aria-label="Parler en direct avec l'avatar"
                title="Parler en direct (avatar)"
                disabled={!session}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-30"
                style={{ background: "var(--primary)" }}
              >
                <AvatarLiveIcon />
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
            </div>
            <p className="text-center text-[11px] text-[var(--text-tertiary)]">
              Toumaï AI peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        </footer>
      </div>
      {voiceModeOpen && (
        <VoiceModeOverlay onSend={voiceSend} onClose={() => setVoiceModeOpen(false)} />
      )}
      {liveAvatarOpen && (
        <LiveAvatarOverlay onSend={voiceSend} onClose={() => setLiveAvatarOpen(false)} />
      )}
      {shareOpen && activeSessionId && (
        <ShareDialog sessionId={activeSessionId} onClose={() => setShareOpen(false)} />
      )}
      {browserGoal && (
        <BrowserAgentOverlay
          goal={browserGoal}
          onClose={(answer) => {
            setBrowserGoal(null);
            if (answer) {
              setMessages((prev) => [
                ...prev,
                { id: nextId(), role: "assistant", content: `🌐 **Agent Navigateur**\n\n${answer}` },
              ]);
            }
          }}
        />
      )}
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

function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.7l6.8-3.9M8.6 13.3l6.8 3.9" strokeLinecap="round" />
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

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
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

function VoiceModeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12v0M8 8v8M12 5v14M16 8v8M20 12v0" strokeLinecap="round" />
    </svg>
  );
}

function AvatarLiveIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="9" r="4" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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

