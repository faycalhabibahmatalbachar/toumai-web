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

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function ProfileTab() {
  const { session } = useAuth();
  const isGuest = Boolean(session?.is_guest);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getProfile(), getUsage()])
      .then(([p, u]) => {
        setProfile(p);
        setName(session?.is_guest ? "" : (p.full_name ?? ""));
        setUsage(u);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }, []);

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile?.full_name) return;
    setSavingName(true);
    setError(null);
    try {
      await updateFullName(trimmed);
      setProfile((p) => (p ? { ...p, full_name: trimmed } : p));
      flashSaved();
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
      setProfile((p) => (p ? { ...p, avatar_url: res.avatar_url } : p));
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
      setProfile((p) => (p ? { ...p, avatar_url: null } : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-20 w-20 animate-pulse rounded-full bg-[var(--card)]" />
        <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-[var(--card)]" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)]"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="Photo de profil" className="h-full w-full object-cover" />
          ) : (
            <Logo size={40} />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar || isGuest}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--primary)]/60 disabled:opacity-40"
            >
              {uploadingAvatar ? "Envoi…" : "Changer la photo"}
            </button>
            {profile?.avatar_url && (
              <button
                onClick={clearAvatar}
                disabled={uploadingAvatar}
                className="rounded-lg px-3 py-1.5 text-xs text-[var(--text-tertiary)] transition hover:text-[var(--error)] disabled:opacity-40"
              >
                Retirer
              </button>
            )}
          </div>
          {isGuest && (
            <p className="text-xs text-[var(--text-tertiary)]">
              Créez un compte pour personnaliser votre profil.
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarPick}
          />
        </div>
      </div>

      {/* Nom */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Nom affiché</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isGuest}
            placeholder="Votre nom"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)] disabled:opacity-50"
          />
          <button
            onClick={saveName}
            disabled={savingName || isGuest || !name.trim() || name.trim() === profile?.full_name}
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            {savingName ? "…" : "Enregistrer"}
          </button>
        </div>
        {saved && <p className="mt-1.5 text-xs text-[var(--success)]">Enregistré.</p>}
      </div>

      {/* Email + plan */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1 text-xs text-[var(--text-tertiary)]">Email</p>
          <p className="text-sm">{isGuest ? "Session invité" : profile?.email ?? "—"}</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-[var(--text-tertiary)]">Formule</p>
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
            style={{ background: "rgba(108,99,255,0.14)", color: "var(--primary-light)" }}
          >
            {profile?.plan ?? "free"}
          </span>
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div>
          <p className="mb-2 text-sm font-medium">Utilisation</p>
          <div className="space-y-2">
            {[
              { label: "Aujourd'hui", requests: usage.requests_today, tokens: usage.tokens_today },
              { label: "Ce mois-ci", requests: usage.requests_month, tokens: usage.tokens_month },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: "var(--card)" }}>
                <p className="mb-2 text-sm font-medium">{s.label}</p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-2xl font-semibold">{s.requests.toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Requêtes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{s.tokens.toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Tokens</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
    </div>
  );
}
