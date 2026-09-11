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

type Props = {
  intent?: WhatsAppConnectorIntent;
};

const ACTIVE = new Set(["qr", "pairing", "connecting"]);

function formatDuration(ms?: number) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "à l’instant";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  if (!rest) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function maskNumber(value?: string | null) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, "");
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 4)}••••${clean.slice(-3)}`;
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
  };

  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!raw || !ACTIVE.has(raw.status)) return;
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [raw?.status]);

  useEffect(() => {
    if (intent === "connect" || intent === "reconnect" || intent === "qr") {
      void startQr();
    }
  }, [intent]);

  async function startQr() {
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
  }

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
  const unreachable = code === "injoignable";
  const disconnected = code === "deconnecte" || raw?.status === "disconnected";
  const expired = code === "session_expiree" || raw?.status === "session_expiree";
  const qr = raw?.qr || null;
  const number = etat?.numero || raw?.number || null;
  const pairingCode = etat?.code_jumelage || raw?.pairingCode || null;
  const capabilities = useMemo(
    () => Object.entries(etat?.capacites || {}).filter(([, enabled]) => enabled),
    [etat?.capacites],
  );

  let summary = etat?.libelle || "État WhatsApp";
  if (unreachable) summary = "Le service WhatsApp ne répond pas actuellement.";
  else if (connected) summary = "WhatsApp est connecté.";
  else if (expired) summary = "La session WhatsApp a expiré.";
  else if (disconnected) summary = "WhatsApp n’est pas connecté.";

  const showNumber = intent === "number" || intent === "status" || connected;
  const showCapabilities = intent === "capabilities";

  return (
    <section
      className="mt-3 max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">WhatsApp</p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{summary}</p>
        </div>
        <span
          className="rounded-full border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)]"
          aria-label={connected ? "WhatsApp connecté" : "État WhatsApp"}
        >
          {connected ? "Connecté" : unreachable ? "Injoignable" : expired ? "Expiré" : disconnected ? "Déconnecté" : raw?.status || code || "…"}
        </span>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          {error}
        </div>
      )}

      {showNumber && connected && (
        <div className="mt-3 grid gap-1 text-xs text-[var(--text-secondary)]">
          <div>Compte : <strong className="text-[var(--text-primary)]">{number ? maskNumber(number) : "non fourni par le connecteur"}</strong></div>
          {etat?.nom_profil ? <div>Profil : <strong className="text-[var(--text-primary)]">{etat.nom_profil}</strong></div> : null}
          {etat?.plateforme ? <div>Plateforme : <strong className="text-[var(--text-primary)]">{etat.plateforme}</strong></div> : null}
          {etat?.derniere_activite_ms != null ? <div>Dernière activité : <strong className="text-[var(--text-primary)]">{formatDuration(etat.derniere_activite_ms)}</strong></div> : null}
          {etat?.connecte_depuis_ms != null ? <div>Connecté depuis : <strong className="text-[var(--text-primary)]">{formatDuration(etat.connecte_depuis_ms)}</strong></div> : null}
          {etat?.contacts != null ? <div>Contacts : <strong className="text-[var(--text-primary)]">{etat.contacts}</strong></div> : null}
        </div>
      )}

      {intent === "number" && connected && !number && (
        <p className="mt-3 text-xs text-[var(--text-secondary)]">Le connecteur ne me fournit pas actuellement le numéro du compte lié.</p>
      )}

      {qr && !connected && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            Dans WhatsApp : <strong>Appareils connectés → Lier un appareil</strong>, puis scannez ce QR code.
          </p>
          {/* Le QR reste dans l'état local du composant : il n'est jamais inséré dans Message.content. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code de connexion WhatsApp" className="h-52 w-52 max-w-full rounded-xl border border-[var(--border)] bg-white p-2" />
          <p className="mt-2 text-xs text-[var(--text-secondary)]">En attente du scan…</p>
        </div>
      )}

      {pairingCode && !connected && (intent === "pairing_code" || !qr) && (
        <div className="mt-3 rounded-xl border border-[var(--border)] p-3">
          <p className="text-xs text-[var(--text-secondary)]">Code de jumelage</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-[0.18em] text-[var(--text-primary)]">{pairingCode}</p>
        </div>
      )}

      {showCapabilities && (
        <div className="mt-3">
          <p className="text-xs font-medium text-[var(--text-primary)]">Capacités réellement déclarées par la passerelle</p>
          {etat?.capacites_source === "inconnu" || !etat?.capacites ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Le connecteur ne fournit pas actuellement un registre fiable de capacités.</p>
          ) : capabilities.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {capabilities.map(([name]) => (
                <span key={name} className="rounded-full border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">{name}</span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Aucune capacité active n’est déclarée.</p>
          )}
          {etat?.hors_de_portee && Object.keys(etat.hors_de_portee).length > 0 ? (
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">Les fonctions hors de portée restent désactivées et ne seront pas simulées.</p>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(disconnected || expired || intent === "connect" || intent === "reconnect") && !unreachable && (
          <button onClick={() => void startQr()} disabled={busy} className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {busy ? "Connexion…" : expired ? "Reconnecter" : "Connecter WhatsApp"}
          </button>
        )}
        {(qr || pairingCode) && !connected && (
          <button onClick={() => void refreshPairing()} disabled={busy} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-50">
            Renouveler
          </button>
        )}
        <button onClick={() => void refresh()} disabled={busy} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-50">
          Vérifier
        </button>
        {connected && !confirmDisconnect && (
          <button onClick={() => setConfirmDisconnect(true)} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">Déconnecter</button>
        )}
      </div>

      {confirmDisconnect && (
        <div className="mt-3 rounded-xl border border-[var(--border)] p-3">
          <p className="text-xs text-[var(--text-primary)]">Déconnecter ce compte WhatsApp ?</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => void disconnect()} disabled={busy} className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Confirmer</button>
            <button onClick={() => setConfirmDisconnect(false)} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">Annuler</button>
          </div>
        </div>
      )}
    </section>
  );
}
