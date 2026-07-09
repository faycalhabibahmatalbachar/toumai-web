"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Logo } from "@/components/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const { registerAccount, loginWithGoogle, loginAsGuest } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError("Choisissez un mot de passe d'au moins 8 caractères.");
      return;
    }
    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions générales et la politique de confidentialité.");
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await registerAccount(email, password, name);
      if (loggedIn) {
        router.push("/chat");
      } else {
        setInfo("Compte créé — confirmez votre e-mail avant de vous connecter.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'inscription");
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
        <h1 className="mb-2 text-center text-2xl font-semibold">Créez votre compte</h1>
        <p className="mb-8 text-center text-sm text-[var(--text-secondary)]">
          Vous recevrez des réponses plus riches et pourrez importer des
          fichiers, générer des images, et bien plus encore.
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
            type="text"
            required
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm outline-none focus:border-[var(--primary)]"
          />
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
            placeholder="Mot de passe (8+ caractères)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm outline-none focus:border-[var(--primary)]"
          />
          <label className="flex items-start gap-2.5 px-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--primary)]"
            />
            <span>
              J&apos;accepte les{" "}
              <Link href="/terms" className="font-medium underline" style={{ color: "var(--primary)" }}>
                conditions générales
              </Link>{" "}
              et la{" "}
              <Link href="/privacy" className="font-medium underline" style={{ color: "var(--primary)" }}>
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
          {error && <p className="px-2 text-sm text-[var(--error)]">{error}</p>}
          {info && <p className="px-2 text-sm text-[var(--success)]">{info}</p>}
          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {loading ? "Création…" : "Continuer"}
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
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--primary)" }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
