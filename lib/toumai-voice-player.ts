"use client";

import { streamSpeech } from "@/lib/voice-api";
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
let generation = 0;
let resolveCurrent: ((outcome: ToumaiVoiceOutcome) => void) | null = null;

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

function cleanupUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
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

function settle(outcome: ToumaiVoiceOutcome) {
  const resolve = resolveCurrent;
  resolveCurrent = null;
  if (resolve) resolve(outcome);
}

export function stopToumaiVoice(owner?: string): boolean {
  if (owner && snapshot.owner !== owner) return false;

  generation += 1;
  aborter?.abort();
  aborter = null;

  if (audio) {
    audio.pause();
    audio.src = "";
    audio.load();
    audio = null;
  }

  cleanupUrl();
  settle("stopped");
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
      if (audio === element) audio = null;
      element.onended = null;
      element.onerror = null;
      cleanupUrl();
      resolve(outcome);
    };

    element.onended = () => finish("ended");
    element.onerror = () => finish("error");

    element.play().catch(() => finish("error"));
  });
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

  const completion = new Promise<ToumaiVoiceOutcome>((resolve) => {
    resolveCurrent = resolve;
  });

  void (async () => {
    try {
      for await (const segment of streamSpeech(text, controller.signal)) {
        if (myGeneration !== generation || controller.signal.aborted) {
          settle("stopped");
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
          settle(outcome);
          return;
        }
      }

      if (myGeneration !== generation || controller.signal.aborted) {
        settle("stopped");
        return;
      }

      if (!produced) {
        publish({
          owner,
          phase: "idle",
          error: "Zenaba n’a produit aucun audio.",
        });
        settle("error");
        return;
      }

      aborter = null;
      publish({ owner: null, phase: "idle", error: null });
      settle("ended");
    } catch (err) {
      if (controller.signal.aborted || myGeneration !== generation) {
        settle("stopped");
        return;
      }
      aborter = null;
      publish({
        owner,
        phase: "idle",
        error: errorMessage(err, "voice"),
      });
      settle("error");
    }
  })();

  return completion;
}
