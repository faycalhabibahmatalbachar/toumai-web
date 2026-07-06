"use client";

import { useEffect, useState } from "react";
import { getPreferences, updatePreferences, type Preferences } from "@/lib/preferences-api";
import { cacheSeed, cacheWrite } from "@/lib/swr-cache";
import {
  enableWebNotifications,
  getWebNotifState,
  isWebNotifEnabled,
  notify,
  setWebNotifEnabled,
  type WebNotifState,
} from "@/lib/web-notifications";
import { CxSwitch, Panel, Row } from "./Rows";

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<Preferences | null>(() => cacheSeed<Preferences>("user:prefs"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then((p) => {
        setPrefs(p);
        cacheWrite("user:prefs", p);
      })
      .catch((err) =>
        setPrefs((c) => {
          if (!c) setError(err instanceof Error ? err.message : "Chargement impossible");
          return c;
        }),
      );
  }, []);

  async function save(patch: Partial<Preferences>) {
    if (!prefs) return;
    const prev = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setError(null);
    try {
      await updatePreferences(patch);
      cacheWrite("user:prefs", next);
    } catch (err) {
      setPrefs(prev);
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  }

  if (!prefs) {
    return <div className="h-48 w-full animate-pulse rounded-[14px] bg-[var(--cx-surface)]" aria-hidden="true" />;
  }

  return (
    <div>
      <Panel title="Cet appareil">
        <WebNotifRow />
      </Panel>

      <Panel title="Ce que Toumaï AI peut signaler">
        <Row
          label="Suggestions proactives"
          description="Toumaï AI vous propose des idées selon le contexte."
        >
          <CxSwitch
            checked={prefs.notif_suggestions}
            label="Suggestions proactives"
            onChange={(v) => save({ notif_suggestions: v })}
          />
        </Row>
        <Row label="Auto-pilote WhatsApp" description="Alertes liées aux réponses automatiques.">
          <CxSwitch
            checked={prefs.notif_wa}
            label="Auto-pilote WhatsApp"
            onChange={(v) => save({ notif_wa: v })}
          />
        </Row>
        <Row label="Agenda" description="Rappels d'événements Google Agenda.">
          <CxSwitch
            checked={prefs.notif_calendar}
            label="Agenda"
            onChange={(v) => save({ notif_calendar: v })}
          />
        </Row>
      </Panel>

      {error && <p className="text-sm text-[var(--cx-error-text)]">{error}</p>}
    </div>
  );
}

/** Notifications du navigateur — même moteur que le connecteur « Notifications
 * web » de l'onglet Connecteurs : permission navigateur + préférence locale. */
function WebNotifRow() {
  const [perm, setPerm] = useState<WebNotifState>("default");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPerm(getWebNotifState());
    setEnabled(isWebNotifEnabled());
  }, []);

  async function toggle(v: boolean) {
    if (!v) {
      setWebNotifEnabled(false);
      setEnabled(false);
      return;
    }
    setBusy(true);
    const res = await enableWebNotifications();
    setPerm(res);
    const on = res === "granted";
    setEnabled(on);
    if (on) notify("Toumaï AI", "Les notifications sont activées — vous serez prévenu ici.");
    setBusy(false);
  }

  const description =
    perm === "unsupported"
      ? "Votre navigateur ne prend pas en charge les notifications."
      : perm === "denied"
        ? "Bloquées par le navigateur — réautorisez le site dans ses réglages."
        : "Recevez les alertes ci-dessous même quand l'onglet est en arrière-plan.";

  return (
    <Row label="Notifications du navigateur" description={description}>
      {perm === "unsupported" || perm === "denied" ? (
        <span
          className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={{
            color: "var(--cx-error-text)",
            background: "var(--cx-error-bg)",
            borderColor: "var(--cx-error-border)",
          }}
        >
          {perm === "denied" ? "Bloquées" : "Non supportées"}
        </span>
      ) : (
        <CxSwitch
          checked={enabled}
          label="Notifications du navigateur"
          onChange={toggle}
          disabled={busy}
        />
      )}
    </Row>
  );
}
