import { authFetch, http } from "./http";

export interface ToumaiNotification {
  id: string;
  title: string;
  body: string;
  event?: string | null;
  canonical_event?: string | null;
  priority?: "P0" | "P1" | "P2" | "P3" | string | null;
  status?: string | null;
  read_at?: string | null;
  archived_at?: string | null;
  created_at?: string | null;
  deep_link?: string | null;
  action?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface NotificationPreferencesV3 {
  inbox_enabled: boolean;
  push_enabled: boolean;
  web_push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_start?: string | null;
  quiet_end?: string | null;
  timezone: string;
  locale: string;
}

export interface NotificationList {
  data: ToumaiNotification[];
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

type JsonRecord = Record<string, unknown>;

async function authJson(path: string, init?: RequestInit): Promise<JsonRecord> {
  const response = await authFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as JsonRecord;
  if (!response.ok || body.success === false) {
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.detail === "string"
          ? body.detail
          : `Erreur ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export async function listNotifications(options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<NotificationList> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? 50));
  params.set("offset", String(options?.offset ?? 0));
  if (options?.unreadOnly) params.set("unread_only", "true");

  const body = await authJson(`/notifications?${params.toString()}`);
  return {
    data: Array.isArray(body.data)
      ? (body.data as ToumaiNotification[])
      : [],
    count: Number(body.count ?? 0),
    limit: Number(body.limit ?? options?.limit ?? 50),
    offset: Number(body.offset ?? options?.offset ?? 0),
    has_more: body.has_more === true,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const body = await authJson("/notifications/unread-count");
  return Number(body.unread_count ?? 0);
}

export async function markNotificationRead(id: string): Promise<void> {
  await authJson(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(): Promise<number> {
  const body = await authJson("/notifications/read-all", { method: "POST" });
  return Number(body.updated ?? 0);
}

export async function archiveNotification(id: string): Promise<void> {
  await authJson(`/notifications/${encodeURIComponent(id)}/archive`, {
    method: "POST",
  });
}

export function getNotificationPreferences(
  category = "*",
): Promise<NotificationPreferencesV3> {
  return http.get<NotificationPreferencesV3>(
    `/notifications/preferences?category=${encodeURIComponent(category)}`,
  );
}

export function updateNotificationPreferences(
  patch: Partial<NotificationPreferencesV3>,
  category = "*",
): Promise<NotificationPreferencesV3> {
  return http.patch<NotificationPreferencesV3>(
    `/notifications/preferences?category=${encodeURIComponent(category)}`,
    patch,
  );
}

export async function getWebPushPublicKey(): Promise<{
  configured: boolean;
  publicKey: string | null;
}> {
  const body = await authJson("/notifications/web-push/vapid-public-key");
  return {
    configured: body.configured === true,
    publicKey: typeof body.public_key === "string" ? body.public_key : null,
  };
}

export async function registerWebPushSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Subscription Web Push incomplète");
  }

  await authJson("/notifications/web-push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      endpoint,
      keys: { p256dh, auth },
    }),
  });
}

export async function revokeWebPushSubscription(endpoint: string): Promise<void> {
  await authJson("/notifications/web-push/subscription", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}
