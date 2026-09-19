import { authFetch, http } from "./http";

export interface NotificationInboxItem {
  id: string;
  title: string;
  body: string;
  event?: string | null;
  canonical_event?: string | null;
  priority?: string | null;
  status?: string | null;
  deep_link?: string | null;
  action?: string | null;
  created_at?: string | null;
  read_at?: string | null;
  archived_at?: string | null;
}

export async function listNotifications(offset = 0, limit = 30) {
  const res = await authFetch(
    `/notifications?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
  );
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: NotificationInboxItem[];
    count?: number;
    has_more?: boolean;
  };
  if (!res.ok || body.success !== true || !Array.isArray(body.data)) {
    throw new Error("Impossible de charger les notifications");
  }
  return {
    items: body.data,
    count: Number(body.count ?? body.data.length),
    hasMore: body.has_more === true,
  };
}

export async function unreadNotificationCount(): Promise<number> {
  const res = await authFetch("/notifications/unread-count");
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    unread_count?: number;
  };
  if (!res.ok || body.success !== true) {
    throw new Error("Impossible de lire le compteur de notifications");
  }
  return Number(body.unread_count ?? 0);
}

export const markNotificationRead = (id: string) =>
  http.post(`/notifications/${encodeURIComponent(id)}/read`);

export const markAllNotificationsRead = () =>
  http.post("/notifications/read-all");

export const archiveNotification = (id: string) =>
  http.post(`/notifications/${encodeURIComponent(id)}/archive`);

export interface NotificationPreference {
  user_id?: string;
  category: string;
  inbox_enabled: boolean;
  push_enabled: boolean;
  web_push_enabled: boolean;
  realtime_enabled: boolean;
  voice_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_start?: string | null;
  quiet_end?: string | null;
  timezone: string;
  locale: string;
}

export const getNotificationPreference = (category = "*") =>
  http.get<NotificationPreference>(
    `/notifications/preferences?category=${encodeURIComponent(category)}`,
  );

export const updateNotificationPreference = (
  patch: Partial<Omit<NotificationPreference, "user_id" | "category">>,
  category = "*",
) =>
  http.patch<NotificationPreference>(
    `/notifications/preferences?category=${encodeURIComponent(category)}`,
    patch,
  );


export interface ProductNotificationPreference {
  key: string;
  enabled: boolean;
  locked: boolean;
}

export interface ProductNotificationPreferences {
  categories: ProductNotificationPreference[];
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone?: string | null;
  };
}

export const getProductNotificationPreferences = () =>
  http.get<ProductNotificationPreferences>("/preferences/notifications");

export const updateProductNotificationPreferences = (
  patch: {
    categories?: Record<string, boolean>;
    quiet_hours?: {
      enabled?: boolean;
      start?: string;
      end?: string;
    };
  },
) =>
  http.put<ProductNotificationPreferences>("/preferences/notifications", patch);


export interface NotificationCapabilities {
  inbox_v3: boolean;
  read_actions: boolean;
  preferences_v3: boolean;
  web_push_schema: boolean;
  web_push_provider: boolean;
  realtime_stream?: boolean;
  voice_reminders?: boolean;
}

/**
 * null = backend pré-v3 (route absente).
 * Une autre panne est propagée : ne pas confondre indisponibilité réseau et
 * rollout normal.
 */
export async function getNotificationCapabilities(): Promise<NotificationCapabilities | null> {
  const res = await authFetch("/notifications/capabilities");
  if (res.status === 404) return null;
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: NotificationCapabilities;
  };
  if (!res.ok || body.success !== true || !body.data) {
    throw new Error("État Notifications indisponible");
  }
  return body.data;
}


export interface RealtimeNotification {
  id?: string | null;
  title: string;
  body: string;
  event?: string | null;
  canonical_event?: string | null;
  priority?: string | null;
  status?: string | null;
  deep_link?: string | null;
  action?: string | null;
  created_at?: string | null;
  read_at?: string | null;
  archived_at?: string | null;
  voice_enabled?: boolean;
  locale?: string | null;
  test_id?: string | null;
}

export interface NotificationChannelTestResult {
  test_id: string;
  notification_id?: string | null;
  inbox: { ok: boolean; replayed: boolean };
  realtime: { requested: boolean };
  voice: { requested: boolean };
  web_push: {
    configured: boolean;
    subscriptions: number;
    sent: number;
    failed: number;
    removed: number;
  };
}

export const testNotificationChannels = (testId: string) =>
  http.post<NotificationChannelTestResult>("/notifications/test-channels", {
    test_id: testId,
  });
