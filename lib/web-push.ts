"use client";

import { authFetch, http } from "./http";
import { updateNotificationPreference } from "./notifications-api";

export type WebPushState = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  configured: boolean;
};

function keyBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function serverKey(): Promise<{ configured: boolean; publicKey: string | null }> {
  const res = await authFetch("/notifications/web-push/vapid-public-key");
  const body = (await res.json().catch(() => ({}))) as {
    configured?: boolean;
    public_key?: string | null;
  };
  if (!res.ok) throw new Error("Web Push indisponible");
  return {
    configured: body.configured === true,
    publicKey: typeof body.public_key === "string" ? body.public_key : null,
  };
}

function supported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function webPushState(): Promise<WebPushState> {
  if (!supported()) {
    return { supported: false, permission: "unsupported", subscribed: false, configured: false };
  }
  const configured = await serverKey().then((v) => v.configured).catch(() => false);
  const registration = await navigator.serviceWorker.ready;
  const current = await registration.pushManager.getSubscription().catch(() => null);
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(current),
    configured,
  };
}

export async function enableWebPush(): Promise<WebPushState> {
  if (!supported()) {
    return { supported: false, permission: "unsupported", subscribed: false, configured: false };
  }
  const { configured, publicKey } = await serverKey();
  if (!configured || !publicKey) throw new Error("Web Push n’est pas configuré sur le serveur");

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    return { supported: true, permission, subscribed: false, configured: true };
  }

  const registration = await navigator.serviceWorker.ready;
  let current = await registration.pushManager.getSubscription();
  if (!current) {
    current = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    });
  }

  const data = current.toJSON();
  if (!data.keys?.p256dh || !data.keys.auth) {
    throw new Error("Subscription Web Push incomplète");
  }
  await http.post("/notifications/web-push/subscribe", {
    endpoint: current.endpoint,
    keys: { p256dh: data.keys.p256dh, auth: data.keys.auth },
  });
  await updateNotificationPreference({ web_push_enabled: true });

  return { supported: true, permission: "granted", subscribed: true, configured: true };
}

export async function disableWebPush(): Promise<WebPushState> {
  if (!supported()) {
    return { supported: false, permission: "unsupported", subscribed: false, configured: false };
  }

  const registration = await navigator.serviceWorker.ready;
  const current = await registration.pushManager.getSubscription();
  if (current) {
    try {
      await authFetch("/notifications/web-push/subscription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: current.endpoint }),
      });
    } finally {
      await current.unsubscribe().catch(() => false);
    }
  }
  await updateNotificationPreference({ web_push_enabled: false }).catch(() => undefined);
  const configured = await serverKey().then((v) => v.configured).catch(() => false);

  return {
    supported: true,
    permission: Notification.permission,
    subscribed: false,
    configured,
  };
}
