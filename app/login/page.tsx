"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, loginWithGoogle, loginAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Arrivée depuis une session expirée (voir session-guard).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired")) {
      setError("Votre session a expiré — reconnectez-vous pour continuer.");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de connexion");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleCredential(idToken: string) {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de connexion Google");
    } finally {
      setLoading(false);
    }
  }

  async function tryGuest() {
    setLoading(true);
    setError(null);
    try {
      await loginAsGuest();
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={44} />
        </div>
        <h1 className="mb-2 text-center text-2xl font-semibold">Content de vous revoir</h1>
        <p className="mb-8 text-center text-sm text-[var(--text-secondary)]">
          Connectez-vous pour retrouver vos conversations et préférences.
        </p>

        <div className="mb-5">
          <GoogleSignInButton onCredential={onGoogleCredential} />
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <div className="h-px flex-1 bg-[var(--border)]" />
          OU
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm outline-none focus:border-[var(--primary)]"
          />
          <input
            type="password"
            required
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm outline-none focus:border-[var(--primary)]"
          />
          <p className="px-2 text-right text-xs">
            <Link href="/forgot" className="text-[var(--text-tertiary)] hover:text-[var(--primary)]">
              Mot de passe oublié ?
            </Link>
          </p>
          {error && <p className="px-2 text-sm text-[var(--error)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {loading ? "Connexion…" : "Continuer"}
          </button>
        </form>

        <button
          onClick={tryGuest}
          disabled={loading}
          className="mt-3 w-full rounded-full border border-[var(--border)] py-3 text-sm font-semibold transition hover:border-[var(--primary)] disabled:opacity-50"
        >
          Continuer sans compte
        </button>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-semibold" style={{ color: "var(--primary)" }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
