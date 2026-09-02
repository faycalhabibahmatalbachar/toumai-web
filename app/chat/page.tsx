"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { streamChat, type HistoryTurn } from "@/lib/chat-stream";
import { getHistory, deleteMessageAndAfter, purgeEphemeralMedia } from "@/lib/chat-api";
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
import { ShareDialog } from "@/components/ShareDialog";
import { BrowserAgentOverlay, detectBrowserGoal } from "@/components/BrowserAgentOverlay";
import { DropZone } from "@/components/chat/media/DropZone";
import { useClipboardImage } from "@/hooks/useClipboardImage";
import { cacheSeed, cacheWrite, useCacheSeed } from "@/lib/swr-cache";
import { applyChatFontSize } from "@/lib/ui-prefs";
import { describeError, errorMessage, microphoneErrorMessage } from "@/lib/errors";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { SELECTABLE_MODELS } from "@/lib/models";
import {
  CommandPalette,
  filterPalette,
  type PaletteItem,
} from "@/components/chat/CommandPalette";

/** Repère un `/commande` ou un `@modèle` en cours de frappe juste avant le
 * curseur. Le déclencheur ne compte qu'en début de champ ou après un espace,
 * pour ne pas s'ouvrir au milieu d'une URL ou d'une adresse e-mail. */
function detectTrigger(
  value: string,
  caret: number,
): { kind: "slash" | "at"; start: number; query: string } | null {
  const before = value.slice(0, caret);
  const m = /(^|\s)([/@])([\p{L}\d-]*)$/u.exec(before);
  if (!m) return null;
  return {
    kind: m[2] === "/" ? "slash" : "at",
    start: caret - m[3].length - 1,
    query: m[3],
  };
}

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

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `m${Date.now()}${idCounter}`;
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

/**
 * La salutation du moment.
 *
 * POURQUOI PLUS DE DEUX
 * ---------------------
 * « Bonjour » couvrait treize heures d'affilée et « Bonsoir » tout le reste :
 * on lisait le même mot du matin au crépuscule, puis le même autre jusqu'à
 * l'aube. Un assistant qui dit « Bonsoir » à quatorze heures ne se trompe pas
 * seulement de mot — il montre qu'il ne regarde pas l'heure.
 *
 * Les bornes suivent l'usage français, pas une division en parts égales :
 * « bonne nuit » se dit quand on devrait dormir, « bon après-midi » commence
 * après le déjeuner, et le soir tombe plus tard qu'on ne le découpe.
 */
function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 14) return "Bon appétit";
  if (h < 18) return "Bon après-midi";
  if (h < 23) return "Bonsoir";
  return "Bonne nuit";
}

export default function ChatPage() {
  const { session, loading, loginAsGuest } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState("auto");
  const [error, setError] = useState<string | null>(null);
  /** Une erreur « collante » attend une action : on ne l'efface pas toute seule. */
  const [errorSticky, setErrorSticky] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [greeting, setGreeting] = useState("Bonjour");
  const [webSearch, setWebSearch] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  /** La conversation à partager. `null` = boîte fermée.
      On garde l'identifiant plutôt qu'un booléen : le partage se déclenche
      aussi depuis la liste latérale, sur une conversation qui n'est pas
      forcément celle qu'on lit. */
  const [shareId, setShareId] = useState<string | null>(null);
  const online = useOnlineStatus();
  // Palette `/` (commandes) et `@` (modèles) ouverte sous le curseur.
  const [palette, setPalette] = useState<{
    kind: "slash" | "at";
    start: number;
    query: string;
  } | null>(null);
  const [paletteIndex, setPaletteIndex] = useState(0);
  // Tâche de navigation web détectée → fenêtre dédiée de l'Agent Navigateur.
  const [browserGoal, setBrowserGoal] = useState<string | null>(null);
  const urlConvAttempted = useRef(false);
  const [attachedDoc, setAttachedDoc] = useState<UploadedDocument | null>(null);
  // Langue de réponse définie dans les préférences ("fr", "en", "ar"… ou
  // "auto") — envoyée à chaque tour pour que l'IA réponde TOUJOURS dans la
  // langue choisie, pas dans celle détectée du message.
  const preferredLangRef = useRef<string>("auto");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  /** L'aperçu de l'image jointe, fabriqué depuis le fichier LOCAL.
   *
   * POURQUOI PAS UNE URL DU SERVEUR
   * -------------------------------
   * Le serveur ne rend qu'un identifiant, un nom et un type — pas d'adresse
   * consultable. Attendre qu'il en fournisse une reporterait l'aperçu à
   * plus tard ; le fichier est déjà dans le navigateur, il n'y a rien à
   * attendre.
   *
   * Conséquence utile : l'aperçu s'affiche DÈS le choix du fichier, avant même
   * la fin de l'import. On voit ce qu'on envoie pendant que ça part. */
  const [apercuJoint, setApercuJoint] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const whisperRecRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dictationBaseRef = useRef("");
  /** Dictée abandonnée : les transcriptions en vol ne doivent plus écrire dans
   * le champ, et la passe finale de Whisper doit être sautée. */
  const dictationCancelRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Le brouillon non envoyé, relu au retour. Voir l'effet plus bas. */
  const BROUILLON = "toumai:brouillon";
  const guestAttempted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>("");
  const stickToBottomRef = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  /** Vrai dès que la conversation passe sous la barre supérieure — celle-ci
   * prend alors son voile et son filet (elle reste invisible au repos). */
  const [scrolled, setScrolled] = useState(false);
  /** Écran étroit : le rappel « /commandes, @modèle » du champ de saisie y
   * passait à la ligne et doublait la hauteur du composeur au repos. */
  const [narrow, setNarrow] = useState(false);

  /** DISCUSSION ÉPHÉMÈRE — rien de ce fil n'est écrit nulle part.
   *
   * Le drapeau part à CHAQUE tour : il n'y a pas de « session éphémère » côté
   * serveur, et un mode qui ne vivrait que dans la page serait une promesse
   * invérifiable — l'écran dirait « rien n'est enregistré » pendant que la
   * base, elle, enregistrerait. */
  const [ephemeral, setEphemeral] = useState(false);
  /** Adresses des images nées dans le fil éphémère : elles passent forcément
   * par R2 (c'est l'upload qui leur donne une adresse), et sont effacées à la
   * fermeture du fil — sinon « rien n'est enregistré » serait faux à moitié. */
  const ephemeralMediaRef = useRef<Set<string>>(new Set());
  // Calculé après montage (pas au rendu serveur statique) pour éviter un
  // écart d'hydratation lié au fuseau horaire du visiteur.
  useEffect(() => {
    setGreeting(timeGreeting());
    // ELLE DOIT SUIVRE L'HEURE, PAS CELLE DU CHARGEMENT.
    //
    // Un onglet reste ouvert des heures. Sans cette horloge, quelqu'un qui
    // ouvre l'application à 11 h 55 lit encore « Bonjour » à 20 h — et le
    // défaut se voit précisément chez les gens qui utilisent le produit le
    // plus longtemps.
    const horloge = setInterval(() => setGreeting(timeGreeting()), 60_000);
    return () => clearInterval(horloge);
  }, []);

  // ── LE BROUILLON QUI SURVIT ─────────────────────────────────────────────
  //
  // On tape trois phrases, on va vérifier quelque chose ailleurs, on revient :
  // tout avait disparu. Ce n'est pas une commodité, c'est du travail perdu —
  // et c'est le genre de perte qu'on n'ose plus risquer, donc on cesse
  // d'écrire de longs messages.
  //
  // `sessionStorage` et non `localStorage` : un brouillon appartient à
  // l'onglet où on l'écrit. Le partager entre onglets ferait apparaître dans
  // l'un ce qu'on tape dans l'autre.
  useEffect(() => {
    try {
      const garde = window.sessionStorage.getItem(BROUILLON);
      if (garde) setInput(garde);
    } catch {
      // Navigation privée, stockage refusé : on s'en passe. Perdre un
      // brouillon est regrettable ; empêcher d'écrire le serait davantage.
    }
  }, []);

  // ── LE CURSEUR DANS LE CHAMP, DÈS L'OUVERTURE ──────────────────────────
  //
  // Sur un écran dont le champ de saisie est le seul point d'entrée, faire
  // cliquer avant de pouvoir écrire est un geste de trop, répété à chaque
  // visite.
  //
  // DÉPENDANT DE `loading`, ET PAS AU SEUL MONTAGE. Le champ n'existe pas
  // encore tant que l'authentification n'a pas répondu : un focus posé au
  // montage tombait sur un élément absent, et ne faisait rien du tout. C'est
  // exactement ce qui se passait — vérifié dans le navigateur, `activeElement`
  // restait `BODY`.
  //
  // Sauf sur mobile : y donner le focus ouvre le clavier par-dessus la
  // conversation, et cache justement ce qu'on venait lire.
  const focusPose = useRef(false);

  /**
   * Référence de rappel : elle se déclenche À L'INSTANT où le champ entre
   * dans le document, pas avant.
   *
   * POURQUOI PAS UN `useEffect`
   * ---------------------------
   * J'ai d'abord posé le focus dans un effet au montage, puis dans un effet
   * dépendant de `loading`. Les deux échouaient, et le navigateur l'a montré :
   * `activeElement` restait `BODY`. Le champ n'existe pas encore quand ces
   * effets tournent — il apparaît plus tard, quand la session est résolue, et
   * aucune dépendance ne redéclenche l'effet à ce moment-là.
   *
   * Un rappel de référence n'a pas ce problème : React l'appelle avec
   * l'élément, quand l'élément est là.
   */
  const attacherChamp = useCallback((el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    // DÉMONTAGE : on relâche le verrou.
    //
    // React remonte les composants en développement (mode strict) : le champ
    // est monté, démonté, remonté. Un verrou « une seule fois » posé au
    // premier montage faisait donc porter le focus sur un élément aussitôt
    // jeté, et refusait de le reposer sur celui qui reste. Vérifié dans le
    // navigateur : `activeElement` restait `BODY`.
    if (!el) {
      focusPose.current = false;
      return;
    }
    if (focusPose.current) return;

    // LE CRITÈRE EST LE CLAVIER, PAS LA LARGEUR.
    //
    // J'avais écrit `min-width: 768px`. Le navigateur l'a démenti : au moment
    // où la référence se déclenche, la fenêtre mesure encore 0 — la garde
    // était donc toujours fausse, et le focus n'était jamais posé. Mesuré,
    // pas supposé : une sonde temporaire n'a jamais été atteinte.
    //
    // Ce qu'on veut vraiment éviter, ce n'est pas un petit écran : c'est
    // qu'un clavier surgisse par-dessus la conversation qu'on venait lire.
    // `(hover: hover) and (pointer: fine)` désigne exactement les appareils à
    // souris, et ne dépend d'aucune dimension encore inconnue.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    focusPose.current = true;
    // Après la peinture, pas pendant l'attachement : focaliser un élément que
    // le navigateur n'a pas encore affiché est au mieux inutile.
    requestAnimationFrame(() => el.focus());
  }, []);

  // Écrit à chaque frappe, effacé à l'envoi (voir l'envoi plus bas).
  useEffect(() => {
    try {
      if (input) window.sessionStorage.setItem(BROUILLON, input);
      else window.sessionStorage.removeItem(BROUILLON);
    } catch {
      // Voir plus haut.
    }
  }, [input]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
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
    setScrolled(el.scrollTop > 8);
  }

  function scrollToBottom() {
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Auto-grandissement de la zone de saisie au fil de la frappe.
  //
  // La mesure est repoussée d'une frame : au tout premier rendu, la feuille de
  // style n'est pas encore appliquée (le champ n'a ni sa largeur ni sa
  // hauteur max), `scrollHeight` renvoyait alors une valeur aberrante et le
  // composeur vide s'ouvrait figé à 200 px de haut. Mesurer après peinture
  // donne la hauteur réelle du contenu.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const measure = () => {
      el.style.height = "auto";
      const content = el.scrollHeight;
      el.style.height = `${Math.min(content, 200)}px`;
      // La barre de défilement ne doit apparaître qu'une fois le champ plafonné :
      // l'arrondi du calcul de hauteur suffisait à faire surgir un liseré
      // permanent au bord droit d'un composeur d'une seule ligne.
      el.style.overflowY = content > 200 ? "auto" : "hidden";
    };
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [input]);

  function clearError() {
    setError(null);
    setErrorSticky(false);
  }

  // Effacement automatique — mais seulement pour ce qui n'appelle aucune
  // action. Une panne réseau qui disparaît toute seule au bout de 6 secondes
  // laisse l'utilisateur devant un écran muet sans savoir ce qui s'est passé :
  // ces messages-là restent jusqu'à ce qu'on les ferme ou qu'un envoi réussisse.
  useEffect(() => {
    if (!error || errorSticky) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error, errorSticky]);

  /** Efface les images du fil éphémère qu'on quitte. Quitter un fil éphémère,
   * c'est le détruire — y compris ce qu'il a produit. */
  const purgeEphemeral = useCallback(() => {
    const urls = [...ephemeralMediaRef.current];
    ephemeralMediaRef.current = new Set();
    if (urls.length) void purgeEphemeralMedia(urls);
  }, []);

  // Onglet fermé ou rechargé pendant un fil éphémère : les images partent quand
  // même (requête `keepalive`). Sans ça, fermer l'onglet les laissait en ligne.
  useEffect(() => {
    if (!ephemeral) return;
    const onLeave = () => purgeEphemeral();
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [ephemeral, purgeEphemeral]);

  /** Ouvre ou referme la discussion éphémère. La fermer détruit son contenu et
   * repart sur un fil vide : ses messages n'existent nulle part, il n'y a rien
   * à retrouver. */
  function toggleEphemeral() {
    purgeEphemeral();
    setEphemeral((on) => !on);
    setActiveSessionId(null);
    setUrlConversation(null);
    setMessages([]);
    clearError();
  }

  // Chargement de l'historique quand l'utilisateur change de conversation.
  // Cache persistant : la conversation s'affiche instantanément depuis le
  // localStorage (zéro squelette au retour), puis se revalide en arrière-plan.
  async function openSession(id: string) {
    // Ouvrir une conversation enregistrée SORT du mode éphémère : sinon
    // l'écran montrerait un fil de la base pendant que les nouveaux messages
    // ne seraient jamais enregistrés.
    if (ephemeral) {
      purgeEphemeral();
      setEphemeral(false);
    }
    setActiveSessionId(id);
    setUrlConversation(id);
    const cached = cacheSeed<Message[]>(`chat:history:${id}`);
    if (cached && cached.length) {
      setMessages(cached);
      setHistoryLoading(false);
    } else {
      setHistoryLoading(true);
    }
    clearError();
    try {
      const history = await getHistory(id);
      const mapped: Message[] = history.map((m) => ({
        id: m.id,
        serverId: m.id,
        role: m.role,
        content: m.content,
        imageUrls: m.metadata?.image_urls,
        sources: m.metadata?.sources,
        searchImages: m.metadata?.search_images,
        // Le panneau « Réflexion » reste disponible en rouvrant la conversation.
        reasoning: m.metadata?.reasoning,
        reasoningMs: m.metadata?.reasoning_ms,
      }));
      setMessages(mapped);
      // On borne à 60 messages en cache : assez pour un retour instantané,
      // sans saturer le quota localStorage sur les longues conversations.
      cacheWrite(`chat:history:${id}`, mapped.slice(-60));
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      lastUserMessageRef.current = lastUser?.content ?? "";
    } catch (err) {
      const friendly = describeError(err, "history");
      // Conversation inexistante ou appartenant à une autre session (ancien
      // lien, compte changé) : on repart proprement sur un nouveau chat au
      // lieu de laisser une erreur 404 « Session introuvable » à l'écran.
      if (friendly.kind === "not-found") {
        setActiveSessionId(null);
        setUrlConversation(null);
        setMessages([]);
        setError("Cette conversation n'est plus accessible avec ce compte — nouvelle conversation ouverte.");
      } else if (friendly.message) {
        setError(friendly.message);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  function newChat() {
    // On reste en éphémère si on y était, mais le fil quitté est détruit.
    purgeEphemeral();
    setActiveSessionId(null);
    setUrlConversation(null);
    setMessages([]);
    clearError();
  }


  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    // UNE PIÈCE JOINTE SEULE SUFFIT À PARTIR.
    //
    // Cette garde exigeait du texte. J'avais activé le bouton d'envoi sans la
    // corriger : le bouton s'allumait, le clic partait, et `send` sortait
    // aussitôt. Un bouton qui a l'air actif et ne fait rien est PIRE qu'un
    // bouton grisé — le premier laisse croire à une panne, le second dit ce
    // qu'il attend. Constaté dans le navigateur : aucun appel réseau après le
    // clic.
    if ((!text && !attachedDoc) || sending || !session) return;
    // Demande de navigation web → l'Agent Navigateur prend le relais dans sa
    // fenêtre dédiée (l'utilisateur n'a plus à le lancer manuellement).
    // Second garde-fou : une édition de site (prompt de patch contenant le HTML
    // courant, donc plein d'URL) ne doit jamais partir vers l'agent.
    const isCodePrompt = text.includes("```") || /<{7}\s*SEARCH/i.test(text);
    if (!isCodePrompt && detectBrowserGoal(text)) {
      setInput("");
      setBrowserGoal(text);
      return;
    }
    setInput("");
    clearError();
    stickToBottomRef.current = true;
    lastUserMessageRef.current = text;

    const isFirstMessage = messages.length === 0;
    const userMsg: Message = {
      id: nextId(),
      role: "user",
      content: text,
      // La pièce part avec le message et reste visible dans le fil.
      ...(attachedDoc
        ? { piece: { nom: attachedDoc.filename, apercu: apercuJoint ?? undefined } }
        : {}),
    };
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
    clearError();
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
   * branche) et relance la génération à partir de là. */
  async function editMessage(id: string, newContent: string) {
    if (sending || !session) return;
    clearError();
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
      // On lâche la référence SANS révoquer l adresse : le message du fil
      // affiche desormais la même vignette, et la révoquer y laisserait un
      // cadre vide.
      setApercuJoint(null);
      // ÉPHÉMÈRE : le contexte voyage AVEC la requête. Sans identifiant de
      // conversation, le serveur n'a rien à relire — chaque message serait le
      // premier, et « résume ce que je viens de dire » ne répondrait rien.
      const ephemeralHistory: HistoryTurn[] = ephemeral
        ? messages
            .filter((m) => m.content && !m.streaming)
            .map((m) => ({ role: m.role, content: m.content }))
            .slice(-20)
        : [];
      const ephemeralLastImage = ephemeral
        ? [...messages].reverse().find((m) => m.imageUrls?.length)?.imageUrls?.slice(-1)[0]
        : undefined;
      await streamChat(
        {
          message: text,
          sessionId: activeSessionId,
          modelPreference: model,
          language: preferredLangRef.current,
          webSearch,
          documentId,
          ephemeral,
          history: ephemeralHistory,
          lastImageUrl: ephemeralLastImage,
        },
        (evt) => {
          if (evt.chunk) {
            acc += evt.chunk;
            onChunk?.(evt.chunk);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
            );
          }
          // En éphémère, `session_id` revient vide : rien n'a été créé, il n'y
          // a pas d'adresse à poser sur cette conversation.
          if (!ephemeral && evt.session_id && evt.session_id !== activeSessionId) {
            setActiveSessionId(evt.session_id);
            setUrlConversation(evt.session_id);
          }
          // Ce que Toumaï fait avant de répondre (recherche web) : affiché
          // pendant l'attente, puis remplacé par les sources réellement
          // consultées. Sans ça, trois points immobiles pendant six secondes.
          if (evt.metadata?.activity) {
            const act = evt.metadata.activity;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, activity: act } : m)),
            );
          }
          if (evt.metadata?.sources && !evt.done) {
            const srcs = evt.metadata.sources;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, sources: srcs, activity: undefined } : m,
              ),
            );
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
            const sources = evt.metadata?.sources;
            const searchImages = evt.metadata?.search_images;
            const modelNotice = evt.metadata?.model_notice;
            const reasoning = evt.metadata?.reasoning;
            const reasoningMs = evt.metadata?.reasoning_ms;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === assistantId) {
                  return {
                    ...m,
                    streaming: false,
                    serverId: evt.message_id,
                    imageUrls: imageUrls?.length ? imageUrls : m.imageUrls,
                    sources: sources?.length ? sources : m.sources,
                    searchImages: searchImages?.length ? searchImages : m.searchImages,
                    // Rétrogradation de modèle : on l'affiche, on ne la cache pas.
                    modelNotice: modelNotice ?? m.modelNotice,
                    // Trace de raisonnement réelle (panneau « Réflexion »).
                    reasoning: reasoning ?? m.reasoning,
                    reasoningMs: reasoningMs ?? m.reasoningMs,
                    // Action sensible (WhatsApp/mail) : la carte
                    // Confirmer/Annuler déclenche la vraie exécution.
                    toolConfirmation: toolConfirmation ?? m.toolConfirmation,
                  };
                }
                if (userMsgId && m.id === userMsgId) return { ...m, serverId: evt.user_message_id };
                return m;
              }),
            );
            // Images nées dans un fil éphémère : on retient leur adresse pour
            // les effacer de R2 à la fermeture du fil.
            if (ephemeral && imageUrls?.length) {
              imageUrls.forEach((u) => ephemeralMediaRef.current.add(u));
            }
            // Nouvelle conversation créée : rafraîchit la sidebar pour
            // l'afficher, et relit le titre que l'IA vient de lui donner (le
            // backend l'écrit juste après ce tour).
            if (isFirstMessage && !ephemeral) {
              setSidebarRefreshKey((k) => k + 1);
              const id = evt.session_id || activeSessionId;
              // Second passage : au premier, la conversation porte encore son
              // nom provisoire — l'IA la nomme juste APRÈS la fin du tour.
              // Sans ce rappel, la barre latérale gardait « Nouvelle
              // conversation » jusqu'au prochain chargement de page.
              if (id) setTimeout(() => setSidebarRefreshKey((k) => k + 1), 1800);
            }
          }
          if (evt.error) {
            throw new Error(evt.error);
          }
        },
        controller.signal,
      );
    } catch (err) {
      // `describeError` couvre l'interruption volontaire (bouton Arrêter), le
      // hors-ligne, le serveur qui redémarre… et renvoie une phrase vide quand
      // il n'y a rien à dire.
      const friendly = describeError(err, "chat");
      if (friendly.message) {
        setError(friendly.message);
        // Réseau, serveur, session expirée : rien ne repartira tant que la
        // personne n'agit pas — le message doit rester à l'écran.
        setErrorSticky(
          ["offline", "unreachable", "server", "unauthorized", "timeout"].includes(friendly.kind),
        );
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
  /** Valide la dictée : le texte transcrit reste dans le champ. */
  function acceptDictation() {
    dictationCancelRef.current = false;
    recognitionRef.current?.stop();
    stopWhisperDictation();
    textareaRef.current?.focus();
  }

  /** Abandonne la dictée : le champ retrouve ce qu'il contenait avant. Sans ce
   * chemin, la seule sortie était de garder une transcription qu'on ne voulait
   * pas et de l'effacer à la main. */
  function cancelDictation() {
    dictationCancelRef.current = true;
    recognitionRef.current?.stop();
    stopWhisperDictation();
    setInput(dictationBaseRef.current);
  }

  function toggleDictation() {
    if (dictating) {
      acceptDictation();
      return;
    }
    dictationCancelRef.current = false;
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
      if (dictationCancelRef.current) return;
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      const base = dictationBaseRef.current;
      setInput(base ? `${base} ${transcript}` : transcript);
    };
    recognition.onend = () => setDictating(false);
    recognition.onerror = (e) => {
      setDictating(false);
      if (e.error === "not-allowed" || e.error === "audio-capture") {
        setError(microphoneErrorMessage(e.error));
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
    } catch (err) {
      setError(microphoneErrorMessage(err instanceof Error ? err.name : "not-allowed"));
      return;
    }
    dictationBaseRef.current = input;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    whisperRecRef.current = recorder;
    let transcribing = false;

    async function transcribeSoFar(final = false) {
      if (transcribing && !final) return; // pas de transcriptions concurrentes
      if (dictationCancelRef.current || !chunks.length) return;
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
      if (dictationCancelRef.current) return; // dictée abandonnée : rien à écrire
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

  /** Fabrique l'aperçu d'une image. Les autres formats gardent leur icône. */
  function poserApercu(file: File) {
    oublierApercu();
    if (file.type.startsWith("image/")) {
      setApercuJoint(URL.createObjectURL(file));
    }
  }

  /** Rend la mémoire de l'aperçu.
   *
   * `createObjectURL` réserve le fichier tant qu'on ne le révoque pas : sans
   * cet appel, joindre vingt images dans une session en garderait vingt en
   * mémoire jusqu'à la fermeture de l'onglet. */
  function oublierApercu() {
    setApercuJoint((prec) => {
      if (prec) URL.revokeObjectURL(prec);
      return null;
    });
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (10 Mo max).");
      return;
    }
    poserApercu(file);
    setUploadingDoc(true);
    clearError();
    try {
      const doc = await uploadDocument(file);
      setAttachedDoc(doc);
    } catch (err) {
      setError(errorMessage(err, "upload"));
    } finally {
      setUploadingDoc(false);
    }
  }

  /** Import d'un fichier venant du glisser-déposer ou du presse-papiers —
   * même chemin que le sélecteur de fichiers, mêmes contrôles de taille. */
  const importFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (10 Mo max).");
      return;
    }
    poserApercu(file);
    setUploadingDoc(true);
    clearError();
    try {
      const doc = await uploadDocument(file);
      setAttachedDoc(doc);
    } catch (err) {
      setError(errorMessage(err, "upload"));
    } finally {
      setUploadingDoc(false);
    }
  }, []);

  // Le backend n'accepte qu'une pièce jointe par message : on prend la première
  // et on le dit, plutôt que d'en perdre silencieusement.
  const onDroppedFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      if (files.length > 1) setError("Un seul fichier par message — le premier a été retenu.");
      void importFile(files[0]);
    },
    [importFile],
  );

  // Collage d'une image depuis le presse-papiers (capture d'écran, copie web).
  useClipboardImage(onDroppedFiles, Boolean(session));

  // ── Commandes `/` et mentions `@` ────────────────────────────────────────
  // Chaque commande déclenche une action qui existe déjà dans cette page :
  // rien n'est listé ici qui ne soit réellement branché.

  // « / » ne porte plus que des ACTIONS. Les modèles sont derrière « @ », le
  // fichier et la recherche web dans la carte des outils : la même chose
  // proposée à trois endroits n'aide personne à la trouver.
  const slashCommands: (PaletteItem & { run: () => void })[] = [
    {
      id: "vocal",
      trigger: "vocal",
      label: "Ouvrir le mode vocal",
      hint: "Parler à Toumaï et écouter sa réponse",
      keywords: ["voix", "micro", "parler"],
      disabledReason: session ? undefined : "Connectez-vous pour utiliser la voix",
      run: () => setVoiceModeOpen(true),
    },
    {
      id: "nouveau",
      trigger: "nouveau",
      label: "Nouvelle conversation",
      keywords: ["reset", "recommencer"],
      run: newChat,
    },
    {
      id: "ephemere",
      trigger: "ephemere",
      label: ephemeral ? "Fermer la discussion éphémère" : "Discussion éphémère",
      hint: "Rien n'est enregistré : ni historique, ni mémoire",
      keywords: ["incognito", "privé", "temporaire", "éphémère"],
      run: toggleEphemeral,
    },
    {
      id: "partager",
      trigger: "partager",
      label: "Partager cette conversation",
      keywords: ["lien", "envoyer"],
      disabledReason: activeSessionId ? undefined : "Disponible une fois la conversation commencée",
      run: () => setShareId(activeSessionId),
    },
  ];

  const paletteItems: PaletteItem[] =
    palette?.kind === "at"
      ? filterPalette(
          SELECTABLE_MODELS.map((m) => ({
            id: m.id,
            trigger: m.name,
            label: m.name,
            hint: m.tagline,
            color: m.color,
            keywords: [m.tagline],
          })),
          palette.query,
        )
      : palette
        ? filterPalette(slashCommands, palette.query)
        : [];

  /** Retire le `/xxx` ou `@xxx` en cours de frappe. */
  function stripTrigger() {
    if (!palette) return;
    const caret = palette.start + 1 + palette.query.length;
    setInput((v) => v.slice(0, palette.start) + v.slice(caret));
    setPalette(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = palette.start;
    });
  }

  function runPaletteItem(item: PaletteItem) {
    if (item.disabledReason) return;
    stripTrigger();
    if (palette?.kind === "at") {
      setModel(item.id);
      return;
    }
    slashCommands.find((c) => c.id === item.id)?.run();
  }

  function syncPalette(value: string, caret: number) {
    const found = detectTrigger(value, caret);
    setPalette(found);
    setPaletteIndex(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (palette && paletteItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteIndex((i) => (i + 1) % paletteItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteIndex((i) => (i - 1 + paletteItems.length) % paletteItems.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        runPaletteItem(paletteItems[paletteIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPalette(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // UNE PIÈCE JOINTE SEULE EST UNE DEMANDE.
  //
  // Le bouton exigeait du texte : joindre une photo puis appuyer sur Entrée
  // ne faisait rien, sans que rien ne dise pourquoi. Or « voici une image »
  // se passe très bien de mots — c'est même le geste le plus naturel.
  //
  // On attend en revanche la FIN de l'import : partir avant, c'est envoyer un
  // message qui référence un document que le serveur n'a pas encore.
  const canSend =
    (Boolean(input.trim()) || Boolean(attachedDoc)) &&
    !uploadingDoc &&
    !sending &&
    Boolean(session);

  return (
    <div className="chat-shell flex h-dvh overflow-hidden">
      <Sidebar
        activeId={activeSessionId}
        onSelect={openSession}
        onNewChat={newChat}
        onShare={setShareId}
        refreshKey={sidebarRefreshKey}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure — flottante au-dessus de la conversation : elle ne
            se matérialise (voile + filet) que lorsque du contenu passe
            dessous, et porte le titre de la conversation en cours. */}
        <header
          data-scrolled={scrolled}
          className="chat-topbar absolute inset-x-0 top-0 z-20 flex h-14 select-none items-center gap-2 px-3 md:px-4"
        >
          {/* Ouvrir les conversations. La marque ne sert PAS de bouton ici :
              un logo n'annonce pas ce que le clic va faire, et il doublait
              celui de la barre latérale juste à côté. */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir les conversations"
            title="Ouvrir les conversations"
            className="chat-iconbtn md:hidden"
          >
            <PanelOpenIcon />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {ephemeral && (
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                style={{
                  border: "1px solid color-mix(in srgb, var(--primary) 35%, transparent)",
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "var(--primary)",
                }}
              >
                <EphemeralIcon />
                Éphémère
              </span>
            )}
            {/* Pas de titre de conversation ici : il répétait mot pour mot le
                message affiché juste en dessous, et il tenait la place d'un
                nom que l'IA n'avait pas encore donné. Le nom du fil vit dans la
                barre latérale, là où il sert à retrouver la conversation. */}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={toggleEphemeral}
              aria-label="Discussion éphémère"
              aria-pressed={ephemeral}
              title={
                ephemeral
                  ? "Fermer la discussion éphémère"
                  : "Discussion éphémère — rien n'est enregistré"
              }
              data-active={ephemeral}
              className="chat-iconbtn"
            >
              <EphemeralIcon />
            </button>
            {messages.length > 0 && (
              <button
                onClick={newChat}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
                className="chat-iconbtn"
              >
                <ComposeIcon />
              </button>
            )}
            {!ephemeral && activeSessionId && messages.length > 0 && (
              <button
                onClick={() => setShareId(activeSessionId)}
                aria-label="Partager la conversation"
                title="Partager la conversation"
                className="chat-iconbtn"
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
        <main
          ref={mainRef}
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden pt-14"
        >
          <div className="mx-auto flex min-h-full w-full max-w-[var(--chat-measure)] flex-col gap-7 px-4 pb-10 pt-4 sm:px-6">
            {historyLoading && <HistorySkeleton />}

            {!historyLoading && messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center px-1 py-8">
                {/* Marque en tête d'accueil : un halo doux derrière le logo —
                    l'écran vide portait uniquement du texte et ne ressemblait
                    à aucun produit en particulier. */}
                <div className="relative mb-5 flex h-14 w-14 items-center justify-center sm:mb-7">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{
                      background:
                        "radial-gradient(circle, color-mix(in srgb, var(--primary) 45%, transparent), transparent 70%)",
                    }}
                  />
                  <Logo size={46} className="relative" />
                </div>
                {ephemeral ? (
                  <>
                    {/* Ce que le mode change, dit AVANT le premier message —
                        un mode qui masquerait seulement la conversation à
                        l'écran serait une promesse invérifiable. */}
                    <h2 className="landing-serif text-center text-[30px] leading-[1.12] tracking-tight text-[var(--text-primary)] sm:text-[38px]">
                      Vous êtes en discussion éphémère.
                    </h2>
                    <p className="mt-4 max-w-md text-center text-[14px] leading-relaxed text-[var(--text-tertiary)] sm:text-[15px]">
                      Rien n&apos;est enregistré : ni dans votre historique, ni dans la
                      mémoire de Toumaï AI. Les images produites ici sont effacées à
                      la fermeture du fil.
                    </p>
                    <Link
                      href="/privacy"
                      className="mt-3 text-[13.5px] underline decoration-[color-mix(in_srgb,var(--primary)_45%,transparent)] underline-offset-4 transition hover:decoration-[var(--primary)]"
                      style={{ color: "var(--primary-light)" }}
                    >
                      En savoir plus sur l&apos;usage de vos données
                    </Link>
                  </>
                ) : (
                  <h2 className="landing-serif text-center text-[34px] leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-[42px]">
                    {greeting}
                    {firstName && (
                      <>
                        ,{" "}
                        <em style={{ color: "var(--primary)" }}>{firstName}.</em>
                      </>
                    )}
                  </h2>
                )}
              </div>
            )}

            {!historyLoading &&
              messages.map((m, i) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  isLast={i === messages.length - 1}
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

        {/* Retour au dernier message — flotte juste au-dessus du composeur.
            Placé DANS la zone défilante, il descendait avec le contenu au lieu
            de rester à portée de clic. */}
        {showScrollDown && (
          <div className="pointer-events-none relative z-10 h-0" aria-hidden={false}>
            <button
              onClick={scrollToBottom}
              aria-label="Aller au dernier message"
              title="Aller au dernier message"
              className="chat-iconbtn pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 border"
              style={{
                borderColor: "var(--border)",
                background: "var(--card)",
                color: "var(--text-secondary)",
                boxShadow: "var(--chat-elev-1)",
              }}
            >
              <ChevronDownIcon />
            </button>
          </div>
        )}

        {/* Perte de réseau : bandeau permanent tant que ça dure, distinct de
            l'erreur ponctuelle — l'utilisateur n'a pas la même chose à faire. */}
        {!online && (
          <div
            role="status"
            className="mx-auto mb-2 flex w-fit max-w-[90%] items-center gap-2 rounded-full px-3.5 py-1.5 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text-secondary)",
            }}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: "var(--text-tertiary)" }}
            />
            Hors ligne — vos messages partiront dès le retour de la connexion.
          </div>
        )}

        {/* Erreur ponctuelle — non bloquante, refermable. */}
        {error && online && (
          <div
            role="alert"
            className="mx-auto mb-2 flex w-fit max-w-[90%] items-start gap-2.5 rounded-xl border px-3.5 py-2 text-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--error) 35%, transparent)",
              background: "color-mix(in srgb, var(--error) 8%, transparent)",
              color: "var(--text-primary)",
            }}
          >
            <span>{error}</span>
            <button
              onClick={clearError}
              aria-label="Masquer ce message"
              className="shrink-0 text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          </div>
        )}

        {/* Saisie — glisser-déposer actif sur toute la zone du composeur. */}
        {/* SUR L'ÉCRAN VIDE, LA SAISIE REMONTE AVEC LA SALUTATION.
            Collé au bas de l'écran, le champ laissait un grand vide entre la
            salutation et lui — on lisait en haut, on écrivait tout en bas.
            Le décalage ne s'applique QUE tant que rien n'a été dit : dès le
            premier message, le champ reprend sa place, là où on l'attend
            pendant qu'on lit une conversation. */}
        <footer
          className={`chat-dock relative px-4 pt-1 sm:px-6 ${
            messages.length === 0 && !historyLoading ? "pb-[7vh]" : "pb-3"
          }`}
        >
          <DropZone onFiles={onDroppedFiles} accept="image/*,.pdf,.docx,.xlsx">
          <div className="mx-auto flex w-full max-w-[var(--chat-measure)] flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.gif"
              onChange={onFilePicked}
            />
            {palette && paletteItems.length > 0 && !dictating && (
              <CommandPalette
                items={paletteItems}
                activeIndex={paletteIndex}
                onHover={setPaletteIndex}
                onPick={runPaletteItem}
                footer={
                  palette.kind === "at"
                    ? "↑↓ pour choisir, Entrée pour appliquer le modèle"
                    : "↑↓ pour choisir, Entrée pour lancer, Échap pour fermer"
                }
              />
            )}
            {/* Composer en DEUX rangées : la zone de texte occupe toute la
                largeur (elle ne se coince plus entre les icônes), les
                contrôles vivent sur leur propre ligne en dessous. */}
            <div className="chat-composer px-2.5 pb-2 pt-1.5">
              {/* Le fichier joint devient un jeton DANS le champ : il porte un
                  nom qu'on ne lit nulle part ailleurs, et l'oublier ferait
                  partir un message sans sa pièce jointe. La recherche web, elle,
                  n'a pas besoin de mots : son icône allumée dans la barre suffit
                  — un libellé pour un état déjà visible encombre le champ. */}
              <div className="flex flex-wrap items-center gap-1.5 px-1.5 pt-1">
                {/* ON MONTRE L'IMAGE, PAS SON NOM DE FICHIER.
                    « Capture d'écran 2026-07-24 152219.jpg » ne dit rien de ce
                    qu'on s'apprête à envoyer ; la vignette le dit d'un coup
                    d'œil, et permet de voir qu'on s'est trompé de fichier
                    AVANT d'appuyer sur Entrée. */}
                {apercuJoint ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={apercuJoint}
                      alt={attachedDoc?.filename ?? "Image jointe"}
                      className="h-16 w-16 rounded-lg border border-[var(--border)] object-cover"
                    />
                    {uploadingDoc && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-[11px] text-white">
                        …
                      </div>
                    )}
                    {attachedDoc && !uploadingDoc && (
                      <button
                        onClick={() => {
                          setAttachedDoc(null);
                          oublierApercu();
                        }}
                        aria-label="Retirer la pièce jointe"
                        title="Retirer"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] leading-none text-[var(--text-secondary)] shadow transition hover:text-[var(--text-primary)]"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  (attachedDoc || uploadingDoc) && (
                    <ComposerChip
                      icon={<FileIcon />}
                      label={uploadingDoc ? "Import en cours…" : (attachedDoc?.filename ?? "")}
                      tone="accent"
                      onRemove={attachedDoc ? () => setAttachedDoc(null) : undefined}
                    />
                  )
                )}
              <textarea
                ref={attacherChamp}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  syncPalette(e.target.value, e.target.selectionStart ?? e.target.value.length);
                }}
                onKeyUp={(e) => {
                  // Déplacement du curseur aux flèches / clic : la palette doit
                  // suivre ce qui est réellement sous le curseur.
                  const el = e.currentTarget;
                  if (e.key.startsWith("Arrow") && !palette) {
                    syncPalette(el.value, el.selectionStart ?? 0);
                  }
                }}
                onBlur={() => setPalette(null)}
                onKeyDown={onKeyDown}
                placeholder={
                  dictating
                    ? "Parlez, la transcription s'écrit ici…"
                    : narrow
                      ? "Écrivez à Toumaï AI…"
                      : "Écrivez à Toumaï AI…  «/» commandes, «@» modèle"
                }
                rows={1}
                disabled={!session}
                // Pendant la dictée, le texte s'affiche en italique atténué :
                // c'est une transcription en cours, pas encore un message.
                className={`chat-input min-w-[12rem] flex-1 resize-none bg-transparent px-0 pb-1 pt-0.5 text-[15px] leading-relaxed outline-none placeholder:text-[var(--text-tertiary)] ${
                  dictating ? "italic text-[var(--text-tertiary)]" : ""
                }`}
              />
              </div>

              {/* DICTÉE — la barre d'outils cède la place à deux seules
                  décisions : abandonner la transcription, ou la garder. */}
              {dictating ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Importer un fichier"
                    title="Importer un fichier"
                    className="chat-iconbtn"
                  >
                    <PlusIcon />
                  </button>
                  <span className="flex items-center gap-2 pl-1">
                    <Waveform active bars={12} height={20} color="var(--primary)" />
                  </span>
                  <div className="flex-1" />
                  <div
                    className="flex items-center overflow-hidden rounded-full border"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  >
                    <button
                      onClick={cancelDictation}
                      aria-label="Abandonner la dictée"
                      title="Abandonner la dictée"
                      className="flex h-9 w-11 items-center justify-center text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                    >
                      <CloseIcon />
                    </button>
                    <span aria-hidden="true" className="h-5 w-px" style={{ background: "var(--border)" }} />
                    <button
                      onClick={acceptDictation}
                      aria-label="Garder la transcription"
                      title="Garder la transcription"
                      className="flex h-9 w-11 items-center justify-center text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                    >
                      <CheckIcon />
                    </button>
                  </div>
                </div>
              ) : (
              <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setToolsOpen((o) => !o)}
                  aria-label="Outils"
                  title="Outils"
                  aria-expanded={toolsOpen}
                  data-active={toolsOpen}
                  className="chat-iconbtn"
                >
                  <PlusIcon />
                </button>
                {toolsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setToolsOpen(false)} />
                    {/* CARTE DES OUTILS — ce qu'on AJOUTE au message, rien
                        d'autre. L'avatar en direct et l'automatisation IA en
                        sont partis : le premier est une action (il vit dans
                        « / »), la seconde est une page (elle vit dans le menu).
                        Une carte de composeur qui mène ailleurs dans le site
                        n'est plus une carte de composeur. */}
                    <div
                      className="absolute bottom-full left-0 z-20 mb-2 w-[15.5rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5"
                      style={{ boxShadow: "var(--chat-elev-2)" }}
                    >
                      <button
                        onClick={() => {
                          setToolsOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="tools-row"
                      >
                        <span className="tools-icon">
                          <FileIcon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium text-[var(--text-primary)]">
                            Ajouter un fichier
                          </span>
                          <span className="block text-[12px] text-[var(--text-tertiary)]">
                            PDF, Word, Excel, image
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setWebSearch((w) => !w);
                          setToolsOpen(false);
                        }}
                        aria-pressed={webSearch}
                        className="tools-row"
                        data-active={webSearch}
                      >
                        <span className="tools-icon">
                          <GlobeIcon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium text-[var(--text-primary)]">
                            Recherche sur le web
                          </span>
                          <span className="block text-[12px] text-[var(--text-tertiary)]">
                            Sources en ligne, citées
                          </span>
                        </span>
                        {webSearch && (
                          <span className="shrink-0 text-[var(--primary)]">
                            <CheckIcon />
                          </span>
                        )}
                      </button>
                      <Link
                        href="/settings?tab=connectors"
                        className="tools-row"
                        onClick={() => setToolsOpen(false)}
                      >
                        <span className="tools-icon">
                          <PlugIcon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium text-[var(--text-primary)]">
                            Connecteurs
                          </span>
                          <span className="block text-[12px] text-[var(--text-tertiary)]">
                            WhatsApp, mail, agenda
                          </span>
                        </span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
              {/* Recherche web : bascule visible dans la barre, pas seulement
                  enfouie dans le menu — c'est l'option qu'on active et coupe
                  le plus souvent d'un message à l'autre. */}
              {/* L'ÉTAT ACTIF SE VOIT ICI, ET NULLE PART AILLEURS.
                  C'est le seul signal que la recherche web est armée — le jeton
                  qui le disait dans le champ a été retiré. La couleur est posée
                  en ligne plutôt que par une classe : le style de la classe
                  n'était pas appliqué (vérifié dans la construction de
                  production, sélecteur correspondant mais couleur héritée du
                  repos), et un indicateur d'état qui dépend d'un aléa de
                  cascade n'est pas un indicateur. */}
              <button
                onClick={() => setWebSearch((w) => !w)}
                aria-label="Recherche web"
                aria-pressed={webSearch}
                title={webSearch ? "Recherche web activée" : "Chercher sur le web"}
                className="chat-iconbtn"
                style={
                  webSearch
                    ? {
                        color: "var(--primary)",
                        background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                      }
                    : undefined
                }
              >
                <GlobeIcon />
              </button>
              <div className="flex-1" />
              <ModelSelector value={model} onChange={setModel} />
              <button
                onClick={toggleDictation}
                aria-label="Dicter"
                title="Dicter"
                className="chat-iconbtn"
              >
                <MicIcon />
              </button>
              {/* UN SEUL bouton à droite. Champ vide, il ouvre le mode vocal ;
                  dès qu'on écrit, il devient l'envoi et prend l'accent Sahel.
                  Deux pastilles côte à côte pour « parler » et « envoyer »
                  demandaient de choisir avant même d'avoir écrit. */}
              {sending ? (
                <button
                  onClick={stopGenerating}
                  aria-label="Arrêter la génération"
                  title="Arrêter"
                  className="chat-iconbtn"
                  style={{ background: "var(--text-secondary)", color: "var(--background)" }}
                >
                  <StopIcon />
                </button>
              ) : canSend ? (
                <button
                  onClick={() => send()}
                  aria-label="Envoyer le message"
                  title="Envoyer (Entrée)"
                  className="chat-iconbtn chat-send"
                >
                  <SendIcon />
                </button>
              ) : (
                <button
                  onClick={() => setVoiceModeOpen(true)}
                  aria-label="Parler à Toumaï AI"
                  title="Parler à Toumaï AI"
                  disabled={!session}
                  className="chat-iconbtn chat-voice"
                >
                  <VoiceModeIcon />
                </button>
              )}
              </div>
              )}
            </div>
            <p className="px-2 text-center text-[11px] leading-relaxed text-[var(--text-tertiary)]">
              Toumaï AI peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
          </DropZone>
        </footer>
      </div>
      {voiceModeOpen && (
        <VoiceModeOverlay onSend={voiceSend} onClose={() => setVoiceModeOpen(false)} />
      )}
      {shareId && (
        <ShareDialog sessionId={shareId} onClose={() => setShareId(null)} />
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
    <div className="flex flex-1 flex-col gap-7 py-2" aria-hidden="true">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex flex-col gap-2 ${i % 2 === 0 ? "" : "items-end"}`}>
          {i % 2 === 0 && <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--card)]" />}
          <div
            className={`animate-pulse rounded-2xl bg-[var(--card)] ${
              i % 2 === 0 ? "h-16 w-full" : "h-10 w-1/2"
            }`}
            style={{ animationDelay: `${i * 120}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

/** Nouvelle conversation — crayon sur feuille, comme les consoles du marché. */
/** Jeton coloré posé DANS le champ de saisie.
 *
 * L'option active était affichée au-dessus du composeur, dans une bande à
 * part : on l'oubliait, et un message partait en recherche web sans qu'on s'en
 * souvienne. À l'intérieur du champ, elle fait partie de ce qu'on écrit. */
function ComposerChip({
  icon,
  label,
  tone,
  onRemove,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "primary" | "accent";
  onRemove?: () => void;
}) {
  const color = tone === "primary" ? "var(--primary)" : "var(--accent)";
  return (
    <span
      className="flex max-w-[18rem] shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium"
      style={{
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        color,
      }}
    >
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Retirer : ${label}`}
          className="shrink-0 rounded transition hover:opacity-70"
        >
          <ChipCloseIcon />
        </button>
      )}
    </span>
  );
}

function ChipCloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function ComposeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Icône « ouvrir le panneau des conversations » — remplace le logo au survol. */
function PanelOpenIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16M13 10l2.5 2-2.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Discussion éphémère — horloge barrée, le même signe que sur mobile. */
function EphemeralIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.05 11a9 9 0 106.2-8.5" strokeLinecap="round" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3l18 18" strokeLinecap="round" />
    </svg>
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


/** Croix — abandon de la dictée. */
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
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

