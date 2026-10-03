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

const ZENABA_TRANSIENT_RETRY_MS = 900;

async function waitForZenabaRetry(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ZENABA_TRANSIENT_RETRY_MS);
    const onAbort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * ZeroGPU peut rendre un 503 applicatif pendant un réveil/une attribution GPU.
 * Une seule reprise courte suffit à absorber ce cas sans transformer un vrai
 * incident fournisseur en boucle de requêtes. L'authentification reste gérée
 * exclusivement par authFetch (refresh + retry 401 séparés de ce retry TTS).
 */
async function zenabaFetch(path: string, init: RequestInit): Promise<Response> {
  let res = await authFetch(path, init);
  if (res.status !== 503) return res;

  if (res.body) await res.body.cancel().catch(() => {});
  await waitForZenabaRetry(init.signal ?? undefined);
  res = await authFetch(path, init);
  return res;
}

// ── Smart Pre-Warm Zenaba ──────────────────────────────────────────────────
//
// Ce texte est un protocole interne entre le Web et le backend. Le backend
// l'intercepte avant l'appel Chatterbox, coordonne toutes ses répliques via
// Redis et ne laisse passer qu'un vrai réveil ZeroGPU par fenêtre globale.
// L'audio produit n'est JAMAIS joué : il sert uniquement à payer le cold start
// avant que l'utilisateur demande réellement à Zenaba de parler.
const ZENABA_PREWARM_SENTINEL = "Préparation vocale interne Toumaï.";
const ZENABA_PREWARM_CLIENT_KEY = "toumai:zenaba:prewarm-client:v1";
const ZENABA_PREWARM_CLIENT_COOLDOWN_MS = 5 * 60 * 1000;

let zenabaPrewarmInFlight: Promise<boolean> | null = null;

function shouldRunZenabaPrewarm(): boolean {
  if (typeof window === "undefined" || document.visibilityState === "hidden") return false;
  try {
    const raw = window.localStorage.getItem(ZENABA_PREWARM_CLIENT_KEY);
    const last = raw ? Number(raw) : 0;
    return !Number.isFinite(last) || Date.now() - last >= ZENABA_PREWARM_CLIENT_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function stampZenabaPrewarm(now = Date.now()): void {
  try {
    window.localStorage.setItem(ZENABA_PREWARM_CLIENT_KEY, String(now));
  } catch {
    // Stockage bloqué : la coordination Redis côté backend reste l'autorité.
  }
}

function unstampZenabaPrewarm(): void {
  try {
    window.localStorage.removeItem(ZENABA_PREWARM_CLIENT_KEY);
  } catch {
    // noop
  }
}

/**
 * Réveille Zenaba en arrière-plan sans jouer de son et sans bloquer l'UI.
 *
 * Deux niveaux empêchent le gaspillage :
 * - localStorage : plusieurs onglets du même navigateur ne relancent pas la
 *   sonde toutes les secondes ;
 * - Redis backend : plusieurs utilisateurs/répliques ne déclenchent qu'un
 *   seul vrai passage ZeroGPU par fenêtre globale.
 *
 * `false` signifie seulement « pas chauffée maintenant » ; cette fonction ne
 * doit jamais casser l'expérience principale.
 */
export function prewarmZenaba(): Promise<boolean> {
  if (zenabaPrewarmInFlight) return zenabaPrewarmInFlight;
  if (!shouldRunZenabaPrewarm()) return Promise.resolve(false);

  // Posé AVANT le réseau pour que deux événements navigateur simultanés ne
  // lancent pas deux requêtes. En cas d'échec, on l'enlève pour autoriser une
  // prochaine opportunité de réveil.
  stampZenabaPrewarm();

  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  zenabaPrewarmInFlight = (async () => {
    try {
      const res = await zenabaFetch("/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ZENABA_PREWARM_SENTINEL,
          language: "fr",
          voice: "zenaba",
        }),
      });
      if (!res.ok) {
        unstampZenabaPrewarm();
        return false;
      }
      const body = await res.json().catch(() => ({}));
      if (body?.success === false) {
        unstampZenabaPrewarm();
        return false;
      }
      const elapsed = Math.round(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - started,
      );
      try {
        window.sessionStorage.setItem("toumai:zenaba:last-prewarm-ms", String(elapsed));
      } catch {
        // Télémétrie locale best-effort seulement.
      }
      return true;
    } catch {
      unstampZenabaPrewarm();
      return false;
    } finally {
      zenabaPrewarmInFlight = null;
    }
  })();

  return zenabaPrewarmInFlight;
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
