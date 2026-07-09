"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/api";
import { Logo } from "@/components/Logo";

/** Supabase redirige ici avec le jeton dans le FRAGMENT d'URL (#access_token=…&type=recovery),
 * jamais envoyé au serveur — on doit le lire côté client. */
function useRecoveryToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setToken(params.get("access_token"));
  }, []);
  return token;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useRecoveryToken();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Choisissez un mot de passe d'au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!token) {
      setError("Lien invalide ou expiré — redemandez un e-mail de réinitialisation.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la réinitialisation");
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
        <h1 className="mb-2 text-center text-2xl font-semibold">Nouveau mot de passe</h1>

        {done ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-center text-sm text-[var(--success)]">
            Mot de passe mis à jour — redirection vers la connexion…
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {!token && (
              <p className="px-2 text-sm text-[var(--error)]">
                Aucun jeton de récupération trouvé dans le lien. Ouvrez le lien reçu par
                e-mail depuis cet appareil, ou{" "}
                <Link href="/forgot" className="font-semibold underline">
                  redemandez-en un
                </Link>
                .
              </p>
            )}
            <input
              type="password"
              required
              placeholder="Nouveau mot de passe (8+ caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            <input
              type="password"
              required
              placeholder="Confirmez le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            {error && <p className="px-2 text-sm text-[var(--error)]">{error}</p>}
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-full py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
