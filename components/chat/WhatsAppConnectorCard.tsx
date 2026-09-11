"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  disconnectWhatsApp,
  getWaEtat,
  getWhatsAppStatus,
  linkWhatsAppQr,
  refreshWhatsAppCode,
  type WaEtat,
  type WhatsAppState,
} from "@/lib/connectors-api";

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

function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />;
}

function StatusDot({ tone }: { tone: "ok" | "warn" | "bad" | "idle" }) {
  const cls = tone === "ok"
    ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]"
    : tone === "warn"
      ? "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,.12)]"
      : tone === "bad"
        ? "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,.12)]"
        : "bg-zinc-400 shadow-[0_0_0_4px_rgba(161,161,170,.12)]";
  return <span className={`h-2.5 w-2.5 rounded-full ${cls}`} aria-hidden="true" />;
}

function MiniIcon({ kind }: { kind: "phone" | "user" | "device" | "clock" | "contacts" | "shield" }) {
  const common = "h-4 w-4";
  if (kind === "phone") return <svg viewBox="0 0 24 24" fill="none" className={common}><path d="M7.2 3.8 9.5 8l-1.7 1.8c1 2.1 2.4 3.5 4.5 4.5l1.8-1.7 4.1 2.3-.8 3.2c-.2.8-.9 1.4-1.7 1.4C9.6 19.5 4.5 14.4 4.5 8.3c0-.8.6-1.5 1.4-1.7l1.3-2.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (kind === "user") return <svg viewBox="0 0 24 24" fill="none" className={common}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  if (kind === "device") return <svg viewBox="0 0 24 24" fill="none" className={common}><rect x="5" y="2.8" width="14" height="18.4" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M10 18h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  if (kind === "clock") return <svg viewBox="0 0 24 24" fill="none" className={common}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  if (kind === "contacts") return <svg viewBox="0 0 24 24" fill="none" className={common}><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M3.8 19a5.2 5.2 0 0 1 10.4 0M16 7.5a2.5 2.5 0 0 1 0 5M17 15c2.1.2 3.5 1.5 3.5 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" className={common}><path d="M12 3 5.5 5.7v5.7c0 4.1 2.6 7.8 6.5 9.6 3.9-1.8 6.5-5.5 6.5-9.6V5.7L12 3Z" stroke="currentColor" strokeWidth="1.7"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function InfoTile({ icon, label, value, note }: { icon: "phone" | "user" | "device" | "clock" | "contacts" | "shield"; label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-black/[0.025] p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-black/5 bg-white p-2 text-zinc-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"><MiniIcon kind={icon} /></div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</p>
          {note ? <p className="mt-1 text-[11px] leading-4 text-[var(--text-tertiary)]">{note}</p> : null}
        </div>
      </div>
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

  const refresh = async () => {
    const g = ++generation.current;
    setError(null);
    const [e, r] = await Promise.all([getWaEtat().catch(() => null), getWhatsAppStatus().catch(() => null)]);
    if (generation.current !== g) return;
    if (!e && !r) {
      setError("Impossible de vérifier WhatsApp actuellement.");
      return;
    }
    if (e) setEtat(e);
    if (r) setRaw(r);
  };

  useEffect(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, []);

  useEffect(() => {
    if (!raw || !ACTIVE.has(raw.status)) return;
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [raw?.status]);

  useEffect(() => {
    if (intent === "connect" || intent === "reconnect" || intent === "qr") void startQr();
  }, [intent]);

  async function startQr() {
    setBusy(true); setError(null);
    try {
      const next = await linkWhatsAppQr();
      setRaw(next);
      const e = await getWaEtat().catch(() => null);
      if (e) setEtat(e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la liaison WhatsApp.");
    } finally { setBusy(false); }
  }

  async function refreshPairing() {
    setBusy(true); setError(null);
    try { await refreshWhatsAppCode(); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de renouveler le code."); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true); setError(null);
    try { await disconnectWhatsApp(); setConfirmDisconnect(false); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de déconnecter WhatsApp."); }
    finally { setBusy(false); }
  }

  const code = etat?.code;
  const connected = code === "connecte" || raw?.status === "connected";
  const unreachable = code === "injoignable";
  const disconnected = code === "deconnecte" || raw?.status === "disconnected";
  const expired = code === "session_expiree" || raw?.status === "session_expiree";
  const qr = raw?.qr || null;
  const number = etat?.numero || raw?.number || null;
  const pairingCode = etat?.code_jumelage || raw?.pairingCode || null;
  const connectedElapsed = elapsedSince(etat?.connecte_depuis_ms);
  const activityElapsed = elapsedSince(etat?.derniere_activite_ms);
  const capabilities = useMemo(() => Object.entries(etat?.capacites || {}).filter(([, enabled]) => enabled), [etat?.capacites]);

  const statusLabel = connected ? "Connecté" : unreachable ? "Injoignable" : expired ? "Session expirée" : disconnected ? "Déconnecté" : raw?.status || code || "Vérification";
  const statusTone: "ok" | "warn" | "bad" | "idle" = connected ? "ok" : unreachable || expired ? "warn" : disconnected ? "bad" : "idle";
  const headline = connected ? "Votre compte WhatsApp est prêt" : expired ? "La session doit être reconnectée" : disconnected ? "Connectez votre compte WhatsApp" : unreachable ? "Le service WhatsApp ne répond pas" : "Vérification du connecteur";
  const subtitle = connected
    ? "Toumaï peut utiliser uniquement les capacités réellement disponibles sur cette session."
    : unreachable
      ? "Aucune information de connexion n’est supposée tant que le service ne répond pas."
      : "La connexion utilise un QR réel fourni par la passerelle. Aucun état n’est inventé.";

  return (
    <section className="mt-3 w-full max-w-xl overflow-hidden rounded-[28px] border border-black/[0.07] bg-[var(--card)] shadow-[0_18px_55px_rgba(0,0,0,.08)] dark:border-white/10" aria-live="polite">
      <div className="relative overflow-hidden border-b border-black/[0.06] px-5 pb-5 pt-5 dark:border-white/10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,.28)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8.5 8.2c.4 2.8 2.4 4.8 5.2 5.3l1.1-1.1 1.7.9-.4 1.7c-.1.5-.5.8-1 .8-4 0-7.2-3.2-7.2-7.2 0-.5.3-.9.8-1l1.7-.4.9 1.7-1.1 1.1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">WhatsApp Connector</h3>
                <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05]">
                  <StatusDot tone={statusTone} /> {statusLabel}
                </span>
              </div>
              <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{headline}</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-[var(--text-secondary)]">{subtitle}</p>
            </div>
          </div>
          <button onClick={() => void refresh()} disabled={busy} className="shrink-0 rounded-xl border border-black/[0.07] bg-white/70 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] shadow-sm transition hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]">
            <span className="inline-flex items-center gap-2">{busy ? <Spinner /> : null} Actualiser</span>
          </button>
        </div>
      </div>

      <div className="p-5">
        {error ? <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-5 text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">Vérification indisponible.</strong> {error}</div> : null}

        {connected ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <InfoTile icon="phone" label="Compte lié" value={number ? maskNumber(number)! : "Non fourni"} note={!number ? "Le connecteur ne renvoie pas le numéro." : undefined} />
            <InfoTile icon="user" label="Profil" value={etat?.nom_profil || "Non fourni"} />
            <InfoTile icon="device" label="Plateforme" value={etat?.plateforme || "Non fournie"} />
            <InfoTile icon="clock" label="Connexion" value={connectedElapsed != null ? formatDuration(connectedElapsed)! : "Durée inconnue"} note={activityElapsed != null ? `Dernière activité ${activityElapsed < 60_000 ? "à l’instant" : `il y a ${formatDuration(activityElapsed)}`}` : undefined} />
            <InfoTile icon="contacts" label="Contacts synchronisés" value={etat?.contacts != null ? String(etat.contacts) : "Inconnu"} note={etat?.contacts === 0 ? "0 synchronisé ≠ aucun contact WhatsApp." : undefined} />
            <InfoTile icon="shield" label="Protection" value="Anti-rafale active" note="Les actions structurelles répétées sont bloquées avant exécution." />
          </div>
        ) : null}

        {qr && !connected ? (
          <div className="mt-1 grid gap-5 rounded-3xl border border-black/[0.06] bg-black/[0.02] p-4 sm:grid-cols-[220px_1fr] dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-center rounded-2xl bg-white p-3 shadow-sm"><img src={qr} alt="QR code de connexion WhatsApp" className="h-48 w-48 max-w-full" /></div>
            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Scannez le QR depuis WhatsApp</p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Ouvrez <strong>Appareils connectés</strong>, choisissez <strong>Lier un appareil</strong>, puis scannez ce code. Le QR est fourni en direct par la passerelle et n’est pas conservé dans la conversation.</p>
              <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"><StatusDot tone="ok" /> En attente du scan</div>
            </div>
          </div>
        ) : null}

        {pairingCode && !connected && (intent === "pairing_code" || !qr) ? (
          <div className="mt-3 rounded-2xl border border-black/[0.07] bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Code de jumelage</p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.22em] text-[var(--text-primary)]">{pairingCode}</p>
          </div>
        ) : null}

        {intent === "number" && connected && !number ? <p className="mt-4 text-xs text-[var(--text-secondary)]">Le numéro du compte lié n’est pas fourni par la passerelle actuellement.</p> : null}

        {intent === "capabilities" ? (
          <div className="mt-4 rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Capacités vérifiées</p>
            {etat?.capacites_source === "inconnu" || !etat?.capacites ? <p className="mt-1 text-xs text-[var(--text-secondary)]">Aucun registre fiable n’est fourni actuellement.</p> : capabilities.length ? <div className="mt-3 flex flex-wrap gap-1.5">{capabilities.map(([name]) => <span key={name} className="rounded-full border border-black/[0.07] bg-black/[0.02] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/[0.03]">{name}</span>)}</div> : <p className="mt-1 text-xs text-[var(--text-secondary)]">Aucune capacité active n’est déclarée.</p>}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {(disconnected || expired || intent === "connect" || intent === "reconnect") && !unreachable ? <button onClick={() => void startQr()} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{busy ? "Connexion…" : expired ? "Reconnecter" : "Connecter WhatsApp"}</button> : null}
          {(qr || pairingCode) && !connected ? <button onClick={() => void refreshPairing()} disabled={busy} className="rounded-xl border border-black/[0.08] px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[0.05]">Renouveler le code</button> : null}
          {connected && !confirmDisconnect ? <button onClick={() => setConfirmDisconnect(true)} className="ml-auto rounded-xl border border-black/[0.08] px-3.5 py-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-rose-500/30 hover:bg-rose-500/[0.05] dark:border-white/10">Déconnecter</button> : null}
        </div>

        {confirmDisconnect ? (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-[var(--text-primary)]">Déconnecter ce compte ?</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Une nouvelle liaison sera nécessaire pour réutiliser WhatsApp.</p></div>
            <div className="flex gap-2"><button onClick={() => setConfirmDisconnect(false)} className="rounded-xl border border-black/[0.08] px-3 py-2 text-xs text-[var(--text-secondary)] dark:border-white/10">Annuler</button><button onClick={() => void disconnect()} disabled={busy} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirmer</button></div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
