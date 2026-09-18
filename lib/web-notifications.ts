"use client";

import {
  getWebPushPublicKey,
  registerWebPushSubscription,
  revokeWebPushSubscription,
  updateNotificationPreferences,
} from "./notifications-api";

/** Préférence locale historique. Elle reste utile pour les notifications
 * générées par l'onglet lui-même, mais la source de vérité du Web Push v3 est
 * désormais le backend + PushManager. */
const FLAG_KEY = "toumai:webnotif:enabled";

export type WebNotifState = "granted" | "denied" | "default" | "unsupported";

export interface WebPushActivationResult {
  permission: WebNotifState;
  subscribed: boolean;
  configured: boolean;
  reason?: string;
}

export function getWebNotifState(): WebNotifState {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission as WebNotifState;
}

export function isWebNotifEnabled(): boolean {
  if (getWebNotifState() !== "granted") return false;
  try {
    return localStorage.getItem(FLAG_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setWebNotifEnabled(value: boolean): void {
  try {
    localStorage.setItem(FLAG_KEY, value ? "1" : "0");
  } catch {
    // Le stockage local n'est qu'un confort, jamais la source de vérité.
  }
}

export async function enableWebNotifications(): Promise<WebNotifState> {
  const state = getWebNotifState();
  if (state === "unsupported" || state === "denied") return state;
  const permission =
    state === "granted" ? "granted" : await Notification.requestPermission();
  if (permission === "granted") setWebNotifEnabled(true);
  return permission as WebNotifState;
}

/** Notification locale de compatibilité — utile pour une action produite par
 * l'onglet courant. Les événements métier durables utilisent Web Push v3. */
export function notify(title: string, body?: string): boolean {
  if (!isWebNotifEnabled()) return false;
  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "toumai-local",
    });
    return true;
  } catch {
    return false;
  }
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    await navigator.serviceWorker.ready;
    return existing;
  }
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;
  return registration;
}

export async function getExistingWebPushSubscription(): Promise<PushSubscription | null> {
  if (getWebNotifState() === "unsupported") return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/** Activation réelle Web Push v3.
 *
 * Aucun endpoint/clé de subscription n'est stocké dans localStorage. Le
 * navigateur conserve les credentials et le backend service_role les protège.
 */
export async function enableWebPushNotifications(): Promise<WebPushActivationResult> {
  const permission = await enableWebNotifications();
  if (permission !== "granted") {
    return {
      permission,
      subscribed: false,
      configured: false,
      reason: permission === "denied" ? "permission_denied" : permission,
    };
  }

  const vapid = await getWebPushPublicKey();
  if (!vapid.configured || !vapid.publicKey) {
    setWebNotifEnabled(false);
    return {
      permission,
      subscribed: false,
      configured: false,
      reason: "server_not_configured",
    };
  }

  const registration = await serviceWorkerRegistration();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapid.publicKey),
    });
  }

  try {
    await registerWebPushSubscription(subscription);
    await updateNotificationPreferences({ web_push_enabled: true });
    setWebNotifEnabled(true);
    return { permission, subscribed: true, configured: true };
  } catch (error) {
    // Une subscription navigateur non enregistrée côté serveur ne sert à rien
    // et risque de faire croire à l'utilisateur que le canal est actif.
    try {
      await subscription.unsubscribe();
    } catch {
      // Best effort.
    }
    setWebNotifEnabled(false);
    throw error;
  }
}

export async function disableWebPushNotifications(): Promise<void> {
  const subscription = await getExistingWebPushSubscription();

  // Couper d'abord côté produit : même si le navigateur refuse ensuite de
  // supprimer sa subscription locale, le moteur v3 n'enverra plus rien.
  await updateNotificationPreferences({ web_push_enabled: false });

  if (subscription) {
    try {
      await revokeWebPushSubscription(subscription.endpoint);
    } finally {
      try {
        await subscription.unsubscribe();
      } catch {
        // La préférence serveur reste coupée : pas de faux état actif.
      }
    }
  }
  setWebNotifEnabled(false);
}

export async function isWebPushSubscribed(): Promise<boolean> {
  if (getWebNotifState() !== "granted") return false;
  try {
    return Boolean(await getExistingWebPushSubscription());
  } catch {
    return false;
  }
}
