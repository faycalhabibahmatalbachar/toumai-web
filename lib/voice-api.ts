import { API_BASE } from "./config";
import { authHeaders } from "./api";
import { handleUnauthorized } from "./session-guard";
import { HttpError } from "./errors";

export interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribeAudio(blob: Blob): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("file", blob, "audio.webm");
  const res = await fetch(`${API_BASE}/voice/transcribe`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  if (res.status === 401) handleUnauthorized();
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new HttpError(res.ok ? 400 : res.status, body.message);
  }
  return body.data as TranscribeResult;
}

export interface SynthesizeResult {
  audio_base64: string;
  mime_type: string;
}

/** Synthétise `text` avec la voix `voice` (id du catalogue déjà utilisé côté
 * app mobile, ex: "fr-FR-VivienneMultilingualNeural") — même moteur, mêmes
 * voix les plus naturelles. */
export async function synthesizeSpeech(text: string, voice?: string): Promise<SynthesizeResult> {
  const res = await fetch(`${API_BASE}/voice/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ text, voice }),
  });
  if (res.status === 401) handleUnauthorized();
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new HttpError(res.ok ? 400 : res.status, body.message);
  }
  return body.data as SynthesizeResult;
}
