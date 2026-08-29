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
            {/* CE QUE LA PERSONNE DOIT COMPRENDRE, PAS CE QUI A ÉCHOUÉ.
                « Aucun jeton de récupération trouvé dans le lien » nomme un
                objet technique que personne n'a jamais vu, et laisse deviner la
                suite. Ce qui s'est passé est plus simple : le lien a expiré, ou
                il a été ouvert autrement qu'en entier. */}
            {!token && (
              <div
                className="rounded-2xl border px-4 py-3.5 text-sm leading-relaxed"
                style={{
                  borderColor: "color-mix(in srgb, var(--error) 32%, transparent)",
                  background: "color-mix(in srgb, var(--error) 7%, transparent)",
                }}
              >
                <p className="font-medium text-[var(--text-primary)]">
                  Ce lien n&apos;est plus valide
                </p>
                <p className="mt-1 text-[var(--text-secondary)]">
                  Les liens de réinitialisation expirent après un moment, et ne
                  fonctionnent qu&apos;une seule fois. Ouvrez le lien le plus récent
                  depuis votre boîte mail, ou{" "}
                  <Link href="/forgot" className="font-semibold underline underline-offset-2">
                    demandez-en un nouveau
                  </Link>
                  .
                </p>
              </div>
            )}
            <ChampMotDePasse
              value={password}
              onChange={setPassword}
              placeholder="Nouveau mot de passe (8 caractères minimum)"
              autoComplete="new-password"
            />
            <ChampMotDePasse
              value={confirm}
              onChange={setConfirm}
              placeholder="Confirmez le mot de passe"
              autoComplete="new-password"
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

/**
 * Champ de mot de passe avec bascule afficher / masquer.
 *
 * L'œil n'apparaît QU'UNE FOIS QUELQUE CHOSE EST SAISI : sur un champ vide, il
 * ne sert à rien et n'ajoute qu'un bouton de plus à comprendre. C'est aussi le
 * moment où il compte le plus — vérifier ce qu'on vient de taper, sur un
 * clavier de téléphone, avant de valider un mot de passe qu'on ne pourra pas
 * relire ensuite.
 */
function ChampMotDePasse({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] py-3 pl-5 pr-12 text-sm outline-none focus:border-[var(--primary)]"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
        >
          {visible ? <OeilBarreIcon /> : <OeilIcon />}
        </button>
      )}
    </div>
  );
}

function OeilIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.6 12S5.2 5 12 5s10.4 7 10.4 7-3.6 7-10.4 7S1.6 12 1.6 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

function OeilBarreIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M9.9 5.2A9.8 9.8 0 0112 5c6.8 0 10.4 7 10.4 7a18 18 0 01-3.3 4.2M6.4 6.6A18 18 0 001.6 12s3.6 7 10.4 7a9.6 9.6 0 004.3-1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.8 9.9a3.2 3.2 0 004.4 4.4" strokeLinecap="round" />
      <path d="M3 3l18 18" strokeLinecap="round" />
    </svg>
  );
}
