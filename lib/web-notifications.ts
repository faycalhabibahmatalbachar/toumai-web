"use client";

/** Notifications web (API Notification du navigateur) — Toumaï AI prévient
 * l'utilisateur même quand l'onglet est en arrière-plan : fin d'une tâche
 * agent, action WhatsApp, rappel d'agenda… L'activation reste locale à cet
 * appareil (préférence localStorage), la permission appartient au navigateur. */

const FLAG_KEY = "toumai:webnotif:enabled";

export type WebNotifState = "granted" | "denied" | "default" | "unsupported";

export function getWebNotifState(): WebNotifState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as WebNotifState;
}

/** Activé = permission accordée ET préférence locale non désactivée. */
export function isWebNotifEnabled(): boolean {
  if (getWebNotifState() !== "granted") return false;
  try {
    return localStorage.getItem(FLAG_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setWebNotifEnabled(v: boolean): void {
  try {
    localStorage.setItem(FLAG_KEY, v ? "1" : "0");
  } catch {}
}

/** Demande la permission au navigateur puis active la préférence locale. */
export async function enableWebNotifications(): Promise<WebNotifState> {
  const state = getWebNotifState();
  if (state === "unsupported" || state === "denied") return state;
  const perm = state === "granted" ? "granted" : await Notification.requestPermission();
  if (perm === "granted") setWebNotifEnabled(true);
  return perm as WebNotifState;
}

/** Émet une notification si (et seulement si) l'utilisateur a activé. */
export function notify(title: string, body?: string): boolean {
  if (!isWebNotifEnabled()) return false;
  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "toumai",
    });
    return true;
  } catch {
    return false;
  }
}
