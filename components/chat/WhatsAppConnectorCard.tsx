"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ContactRound,
  Copy,
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
  X,
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

function InfoCell({ icon, label, value, wide = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border border-[var(--border)]/80 bg-[var(--background)]/35 px-3 py-2.5 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-tertiary)]"><span className="shrink-0 opacity-75">{icon}</span><span>{label}</span></div>
      <div className="mt-1 truncate text-[12px] font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function ProgressTimeline({ progression }: { progression: NonNullable<WaEtat["progression"]> }) {
  return (
    <ol className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]/30 px-3.5 py-2.5" aria-label="Progression de la connexion WhatsApp">
      {progression.etapes.slice(0, 8).map((step, index) => {
        const active = step.etat === "en_cours";
        const done = step.etat === "termine";
        const failed = step.etat === "echoue";
        return (
          <li key={step.cle} className="relative flex min-h-8 items-start gap-2.5 py-1">
            {index < progression.etapes.length - 1 ? <span className="absolute left-[7px] top-6 h-[calc(100%-10px)] w-px bg-[var(--border)]" /> : null}
            <span className={`relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--card)] ${done ? "text-emerald-600" : failed ? "text-red-600" : active ? "text-[var(--primary)]" : "text-[var(--text-tertiary)]"}`}>
              {done ? <Check className="h-3 w-3" /> : failed ? <X className="h-3 w-3" /> : active ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />}
            </span>
            <p className={`text-[11px] leading-5 ${active ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{step.libelle}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function WhatsAppConnectorCard({ intent = "status" }: Props) {
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
      getWaEtat().catch(() => null),
      getWhatsAppStatus().catch(() => null),
    ]);
    if (generation.current !== current) return;
    if (!nextEtat && !nextRaw) {
      setError("Impossible de vérifier WhatsApp actuellement.");
      return;
    }
    setError(null);
    if (nextEtat) setEtat(nextEtat);
    if (nextRaw) setRaw(nextRaw);
  }, []);

  const startQr = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopiedCode(false);
    try {
      const next = await linkWhatsAppQr();
      setRaw(next);
      const nextEtat = await getWaEtat().catch(() => null);
      if (nextEtat) setEtat(nextEtat);
      setExpanded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de la liaison WhatsApp.");
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshPairing = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopiedCode(false);
    try {
      const next = await refreshWhatsAppCode();
      setRaw((current) => current ? { ...current, pairingCode: next.pairingCode, codeExpiresAt: next.codeExpiresAt, status: "pairing" } : { status: "pairing", pairingCode: next.pairingCode, codeExpiresAt: next.codeExpiresAt });
      await refresh();
      setExpanded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de générer le code de couplage.");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

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
      await disconnectWhatsApp();
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
  const statusIcon = connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : unreachable ? <WifiOff className="h-3.5 w-3.5" /> : busy || raw?.status === "connecting" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />;
  const statusTone = connected ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : unreachable || expired ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-[var(--border)] bg-[var(--background)]/45 text-[var(--text-secondary)]";
  const showCapabilities = intent === "capabilities";
  const showIdentity = connected && ["status", "number", "profile", "last_activity", "connected_duration", "contact_count"].includes(intent);
  const lastActivityLabel = activityElapsed != null ? activityElapsed < 60_000 ? "à l’instant" : `il y a ${formatDuration(activityElapsed)}` : null;

  if (connected && !expanded && CONNECTION_INTENTS.has(intent)) {
    return (
      <section className="mt-3 w-full max-w-[560px] rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3.5 py-2.5" aria-live="polite">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><Check className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[var(--text-primary)]">WhatsApp connecté</p><p className="truncate text-[10px] text-[var(--text-tertiary)]">{maskNumber(number) || "Compte lié"}</p></div>
          <button onClick={() => setExpanded(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-[var(--text-tertiary)] hover:bg-[var(--hover)]">Détails <ChevronDown className="h-3 w-3" /></button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative mt-3 w-full max-w-[560px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card)]" aria-live="polite">
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)]/55"><Smartphone className="h-4.5 w-4.5 text-[var(--text-primary)]" /></div>
            <div className="min-w-0"><h3 className="text-[13px] font-semibold text-[var(--text-primary)]">WhatsApp</h3><p className="mt-0.5 max-w-[360px] text-[11px] leading-4 text-[var(--text-secondary)]">{summary}</p></div>
          </div>
          <div className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${statusTone}`}>{statusIcon}<span>{visibleStatus}</span></div>
        </div>

        {error ? <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5 text-[11px] leading-4 text-[var(--text-secondary)]"><WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /><span>{error}</span></div> : null}

        {etat?.progression && !connected ? <ProgressTimeline progression={etat.progression} /> : null}

        {showIdentity ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <InfoCell icon={<Smartphone className="h-3 w-3" />} label="Compte lié" value={number ? maskNumber(number) : "Numéro non fourni"} />
            {etat?.nom_profil ? <InfoCell icon={<UserRound className="h-3 w-3" />} label="Profil" value={etat.nom_profil} /> : null}
            {connectedElapsed != null ? <InfoCell icon={<Clock3 className="h-3 w-3" />} label="Connecté depuis" value={formatDuration(connectedElapsed)} /> : null}
            {lastActivityLabel ? <InfoCell icon={<Wifi className="h-3 w-3" />} label="Dernière activité" value={lastActivityLabel} /> : null}
            {etat?.contacts != null ? <InfoCell icon={<ContactRound className="h-3 w-3" />} label="Contacts synchronisés" value={<span>{etat.contacts}{etat.contacts === 0 ? <span className="ml-1 font-normal text-[var(--text-tertiary)]">· pas le total</span> : null}</span>} wide={!etat?.nom_profil && connectedElapsed == null && !lastActivityLabel} /> : null}
            {etat?.plateforme ? <InfoCell icon={<Smartphone className="h-3 w-3" />} label="Plateforme" value={etat.plateforme} /> : null}
          </div>
        ) : null}

        {intent === "number" && connected && !number ? <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/35 px-3 py-2.5 text-[11px] leading-4 text-[var(--text-secondary)]">Le compte est lié, mais le connecteur ne fournit pas son numéro. Toumaï n’en déduit aucun.</div> : null}

        {qr && !connected ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/30 p-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="mx-auto rounded-xl border border-[var(--border)] bg-white p-2 sm:mx-0">
              {/* Le QR vit uniquement dans l'état local du composant : jamais dans Message.content ni l'historique. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code de connexion WhatsApp" className="h-40 w-40 sm:h-44 sm:w-44" />
            </div>
            <div className="min-w-0"><p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]"><QrCode className="h-3.5 w-3.5" />Scanner avec WhatsApp</p><p className="mt-1.5 text-[11px] leading-4 text-[var(--text-secondary)]">WhatsApp → Appareils connectés → Lier un appareil.</p><p className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]"><LoaderCircle className="h-3 w-3 animate-spin" />En attente du scan…</p><button onClick={() => void startQr()} disabled={busy} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:opacity-50"><RefreshCw className="h-3 w-3" />Nouveau QR</button></div>
          </div>
        ) : null}

        {pairingCode && !connected && (intent === "pairing_code" || intent === "refresh_pairing" || !qr) ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]/30 p-3.5">
            <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-secondary)]"><KeyRound className="h-3.5 w-3.5" />Code de couplage</p>{expiresIn ? <span className={`text-[10px] ${expiresIn === "expiré" ? "text-[var(--error)]" : "text-[var(--text-tertiary)]"}`}>{expiresIn === "expiré" ? "Code expiré" : `Expire dans ${expiresIn}`}</span> : null}</div>
            <div className="mt-2 flex items-center gap-2"><p className="min-w-0 flex-1 break-all font-mono text-xl font-semibold tracking-[0.16em] text-[var(--text-primary)]">{pairingCode}</p><button onClick={() => void copyPairingCode()} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)]" aria-label="Copier le code de couplage">{copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div>
            <p className="mt-2 text-[10px] leading-4 text-[var(--text-tertiary)]">Le code disparaît de cette carte dès que la connexion est confirmée.</p>
            <button onClick={() => void refreshPairing()} disabled={busy} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />Nouveau code</button>
          </div>
        ) : null}

        {showCapabilities ? (
          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/30 p-3.5">
            <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-primary)]"><ShieldCheck className="h-3.5 w-3.5" />Capacités réelles</p>{etat?.capacites_source && etat.capacites_source !== "inconnu" ? <span className="text-[9px] text-[var(--text-tertiary)]">{etat.capacites_source}</span> : null}</div>
            {etat?.capacites_source === "inconnu" || !etat?.capacites ? <p className="mt-2 text-[11px] leading-4 text-[var(--text-secondary)]">Le connecteur ne fournit pas actuellement un registre fiable. Aucune capacité n’est inventée.</p> : capabilities.length ? <div className="mt-2 flex flex-wrap gap-1.5">{capabilities.map(([name]) => <span key={name} className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[9px] font-medium text-[var(--text-secondary)]">{name}</span>)}</div> : <p className="mt-2 text-[11px] text-[var(--text-secondary)]">Aucune capacité active déclarée.</p>}
          </div>
        ) : null}

        {intent === "status" || intent === "capabilities" ? <WhatsAppProtectionPanel protection={etat?.protection} connected={connected} /> : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
          {(disconnected || expired || intent === "connect" || intent === "reconnect") && !unreachable && !qr ? <button onClick={() => void startQr()} disabled={busy} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50">{busy ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <QrCode className="h-3 w-3" />}{busy ? "Connexion…" : expired ? "Reconnecter" : "Connecter"}</button> : null}
          <button onClick={() => void refresh()} disabled={busy} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--hover)] disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />Vérifier</button>
          {connected && !confirmDisconnect ? <button onClick={() => setConfirmDisconnect(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[10px] font-medium text-[var(--text-tertiary)] hover:bg-[var(--hover)]"><Unplug className="h-3 w-3" />Déconnecter</button> : null}
        </div>

        {confirmDisconnect ? <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3"><p className="text-[11px] font-semibold text-[var(--text-primary)]">Déconnecter ce compte ?</p><p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">La session WhatsApp liée sera fermée.</p><div className="mt-2 flex gap-2"><button onClick={() => void disconnect()} disabled={busy} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[10px] font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3" />}Confirmer</button><button onClick={() => setConfirmDisconnect(false)} className="min-h-9 rounded-lg border border-[var(--border)] px-3 text-[10px] text-[var(--text-secondary)]">Annuler</button></div></div> : null}

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--background)]/25 px-3 py-2 text-[9px] leading-4 text-[var(--text-tertiary)]"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /><span>État, numéro, QR, code et résultat viennent du connecteur. Toumaï ne simule pas une connexion.</span></div>
      </div>
    </section>
  );
}
