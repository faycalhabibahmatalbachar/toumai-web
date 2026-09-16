"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock3,
  ContactRound,
  Copy,
  KeyRound,
  LoaderCircle,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unplug,
  UserRound,
  Wifi,
} from "lucide-react";
import type { WaEtat, WhatsAppState } from "@/lib/connectors-api";
import type { StatusKey } from "@/lib/widgets/core";
import {
  ActionBar,
  ConfirmationPanel,
  Disclosure,
  InlineNotice,
  MetaList,
  ProgressSteps,
  WidgetButton,
  WidgetCard,
  WidgetHeader,
  type MetaItem,
} from "./widgets/primitives";
import { useWidgetRuntime } from "./widgets/runtime";
import { WhatsAppProtectionPanel } from "./WhatsAppProtectionPanel";

export type WhatsAppConnectorIntent =
  | "status"
  | "connect"
  | "reconnect"
  | "qr"
  | "pairing_code"
  | "refresh_pairing"
  | "number"
  | "profile"
  | "last_activity"
  | "connected_duration"
  | "contact_count"
  | "capabilities"
  | "disconnect";

type Props = { intent?: WhatsAppConnectorIntent };

const ACTIVE = new Set(["qr", "pairing", "connecting"]);
const CONNECTION_INTENTS = new Set<WhatsAppConnectorIntent>(["connect", "reconnect", "qr", "pairing_code", "refresh_pairing"]);

function formatDuration(ms?: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "à l’instant";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  if (!rest) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function elapsedSince(timestamp?: number | null): number | null {
  if (timestamp == null || !Number.isFinite(timestamp) || timestamp <= 0) return null;
  const asMs = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  const elapsed = Date.now() - asMs;
  if (elapsed < -5 * 60_000) return null;
  return Math.max(0, elapsed);
}

function maskNumber(value?: string | null) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, "");
  if (clean.length <= 7) return clean;
  const prefix = clean.startsWith("+") ? clean.slice(0, 7) : `+${clean.slice(0, 6)}`;
  return `${prefix}•••${clean.slice(-3)}`;
}

function humanStatus(status?: string | null) {
  switch (status) {
    case "connecte":
    case "connected": return "Connecté";
    case "injoignable": return "Injoignable";
    case "session_expiree": return "Session expirée";
    case "deconnecte":
    case "disconnected": return "Déconnecté";
    case "qr": return "QR à scanner";
    case "pairing":
    case "jumelage": return "Jumelage";
    case "connecting":
    case "connexion": return "Connexion";
    case "unconfigured":
    case "non_configure": return "Non configuré";
    case "error":
    case "erreur": return "Erreur";
    default: return "Vérification";
  }
}

function expirationMs(etat?: WaEtat | null, raw?: WhatsAppState | null): number | null {
  if (etat?.code_expire_le && Number.isFinite(etat.code_expire_le)) {
    return etat.code_expire_le < 10_000_000_000 ? etat.code_expire_le * 1000 : etat.code_expire_le;
  }
  if (raw?.codeExpiresAt) {
    const parsed = new Date(raw.codeExpiresAt).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function countdown(expiry: number | null, now: number) {
  if (!expiry) return null;
  const seconds = Math.max(0, Math.floor((expiry - now) / 1000));
  if (seconds <= 0) return "expiré";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}



export function WhatsAppConnectorCard({ intent = "status" }: Props) {
  const { whatsapp: wa } = useWidgetRuntime();
  const [etat, setEtat] = useState<WaEtat | null>(null);
  const [raw, setRaw] = useState<WhatsAppState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const generation = useRef(0);
  const startedConnection = useRef(false);
  const requestedPairing = useRef(false);
  const wasConnected = useRef(false);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    const [nextEtat, nextRaw] = await Promise.all([
      wa.getEtat().catch(() => null),
      wa.getStatus().catch(() => null),
    ]);
    if (generation.current !== current) return;
    if (!nextEtat && !nextRaw) {
      setError("Impossible de vérifier WhatsApp actuellement.");
      return;
    }
    setError(null);
    if (nextEtat) setEtat(nextEtat);
    if (nextRaw) setRaw(nextRaw);
  }, [wa]);

  const startQr = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopiedCode(false);
    try {
      const next = await wa.linkQr();
      setRaw(next);
      const nextEtat = await wa.getEtat().catch(() => null);
      if (nextEtat) setEtat(nextEtat);
      setExpanded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de la liaison WhatsApp.");
    } finally {
      setBusy(false);
    }
  }, [wa]);

  const refreshPairing = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopiedCode(false);
    try {
      const next = await wa.refreshCode();
      setRaw((current) => current ? { ...current, pairingCode: next.pairingCode, codeExpiresAt: next.codeExpiresAt, status: "pairing" } : { status: "pairing", pairingCode: next.pairingCode, codeExpiresAt: next.codeExpiresAt });
      await refresh();
      setExpanded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de générer le code de couplage.");
    } finally {
      setBusy(false);
    }
  }, [refresh, wa]);

  useEffect(() => {
    const id = window.setTimeout(() => void refresh(), 0);
    return () => { window.clearTimeout(id); generation.current += 1; };
  }, [refresh]);

  const rawStatus = raw?.status;
  useEffect(() => {
    if (!rawStatus || !ACTIVE.has(rawStatus)) return;
    const id = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(id);
  }, [rawStatus, refresh]);

  useEffect(() => {
    if (!["connect", "reconnect", "qr"].includes(intent) || startedConnection.current) return;
    startedConnection.current = true;
    const id = window.setTimeout(() => void startQr(), 0);
    return () => window.clearTimeout(id);
  }, [intent, startQr]);

  useEffect(() => {
    if (!["pairing_code", "refresh_pairing"].includes(intent) || requestedPairing.current) return;
    requestedPairing.current = true;
    const id = window.setTimeout(() => void refreshPairing(), 250);
    return () => window.clearTimeout(id);
  }, [intent, refreshPairing]);

  const code = etat?.code;
  const connected = code === "connecte" || raw?.status === "connected";
  const unreachable = code === "injoignable" || raw?.status === "injoignable";
  const disconnected = code === "deconnecte" || raw?.status === "disconnected";
  const expired = code === "session_expiree" || raw?.status === "session_expiree";
  const qr = connected ? null : raw?.qr || null;
  const number = etat?.numero || raw?.number || null;
  const pairingCode = connected ? null : etat?.code_jumelage || raw?.pairingCode || null;
  const expiry = expirationMs(etat, raw);
  const expiresIn = countdown(expiry, now);
  const connectedElapsed = elapsedSince(etat?.connecte_depuis_ms);
  const activityElapsed = elapsedSince(etat?.derniere_activite_ms);
  const capabilities = useMemo(() => Object.entries(etat?.capacites || {}).filter(([, enabled]) => enabled), [etat?.capacites]);

  useEffect(() => {
    if (!pairingCode || connected) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [pairingCode, connected]);

  useEffect(() => {
    if (connected && !wasConnected.current && CONNECTION_INTENTS.has(intent)) {
      wasConnected.current = true;
      const id = window.setTimeout(() => setExpanded(false), 2600);
      return () => window.clearTimeout(id);
    }
    if (!connected) wasConnected.current = false;
  }, [connected, intent]);

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await wa.disconnect();
      setConfirmDisconnect(false);
      setExpanded(true);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de déconnecter WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  async function copyPairingCode() {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1600);
  }

  let summary = etat?.libelle || "Lecture de l’état du connecteur…";
  if (unreachable) summary = "Le service WhatsApp ne répond pas actuellement.";
  else if (connected) summary = "Compte lié et prêt pour les actions autorisées.";
  else if (expired) summary = "La session a expiré. Une nouvelle liaison est nécessaire.";
  else if (disconnected) summary = "Aucun compte WhatsApp n’est actuellement lié.";
  else if (qr) summary = "Scannez le QR pour terminer la liaison.";
  else if (pairingCode) summary = "Saisissez ce code dans WhatsApp pour terminer la liaison.";

  const visibleStatus = humanStatus(code || raw?.status);
  const statusKey: StatusKey = connected
    ? "success"
    : unreachable
      ? "unavailable"
      : expired
        ? "auth_required"
        : busy || raw?.status === "connecting" || code === "connexion"
          ? "running"
          : qr || pairingCode
            ? "awaiting_confirmation"
            : code === "erreur" || raw?.status === "error"
              ? "failed"
              : !etat && !raw
                ? "loading"
                : "idle";
  const showCapabilities = intent === "capabilities";
  const showIdentity = connected && ["status", "number", "profile", "last_activity", "connected_duration", "contact_count"].includes(intent);
  const lastActivityLabel = activityElapsed != null ? activityElapsed < 60_000 ? "à l’instant" : `il y a ${formatDuration(activityElapsed)}` : null;

  if (connected && !expanded && CONNECTION_INTENTS.has(intent)) {
    return (
      <WidgetCard label="WhatsApp connecté" tone="success" accent live testId="whatsapp_connected_compact" className="!max-w-[26rem]">
        <WidgetHeader
          icon={MessageCircle}
          tone="success"
          title="WhatsApp connecté"
          subtitle={maskNumber(number) || "Compte lié"}
          trailing={<WidgetButton variant="ghost" onClick={() => setExpanded(true)} ariaLabel="Afficher les détails de la connexion WhatsApp">Détails</WidgetButton>}
        />
      </WidgetCard>
    );
  }

  const identity: MetaItem[] = showIdentity ? [
    { label: "Compte lié", value: number ? maskNumber(number) : "Numéro non fourni", icon: Smartphone },
    etat?.nom_profil ? { label: "Profil", value: etat.nom_profil, icon: UserRound } : null,
    connectedElapsed != null ? { label: "Connecté depuis", value: formatDuration(connectedElapsed), icon: Clock3 } : null,
    lastActivityLabel ? { label: "Dernière activité", value: lastActivityLabel, icon: Wifi } : null,
    etat?.contacts != null ? { label: "Contacts synchronisés", value: `${etat.contacts}${etat.contacts === 0 ? " · pas le total" : ""}`, icon: ContactRound } : null,
  ].filter(Boolean) as MetaItem[] : [];

  return (
    <WidgetCard label="WhatsApp" live testId="whatsapp_connector">
      <WidgetHeader icon={MessageCircle} title="WhatsApp" subtitle={summary} status={statusKey} statusLabel={visibleStatus} />

      {error ? <InlineNotice tone="warning">{error}</InlineNotice> : null}

      {etat?.progression && !connected ? (
        <ProgressSteps
          label="Progression de la connexion WhatsApp"
          steps={etat.progression.etapes.slice(0, 8).map((step) => ({
            key: step.cle,
            label: step.libelle,
            status: step.etat === "termine" ? "success" : step.etat === "echoue" ? "failed" : step.etat === "en_cours" ? "running" : step.etat === "annule" ? "cancelled" : "pending",
          }))}
        />
      ) : null}

      <MetaList items={identity} />

      {intent === "number" && connected && !number ? (
        <InlineNotice tone="neutral">Le compte est lié, mais le connecteur ne fournit pas son numéro. Toumaï n’en déduit aucun.</InlineNotice>
      ) : null}

      {qr && !connected ? (
        <div className="mx-3.5 mb-3 grid gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="mx-auto rounded-lg bg-white p-2 sm:mx-0">
            {/* Le QR vit uniquement dans l'état local du composant : jamais dans Message.content ni l'historique. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code de connexion WhatsApp" className="h-40 w-40 sm:h-44 sm:w-44" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--text-primary)]"><QrCode className="h-3.5 w-3.5" aria-hidden="true" />Scanner avec WhatsApp</p>
            <p className="mt-1 text-[12px] leading-[18px] text-[var(--text-secondary)]">WhatsApp → Appareils connectés → Lier un appareil.</p>
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--text-tertiary)]" role="status"><LoaderCircle className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />En attente du scan…</p>
            <div className="mt-2.5"><WidgetButton icon={RefreshCw} onClick={() => void startQr()} disabled={busy}>Nouveau QR</WidgetButton></div>
          </div>
        </div>
      ) : null}

      {pairingCode && !connected && (intent === "pairing_code" || intent === "refresh_pairing" || !qr) ? (
        <div className="mx-3.5 mb-3 rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]"><KeyRound className="h-3.5 w-3.5" aria-hidden="true" />Code de couplage</p>
            {expiresIn ? <span className={`text-[11.5px] tabular-nums ${expiresIn === "expiré" ? "text-[var(--tmw-error)]" : "text-[var(--text-tertiary)]"}`}>{expiresIn === "expiré" ? "Code expiré" : `Expire dans ${expiresIn}`}</span> : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <p className="min-w-0 flex-1 break-all font-mono text-xl font-semibold tracking-[0.16em] text-[var(--text-primary)]" dir="ltr">{pairingCode}</p>
            <WidgetButton variant="secondary" icon={copiedCode ? Check : Copy} onClick={() => void copyPairingCode()} ariaLabel="Copier le code de couplage">{copiedCode ? "Copié" : "Copier"}</WidgetButton>
          </div>
          <p className="mt-2 text-[11.5px] leading-4 text-[var(--text-tertiary)]">Le code disparaît de cette carte dès que la connexion est confirmée.</p>
          <div className="mt-2.5"><WidgetButton icon={RefreshCw} onClick={() => void refreshPairing()} loading={busy}>Nouveau code</WidgetButton></div>
        </div>
      ) : null}

      {showCapabilities ? (
        <div className="mx-3.5 mb-3 rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Capacités réelles</p>
            {etat?.capacites_source && etat.capacites_source !== "inconnu" ? <span className="text-[11px] text-[var(--text-tertiary)]">{etat.capacites_source}</span> : null}
          </div>
          {etat?.capacites_source === "inconnu" || !etat?.capacites
            ? <p className="mt-2 text-[12px] leading-[18px] text-[var(--text-secondary)]">Le connecteur ne fournit pas actuellement un registre fiable. Aucune capacité n’est inventée.</p>
            : capabilities.length
              ? <div className="mt-2 flex flex-wrap gap-1.5">{capabilities.map(([name]) => <span key={name} className="tmw-inset rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">{name}</span>)}</div>
              : <p className="mt-2 text-[12px] text-[var(--text-secondary)]">Aucune capacité active déclarée.</p>}
        </div>
      ) : null}

      {intent === "capabilities" ? <div className="px-3.5 pb-3"><WhatsAppProtectionPanel protection={etat?.protection} connected={connected} /></div> : null}
      {intent === "status" ? (
        <Disclosure summary="Protection du compte">
          <div className="px-3.5 pb-3"><WhatsAppProtectionPanel protection={etat?.protection} connected={connected} /></div>
        </Disclosure>
      ) : null}

      {confirmDisconnect ? (
        <ConfirmationPanel
          title="Déconnecter ce compte ?"
          body="La session WhatsApp liée sera fermée. Il faudra refaire la liaison avec votre téléphone."
          confirmLabel="Déconnecter"
          destructive
          busy={busy}
          onCancel={() => setConfirmDisconnect(false)}
          onConfirm={() => void disconnect()}
        />
      ) : (
        <ActionBar>
          {(disconnected || expired || intent === "connect" || intent === "reconnect") && !unreachable && !qr
            ? <WidgetButton variant="primary" icon={QrCode} loading={busy} onClick={() => void startQr()}>{busy ? "Connexion…" : expired ? "Reconnecter" : "Connecter"}</WidgetButton>
            : null}
          <WidgetButton icon={RefreshCw} onClick={() => void refresh()} disabled={busy}>Vérifier</WidgetButton>
          {connected ? <><span className="ms-auto" /><WidgetButton variant="ghost" icon={Unplug} onClick={() => setConfirmDisconnect(true)}>Déconnecter</WidgetButton></> : null}
        </ActionBar>
      )}
    </WidgetCard>
  );
}
