import { authFetch, postForm } from "./http";
import { HttpError } from "./errors";

export interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribeAudio(blob: Blob): Promise<TranscribeResult> {
  const form = new FormData();
  const mime = (blob.type || "audio/webm").toLowerCase();
  const ext =
    mime.includes("mp4") || mime.includes("m4a")
      ? "m4a"
      : mime.includes("ogg")
        ? "ogg"
        : mime.includes("wav")
          ? "wav"
          : "webm";
  form.append("file", blob, `audio.${ext}`);
  return postForm<TranscribeResult>("/voice/transcribe", form);
}

export interface SynthesizeResult {
  audio_base64: string;
  mime_type: string;
}

export interface ZenabaPlaybackDiagnostics {
  voice: string;
  engine: string;
  reference: string;
  transport: string;
  serverTtfaMs: number | null;
  providerMs: number | null;
  certified: boolean;
}

export interface SpeechSegment extends SynthesizeResult {
  index: number;
  text: string;
  diagnostics?: ZenabaPlaybackDiagnostics;
}

function integerHeader(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function zenabaDiagnostics(res: Response): ZenabaPlaybackDiagnostics {
  return {
    voice: res.headers.get("X-Toumai-Voice") || "Zenaba",
    engine: res.headers.get("X-Toumai-Voice-Engine") || "unknown",
    reference: res.headers.get("X-Toumai-Voice-Reference") || "unknown",
    transport: res.headers.get("X-Toumai-Voice-Transport") || "unknown",
    serverTtfaMs: integerHeader(res.headers, "X-Toumai-Voice-TTFA-Ms"),
    providerMs: integerHeader(res.headers, "X-Toumai-Voice-Provider-Ms"),
    certified: res.headers.get("X-Toumai-Voice-Certified") === "1",
  };
}

async function ttsHttpError(res: Response): Promise<HttpError> {
  const body = await res.json().catch(() => ({}));
  const message =
    typeof body?.message === "string"
      ? body.message
      : typeof body?.detail === "string"
        ? body.detail
        : "La Voix Toumaï est momentanément indisponible.";
  return new HttpError(res.status || 500, message);
}

/**
 * Les reprises TTS sont centralisées côté backend.
 *
 * Important : un seul clic ne doit jamais devenir deux requêtes HTTP puis
 * quatre jobs Gradio. `authFetch` conserve uniquement son mécanisme normal de
 * refresh 401 ; les 503 Zenaba ne sont pas réessayés dans le navigateur.
 */
async function zenabaFetch(path: string, init: RequestInit): Promise<Response> {
  return authFetch(path, init);
}

/**
 * Compatibilité d'API pour les anciens composants.
 *
 * Le Smart Pre-Warm GPU est désactivé avec ZeroGPU : le GPU est rendu après la
 * fonction, donc une synthèse silencieuse à l'ouverture ne garantit pas que le
 * prochain appel sera chaud et peut au contraire entrer en concurrence avec la
 * vraie lecture. Le backend accepte toujours l'ancien sentinel sans consommer
 * de GPU pour les clients déjà déployés.
 */
export function prewarmZenaba(): Promise<boolean> {
  return Promise.resolve(false);
}

/**
 * Toumaï Voice V1 est volontairement figée sur Zenaba, en français.
 * Le paramètre legacyVoice reste toléré pendant la migration des anciens
 * composants mais n'est jamais transmis : aucun client ne peut choisir un
 * autre timbre.
 */
export async function synthesizeSpeech(
  text: string,
  _legacyVoice?: string,
  signal?: AbortSignal,
): Promise<SynthesizeResult> {
  const res = await zenabaFetch("/voice/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language: "fr", voice: "zenaba" }),
    signal,
  });
  if (!res.ok) throw await ttsHttpError(res);
  const body = await res.json().catch(() => ({}));
  if (body.success === false) {
    throw new HttpError(res.status || 400, body.message);
  }
  return body.data as SynthesizeResult;
}

/**
 * Un segment Zenaba en WAV brut, lu au fil de l'octet.
 *
 * Aucun base64, et le lecteur consomme `response.body` au lieu de garder le
 * WAV entier en mémoire. En revanche le moteur actif, Chatterbox
 * Multilingual V3, produit un WAV complet par segment : les octets arrivent
 * donc d'un coup, une fois la génération du segment terminée. Le transport est
 * prêt pour un moteur réellement progressif, il n'en invente pas un.
 */
export async function openLiveSpeechStream(
  text: string,
  signal?: AbortSignal,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const res = await zenabaFetch("/voice/synthesize/live", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/wav" },
    body: JSON.stringify({ text, language: "fr", voice: "zenaba" }),
    signal,
  });
  if (!res.ok || !res.body) throw await ttsHttpError(res);
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("audio/wav") && !contentType.includes("audio/x-wav")) {
    throw new Error("Zenaba a renvoyé un format audio inattendu.");
  }
  return res.body.getReader();
}

/**
 * Flux Zenaba phrase par phrase. C'est le chemin principal pour le chat et
 * les rappels : première phrase audible sans attendre la fin d'une longue
 * réponse, avec annulation réelle via AbortSignal.
 */
export async function* streamSpeech(
  text: string,
  signal?: AbortSignal,
): AsyncGenerator<SpeechSegment> {
  const res = await zenabaFetch("/voice/synthesize/stream?format=ndjson", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify({ text, language: "fr", voice: "zenaba" }),
    signal,
  });
  if (!res.ok || !res.body) throw await ttsHttpError(res);

  const diagnostics = zenabaDiagnostics(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const raw = line.trim();
        if (!raw) continue;
        const segment = JSON.parse(raw) as SpeechSegment & { error?: string };
        if (segment.error) throw new Error(segment.error);
        if (!segment.audio_base64 || !segment.mime_type) {
          throw new Error("Zenaba n’a pas produit l’un des segments audio.");
        }
        yield { ...segment, diagnostics };
      }
    }

    const tail = buffer.trim();
    if (tail) {
      const segment = JSON.parse(tail) as SpeechSegment & { error?: string };
      if (segment.error) throw new Error(segment.error);
      if (!segment.audio_base64 || !segment.mime_type) {
        throw new Error("Zenaba n’a pas produit le dernier segment audio.");
      }
      yield { ...segment, diagnostics };
    }
  } finally {
    reader.releaseLock();
  }
}
