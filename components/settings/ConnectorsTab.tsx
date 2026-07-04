"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectMail,
  disconnectGoogle,
  disconnectMail,
  disconnectWhatsApp,
  getGoogleAuthUrl,
  getGoogleStatus,
  getMailStatus,
  getWhatsAppStatus,
  linkWhatsApp,
  refreshWhatsAppCode,
  type MailStatus,
  type WhatsAppState,
} from "@/lib/connectors-api";
import { ConnectorCard, type ConnectorStatus } from "./ConnectorCard";

interface ActivityEntry {
  id: string;
  label: string;
  detail: string;
  at: Date;
}

export function ConnectorsTab() {
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  function log(label: string, detail: string) {
    setActivity((prev) => [{ id: `${Date.now()}-${Math.random()}`, label, detail, at: new Date() }, ...prev].slice(0, 20));
  }

  const q = query.trim().toLowerCase();
  const match = (name: string) => !q || name.toLowerCase().includes(q);

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-medium">Connecteurs & Intégrations</p>
          <p className="text-sm text-[var(--text-tertiary)]">
            Gérez les services tiers reliés à Toumaï AI.
          </p>
        </div>
        <div className="relative w-48 shrink-0 sm:w-64">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des connecteurs…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className={match("Google Agenda") ? "" : "hidden"}>
          <GoogleConnector onLog={log} />
        </div>
        <div className={match("Mail") ? "" : "hidden"}>
          <MailConnector onLog={log} />
        </div>
        <div className={match("WhatsApp") ? "" : "hidden"}>
          <WhatsAppConnector onLog={log} />
        </div>
        <div className={match("Météo") ? "" : "hidden"}>
          <ConnectorCard
            icon="🌤️"
            name="Météo"
            description="Toujours actif — Toumaï AI consulte la météo en direct quand vous le demandez, sans configuration."
            status="connected"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="mb-3 text-sm font-medium">Activité récente</p>
        {activity.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">
            Aucune action sur les connecteurs pendant cette session.
          </p>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--text-secondary)]">{a.label}</span>
                <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                  {a.detail} · {a.at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

type OnLog = (label: string, detail: string) => void;

function GoogleConnector({ onLog }: { onLog: OnLog }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function refresh() {
    return getGoogleStatus()
      .then((s) => {
        setConnected(s.connected);
        setCheckedAt(new Date());
      })
      .catch(() => setConnected(false));
  }

  useEffect(() => {
    refresh();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function connect() {
    setError(null);
    setBusy(true);
    try {
      const { auth_url } = await getGoogleAuthUrl();
      window.open(auth_url, "_blank", "width=520,height=680");
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts += 1;
        const s = await getGoogleStatus().catch(() => null);
        if (s?.connected) {
          setConnected(true);
          setCheckedAt(new Date());
          setBusy(false);
          onLog("Google Agenda connecté", "Autorisation accordée");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (attempts > 40) {
          setBusy(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 3000);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Échec de la connexion");
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectGoogle();
      setConnected(false);
      setCheckedAt(new Date());
      onLog("Google Agenda déconnecté", "Par l'utilisateur");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la déconnexion");
    } finally {
      setBusy(false);
    }
  }

  const status: ConnectorStatus = connected === null ? "loading" : connected ? "connected" : "disconnected";

  return (
    <ConnectorCard
      icon="📅"
      name="Google Agenda"
      description="Permet à Toumaï AI de lire et créer des événements dans votre agenda."
      status={status}
      lastChecked={checkedAt}
    >
      <div className="flex flex-col gap-1.5">
        {connected ? (
          <button
            onClick={disconnect}
            disabled={busy}
            className="w-fit rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--error)] hover:text-[var(--error)] disabled:opacity-40"
          >
            Déconnecter
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={busy || connected === null}
            className="w-fit rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            {busy ? "En attente d'autorisation…" : "Connecter"}
          </button>
        )}
        {error && <p className="text-xs text-[var(--error)]">{error}</p>}
      </div>
    </ConnectorCard>
  );
}

function MailConnector({ onLog }: { onLog: OnLog }) {
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | undefined>(undefined);
  const [form, setForm] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMailStatus()
      .then((s) => {
        setStatus(s);
        setCheckedAt(new Date());
      })
      .catch(() => setStatus({ connected: false, email: null }));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await connectMail(email, pwd);
      setStatus({ connected: res.connected, email: res.email });
      setCheckedAt(new Date());
      setForm(false);
      setPwd("");
      onLog("Mail connecté", res.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion échouée");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectMail();
      setStatus({ connected: false, email: null });
      setCheckedAt(new Date());
      onLog("Mail déconnecté", "Par l'utilisateur");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la déconnexion");
    } finally {
      setBusy(false);
    }
  }

  const cStatus: ConnectorStatus = status === null ? "loading" : status.connected ? "connected" : "disconnected";

  return (
    <ConnectorCard
      icon="📧"
      name="Mail"
      description={
        status?.connected && status.email
          ? `Connecté à ${status.email}`
          : "Lisez et envoyez des e-mails via Toumaï AI (Gmail, Outlook…)."
      }
      status={cStatus}
      lastChecked={checkedAt}
    >
      {status?.connected ? (
        <button
          onClick={disconnect}
          disabled={busy}
          className="w-fit rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--error)] hover:text-[var(--error)] disabled:opacity-40"
        >
          Déconnecter
        </button>
      ) : form ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <input
            type="email"
            required
            placeholder="vous@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs outline-none focus:border-[var(--primary)]"
          />
          <input
            type="password"
            required
            placeholder="Mot de passe d'application"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs outline-none focus:border-[var(--primary)]"
          />
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Utilisez un « mot de passe d'application », pas votre mot de passe principal
            (Gmail : myaccount.google.com/apppasswords).
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--primary)" }}
            >
              {busy ? "Vérification…" : "Connecter"}
            </button>
            <button
              type="button"
              onClick={() => setForm(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Annuler
            </button>
          </div>
          {error && <p className="text-xs text-[var(--error)]">{error}</p>}
        </form>
      ) : (
        <button
          onClick={() => setForm(true)}
          className="w-fit rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          Connecter
        </button>
      )}
    </ConnectorCard>
  );
}

function WhatsAppConnector({ onLog }: { onLog: OnLog }) {
  const [state, setState] = useState<WhatsAppState | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const s = await getWhatsAppStatus().catch(() => null);
      if (!s) return;
      setState(s);
      setCheckedAt(new Date());
      if (s.status === "connected" || s.status === "disconnected" || s.status === "error") {
        stopPolling();
        if (s.status === "connected") onLog("WhatsApp connecté", s.number || "Numéro lié");
      }
    }, 3000);
  }

  useEffect(() => {
    getWhatsAppStatus()
      .then((s) => {
        setState(s);
        setCheckedAt(new Date());
        if (s.status === "qr" || s.status === "pairing" || s.status === "connecting") startPolling();
      })
      .catch(() => setState({ status: "disconnected" }));
    return stopPolling;
  }, []);

  async function link() {
    if (!phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const s = await linkWhatsApp(phone.trim());
      setState(s);
      setCheckedAt(new Date());
      if (s.pairingCode) onLog("Code WhatsApp généré", phone.trim());
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la liaison");
    } finally {
      setBusy(false);
    }
  }

  async function refreshCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await refreshWhatsAppCode();
      setState((prev) => (prev ? { ...prev, pairingCode: res.pairingCode, codeExpiresAt: res.codeExpiresAt } : prev));
      onLog("Code WhatsApp régénéré", phone.trim() || "—");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du rafraîchissement");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectWhatsApp();
      setState({ status: "disconnected" });
      setCheckedAt(new Date());
      stopPolling();
      onLog("WhatsApp déconnecté", "Par l'utilisateur");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la déconnexion");
    } finally {
      setBusy(false);
    }
  }

  if (state?.status === "unconfigured") {
    return (
      <ConnectorCard
        icon="💬"
        name="WhatsApp"
        description="Auto-pilote WhatsApp — pas encore disponible sur cette instance."
        status="unavailable"
      />
    );
  }

  const cStatus: ConnectorStatus =
    state === null
      ? "loading"
      : state.status === "connected"
        ? "connected"
        : state.status === "qr" || state.status === "pairing" || state.status === "connecting"
          ? "pending"
          : "disconnected";

  const description =
    state?.status === "connected" && state.number
      ? `Connecté — ${state.number}`
      : "Laissez Toumaï AI répondre automatiquement sur WhatsApp (auto-pilote).";

  return (
    <ConnectorCard icon="💬" name="WhatsApp" description={description} status={cStatus} lastChecked={checkedAt}>
      {state?.status === "connected" ? (
        <button
          onClick={disconnect}
          disabled={busy}
          className="w-fit rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--error)] hover:text-[var(--error)] disabled:opacity-40"
        >
          Déconnecter
        </button>
      ) : state?.pairingCode ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-[var(--text-secondary)]">
            Dans WhatsApp : Appareils connectés → Lier avec le numéro de téléphone, puis saisissez :
          </p>
          <p
            className="w-fit rounded-lg px-3 py-1.5 font-mono text-lg font-semibold tracking-widest"
            style={{ background: "var(--surface)" }}
          >
            {state.pairingCode}
          </p>
          <button
            onClick={refreshCode}
            disabled={busy}
            className="w-fit text-xs text-[var(--text-tertiary)] underline transition hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            Code expiré ? Regénérer
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="tel"
            placeholder="+235 XX XX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full max-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={link}
            disabled={busy || !phone.trim()}
            className="w-fit rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            {busy ? "Liaison…" : "Obtenir un code"}
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-[var(--error)]">{error}</p>}
    </ConnectorCard>
  );
}
