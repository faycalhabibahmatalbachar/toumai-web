"use client";

import { useEffect, useRef, useState } from "react";
import {
  getProfile,
  getUsage,
  removeAvatar,
  updateAvatar,
  updateFullName,
  type UsageStats,
  type UserProfile,
} from "@/lib/user-api";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { cacheSeed, cacheWrite } from "@/lib/swr-cache";
import { Panel, Row } from "./Rows";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function GeneralSection() {
  const { session, logout } = useAuth();
  const isGuest = Boolean(session?.is_guest);
  // Seed depuis le cache persistant : la section s'affiche instantanément,
  // puis se revalide en arrière-plan.
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    cacheSeed<UserProfile>("user:profile"),
  );
  const [usage, setUsage] = useState<UsageStats | null>(() => cacheSeed<UsageStats>("user:usage"));
  const [name, setName] = useState(() =>
    session?.is_guest ? "" : (cacheSeed<UserProfile>("user:profile")?.full_name ?? ""),
  );
  const [loading, setLoading] = useState(profile === null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getProfile(), getUsage()])
      .then(([p, u]) => {
        setProfile(p);
        cacheWrite("user:profile", p);
        setName(session?.is_guest ? "" : (p.full_name ?? ""));
        setUsage(u);
        cacheWrite("user:usage", u);
      })
      .catch((err) => {
        // Échec réseau : on garde les données en cache si présentes.
        if (!profile) setError(err instanceof Error ? err.message : "Chargement impossible");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile?.full_name) return;
    setSavingName(true);
    setError(null);
    try {
      await updateFullName(trimmed);
      setProfile((p) => {
        const next = p ? { ...p, full_name: trimmed } : p;
        if (next) cacheWrite("user:profile", next);
        return next;
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSavingName(false);
    }
  }

  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image trop lourde (2 Mo max).");
      return;
    }
    setUploadingAvatar(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
        reader.readAsDataURL(file);
      });
      const res = await updateAvatar(dataUrl);
      setProfile((p) => {
        const next = p ? { ...p, avatar_url: res.avatar_url } : p;
        if (next) cacheWrite("user:profile", next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function clearAvatar() {
    setUploadingAvatar(true);
    setError(null);
    try {
      await removeAvatar();
      setProfile((p) => {
        const next = p ? { ...p, avatar_url: null } : p;
        if (next) cacheWrite("user:profile", next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-32 w-full animate-pulse rounded-2xl bg-[var(--card)]" />
        <div className="h-48 w-full animate-pulse rounded-2xl bg-[var(--card)]" />
      </div>
    );
  }

  return (
    <div>
      <Panel title="Profil">
        <Row label="Photo de profil" description={isGuest ? "Créez un compte pour personnaliser votre profil." : "Visible dans la barre latérale et l'accueil."}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)]"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Photo de profil" className="h-full w-full object-cover" />
              ) : (
                <Logo size={22} />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar || isGuest}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--primary)]/60 disabled:opacity-40"
            >
              {uploadingAvatar ? "Envoi…" : "Changer"}
            </button>
            {profile?.avatar_url && (
              <button
                onClick={clearAvatar}
                disabled={uploadingAvatar}
                className="rounded-lg px-2 py-1.5 text-xs text-[var(--text-tertiary)] transition hover:text-[var(--error)] disabled:opacity-40"
              >
                Retirer
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
          </div>
        </Row>
        <Row label="Nom affiché" description={saved ? "Enregistré." : "Le nom que les autres voient."}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            disabled={isGuest || savingName}
            placeholder={isGuest ? "Session invité" : "Votre nom"}
            className="w-52 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] disabled:opacity-50"
          />
        </Row>
        <Row label="Adresse e-mail" description="Utilisée pour la connexion et les notifications.">
          <span className="text-sm text-[var(--text-secondary)]">
            {isGuest ? "Session invité" : profile?.email ?? "—"}
          </span>
        </Row>
      </Panel>

      {usage && (
        <Panel title="Utilisation">
          <UsageRow
            icon={<ChatBubbleIcon />}
            label="Aujourd'hui"
            description="Requêtes et tokens utilisés aujourd'hui."
            value={`${usage.requests_today.toLocaleString("fr-FR")} requêtes · ${usage.tokens_today.toLocaleString("fr-FR")} tokens`}
          />
          <UsageRow
            icon={<CalendarIcon />}
            label="Ce mois-ci"
            description="Requêtes et tokens utilisés ce mois."
            value={`${usage.requests_month.toLocaleString("fr-FR")} requêtes · ${usage.tokens_month.toLocaleString("fr-FR")} tokens`}
          />
        </Panel>
      )}

      <Panel title="Compte">
        {isGuest ? (
          // Session invité : proposer la connexion, pas la déconnexion.
          <Row
            label="Se connecter"
            description="Créez un compte ou connectez-vous pour retrouver vos conversations partout."
          >
            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="rounded-[9px] px-3.5 py-1.5 text-xs font-semibold text-[#FFF6F1] transition hover:bg-[var(--cx-accent-hover)]"
                style={{ background: "var(--cx-accent)" }}
              >
                Connexion
              </a>
              <a
                href="/register"
                className="rounded-[9px] border border-[var(--cx-border-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)]"
              >
                Inscription
              </a>
            </div>
          </Row>
        ) : (
          <Row label="Se déconnecter" description="Vous pourrez vous reconnecter à tout moment.">
            <button
              onClick={logout}
              className="rounded-[9px] border border-[var(--cx-border-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--cx-text-secondary)] transition hover:border-[var(--cx-error)] hover:text-[var(--cx-error-text)]"
            >
              Déconnexion
            </button>
          </Row>
        )}
      </Panel>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
    </div>
  );
}

/** Rangée d'utilisation — icône dans une pastille, valeur à droite. */
function UsageRow({
  icon,
  label,
  description,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-t border-[var(--border)] px-5 py-4 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{description}</p>
        </div>
      </div>
      <span className="shrink-0 text-sm text-[var(--text-secondary)]">{value}</span>
    </div>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
