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
  // Safari peut produire audio/mp4 alors que Chromium produit généralement
  // audio/webm. Conserver une extension cohérente évite que le backend STT
  // interprète mal le conteneur.
  form.append("file", blob, `audio.${ext}`);
  return postForm<TranscribeResult>("/voice/transcribe", form);
}

export interface SynthesizeResult {
  audio_base64: string;
  mime_type: string;
}

export interface SpeechSegment extends SynthesizeResult {
  index: number;
  text: string;
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
  const res = await authFetch("/voice/synthesize", {
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
 * Flux Zenaba phrase par phrase. C'est le chemin principal pour le chat et
 * les rappels : première phrase audible sans attendre la fin d'une longue
 * réponse, avec annulation réelle via AbortSignal.
 */
export async function* streamSpeech(
  text: string,
  signal?: AbortSignal,
): AsyncGenerator<SpeechSegment> {
  const res = await authFetch("/voice/synthesize/stream?format=ndjson", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify({ text, language: "fr", voice: "zenaba" }),
    signal,
  });
  if (!res.ok || !res.body) throw await ttsHttpError(res);

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
        yield segment;
      }
    }

    const tail = buffer.trim();
    if (tail) {
      const segment = JSON.parse(tail) as SpeechSegment & { error?: string };
      if (segment.error) throw new Error(segment.error);
      if (!segment.audio_base64 || !segment.mime_type) {
        throw new Error("Zenaba n’a pas produit le dernier segment audio.");
      }
      yield segment;
    }
  } finally {
    reader.releaseLock();
  }
}
