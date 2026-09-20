"use client";

import { openLiveSpeechStream, streamSpeech } from "@/lib/voice-api";
import { errorMessage } from "@/lib/errors";

export type ToumaiVoicePhase = "idle" | "loading" | "playing";
export type ToumaiVoiceOutcome = "ended" | "stopped" | "error";

export type ToumaiVoiceSnapshot = {
  owner: string | null;
  phase: ToumaiVoicePhase;
  error: string | null;
};

let snapshot: ToumaiVoiceSnapshot = {
  owner: null,
  phase: "idle",
  error: null,
};

const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
let aborter: AbortController | null = null;
let objectUrl: string | null = null;
let liveContext: AudioContext | null = null;
const liveSources = new Set<AudioBufferSourceNode>();
let liveNextStartTime = 0;
let generation = 0;
let voiceConversationActive = false;
const conversationIdleWaiters = new Set<(released: boolean) => void>();
let completion:
  | { generation: number; resolve: (outcome: ToumaiVoiceOutcome) => void }
  | null = null;
let segmentCompletion:
  | { generation: number; resolve: (outcome: ToumaiVoiceOutcome) => void }
  | null = null;

function publish(next: ToumaiVoiceSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function getToumaiVoiceSnapshot(): ToumaiVoiceSnapshot {
  return snapshot;
}

const SERVER_SNAPSHOT: ToumaiVoiceSnapshot = {
  owner: null,
  phase: "idle",
  error: null,
};

export function getToumaiVoiceServerSnapshot(): ToumaiVoiceSnapshot {
  return SERVER_SNAPSHOT;
}

export function subscribeToumaiVoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setToumaiVoiceConversationActive(active: boolean): void {
  voiceConversationActive = active;
  if (!active) {
    for (const resolve of conversationIdleWaiters) resolve(true);
    conversationIdleWaiters.clear();
  }
}

export function isToumaiVoiceConversationActive(): boolean {
  return voiceConversationActive;
}

export async function waitForToumaiVoiceConversationIdle(
  timeoutMs = 120_000,
): Promise<boolean> {
  if (!voiceConversationActive) return true;
  return new Promise<boolean>((resolve) => {
    let finished = false;
    const done = (released: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      conversationIdleWaiters.delete(done);
      resolve(released);
    };
    const timer = window.setTimeout(() => done(false), timeoutMs);
    conversationIdleWaiters.add(done);
  });
}

function cleanupUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

/**
 * À appeler directement depuis le geste qui ouvre le mode vocal. Les navigateurs
 * mobiles peuvent bloquer un AudioContext créé seulement après un aller-retour
 * réseau ; le créer/réactiver pendant le clic conserve l'autorisation audio.
 */
export function primeToumaiVoiceAudio(): void {
  try {
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    if (!liveContext || liveContext.state === "closed") {
      liveContext = new Ctor({ latencyHint: "interactive" });
    }
    void liveContext.resume().catch(() => {});
  } catch {
    // Le chemin HTMLAudio historique reste disponible pour les lectures non-live.
  }
}

function stopLiveSources() {
  for (const source of liveSources) {
    try {
      source.stop();
    } catch {
      // déjà terminé
    }
    source.onended = null;
    try {
      source.disconnect();
    } catch {
      // déjà déconnecté
    }
  }
  liveSources.clear();
  liveNextStartTime = 0;
}

function concatBytes(a: Uint8Array, b: Uint8Array) {
  // Toujours allouer notre propre ArrayBuffer : ReadableStream peut fournir
  // Uint8Array<ArrayBufferLike>, alors que le tampon local Web Audio est un
  // Uint8Array<ArrayBuffer>. Cette copie garde aussi un buffer détachable sûr.
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

type WavHeader = {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
};

function parseStreamingWavHeader(header: Uint8Array): WavHeader {
  if (header.length < 44) throw new Error("En-tête WAV Zenaba incomplet.");
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...Array.from(header.slice(start, end)));
  if (ascii(0, 4) !== "RIFF" || ascii(8, 12) !== "WAVE") {
    throw new Error("Flux WAV Zenaba invalide.");
  }
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  if (!channels || !sampleRate || bitsPerSample !== 16) {
    throw new Error("Format PCM Zenaba non pris en charge.");
  }
  return { channels, sampleRate, bitsPerSample };
}

function schedulePcm16(
  pcm: Uint8Array,
  format: WavHeader,
  speed: number,
  myGeneration: number,
  onDrained: () => void,
): boolean {
  if (!liveContext || myGeneration !== generation || !pcm.length) return false;
  const bytesPerFrame = format.channels * 2;
  const frames = Math.floor(pcm.length / bytesPerFrame);
  if (!frames) return false;

  const usable = frames * bytesPerFrame;
  const view = new Int16Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + usable));
  const buffer = liveContext.createBuffer(format.channels, frames, format.sampleRate);

  for (let channel = 0; channel < format.channels; channel += 1) {
    const target = buffer.getChannelData(channel);
    for (let frame = 0; frame < frames; frame += 1) {
      target[frame] = view[frame * format.channels + channel] / 32768;
    }
  }

  const source = liveContext.createBufferSource();
  source.buffer = buffer;
  const rate = Number.isFinite(speed) ? Math.min(1.5, Math.max(0.75, speed)) : 1;
  source.playbackRate.value = rate;
  source.connect(liveContext.destination);

  const startAt = Math.max(liveContext.currentTime + 0.012, liveNextStartTime);
  liveNextStartTime = startAt + buffer.duration / rate;
  liveSources.add(source);
  source.onended = () => {
    liveSources.delete(source);
    try {
      source.disconnect();
    } catch {
      // noop
    }
    onDrained();
  };
  source.start(startAt);
  return true;
}

function base64Blob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Retire seulement la syntaxe de présentation. Le contenu de la réponse reste
 * la source de vérité : aucun résumé, aucune reformulation et aucun texte
 * artificiel n'est ajouté.
 */
export function textForToumaiVoice(raw: string): string {
  return (raw || "")
    .replace(/(?:```)(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)(?:```)/g, "$1")
    .replace(/\x60([^\x60]+)\x60/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/~{2}/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function settleCompletion(
  targetGeneration: number,
  outcome: ToumaiVoiceOutcome,
) {
  if (completion?.generation !== targetGeneration) return;
  const resolve = completion.resolve;
  completion = null;
  resolve(outcome);
}

function settleSegment(
  targetGeneration: number,
  outcome: ToumaiVoiceOutcome,
) {
  if (segmentCompletion?.generation !== targetGeneration) return;
  const resolve = segmentCompletion.resolve;
  segmentCompletion = null;
  resolve(outcome);
}

export function stopToumaiVoice(owner?: string): boolean {
  if (owner && snapshot.owner !== owner) return false;

  const stoppedGeneration = generation;
  generation += 1;
  aborter?.abort();
  aborter = null;
  stopLiveSources();

  if (audio) {
    audio.pause();
    audio.src = "";
    audio.load();
    audio = null;
  }

  cleanupUrl();
  settleSegment(stoppedGeneration, "stopped");
  settleCompletion(stoppedGeneration, "stopped");
  publish({ owner: null, phase: "idle", error: null });
  return true;
}

export function clearToumaiVoiceError(owner?: string) {
  if (owner && snapshot.owner !== owner) return;
  if (snapshot.error) publish({ ...snapshot, error: null });
}

async function playSegment(
  audioBase64: string,
  mimeType: string,
  speed: number,
  myGeneration: number,
): Promise<ToumaiVoiceOutcome> {
  if (myGeneration !== generation) return "stopped";

  cleanupUrl();
  objectUrl = URL.createObjectURL(base64Blob(audioBase64, mimeType));
  const element = new Audio(objectUrl);
  element.playbackRate = Number.isFinite(speed) ? Math.min(1.5, Math.max(0.75, speed)) : 1;
  audio = element;

  return new Promise<ToumaiVoiceOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: ToumaiVoiceOutcome) => {
      if (settled) return;
      settled = true;
      if (segmentCompletion?.generation === myGeneration) {
        segmentCompletion = null;
      }
      if (audio === element) audio = null;
      element.onended = null;
      element.onerror = null;
      cleanupUrl();
      resolve(outcome);
    };

    segmentCompletion = {
      generation: myGeneration,
      resolve: (outcome) => finish(outcome),
    };

    element.onended = () => finish("ended");
    element.onerror = () => finish("error");

    element.play().catch(() => finish("error"));
  });
}

/**
 * Lecture d'un segment Zenaba en WAV brut, décodé au fil de l'octet.
 *
 * CE QUE CE CHEMIN GAGNE, ET CE QU'IL NE GAGNE PAS
 * -------------------------------------------------
 * Il évite le détour base64 du flux NDJSON et rend la main au moteur audio dès
 * que l'en-tête RIFF est complet. Mais le moteur actif, Chatterbox
 * Multilingual V3, rend un WAV COMPLET par segment : le premier son n'arrive
 * donc pas avant la fin de la génération DU SEGMENT. Le lecteur est prêt à
 * jouer un flux réellement progressif, et le fera sans modification si un
 * moteur en produit un ; écrire ici qu'il en reçoit un aujourd'hui ferait
 * chercher une latence là où elle n'est pas.
 *
 * La latence perçue se joue donc ailleurs : dans le découpage en phrases fait
 * par l'appelant, qui lance la lecture dès la première phrase utile.
 */
export async function playToumaiVoiceLive(
  rawText: string,
  owner: string,
  speed = 1,
): Promise<ToumaiVoiceOutcome> {
  // Compatibilité seulement : même moteur, même Zenaba, mais transport par
  // élément <audio> si Web Audio n'existe réellement pas sur cet appareil.
  if (!audioContextCtor()) return playToumaiVoice(rawText, owner, speed);

  const text = textForToumaiVoice(rawText);
  if (!text) {
    publish({ owner, phase: "idle", error: "Aucun texte à lire." });
    return "error";
  }

  if (snapshot.owner === owner && snapshot.phase !== "idle") {
    stopToumaiVoice(owner);
    return "stopped";
  }

  stopToumaiVoice();
  const myGeneration = ++generation;
  const controller = new AbortController();
  aborter = controller;
  publish({ owner, phase: "loading", error: null });

  const completionPromise = new Promise<ToumaiVoiceOutcome>((resolve) => {
    completion = { generation: myGeneration, resolve };
  });

  void (async () => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      primeToumaiVoiceAudio();
      if (!liveContext) throw new Error("Audio Web indisponible sur cet appareil.");
      await liveContext.resume();

      reader = await openLiveSpeechStream(text, controller.signal);
      if (myGeneration !== generation || controller.signal.aborted) {
        settleCompletion(myGeneration, "stopped");
        return;
      }

      const header = new Uint8Array(44);
      let headerReceived = 0;
      let format: WavHeader | null = null;
      let pcm = new Uint8Array(0);
      let produced = false;
      let networkEnded = false;
      const MIN_PCM_BYTES = 8192;

      const playbackDone = new Promise<ToumaiVoiceOutcome>((resolve) => {
        segmentCompletion = { generation: myGeneration, resolve };
      });

      const maybeFinish = () => {
        if (
          networkEnded &&
          liveSources.size === 0 &&
          segmentCompletion?.generation === myGeneration
        ) {
          settleSegment(myGeneration, produced ? "ended" : "error");
        }
      };

      const flushPcm = (force: boolean) => {
        if (!format) return;
        if (!force && pcm.length < MIN_PCM_BYTES) return;
        const bytesPerFrame = format.channels * 2;
        const usable = Math.floor(pcm.length / bytesPerFrame) * bytesPerFrame;
        if (!usable) return;
        const chunk = pcm.slice(0, usable);
        pcm = pcm.slice(usable);
        if (schedulePcm16(chunk, format, speed, myGeneration, maybeFinish)) {
          produced = true;
          publish({ owner, phase: "playing", error: null });
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value?.length) continue;
        if (myGeneration !== generation || controller.signal.aborted) {
          settleSegment(myGeneration, "stopped");
          settleCompletion(myGeneration, "stopped");
          return;
        }

        let chunk = value;
        if (!format) {
          const needed = 44 - headerReceived;
          const take = Math.min(needed, chunk.length);
          header.set(chunk.slice(0, take), headerReceived);
          headerReceived += take;
          chunk = chunk.slice(take);
          if (headerReceived === 44) format = parseStreamingWavHeader(header);
        }
        if (format && chunk.length) {
          pcm = concatBytes(pcm, chunk);
          flushPcm(false);
        }
      }

      if (!format) throw new Error("Zenaba n’a pas renvoyé d’en-tête WAV complet.");
      flushPcm(true);
      networkEnded = true;
      maybeFinish();

      const outcome = await playbackDone;
      if (outcome !== "ended") {
        if (outcome === "error" && myGeneration === generation) {
          publish({ owner, phase: "idle", error: "Zenaba n’a produit aucun audio lisible." });
        }
        settleCompletion(myGeneration, outcome);
        return;
      }

      if (myGeneration !== generation || controller.signal.aborted) {
        settleCompletion(myGeneration, "stopped");
        return;
      }

      aborter = null;
      publish({ owner: null, phase: "idle", error: null });
      settleCompletion(myGeneration, "ended");
    } catch (err) {
      if (!controller.signal.aborted) {
        try {
          await reader?.cancel();
        } catch {
          // Le serveur ou le navigateur a déjà fermé le body.
        }
      }
      if (controller.signal.aborted || myGeneration !== generation) {
        settleSegment(myGeneration, "stopped");
        settleCompletion(myGeneration, "stopped");
        return;
      }
      stopLiveSources();
      aborter = null;
      publish({ owner, phase: "idle", error: errorMessage(err, "voice") });
      settleSegment(myGeneration, "error");
      settleCompletion(myGeneration, "error");
    } finally {
      try {
        reader?.releaseLock();
      } catch {
        // déjà libéré
      }
    }
  })();

  return completionPromise;
}

/**
 * Unique lecteur vocal de Toumaï.
 * Un seul owner peut parler à la fois. Un deuxième clic sur le même owner
 * arrête. Un autre owner remplace le précédent. L'annulation coupe aussi la
 * requête TTS en cours.
 */
export async function playToumaiVoice(
  rawText: string,
  owner: string,
  speed = 1,
): Promise<ToumaiVoiceOutcome> {
  const text = textForToumaiVoice(rawText);
  if (!text) {
    publish({ owner, phase: "idle", error: "Aucun texte à lire." });
    return "error";
  }

  if (snapshot.owner === owner && snapshot.phase !== "idle") {
    stopToumaiVoice(owner);
    return "stopped";
  }

  stopToumaiVoice();
  const myGeneration = ++generation;
  const controller = new AbortController();
  aborter = controller;
  publish({ owner, phase: "loading", error: null });

  let produced = false;

  const completionPromise = new Promise<ToumaiVoiceOutcome>((resolve) => {
    completion = { generation: myGeneration, resolve };
  });

  void (async () => {
    try {
      for await (const segment of streamSpeech(text, controller.signal)) {
        if (myGeneration !== generation || controller.signal.aborted) {
          settleCompletion(myGeneration, "stopped");
          return;
        }

        produced = true;
        publish({ owner, phase: "playing", error: null });
        const outcome = await playSegment(
          segment.audio_base64,
          segment.mime_type,
          speed,
          myGeneration,
        );

        if (outcome !== "ended") {
          if (outcome === "error" && myGeneration === generation) {
            publish({
              owner,
              phase: "idle",
              error: "La lecture audio n’a pas pu démarrer sur cet appareil.",
            });
          }
          settleCompletion(myGeneration, outcome);
          return;
        }
      }

      if (myGeneration !== generation || controller.signal.aborted) {
        settleCompletion(myGeneration, "stopped");
        return;
      }

      if (!produced) {
        publish({
          owner,
          phase: "idle",
          error: "Zenaba n’a produit aucun audio.",
        });
        settleCompletion(myGeneration, "error");
        return;
      }

      aborter = null;
      publish({ owner: null, phase: "idle", error: null });
      settleCompletion(myGeneration, "ended");
    } catch (err) {
      if (controller.signal.aborted || myGeneration !== generation) {
        settleCompletion(myGeneration, "stopped");
        return;
      }
      aborter = null;
      publish({
        owner,
        phase: "idle",
        error: errorMessage(err, "voice"),
      });
      settleCompletion(myGeneration, "error");
    }
  })();

  return completionPromise;
}
