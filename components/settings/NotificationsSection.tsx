"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  getNotificationPreference,
  getProductNotificationPreferences,
  updateNotificationPreference,
  updateProductNotificationPreferences,
  type NotificationPreference,
  type ProductNotificationPreferences,
} from "@/lib/notifications-api";
import {
  disableWebPush,
  enableWebPush,
  webPushState,
  type WebPushState,
} from "@/lib/web-push";
import { CxSwitch, Panel, Row } from "./Rows";

const LABELS: Record<string, { label: string; description: string }> = {
  ai_tasks: {
    label: "Assistant",
    description: "Tâches terminées, erreurs et résultats importants.",
  },
  confirmations: {
    label: "Actions à valider",
    description: "Une action de l’agent attend votre décision.",
  },
  automations_success: {
    label: "Automatisations réussies",
    description: "Une exécution programmée s’est terminée.",
  },
  automations_failure: {
    label: "Automatisations en échec",
    description: "Une exécution a échoué ou demande votre attention.",
  },
  reminders: {
    label: "Rappels",
    description: "Alarmes, rendez-vous et rappels programmés.",
  },
  whatsapp_messages: {
    label: "Messages WhatsApp",
    description: "Messages et médias reçus ou événements de conversation.",
  },
  whatsapp_autopilot: {
    label: "Auto-pilote WhatsApp",
    description: "Suggestions et réponses automatiques.",
  },
  whatsapp_connection: {
    label: "Connexion WhatsApp",
    description: "Connexion perdue, restaurée ou session à renouveler.",
  },
  mail: {
    label: "E-mail",
    description: "Envois et événements liés à votre messagerie.",
  },
  calendar: {
    label: "Agenda",
    description: "Événements et rappels de calendrier.",
  },
  usage: {
    label: "Usage et limites",
    description: "Quota bientôt atteint, atteint ou réinitialisé.",
  },
  security: {
    label: "Sécurité du compte",
    description: "Connexions, sessions et changements sensibles.",
  },
  product: {
    label: "Toumaï AI",
    description: "Mises à jour produit et informations système utiles.",
  },
};

const EMPTY_WEB_PUSH: WebPushState = {
  supported: false,
  permission: "unsupported",
  subscribed: false,
  configured: false,
};

export function NotificationsSection() {
  const [global, setGlobal] = useState<NotificationPreference | null>(null);
  const [product, setProduct] = useState<ProductNotificationPreferences | null>(null);
  const [push, setPush] = useState<WebPushState>(EMPTY_WEB_PUSH);
  const [v3Available, setV3Available] = useState(false);
  const voiceSupported = useSyncExternalStore(
    () => () => undefined,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [p, w] = await Promise.all([
          getProductNotificationPreferences(),
          webPushState(),
        ]);

        let g: NotificationPreference;
        let available = false;
        try {
          g = await getNotificationPreference("*");
          available = true;
        } catch {
          // Compatibilité avec le backend pré-v3 : les catégories et heures
          // calmes restent pleinement utilisables via /preferences/notifications.
          // Les nouveaux canaux restent visibles mais non modifiables tant que
          // /notifications/preferences n'est pas déployé.
          g = {
            category: "*",
            inbox_enabled: true,
            push_enabled: true,
            web_push_enabled: false,
            realtime_enabled: true,
            voice_enabled: false,
            email_enabled: false,
            quiet_hours_enabled: Boolean(p.quiet_hours?.enabled),
            quiet_start: p.quiet_hours?.start ?? "22:00",
            quiet_end: p.quiet_hours?.end ?? "07:00",
            timezone: p.quiet_hours?.timezone ?? "Africa/Ndjamena",
            locale: "fr",
          };
        }

        if (cancelled) return;
        setGlobal(g);
        setProduct(p);
        setPush(w);
        setV3Available(available);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Chargement impossible");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () =>
      (product?.categories ?? []).filter((item) => LABELS[item.key]),
    [product],
  );

  async function saveGlobal(
    patch: Partial<Omit<NotificationPreference, "user_id" | "category">>,
  ) {
    if (!global || !v3Available) return;
    const previous = global;
    setGlobal({ ...global, ...patch });
    setError(null);
    try {
      const saved = await updateNotificationPreference(patch, "*");
      setGlobal(saved);
    } catch (err) {
      setGlobal(previous);
      setError(err instanceof Error ? err.message : "Échec de l’enregistrement");
    }
  }

  async function saveCategory(key: string, enabled: boolean) {
    if (!product) return;
    const previous = product;
    setProduct({
      ...product,
      categories: product.categories.map((item) =>
        item.key === key ? { ...item, enabled } : item,
      ),
    });
    setError(null);
    try {
      const saved = await updateProductNotificationPreferences({
        categories: { [key]: enabled },
      });
      setProduct(saved);
    } catch (err) {
      setProduct(previous);
      setError(err instanceof Error ? err.message : "Échec de l’enregistrement");
    }
  }

  async function saveQuiet(
    patch: Partial<ProductNotificationPreferences["quiet_hours"]>,
  ) {
    if (!product) return;
    const previous = product;
    const next = {
      ...product,
      quiet_hours: { ...product.quiet_hours, ...patch },
    };
    setProduct(next);
    setError(null);
    try {
      const saved = await updateProductNotificationPreferences({
        quiet_hours: patch,
      });
      setProduct(saved);
    } catch (err) {
      setProduct(previous);
      setError(err instanceof Error ? err.message : "Échec de l’enregistrement");
    }
  }

  async function toggleWebPush(enabled: boolean) {
    if (!v3Available) return;
    setBusy("web_push");
    setError(null);
    try {
      const next = enabled ? await enableWebPush() : await disableWebPush();
      setPush(next);
      const latest = await getNotificationPreference("*");
      setGlobal(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Web Push indisponible");
      setPush(await webPushState().catch(() => EMPTY_WEB_PUSH));
    } finally {
      setBusy(null);
    }
  }

  if (!global || !product) {
    return (
      <div className="space-y-4">
        <div className="h-32 w-full animate-pulse rounded-[14px] bg-[var(--cx-surface)]" />
        <div className="h-64 w-full animate-pulse rounded-[14px] bg-[var(--cx-surface)]" />
        {error && <p className="text-sm text-[var(--cx-error-text)]">{error}</p>}
      </div>
    );
  }

  const webPushDescription = !push.supported
    ? "Ce navigateur ne prend pas en charge Web Push."
    : !push.configured
      ? "Le serveur n’a pas encore de clé VAPID active."
      : push.permission === "denied"
        ? "Bloqué par le navigateur. Réautorisez Toumaï AI dans ses réglages."
        : "Fonctionne même lorsque l’onglet Toumaï AI est fermé.";

  return (
    <div className="space-y-4">
      <Panel title="Canaux">
        <Row
          label="Push mobile"
          description={
            v3Available
              ? "Autorise les alertes sur vos appareils mobiles enregistrés."
              : "Disponible dès la mise à niveau Notifications v3 du serveur."
          }
        >
          <CxSwitch
            checked={global.push_enabled}
            label="Push mobile"
            disabled={!v3Available}
            onChange={(value) => void saveGlobal({ push_enabled: value })}
          />
        </Row>

        <Row
          label="Inbox Toumaï"
          description="Toujours active pour conserver chaque rappel même si un canal externe échoue."
        >
          <CxSwitch
            checked
            label="Inbox Toumaï"
            disabled
            onChange={() => undefined}
          />
        </Row>

        <Row
          label="Temps réel dans Toumaï"
          description="Affiche immédiatement le rappel dans l’application lorsque Toumaï est ouvert."
        >
          <CxSwitch
            checked={global.realtime_enabled}
            label="Temps réel dans Toumaï"
            disabled={!v3Available}
            onChange={(value) => void saveGlobal({ realtime_enabled: value })}
          />
        </Row>

        <Row
          label="Voix Toumaï"
          description={
            voiceSupported
              ? "Lit les rappels à voix haute uniquement quand Toumaï est ouvert au premier plan."
              : "La lecture vocale n’est pas prise en charge par ce navigateur."
          }
        >
          <CxSwitch
            checked={global.voice_enabled}
            label="Voix Toumaï"
            disabled={!v3Available || !voiceSupported}
            onChange={(value) => void saveGlobal({ voice_enabled: value })}
          />
        </Row>

        <Row label="Web Push" description={webPushDescription}>
          <CxSwitch
            checked={push.subscribed && global.web_push_enabled}
            label="Web Push"
            disabled={
              !v3Available ||
              busy === "web_push" ||
              !push.supported ||
              !push.configured ||
              push.permission === "denied"
            }
            onChange={(value) => void toggleWebPush(value)}
          />
        </Row>

        <Row
          label="E-mail"
          description="Pour les événements qui autorisent explicitement ce canal."
        >
          <CxSwitch
            checked={global.email_enabled}
            label="E-mail"
            disabled={!v3Available}
            onChange={(value) => void saveGlobal({ email_enabled: value })}
          />
        </Row>
      </Panel>

      {!v3Available && (
        <p className="rounded-xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] px-4 py-3 text-xs leading-relaxed text-[var(--cx-text-secondary)]">
          Vos catégories et heures calmes restent actives. Les canaux Push Web et e-mail
          seront modifiables dès que le backend Notifications v3 sera déployé.
        </p>
      )}

      <Panel title="Ce que Toumaï AI peut signaler">
        {categories.map((item) => {
          const copy = LABELS[item.key];
          return (
            <Row
              key={item.key}
              label={copy.label}
              description={copy.description}
            >
              <CxSwitch
                checked={item.enabled}
                label={copy.label}
                disabled={item.locked}
                onChange={(value) => void saveCategory(item.key, value)}
              />
            </Row>
          );
        })}
      </Panel>

      <Panel title="Heures calmes">
        <Row
          label="Ne pas déranger"
          description="Les événements P0 restent prioritaires ; les autres canaux interruptifs sont silencés."
        >
          <CxSwitch
            checked={product.quiet_hours.enabled}
            label="Heures calmes"
            onChange={(value) => void saveQuiet({ enabled: value })}
          />
        </Row>

        {product.quiet_hours.enabled && (
          <div className="grid grid-cols-2 gap-3 border-t border-[var(--cx-border-subtle)] px-4 py-4">
            <label className="text-xs font-medium text-[var(--cx-text-secondary)]">
              Début
              <input
                type="time"
                value={product.quiet_hours.start}
                onChange={(event) => void saveQuiet({ start: event.target.value })}
                className="mt-1 block h-10 w-full rounded-xl border border-[var(--cx-border)] bg-[var(--cx-surface)] px-3 text-sm text-[var(--cx-text-primary)] outline-none focus:border-[var(--cx-accent)]"
              />
            </label>
            <label className="text-xs font-medium text-[var(--cx-text-secondary)]">
              Fin
              <input
                type="time"
                value={product.quiet_hours.end}
                onChange={(event) => void saveQuiet({ end: event.target.value })}
                className="mt-1 block h-10 w-full rounded-xl border border-[var(--cx-border)] bg-[var(--cx-surface)] px-3 text-sm text-[var(--cx-text-primary)] outline-none focus:border-[var(--cx-accent)]"
              />
            </label>
          </div>
        )}
      </Panel>

      <p className="px-1 text-xs leading-relaxed text-[var(--cx-text-tertiary)]">
        L’Inbox reste durable même quand un canal externe est désactivé ou échoue.
        Les heures calmes suspendent les canaux interruptifs ; la voix ne parle jamais
        en arrière-plan et reste désactivée tant que vous ne l’activez pas.
      </p>

      {error && <p className="text-sm text-[var(--cx-error-text)]">{error}</p>}
    </div>
  );
}
