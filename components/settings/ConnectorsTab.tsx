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
import { WhatsAppPermissionsPanel } from "./WhatsAppPermissionsPanel";

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
    <div className="flex flex-col gap-6 xl:flex-row">
      {/* ── Colonne principale ── */}
      <div className="min-w-0 flex-1">
        <div className="relative mb-5">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des connecteurs…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        {/* Bandeau confiance */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}
            aria-hidden="true"
          >
            <InfoIcon />
          </span>
          <p className="text-[13px] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Bon à savoir</span> — vos
            connexions sont chiffrées, chaque action sensible demande votre confirmation, et vous
            contrôlez chaque permission.
          </p>
        </div>
      </div>

      {/* ── Rail latéral : aperçu + activité ── */}
      <aside className="w-full shrink-0 space-y-4 xl:w-72">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-3 text-sm font-semibold">Aperçu</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}
                aria-hidden="true"
              >
                <PlugMiniIcon />
              </span>
              <div>
                <p className="text-sm font-semibold">Connecteurs</p>
                <p className="text-xs text-[var(--text-tertiary)]">WhatsApp, Mail, Agenda, Météo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}
                aria-hidden="true"
              >
                <BoltMiniIcon />
              </span>
              <div>
                <p className="text-sm font-semibold">{activity.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Actions cette session</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}
                aria-hidden="true"
              >
                <ShieldIcon />
              </span>
              <div>
                <p className="text-sm font-semibold">Tout est sécurisé</p>
                <p className="text-xs text-[var(--text-tertiary)]">Connexions chiffrées</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-2 text-sm font-semibold">Activité récente</p>
          {activity.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)]">
              Aucune action sur les connecteurs pendant cette session.
            </p>
          ) : (
            <ul className="space-y-2">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="text-xs">
                  <span className="block font-medium text-[var(--text-secondary)]">{a.label}</span>
                  <span className="text-[var(--text-tertiary)]">
                    {a.detail} · {a.at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 11v5" strokeLinecap="round" />
    </svg>
  );
}

function PlugMiniIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0V8zM12 18v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltMiniIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const [permissionsOpen, setPermissionsOpen] = useState(false);
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPermissionsOpen(true)}
            className="w-fit rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Gérer les permissions
          </button>
          <a
            href="/whatsapp"
            className="w-fit rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--primary)]/60"
          >
            Tableau de bord
          </a>
          <button
            onClick={disconnect}
            disabled={busy}
            className="w-fit rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--error)] hover:text-[var(--error)] disabled:opacity-40"
          >
            Déconnecter
          </button>
        </div>
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
      {permissionsOpen && <WhatsAppPermissionsPanel onClose={() => setPermissionsOpen(false)} />}
    </ConnectorCard>
  );
}
