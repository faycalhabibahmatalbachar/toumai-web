import { authFetch, postForm } from "./http";
import { HttpError } from "./errors";

export interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribeAudio(blob: Blob): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("file", blob, "audio.webm");
  return postForm<TranscribeResult>("/voice/transcribe", form);
}

export interface SynthesizeResult {
  audio_base64: string;
  mime_type: string;
}

/** Synthétise `text` avec la voix `voice` (id du catalogue déjà utilisé côté
 * app mobile, ex: "fr-FR-VivienneMultilingualNeural") — même moteur, mêmes
 * voix les plus naturelles. */
export async function synthesizeSpeech(text: string, voice?: string): Promise<SynthesizeResult> {
  const res = await authFetch("/voice/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new HttpError(res.ok ? 400 : res.status, body.message);
  }
  return body.data as SynthesizeResult;
}
