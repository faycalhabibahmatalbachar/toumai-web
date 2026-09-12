"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ContactRound,
  KeyRound,
  LoaderCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unplug,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  disconnectWhatsApp,
  getWaEtat,
  getWhatsAppStatus,
  linkWhatsAppQr,
  refreshWhatsAppCode,
  type WaEtat,
  type WhatsAppState,
} from "@/lib/connectors-api";
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

type Props = {
  intent?: WhatsAppConnectorIntent;
};

const ACTIVE = new Set(["qr", "pairing", "connecting"]);

function formatDuration(ms?: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60000);
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
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 4)}••••${clean.slice(-3)}`;
}

function humanStatus(status?: string | null) {
  switch (status) {
    case "connecte":
    case "connected":
      return "Connecté";
    case "injoignable":
      return "Injoignable";
    case "session_expiree":
      return "Session expirée";
    case "deconnecte":
    case "disconnected":
      return "Déconnecté";
    case "qr":
      return "QR à scanner";
    case "pairing":
    case "jumelage":
      return "Jumelage";
    case "connecting":
    case "connexion":
      return "Connexion";
    case "unconfigured":
    case "non_configure":
      return "Non configuré";
    case "error":
    case "erreur":
      return "Erreur";
    default:
      return "Vérification";
  }
}

function InfoCell({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-[var(--border)]/80 bg-[var(--background)]/35 px-3.5 py-3 ${wide ? "sm:col-span-2" : ""}`}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-tertiary)]">
        <span className="shrink-0 opacity-75" aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1.5 truncate text-[13px] font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export function WhatsAppConnectorCard({ intent = "status" }: Props) {
  const [etat, setEtat] = useState<WaEtat | null>(null);
  const [raw, setRaw] = useState<WhatsAppState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const g = ++generation.current;
    setError(null);
    const [e, r] = await Promise.all([
      getWaEtat().catch(() => null),
      getWhatsAppStatus().catch(() => null),
    ]);
    if (generation.current !== g) return;
    if (!e && !r) {
      setError("Impossible de vérifier WhatsApp actuellement.");
      return;
    }
    if (e) setEtat(e);
    if (r) setRaw(r);
  }, []);

  const startQr = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await linkWhatsAppQr();
      setRaw(next);
      const e = await getWaEtat().catch(() => null);
      if (e) setEtat(e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la liaison WhatsApp.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(id);
      generation.current += 1;
    };
  }, [refresh]);

  const rawStatus = raw?.status;
  useEffect(() => {
    if (!rawStatus || !ACTIVE.has(rawStatus)) return;
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [rawStatus, refresh]);

  useEffect(() => {
    if (intent !== "connect" && intent !== "reconnect" && intent !== "qr") return;
    const id = window.setTimeout(() => void startQr(), 0);
    return () => window.clearTimeout(id);
  }, [intent, startQr]);

  async function refreshPairing() {
    setBusy(true);
    setError(null);
    try {
      await refreshWhatsAppCode();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de renouveler le code.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectWhatsApp();
      setConfirmDisconnect(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de déconnecter WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  const code = etat?.code;
  const connected = code === "connecte" || raw?.status === "connected";
  const unreachable = code === "injoignable" || raw?.status === "injoignable";
  const disconnected = code === "deconnecte" || raw?.status === "disconnected";
  const expired = code === "session_expiree" || raw?.status === "session_expiree";
  const qr = raw?.qr || null;
  const number = etat?.numero || raw?.number || null;
  const pairingCode = etat?.code_jumelage || raw?.pairingCode || null;
  const connectedElapsed = elapsedSince(etat?.connecte_depuis_ms);
  const activityElapsed = elapsedSince(etat?.derniere_activite_ms);
  const capabilities = useMemo(
    () => Object.entries(etat?.capacites || {}).filter(([, enabled]) => enabled),
    [etat?.capacites],
  );

  let summary = etat?.libelle || "Lecture de l’état du connecteur…";
  if (unreachable) summary = "Le service WhatsApp ne répond pas actuellement.";
  else if (connected) summary = "Compte lié et prêt pour les actions autorisées.";
  else if (expired) summary = "La session a expiré. Une nouvelle liaison est nécessaire.";
  else if (disconnected) summary = "Aucun compte WhatsApp n’est actuellement lié.";
  else if (qr) summary = "Scannez le QR pour terminer la liaison.";

  const visibleStatus = humanStatus(code || raw?.status);
  const statusIcon = connected ? (
    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
  ) : unreachable ? (
    <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
  ) : busy || raw?.status === "connecting" ? (
    <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
  ) : (
    <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
  );

  const statusTone = connected
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : unreachable || expired
      ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : "border-[var(--border)] bg-[var(--background)]/45 text-[var(--text-secondary)]";

  const showCapabilities = intent === "capabilities";
  const showIdentity = connected && ["status", "number", "profile", "last_activity", "connected_duration", "contact_count"].includes(intent);
  const lastActivityLabel = activityElapsed != null
    ? activityElapsed < 60_000
      ? "à l’instant"
      : `il y a ${formatDuration(activityElapsed)}`
    : null;

  return (
    <section
      className="relative mt-3 w-full max-w-[560px] overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--card)] shadow-[0_18px_60px_rgba(0,0,0,0.08)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--primary)]/8 to-transparent" />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        WhatsApp : {visibleStatus}. {summary}
      </p>

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)]/60 shadow-sm">
              <Smartphone className="h-5 w-5 text-[var(--text-primary)]" aria-hidden="true" />
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">WhatsApp</h3>
                <span className="rounded-full border border-[var(--border)] bg-[var(--background)]/45 px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                  Connecteur
                </span>
              </div>
              <p className="mt-1 max-w-[390px] text-[12px] leading-5 text-[var(--text-secondary)]">{summary}</p>
            </div>
          </div>

          <div className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${statusTone}`}>
            {statusIcon}
            <span>{visibleStatus}</span>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3 text-[12px] leading-5 text-[var(--text-secondary)]">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {showIdentity && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoCell
              icon={<Smartphone className="h-3.5 w-3.5" />}
              label="Compte lié"
              value={number ? maskNumber(number) : "Numéro non fourni"}
            />
            {etat?.nom_profil ? (
              <InfoCell icon={<UserRound className="h-3.5 w-3.5" />} label="Profil" value={etat.nom_profil} />
            ) : null}
            {connectedElapsed != null ? (
              <InfoCell icon={<Clock3 className="h-3.5 w-3.5" />} label="Connecté depuis" value={formatDuration(connectedElapsed)} />
            ) : null}
            {lastActivityLabel ? (
              <InfoCell icon={<Wifi className="h-3.5 w-3.5" />} label="Dernière activité" value={lastActivityLabel} />
            ) : null}
            {etat?.contacts != null ? (
              <InfoCell
                icon={<ContactRound className="h-3.5 w-3.5" />}
                label="Contacts synchronisés"
                value={
                  <span>
                    {etat.contacts}
                    {etat.contacts === 0 ? (
                      <span className="ml-1 font-normal text-[var(--text-tertiary)]">· pas le total du compte</span>
                    ) : null}
                  </span>
                }
                wide={!etat?.nom_profil && connectedElapsed == null && !lastActivityLabel}
              />
            ) : null}
            {etat?.plateforme ? (
              <InfoCell icon={<Smartphone className="h-3.5 w-3.5" />} label="Plateforme déclarée" value={etat.plateforme} />
            ) : null}
          </div>
        )}

        {intent === "number" && connected && !number && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]/35 px-3.5 py-3 text-[12px] leading-5 text-[var(--text-secondary)]">
            Le connecteur est bien lié, mais il ne fournit pas actuellement le numéro du compte. Aucun numéro n’est déduit ou inventé.
          </div>
        )}

        {qr && !connected && (
          <div className="mt-5 grid gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--background)]/35 p-3.5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-4">
            <div className="mx-auto rounded-2xl border border-[var(--border)] bg-white p-2.5 shadow-sm sm:mx-0">
              {/* Le QR reste uniquement dans l'état local du composant et n'entre jamais dans Message.content. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code de connexion WhatsApp" className="h-44 w-44 sm:h-48 sm:w-48" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
                <QrCode className="h-4 w-4" aria-hidden="true" />
                Scanner avec WhatsApp
              </div>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                Ouvrez <strong className="font-semibold text-[var(--text-primary)]">Appareils connectés</strong>, choisissez <strong className="font-semibold text-[var(--text-primary)]">Lier un appareil</strong>, puis scannez ce QR.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                En attente de la liaison réelle…
              </div>
            </div>
          </div>
        )}

        {pairingCode && !connected && (intent === "pairing_code" || !qr) && (
          <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--background)]/35 p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Code de jumelage fourni par le connecteur
            </div>
            <p className="mt-2 break-all font-mono text-xl font-semibold tracking-[0.18em] text-[var(--text-primary)]">{pairingCode}</p>
          </div>
        )}

        {showCapabilities && (
          <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--background)]/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Capacités déclarées
              </div>
              {etat?.capacites_source && etat.capacites_source !== "inconnu" ? (
                <span className="text-[10px] text-[var(--text-tertiary)]">Source : {etat.capacites_source}</span>
              ) : null}
            </div>

            {etat?.capacites_source === "inconnu" || !etat?.capacites ? (
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                Le connecteur ne fournit pas actuellement un registre fiable de capacités. Rien n’est supposé disponible par défaut.
              </p>
            ) : capabilities.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {capabilities.map(([name]) => (
                  <span key={name} className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-[var(--text-secondary)]">Aucune capacité active n’est déclarée.</p>
            )}

            {etat?.hors_de_portee && Object.keys(etat.hors_de_portee).length > 0 ? (
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-5 text-[var(--text-tertiary)]">
                Les fonctions hors de portée restent désactivées et ne sont jamais simulées.
              </p>
            ) : null}
          </div>
        )}

        <WhatsAppProtectionPanel protection={etat?.protection} connected={connected} />

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          {(disconnected || expired || intent === "connect" || intent === "reconnect") && !unreachable && (
            <button
              onClick={() => void startQr()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
              {busy ? "Connexion…" : expired ? "Reconnecter" : "Connecter WhatsApp"}
            </button>
          )}

          {(qr || pairingCode) && !connected && (
            <button
              onClick={() => void refreshPairing()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/35 px-3.5 py-2 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--background)]/60 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Renouveler
            </button>
          )}

          <button
            onClick={() => void refresh()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/35 px-3.5 py-2 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--background)]/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            Vérifier
          </button>

          {connected && !confirmDisconnect && (
            <button
              onClick={() => setConfirmDisconnect(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[11px] font-medium text-[var(--text-tertiary)] transition hover:bg-[var(--background)]/45 hover:text-[var(--text-secondary)]"
            >
              <Unplug className="h-3.5 w-3.5" />
              Déconnecter
            </button>
          )}
        </div>

        {confirmDisconnect && (
          <div className="mt-3 rounded-[20px] border border-amber-500/20 bg-amber-500/[0.06] p-3.5">
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">Déconnecter ce compte WhatsApp ?</p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">La session liée sera fermée. Cette action nécessite votre confirmation explicite.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void disconnect()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                Confirmer
              </button>
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-[11px] font-medium text-[var(--text-secondary)]"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--background)]/25 px-3 py-2.5 text-[10px] leading-4 text-[var(--text-tertiary)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Les informations affichées viennent du connecteur. Les actions sensibles restent soumises aux protections serveur et ne sont pas simulées.</span>
        </div>
      </div>
    </section>
  );
}
