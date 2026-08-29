"use client";

import { useEffect, useRef, useState } from "react";
import { transcribeAudio, synthesizeSpeech } from "@/lib/voice-api";
import { getPreferences } from "@/lib/preferences-api";
import { useMicLevels } from "./Waveform";
import { VoiceOrb, ORB, type VoiceOrbPhase } from "./chat/VoiceOrb";
import { NetworkBadge } from "./chat/NetworkBadge";
import { MoniteurReseau, type QualiteReseau } from "@/lib/network-quality";

type Phase = "listening" | "processing" | "speaking" | "error";

// useMicLevels renvoie un plancher artificiel de 0.08 même en silence total
// (pour que les barres restent visibles à l'écran) — un seuil fixe se
// retrouvait donc quasi toujours au-dessus du bruit ambiant réel. On calibre
// désormais le bruit ambiant en tout début d'écoute, puis on exige un
// dépassement net de ce plancher pour considérer que l'utilisateur parle.
const CALIBRATION_MS = 350;
const SPEAKING_MARGIN = 0.13;
const SILENCE_MS_TO_STOP = 1100;
const MIN_RECORD_MS = 500;
const MAX_RECORD_MS = 20000; // garde-fou : ne jamais rester bloqué en écoute
// Une vraie prise de parole = niveau au-dessus du seuil pendant une durée
// SOUTENUE, pas un simple pic (toux, clic, souffle). Sans cela, 2-3 s de
// silence après un bruit bref suffisaient à envoyer du vide à la
// transcription — et l'IA « répondait » à rien.
const SUSTAINED_SPEECH_MS = 280;
const MIN_TOTAL_SPEECH_MS = 400;
// Le MediaRecorder ne livrait un blob qu'à l'arrêt (aucun timeslice), donc
// chunksRef restait vide pendant toute l'écoute — la condition qui exigeait
// des chunks déjà présents avant d'auto-arrêter ne pouvait donc jamais être
// vraie. C'était la cause réelle de l'arrêt automatique qui ne se déclenchait
// jamais (l'utilisateur devait toujours cliquer un bouton manuel).
const RECORDER_TIMESLICE_MS = 250;
const SLOW_RESPONSE_HINT_MS = 6000;

/** Contraintes du micro — les trois demandées, pas « audio: true ».
 *
 * `echoCancellation` est celle qui compte : c'est elle qui permet d'écouter
 * PENDANT que l'assistant parle sans l'entendre lui-même, et donc de couper la
 * parole à la voix. Demander ne suffit pas — on relit ce que la piste applique
 * vraiment avant d'y croire. */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/** Le temps que l'annulation d'écho converge sur le signal de référence.
 * Écouter avant, c'est entendre le haut-parleur. */
const BARGE_WARMUP_MS = 450;
/** Franc, et volontairement plus haut que le seuil d'écoute normale : ce qui
 * reste après annulation d'écho n'est pas du silence parfait. */
const BARGE_THRESHOLD = 0.2;
/** Une parole SOUTENUE, pas un pic : une toux, un claquement de porte ou un
 * raclement de gorge ne doivent pas couper une réponse en cours. */
const BARGE_SUSTAINED_MS = 380;

// Découpe la réponse en phrases complètes dès qu'elles arrivent dans le flux,
// pour lancer la synthèse vocale phrase par phrase (temps réel) plutôt que
// d'attendre la réponse entière avant de commencer à parler.
const SENTENCE_END = /^([\s\S]*?[.!?…:])(\s+|$)/;

// Hallucinations classiques de Whisper sur un audio silencieux/bruité — si la
// transcription ne contient QUE ça, ce n'est pas une vraie question de
// l'utilisateur : on relance l'écoute au lieu d'envoyer du bruit au chat.
const HALLUCINATION_PATTERNS = [
  /merci d'avoir regard/i,
  /n'oubliez pas de (vous )?abonner/i,
  /sous-titr/i,
  /thank(s| you) for watching/i,
  /don't forget to subscribe/i,
  /^(salut|bonjour|allo|coucou)[.!?\s]*$/i,
  /^merci[.!?\s]*$/i,
];

/** Corrections de prononciation pour la synthèse vocale — le nom du créateur
 * se prononce « Fayssal », pas « Faïkal ». */
function fixPronunciation(text: string): string {
  return text.replace(/fay[cç]al/gi, (m) => (m[0] === "F" ? "Fayssal" : "fayssal"));
}

/** Retire la syntaxe markdown avant la synthèse vocale — sinon la voix lit
 * littéralement « astérisque astérisque », les dièses des titres, etc. */
function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ") // blocs de code — illisibles à l'oral
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // liens → texte seul
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "") // puces de liste
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_#|~]/g, " ") // reliquats isolés
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeHallucination(text: string, recordMs: number): boolean {
  const t = text.trim();
  if (!t) return false;
  // Ces phrases n'apparaissent quasi jamais sur un enregistrement de plus de
  // 2.5s avec une vraie voix dedans — seulement sur du silence/bruit bref.
  if (recordMs > 2500) return false;
  return HALLUCINATION_PATTERNS.some((re) => re.test(t));
}

export function VoiceModeOverlay({
  onSend,
  onClose,
}: {
  /** Envoie le texte transcrit dans la conversation ; `onChunk` est appelé
   * pour chaque fragment de la réponse dès qu'il arrive (streaming), et la
   * promesse se résout avec le texte complet une fois le flux terminé. */
  onSend: (text: string, onChunk?: (chunk: string) => void) => Promise<string>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [caption, setCaption] = useState("");
  const [replyCaption, setReplyCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | undefined>(undefined);
  const [slowHint, setSlowHint] = useState(false);
  // MICRO COUPÉ ≠ CONVERSATION FERMÉE.
  //
  // Quelqu'un entre dans la pièce et il faut cesser d'émettre sans quitter
  // l'écran. Le seul bouton micro de cet écran COUPE la prise de son : il ne
  // sert pas à « passer en vocal », on y est déjà.
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  // Écrire quand la voix ne suffit pas : un nom propre, une adresse, une
  // référence exacte que la transcription écorchera toujours.
  const [typed, setTyped] = useState("");
  // Ce que vaut la liaison. Mesuré, pas déduit de `navigator.onLine` : le
  // navigateur dit s'il a une interface active, pas si les paquets arrivent.
  const [reseau, setReseau] = useState<QualiteReseau>("inconnue");
  const moniteurRef = useRef<MoniteurReseau | null>(null);
  // Lecture en cours : ce qui permet de l'ARRÊTER net quand on coupe la parole.
  const speakingRef = useRef(false);
  const interruptRef = useRef(false);
  /** L'annulation d'écho du navigateur est-elle réellement engagée ?
   *
   * C'est toute la différence avec le mobile. Là-bas, la détection
   * d'interruption à la voix a été abandonnée après cinq tentatives : sans
   * annulation d'écho matérielle, le micro entend le haut-parleur et
   * l'assistant se coupe lui-même — cinq fausses interruptions en soixante-
   * quinze secondes, relevées dans les journaux.
   *
   * Sur le web, `getUserMedia` expose une AEC logicielle qu'on peut EXIGER et
   * surtout VÉRIFIER (`getSettings().echoCancellation`). Quand elle est là, la
   * voix peut couper la parole ; quand elle n'y est pas, on ne tente rien et
   * le geste reste le seul chemin — couper quelqu'un au milieu de sa phrase
   * est bien pire que de lui demander un clic. */
  const echoAnnuleRef = useRef(false);
  /** L'invitation « parlez ou touchez pour interrompre » a-t-elle déjà été
   * montrée ? Répétée à chaque réponse, elle devient un bandeau qu'on ne lit
   * plus — et l'écran se remet à ressembler à un tableau de bord. */
  const [interruptionVue, setInterruptionVue] = useState(false);
  const bargeStreamRef = useRef<MediaStream | null>(null);
  const bargeStopRef = useRef<(() => void) | null>(null);
  // Vitesse de lecture (préférence utilisateur) — appliquée via playbackRate,
  // indépendante du moteur TTS.
  const speedRef = useRef(1.0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const closedRef = useRef(false);
  const startedAtRef = useRef(0);
  const silenceSinceRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  // Détection de parole soutenue : début du dépassement en cours + cumul de
  // parole réelle sur tout l'enregistrement.
  const speechRunStartRef = useRef<number | null>(null);
  const totalSpeechMsRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const noiseFloorRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<number[]>([]);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Micro coupé : on n'analyse plus rien non plus. Laisser l'analyseur ouvert
  // garderait le voyant d'enregistrement du navigateur allumé alors qu'on a
  // demandé le silence.
  // Le moniteur vit le temps de l'écran. `online`/`offline` du navigateur sont
  // des faits certains : ils publient immédiatement, sans attendre confirmation.
  useEffect(() => {
    const moniteur = new MoniteurReseau((q) => setReseau(q));
    moniteurRef.current = moniteur;
    moniteur.demarrer();
    const perdu = () => moniteur.signalerRupture();
    const revenu = () => moniteur.demarrer();
    window.addEventListener("offline", perdu);
    window.addEventListener("online", revenu);
    return () => {
      window.removeEventListener("offline", perdu);
      window.removeEventListener("online", revenu);
      moniteur.arreter();
      moniteurRef.current = null;
    };
  }, []);

  const listening = phase === "listening" && !muted;
  const levels = useMicLevels(listening, 24);
  const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;

  useEffect(() => {
    getPreferences()
      .then((p) => {
        setVoice(p.tts_voice);
        if (p.tts_speed) speedRef.current = p.tts_speed;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    closedRef.current = false;
    startListening();
    return () => {
      closedRef.current = true;
      stopRecorderTracks();
      audioElRef.current?.pause();
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calibration du bruit ambiant + détection de silence après prise de parole.
  useEffect(() => {
    if (phase !== "listening") return;
    const elapsed = Date.now() - startedAtRef.current;

    if (elapsed < CALIBRATION_MS) {
      calibrationSamplesRef.current.push(avgLevel);
      return;
    }
    if (noiseFloorRef.current === null) {
      const samples = calibrationSamplesRef.current;
      noiseFloorRef.current = samples.length
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0.08;
    }

    const speakingThreshold = noiseFloorRef.current + SPEAKING_MARGIN;
    const now = Date.now();
    const frameMs = lastFrameAtRef.current ? Math.min(now - lastFrameAtRef.current, 200) : 0;
    lastFrameAtRef.current = now;
    const isAboveThreshold = avgLevel > speakingThreshold;

    if (isAboveThreshold) {
      if (speechRunStartRef.current === null) speechRunStartRef.current = now;
      totalSpeechMsRef.current += frameMs;
      // Un pic isolé (toux, clic) ne compte pas : il faut un dépassement
      // SOUTENU avant de considérer que l'utilisateur a parlé.
      if (now - speechRunStartRef.current >= SUSTAINED_SPEECH_MS) {
        hasSpokenRef.current = true;
      }
      silenceSinceRef.current = null;
    } else {
      speechRunStartRef.current = null;
      if (hasSpokenRef.current) {
        if (silenceSinceRef.current === null) silenceSinceRef.current = now;
        else if (
          elapsed > MIN_RECORD_MS &&
          now - silenceSinceRef.current > SILENCE_MS_TO_STOP &&
          chunksRef.current.length > 0
        ) {
          stopListening();
        }
      }
    }

    // Garde-fou : handleRecordingStopped ne transcrit que s'il y a eu une
    // vraie prise de parole — sinon il relance simplement l'écoute.
    if (elapsed > MAX_RECORD_MS) stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avgLevel, phase]);

  /** Écoute discrète pendant que l'assistant parle, pour reconnaître qu'on lui
   * coupe la parole.
   *
   * Rien n'est enregistré ni envoyé ici : on ne lit qu'un niveau. Trois gardes,
   * et il faut les trois — c'est ce qui manquait au mobile :
   *   1. l'annulation d'écho doit être RÉELLEMENT engagée, sinon on entend le
   *      haut-parleur et l'assistant se coupe lui-même ;
   *   2. un délai après le début de la lecture, le temps que l'AEC apprenne le
   *      signal de référence ;
   *   3. une parole SOUTENUE au-dessus du bruit résiduel — un claquement de
   *      porte ou une toux ne doit pas interrompre une réponse. */
  async function startBargeListening() {
    if (bargeStreamRef.current || mutedRef.current) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
    } catch {
      return; // pas de micro disponible : le clic reste le chemin d'interruption
    }
    if (closedRef.current || !speakingRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const aec = stream.getAudioTracks()[0]?.getSettings?.().echoCancellation === true;
    echoAnnuleRef.current = aec;
    if (!aec) {
      // Sans annulation d'écho, écouter pendant la lecture ne distingue pas la
      // voix de l'utilisateur de la nôtre. On n'essaie pas.
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    bargeStreamRef.current = stream;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    let depuis: number | null = null;
    const demarreA = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!speakingRef.current || closedRef.current) return;
      // Garde 2 : l'AEC a besoin de quelques centaines de millisecondes pour
      // converger sur le signal de référence.
      if (performance.now() - demarreA < BARGE_WARMUP_MS) return;
      analyser.getByteFrequencyData(data);
      let somme = 0;
      for (let i = 0; i < data.length; i++) somme += data[i];
      const niveau = somme / data.length / 255;
      if (niveau > BARGE_THRESHOLD) {
        // Garde 3 : la parole doit DURER. Un pic isolé n'interrompt pas.
        if (depuis === null) depuis = performance.now();
        else if (performance.now() - depuis >= BARGE_SUSTAINED_MS) interrupt();
      } else {
        depuis = null;
      }
    };
    raf = requestAnimationFrame(tick);

    bargeStopRef.current = () => {
      cancelAnimationFrame(raf);
      void ctx.close().catch(() => {});
      stream.getTracks().forEach((t) => t.stop());
      bargeStreamRef.current = null;
      bargeStopRef.current = null;
    };
  }

  function stopBargeListening() {
    bargeStopRef.current?.();
  }

  function stopRecorderTracks() {
    try {
      recorderRef.current?.stop();
    } catch {
      /* déjà arrêté */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function toggleMuted() {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      if (next) {
        // On relâche vraiment le micro : garder le flux ouvert allumerait le
        // voyant d'enregistrement du navigateur alors qu'on a demandé le
        // silence. « Coupé » doit être coupé.
        stopRecorderTracks();
        setPhase("listening");
      } else if (!closedRef.current) {
        void startListening();
      }
      return next;
    });
  }

  async function startListening() {
    setError(null);
    setCaption("");
    setReplyCaption("");
    setSlowHint(false);
    chunksRef.current = [];
    silenceSinceRef.current = null;
    hasSpokenRef.current = false;
    speechRunStartRef.current = null;
    totalSpeechMsRef.current = 0;
    lastFrameAtRef.current = 0;
    noiseFloorRef.current = null;
    calibrationSamplesRef.current = [];
    startedAtRef.current = Date.now();
    setPhase("listening");
    // Micro coupé : l'écran reste ouvert et l'orbe continue de respirer, mais
    // aucun flux n'est demandé.
    if (mutedRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
      streamRef.current = stream;
      // On RELIT ce que la piste applique vraiment : demander l'annulation
      // d'écho ne garantit pas de l'obtenir, et c'est elle qui autorise (ou
      // non) l'interruption à la voix.
      echoAnnuleRef.current = stream.getAudioTracks()[0]?.getSettings?.().echoCancellation === true;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleRecordingStopped();
      recorder.start(RECORDER_TIMESLICE_MS);
    } catch {
      setError("Accès au microphone refusé.");
      setPhase("error");
    }
  }

  function stopListening() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  /** Joue une file de segments audio (base64) dans l'ordre, en attendant que
   * chaque synthèse soit prête — mais celles-ci tournent en parallèle en
   * arrière-plan pendant que le segment précédent joue encore. */
  async function playQueueInOrder(
    queue: Promise<{ audio_base64: string; mime_type: string } | null>[],
  ) {
    for (const p of queue) {
      if (closedRef.current) return;
      const result = await p.catch(() => null);
      if (!result || closedRef.current) continue;
      await playAudio(result.audio_base64, result.mime_type);
    }
  }

  function playAudio(audioBase64: string, mimeType: string): Promise<void> {
    return new Promise((resolve) => {
      // Coupé pendant que ce segment attendait son tour : on ne le joue pas.
      if (interruptRef.current || closedRef.current) {
        resolve();
        return;
      }
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audio.playbackRate = speedRef.current;
      audioElRef.current = audio;
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      // La mesure de latence est faussée pendant qu'on télécharge et joue de
      // l'audio : ce qu'on mesurerait est notre propre file d'attente.
      moniteurRef.current?.signalerVoixEntrante();
      audio.play().catch(() => resolve());
    });
  }

  /** COUPER LA PAROLE À L'ASSISTANT.
   *
   * Un seul chemin, quelle que soit l'origine — clic sur l'orbe ou voix
   * détectée : la lecture s'arrête net, la file de segments est abandonnée, et
   * le micro se rouvre. Deux chemins auraient fini par laisser un segment
   * traîner et reprendre la parole tout seul après l'interruption. */
  function interrupt() {
    if (!speakingRef.current || closedRef.current) return;
    interruptRef.current = true;
    speakingRef.current = false;
    const el = audioElRef.current;
    if (el) {
      el.onended = null;
      el.pause();
      el.src = "";
    }
    audioElRef.current = null;
    stopBargeListening();
    startListening();
  }

  async function handleRecordingStopped() {
    if (closedRef.current) return;
    if (!chunksRef.current.length) return;
    // COMPRENDRE avant de répondre : sans prise de parole réelle et soutenue,
    // on ne transcrit rien — on rouvre simplement l'écoute. C'est ce qui
    // empêche l'IA de « répondre » après 2-3 s de silence.
    if (!hasSpokenRef.current || totalSpeechMsRef.current < MIN_TOTAL_SPEECH_MS) {
      if (!closedRef.current) startListening();
      return;
    }
    const recordMs = Date.now() - startedAtRef.current;
    setPhase("processing");
    slowTimerRef.current = setTimeout(() => setSlowHint(true), SLOW_RESPONSE_HINT_MS);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const { text } = await transcribeAudio(blob);
      if (!text.trim() || looksLikeHallucination(text, recordMs)) {
        if (!closedRef.current) startListening();
        return;
      }
      await runTurn(text);
    } catch (err) {
      if (closedRef.current) return;
      setError(err instanceof Error ? err.message : "Erreur pendant la conversation vocale.");
      setPhase("error");
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    }
  }

  /** Un tour de conversation, quelle qu'en soit l'entrée.
   *
   * La voix et le texte écrit aboutissent au MÊME chemin : même streaming,
   * même synthèse phrase par phrase, même réouverture du micro à la fin. Deux
   * chemins séparés auraient fini par diverger — et c'est toujours celui qu'on
   * teste le moins qui casse. */
  async function runTurn(text: string) {
    if (closedRef.current) return;
    interruptRef.current = false;
    stopListening();
    setError(null);
    setReplyCaption("");
    setCaption(text);
    setPhase("processing");
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => setSlowHint(true), SLOW_RESPONSE_HINT_MS);
    try {
      // Synthèse phrase par phrase : dès qu'une phrase complète arrive dans
      // le flux, on lance sa synthèse vocale immédiatement en arrière-plan,
      // sans attendre la fin de la réponse — c'est ce qui rend la conversation
      // perceptiblement instantanée plutôt que d'attendre le texte entier.
      let buffer = "";
      let spokenAnything = false;
      let playbackPromise: Promise<void> | null = null;
      const audioQueue: Promise<{ audio_base64: string; mime_type: string } | null>[] = [];

      function flushSentence(sentence: string) {
        const trimmed = fixPronunciation(stripMarkdownForSpeech(sentence));
        if (!trimmed) return;
        spokenAnything = true;
        audioQueue.push(synthesizeSpeech(trimmed, voice).catch(() => null));
        if (audioQueue.length === 1) {
          if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
          setSlowHint(false);
          setPhase("speaking");
          speakingRef.current = true;
          setInterruptionVue((vue) => {
            if (!vue) setTimeout(() => setInterruptionVue(true), 6000);
            return vue;
          });
          void startBargeListening();
          playbackPromise = playQueueInOrder(audioQueue);
        }
      }

      const reply = await onSend(text, (chunk) => {
        if (closedRef.current) return;
        setReplyCaption((prev) => prev + chunk);
        buffer += chunk;
        let match: RegExpExecArray | null;
        while ((match = SENTENCE_END.exec(buffer))) {
          flushSentence(match[1]);
          buffer = buffer.slice(match[0].length);
        }
      });
      if (closedRef.current) return;
      if (buffer.trim()) flushSentence(buffer);

      if (!reply.trim() && !spokenAnything) {
        startListening();
        return;
      }

      // playQueueInOrder consomme la file au fur et à mesure qu'elle se
      // remplit (même tableau référencé) ; on attend juste sa fin réelle
      // pour rouvrir le micro seulement une fois la dernière phrase jouée.
      if (playbackPromise) await playbackPromise;
      speakingRef.current = false;
      stopBargeListening();
      // Interrompu : `interrupt()` a déjà rouvert le micro, ne pas le refaire —
      // deux `startListening()` concurrents laissent un enregistreur orphelin.
      if (!closedRef.current && !interruptRef.current) startListening();
    } catch (err) {
      if (closedRef.current) return;
      setError(err instanceof Error ? err.message : "Erreur pendant la conversation vocale.");
      setPhase("error");
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    }
  }

  function close() {
    closedRef.current = true;
    mutedRef.current = false;
    speakingRef.current = false;
    stopBargeListening();
    moniteurRef.current?.arreter();
    stopRecorderTracks();
    audioElRef.current?.pause();
    onClose();
  }


  // Phases de l'orbe : les mêmes quatre que sur mobile. L'écran ne porte
  // presque aucun texte — c'est le MOUVEMENT qui dit ce qui se passe, et il
  // doit se reconnaître au premier coup d'œil, sans avoir été appris.
  const orbPhase: VoiceOrbPhase =
    phase === "listening"
      ? "ecoute"
      : phase === "processing"
        ? "reflexion"
        : phase === "speaking"
          ? "parole"
          : "repos";

  return (
    // Opaque, et sa propre palette : rien de la conversation ne doit
    // transparaître. Le mode vocal n'est pas un écran de l'application parmi
    // d'autres, c'est un espace où l'on entre — il ne suit donc pas le mode
    // clair/sombre, comme sur mobile.
    <div
      className="fixed inset-0 z-50 select-none"
      style={{
        background: `radial-gradient(circle at 50% 38%, ${ORB.surface} 0%, #120E0B 45%, ${ORB.fond} 100%)`,
        color: rgbaIvoire(1),
      }}
    >
      {/* L'orbe occupe TOUT l'écran : l'onde doit pouvoir sortir de la sphère
          et mourir dans le noir des bords. Bornée à une boîte, elle se
          couperait net et ferait apparaître un cadre. */}
      <VoiceOrb phase={orbPhase} level={avgLevel} className="absolute inset-0 h-full w-full" />

      {/* COUPER LA PAROLE D'UN GESTE.
          Un clic ne se trompe jamais : pas de seuil, pas d'écho, pas de faux
          positif. La détection à la voix (plus haut) vient en plus, jamais à la
          place — l'app mobile a abandonné la détection seule après cinq
          tentatives, et c'est le geste qui a été retenu. */}
      {phase === "speaking" && (
        <button
          onClick={interrupt}
          aria-label="Interrompre Toumaï AI"
          title="Interrompre"
          className="absolute inset-x-0 top-0 bottom-24 w-full cursor-pointer"
        >
          <span className="sr-only">Interrompre</span>
        </button>
      )}

      {/* Deux boutons rigoureusement identiques, placés symétriquement : aucun
          des deux n'est plus important que l'autre, et surtout aucun ne doit
          disputer l'attention à l'orbe. */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4 sm:px-5 sm:pt-5">
        <VoiceRoundButton onClick={close} label="Fermer le mode vocal">
          <CloseIcon />
        </VoiceRoundButton>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 px-3 pt-1">
          {/* L'état de la liaison : en haut et au centre, le seul endroit qui ne
              dispute rien à l'orbe, et le premier où le regard revient quand une
              réponse tarde. Muet tant que tout va bien. */}
          <NetworkBadge qualite={reseau} />
          {/* AUCUN LIBELLÉ DE PHASE. « Je vous écoute », « Toumaï réfléchit » :
              l'orbe le dit déjà par son mouvement, et le dire deux fois
              transforme un espace en tableau de bord. Ne reste que ce que le
              mouvement ne peut PAS dire — une attente anormalement longue. */}
          {slowHint && phase === "processing" && (
            <span className="truncate text-[13px]" style={{ color: rgbaIvoire(0.5) }}>
              Ça prend un peu plus de temps que prévu…
            </span>
          )}
        </div>
        <VoiceRoundButton
          onClick={toggleMuted}
          label={muted ? "Réactiver le micro" : "Couper le micro"}
          accent={muted}
        >
          {muted ? <MicOffIcon /> : <MicIcon />}
        </VoiceRoundButton>
      </div>

      {/* Sous-titres — bas de l'écran, jamais au milieu : ils ne doivent pas se
          poser sur la sphère. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 flex flex-col items-center gap-2 px-6 text-center sm:bottom-28">
        {phase === "listening" && caption && (
          <p className="max-w-lg text-[15px] leading-relaxed" style={{ color: rgbaIvoire(0.82) }}>
            {caption}
          </p>
        )}
        {phase === "speaking" && replyCaption && (
          <p className="max-w-lg text-[15px] leading-relaxed" style={{ color: rgbaIvoire(0.82) }}>
            {stripMarkdownForSpeech(replyCaption)}
          </p>
        )}
        {muted && (
          <p className="text-[13px]" style={{ color: rgbaAmbre(0.85) }}>
            Micro coupé — la conversation continue.
          </p>
        )}
        {/* L'invitation ne s'affiche qu'une fois : au premier tour parlé. Répétée
            à chaque réponse, elle deviendrait un bandeau qu'on ne lit plus. */}
        {phase === "speaking" && !interruptionVue && (
          <p className="text-[12.5px]" style={{ color: rgbaIvoire(0.4) }}>
            Parlez ou touchez l&apos;écran pour l&apos;interrompre
          </p>
        )}
        {error && (
          <p className="max-w-lg text-[14px]" style={{ color: rgbaAmbre(0.95) }}>
            {error}
          </p>
        )}
        {phase === "error" && (
          <button
            onClick={startListening}
            className="pointer-events-auto mt-2 rounded-full px-5 py-2 text-[14px] font-medium"
            style={{
              border: `1px solid ${rgbaAmbre(0.45)}`,
              background: rgbaAmbre(0.12),
              color: rgbaAmbre(1),
            }}
          >
            Réessayer
          </button>
        )}
      </div>

      {/* Barre du bas : écrire quand la voix ne suffit pas — un nom propre, une
          référence exacte, une adresse. Pas de bouton micro pour « passer en
          vocal » : on y est déjà. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = typed.trim();
          if (!t) return;
          setTyped("");
          void runTurn(t);
        }}
        className="absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-6"
      >
        <div
          className="mx-auto flex max-w-md items-center gap-2 rounded-full px-2 py-1.5"
          style={{ border: `1px solid ${rgbaIvoire(0.14)}`, background: "rgba(0,0,0,0.34)" }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={
              reseau === "rompue" ? "Connexion perdue…" : "Écrire plutôt que parler…"
            }
            disabled={reseau === "rompue"}
            className="min-w-0 flex-1 bg-transparent px-3 text-[14px] outline-none disabled:opacity-50"
            style={{ color: rgbaIvoire(0.92) }}
          />
          <button
            type="submit"
            disabled={!typed.trim()}
            aria-label="Envoyer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-30"
            style={{ background: rgbaAmbre(0.9), color: ORB.fond }}
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

const rgbaIvoire = (a: number) => `rgba(${ORB.ivoire.join(",")}, ${a})`;
const rgbaAmbre = (a: number) => `rgba(${ORB.ambre.join(",")}, ${a})`;

/** Bouton circulaire discret : fond presque noir, bordure infime, icône claire.
 * Les deux boutons de l'écran sont identiques — toute différence de traitement
 * créerait une hiérarchie qu'aucun des deux ne mérite. */
function VoiceRoundButton({
  onClick,
  label,
  accent,
  children,
}: {
  onClick: () => void;
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:brightness-125"
      style={{
        background: "rgba(0,0,0,0.34)",
        border: `0.9px solid ${accent ? rgbaAmbre(0.45) : rgbaIvoire(0.16)}`,
        color: accent ? rgbaAmbre(1) : rgbaIvoire(0.88),
      }}
    >
      {children}
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

/** L'accent n'est pas décoratif : couper son micro est un état dans lequel on
 * peut rester par mégarde et parler dans le vide. Il doit se voir d'un coup
 * d'œil, sans lire. */
function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 5a3 3 0 016 0v5" strokeLinecap="round" />
      <path d="M5 11a7 7 0 0011.3 5.5M19 11a7 7 0 01-.4 2.3M12 18v3" strokeLinecap="round" />
      <path d="M3 3l18 18" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
