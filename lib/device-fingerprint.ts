// Enregistrement d'appareil (Device Intelligence Center admin) — collecte
// CÔTÉ CLIENT uniquement des attributs réellement disponibles via les API
// navigateur standard. Aucune empreinte tierce, aucun tracking publicitaire.
// Best-effort : toute erreur est silencieuse, ne doit jamais gêner le produit.
import { API_BASE } from "./config";
import { authHeaders } from "./api";

const REGISTERED_KEY = "toumai_device_registered_v1";

function detectDeviceType(): "desktop" | "mobile" | "tablet" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(): { browser: string; version: string } {
  const ua = navigator.userAgent;
  const patterns: [RegExp, string][] = [
    [/Edg\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Version\/([\d.]+).*Safari/, "Safari"],
  ];
  for (const [re, name] of patterns) {
    const m = ua.match(re);
    if (m) return { browser: name, version: m[1] };
  }
  return { browser: "Inconnu", version: "" };
}

function detectOs(): { os: string; version: string } {
  const ua = navigator.userAgent;
  const patterns: [RegExp, string][] = [
    [/Windows NT ([\d.]+)/, "Windows"],
    [/Mac OS X ([\d_.]+)/, "macOS"],
    [/Android ([\d.]+)/, "Android"],
    [/OS ([\d_]+) like Mac OS X/, "iOS"],
    [/Linux/, "Linux"],
  ];
  for (const [re, name] of patterns) {
    const m = ua.match(re);
    if (m) return { os: name, version: (m[1] || "").replace(/_/g, ".") };
  }
  return { os: "Inconnu", version: "" };
}

function getGpuRenderer(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return null;
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
  } catch {
    return null;
  }
}

async function computeFingerprint(attrs: Record<string, unknown>): Promise<string> {
  const raw = JSON.stringify(attrs);
  try {
    const enc = new TextEncoder().encode(raw);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Repli simple si SubtleCrypto indisponible (contexte non sécurisé).
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
    return `fp_${h}`;
  }
}

/** Enregistre l'appareil courant une fois par session de navigation. */
export async function registerDeviceOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(REGISTERED_KEY)) return;
  const auth = authHeaders();
  if (!("Authorization" in auth)) return; // pas de session active

  try {
    const { browser, version: browser_version } = detectBrowser();
    const { os, version: os_version } = detectOs();
    const attrs = {
      device_type: detectDeviceType(),
      platform: navigator.platform,
      browser, browser_version, os, os_version,
      screen_width: window.screen?.width,
      screen_height: window.screen?.height,
      pixel_ratio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      color_scheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      touch_support: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      device_memory_gb: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null,
      gpu_renderer: getGpuRenderer(),
    };
    const fingerprint = await computeFingerprint({
      platform: attrs.platform, browser, os,
      screen_width: attrs.screen_width, screen_height: attrs.screen_height,
      language: attrs.language, timezone: attrs.timezone, gpu_renderer: attrs.gpu_renderer,
    });

    await fetch(`${API_BASE}/user/device-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ fingerprint, ...attrs }),
    });
    window.sessionStorage.setItem(REGISTERED_KEY, "1");
  } catch {
    // Silencieux — l'instrumentation ne doit jamais impacter l'expérience produit.
  }
}
