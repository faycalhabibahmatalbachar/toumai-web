"use client";

import { useEffect, useState } from "react";
import { getPreferences, updatePreferences, type Preferences } from "@/lib/preferences-api";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferencesV3,
} from "@/lib/notifications-api";
import { cacheSeed, cacheWrite } from "@/lib/swr-cache";
import {
  disableWebPushNotifications,
  enableWebPushNotifications,
  getWebNotifState,
  isWebPushSubscribed,
  type WebNotifState,
} from "@/lib/web-notifications";
import { CxSwitch, Panel, Row } from "./Rows";

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<Preferences | null>(() =>
    cacheSeed<Preferences>("user:prefs"),
  );
  const [v3, setV3] = useState<NotificationPreferencesV3 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingV3, setSavingV3] = useState(false);

  useEffect(() => {
    getPreferences()
      .then((p) => {
        setPrefs(p);
        cacheWrite("user:prefs", p);
      })
      .catch((err) =>
        setPrefs((current) => {
          if (!current) {
            setError(err instanceof Error ? err.message : "Chargement impossible");
          }
          return current;
        }),
      );

    getNotificationPreferences()
      .then(setV3)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Les préférences de notification sont indisponibles.",
        ),
      );
  }, []);

  async function saveLegacy(patch: Partial<Preferences>) {
    if (!prefs) return;
    const previous = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setError(null);
    try {
      await updatePreferences(patch);
      cacheWrite("user:prefs", next);
    } catch (err) {
      setPrefs(previous);
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  }

  async function saveV3(patch: Partial<NotificationPreferencesV3>) {
    if (!v3 || savingV3) return false;
    const previous = v3;
    const next = { ...v3, ...patch };
    setV3(next);
    setSavingV3(true);
    setError(null);
    try {
      const saved = await updateNotificationPreferences(patch);
      setV3({ ...next, ...(saved ?? {}) });
      return true;
    } catch (err) {
      setV3(previous);
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
      return false;
    } finally {
      setSavingV3(false);
    }
  }

  if (!prefs || !v3) {
    return (
      <div
        className="h-48 w-full animate-pulse rounded-[14px] bg-[var(--cx-surface)]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="space-y-5">
      <Panel title="Canaux">
        <Row
          label="Inbox Toumaï"
          description="Conserve les événements importants dans votre centre de notifications."
        >
          <CxSwitch
            checked={v3.inbox_enabled}
            label="Inbox Toumaï"
            disabled={savingV3}
            onChange={(value) => void saveV3({ inbox_enabled: value })}
          />
        </Row>

        <WebPushRow
          enabledByServer={v3.web_push_enabled}
          disabled={savingV3}
          onServerPreference={(value) => {
            setV3((current) =>
              current ? { ...current, web_push_enabled: value } : current,
            );
          }}
          onError={setError}
        />

        <Row
          label="Email"
          description="Pour les événements compatibles : sécurité, paiements et alertes critiques."
        >
          <CxSwitch
            checked={v3.email_enabled}
            label="Notifications Email"
            disabled={savingV3}
            onChange={(value) => void saveV3({ email_enabled: value })}
          />
        </Row>
      </Panel>

      <Panel title="Heures silencieuses">
        <Row
          label="Mode silencieux"
          description="Les alertes non critiques attendent la fin de la plage. Un canal explicitement désactivé reste toujours désactivé."
        >
          <CxSwitch
            checked={v3.quiet_hours_enabled}
            label="Heures silencieuses"
            disabled={savingV3}
            onChange={(value) =>
              void saveV3({
                quiet_hours_enabled: value,
                ...(value && !v3.quiet_start ? { quiet_start: "22:00" } : {}),
                ...(value && !v3.quiet_end ? { quiet_end: "07:00" } : {}),
              })
            }
          />
        </Row>

        {v3.quiet_hours_enabled && (
          <div className="grid gap-3 border-t border-[var(--cx-border-subtle)] px-4 py-4 sm:grid-cols-2">
            <TimeField
              label="Début"
              value={(v3.quiet_start ?? "22:00").slice(0, 5)}
              disabled={savingV3}
              onChange={(quiet_start) => void saveV3({ quiet_start })}
            />
            <TimeField
              label="Fin"
              value={(v3.quiet_end ?? "07:00").slice(0, 5)}
              disabled={savingV3}
              onChange={(quiet_end) => void saveV3({ quiet_end })}
            />
          </div>
        )}
      </Panel>

      <Panel title="Ce que Toumaï AI peut signaler">
        <Row
          label="Suggestions proactives"
          description="Toumaï AI vous propose des idées selon le contexte."
        >
          <CxSwitch
            checked={prefs.notif_suggestions}
            label="Suggestions proactives"
            onChange={(value) => void saveLegacy({ notif_suggestions: value })}
          />
        </Row>
        <Row
          label="Auto-pilote WhatsApp"
          description="Alertes liées aux réponses automatiques."
        >
          <CxSwitch
            checked={prefs.notif_wa}
            label="Auto-pilote WhatsApp"
            onChange={(value) => void saveLegacy({ notif_wa: value })}
          />
        </Row>
        <Row label="Agenda" description="Rappels d'événements Google Agenda.">
          <CxSwitch
            checked={prefs.notif_calendar}
            label="Agenda"
            onChange={(value) => void saveLegacy({ notif_calendar: value })}
          />
        </Row>
      </Panel>

      {error && (
        <p className="text-sm text-[var(--cx-error-text)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function WebPushRow({
  enabledByServer,
  disabled,
  onServerPreference,
  onError,
}: {
  enabledByServer: boolean;
  disabled: boolean;
  onServerPreference: (value: boolean) => void;
  onError: (value: string | null) => void;
}) {
  const [permission, setPermission] = useState<WebNotifState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      setPermission(getWebNotifState());
      void isWebPushSubscribed().then((value) => {
        if (!cancelled) setSubscribed(value);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  async function toggle(value: boolean) {
    if (busy || disabled) return;
    setBusy(true);
    onError(null);
    try {
      if (value) {
        const result = await enableWebPushNotifications();
        setPermission(result.permission);
        setSubscribed(result.subscribed);
        if (!result.subscribed) {
          if (result.reason === "server_not_configured") {
            throw new Error(
              "Web Push n'est pas encore configuré côté serveur (clé VAPID manquante).",
            );
          }
          if (result.permission === "denied") {
            throw new Error(
              "Les notifications sont bloquées dans les réglages du navigateur.",
            );
          }
          return;
        }
        onServerPreference(true);
      } else {
        await disableWebPushNotifications();
        setSubscribed(false);
        onServerPreference(false);
      }
    } catch (err) {
      const actual = await isWebPushSubscribed();
      setSubscribed(actual);
      onError(
        err instanceof Error
          ? err.message
          : "La configuration Web Push n'a pas abouti.",
      );
    } finally {
      setBusy(false);
    }
  }

  const unsupported = permission === "unsupported";
  const denied = permission === "denied";
  const active = enabledByServer && subscribed && permission === "granted";

  const description = unsupported
    ? "Ce navigateur ne prend pas en charge PushManager."
    : denied
      ? "Bloquées par le navigateur. Réautorisez toumaiai.com dans ses réglages."
      : active
        ? "Actif sur ce navigateur, même lorsque l'onglet Toumaï n'est pas ouvert."
        : enabledByServer && !subscribed
          ? "La préférence serveur est active, mais ce navigateur doit être réabonné."
          : "Recevez les alertes importantes même quand l'onglet est fermé.";

  return (
    <Row label="Web Push" description={description}>
      {unsupported || denied ? (
        <span
          className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={{
            color: "var(--cx-error-text)",
            background: "var(--cx-error-bg)",
            borderColor: "var(--cx-error-border)",
          }}
        >
          {denied ? "Bloquées" : "Non supporté"}
        </span>
      ) : (
        <CxSwitch
          checked={active}
          label="Web Push"
          onChange={(value) => void toggle(value)}
          disabled={busy || disabled}
        />
      )}
    </Row>
  );
}

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--cx-text-secondary)]">{label}</span>
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] px-3 py-2 text-[var(--cx-text-primary)] outline-none focus:border-[var(--primary)] disabled:opacity-50"
      />
    </label>
  );
}
