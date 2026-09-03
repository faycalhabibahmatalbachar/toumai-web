"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Logo } from "@/components/Logo";
import { Turnstile, type TurnstilePoignee } from "@/components/Turnstile";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, finirAvecCode, loginWithGoogle, loginAsGuest } = useAuth();
  /** Le jeton d'attente quand un second facteur est exigé.
   *
   * Tant qu'il est posé, l'écran demande le code et RIEN d'autre : aucune
   * session n'existe encore, et le mot de passe n'a plus à être ressaisi. */
  const [defiMfa, setDefiMfa] = useState<string | null>(null);
  const [codeMfa, setCodeMfa] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstilePoignee | null>(null);

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
      const defi = await loginWithPassword(email, password, turnstileToken);
      if (defi) {
        // Le mot de passe est bon, mais il ne suffit plus. On bascule sur la
        // demande de code sans ouvrir la moindre session.
        setDefiMfa(defi.mfaPendingToken);
        return;
      }
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de connexion");
      // Un jeton Turnstile ne sert qu'une fois : sans remise à zéro, la
      // tentative suivante échouerait sur un jeton déjà consommé.
      turnstile.current?.reinitialiser();
    } finally {
      setLoading(false);
    }
  }

  async function soumettreCode(e: React.FormEvent) {
    e.preventDefault();
    if (!defiMfa) return;
    setError(null);
    setLoading(true);
    try {
      await finirAvecCode(defiMfa, codeMfa);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
      setCodeMfa("");
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

  // ── LE SECOND FACTEUR PREND TOUT L'ÉCRAN ────────────────────────────────
  //
  // Un écran séparé, et non un champ ajouté sous le mot de passe : à ce
  // stade, le mot de passe est déjà accepté et n'a plus à être ressaisi. Le
  // laisser visible inviterait à le retaper, et à croire qu'il a échoué.
  if (defiMfa) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <Logo size={44} />
          </div>
          <h1 className="mb-2 text-center text-2xl font-semibold">Vérification en deux étapes</h1>
          <p className="mb-8 text-center text-sm text-[var(--text-secondary)]">
            Saisissez le code à six chiffres de votre application
            d&apos;authentification. Vous pouvez aussi utiliser l&apos;un de vos
            codes de secours.
          </p>
          <form onSubmit={soumettreCode} className="space-y-3">
            <input
              autoFocus
              required
              // `inputMode` fait sortir le pavé numérique sur mobile, et
              // `one-time-code` laisse le téléphone proposer le code lui-même.
              inputMode="text"
              autoComplete="one-time-code"
              placeholder="123456 ou code de secours"
              value={codeMfa}
              onChange={(e) => setCodeMfa(e.target.value)}
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-center text-lg tracking-[0.2em] outline-none focus:border-[var(--primary)]"
            />
            {error && <p className="px-2 text-sm text-[var(--error)]">{error}</p>}
            <button
              type="submit"
              disabled={loading || !codeMfa.trim()}
              className="w-full rounded-full py-3 text-sm font-medium text-white transition disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "Vérification…" : "Continuer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDefiMfa(null);
                setCodeMfa("");
                setError(null);
                turnstile.current?.reinitialiser();
              }}
              className="w-full rounded-full py-2 text-sm text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
            >
              Revenir à la connexion
            </button>
          </form>
        </div>
      </div>
    );
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
          <Turnstile onToken={setTurnstileToken} poignee={turnstile} />
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
