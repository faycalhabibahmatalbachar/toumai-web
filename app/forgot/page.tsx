"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/api";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi");
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
        <h1 className="mb-2 text-center text-2xl font-semibold">Mot de passe oublié</h1>
        <p className="mb-8 text-center text-sm text-[var(--text-secondary)]">
          Entrez votre adresse e-mail, on vous envoie un lien pour le réinitialiser.
        </p>

        {sent ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-center text-sm text-[var(--text-secondary)]">
            Si un compte existe pour <span className="font-medium">{email}</span>, un e-mail
            vient d&apos;être envoyé avec un lien de réinitialisation.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            {error && <p className="px-2 text-sm text-[var(--error)]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          <Link href="/login" className="font-semibold" style={{ color: "var(--primary)" }}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
