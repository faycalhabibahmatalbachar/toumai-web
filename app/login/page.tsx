"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Turnstile, type TurnstilePoignee } from "@/components/Turnstile";
import { signalerWidgetIndisponible } from "@/lib/api";
import { checkoutUrl, PLAN_CATALOG } from "@/lib/plan-catalog";

import { AuthShell } from "@/components/billing/AuthShell";
import {
  AuthPremium,
  IconeAlerte,
  IconeInfo,
  IconeOeil,
} from "@/components/auth/AuthPremium";
import { safeAccountReturn } from "@/lib/payment-navigation";

import { usePaymentPlan, usePaymentLocation } from "@/hooks/use-payment-navigation";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, finirAvecCode, loginWithGoogle } = useAuth();
  /** Le jeton d'attente quand un second facteur est exigé.
   *
   * Tant qu'il est posé, l'écran demande le code et RIEN d'autre : aucune
   * session n'existe encore, et le mot de passe n'a plus à être ressaisi. */
  const [defiMfa, setDefiMfa] = useState<string | null>(null);
  const [codeMfa, setCodeMfa] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const planMemorise = usePaymentPlan();
  const location = usePaymentLocation();
  const parametres = new URLSearchParams(location.split("?")[1]);
  const retourCompte = safeAccountReturn(parametres.get("next"));
  const turnstile = useRef<TurnstilePoignee | null>(null);

  // Arrivée depuis une session expirée (voir session-guard).
  const sessionExpiree = parametres.has("expired");

  /** UNE SESSION EXPIRÉE N'EST PAS UN PARCOURS D'ACHAT.
   *
   * `usePaymentPlan` retombe sur le plan gardé en `sessionStorage` quand
   * l'adresse n'en porte pas. C'est juste pour une reprise de paiement, mais
   * il suffisait d'avoir regardé un tarif dans la même session pour que
   * `/login/?expired=1` se rhabille en tunnel : « Retour aux offres », « Compte
   * → Paiement → Confirmation », alors qu'on a simplement été déconnecté.
   *
   * Le plan reste en mémoire, il n'habille plus cet écran-là. */
  const planChoisi = sessionExpiree ? null : planMemorise;
  const destination = planChoisi ? checkoutUrl(planChoisi) : retourCompte ?? "/chat";

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
      router.replace(destination);
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
      router.replace(destination);
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
      router.replace(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de connexion Google");
    } finally {
      setLoading(false);
    }
  }

  /** Le message d'erreur, dans un conteneur signalé aux lecteurs d'écran. */
  const messageErreur = error && (
    <p role="alert" className="auth-erreur">
      <IconeAlerte />
      <span>{error}</span>
    </p>
  );

  // ── LE SECOND FACTEUR PREND TOUT L'ÉCRAN ────────────────────────────────
  //
  // Un écran séparé, et non un champ ajouté sous le mot de passe : à ce
  // stade, le mot de passe est déjà accepté et n'a plus à être ressaisi. Le
  // laisser visible inviterait à le retaper, et à croire qu'il a échoué.
  if (defiMfa) {
    const codeCorps = (
      <form onSubmit={soumettreCode} className="auth-formulaire" style={{ marginTop: 26 }}>
        <label className="auth-champ">
          <span className="auth-etiquette">Code de vérification</span>
          <input
            autoFocus
            required
            // `inputMode` fait sortir le pavé numérique sur mobile, et
            // `one-time-code` laisse le téléphone proposer le code lui-même.
            inputMode="text"
            autoComplete="one-time-code"
            placeholder="123456"
            aria-label="Code à six chiffres ou code de secours"
            value={codeMfa}
            onChange={(e) => setCodeMfa(e.target.value)}
            disabled={loading}
            className="auth-saisie auth-code"
          />
        </label>
        {messageErreur}
        <div style={{ marginTop: 18 }}>
          <button type="submit" disabled={loading || !codeMfa.trim()} className="auth-bouton">
            {loading && <span className="auth-rotative" aria-hidden="true" />}
            {loading ? "Vérification…" : "Continuer"}
          </button>
          <button
            type="button"
            className="auth-bouton-discret"
            onClick={() => {
              setDefiMfa(null);
              setCodeMfa("");
              setError(null);
              turnstile.current?.reinitialiser();
            }}
          >
            Revenir à la connexion
          </button>
        </div>
      </form>
    );

    const introCode =
      "Saisissez le code à six chiffres de votre application d’authentification. Un code de secours fonctionne aussi.";

    if (planChoisi) {
      return (
        <AuthShell planId={planChoisi}>
          <div className="w-full">
            <h1 className="mb-2 text-2xl font-semibold">Vérification en deux étapes</h1>
            <p className="text-sm text-[var(--text-secondary)]">{introCode}</p>
            {codeCorps}
          </div>
        </AuthShell>
      );
    }

    return (
      <AuthPremium titre="Vérification en deux étapes" intro={introCode}>
        {codeCorps}
      </AuthPremium>
    );
  }

  // ── LA CONNEXION ────────────────────────────────────────────────────────

  const corps = (
    <>
      {sessionExpiree && (
        <p role="status" className="auth-avis">
          <IconeInfo />
          <span>
            <strong>Votre session a expiré.</strong> Reconnectez-vous pour reprendre où
            vous en étiez.
          </span>
        </p>
      )}

      {planChoisi && (
        <p className="auth-offre">
          Reprenez votre choix : <strong>{PLAN_CATALOG[planChoisi].publicName}</strong>,{" "}
          {PLAN_CATALOG[planChoisi].amount.toLocaleString("fr-FR")} FCFA pour 30 jours.
        </p>
      )}

      <div className="auth-google">
        <GoogleSignInButton onCredential={onGoogleCredential} />
      </div>

      <p className="auth-separateur">ou</p>

      <form onSubmit={submit} className="auth-formulaire">
        <label className="auth-champ">
          <span className="auth-etiquette">Adresse e-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            aria-invalid={error ? true : undefined}
            className="auth-saisie"
          />
        </label>

        <label className="auth-champ">
          <span className="auth-etiquette">Mot de passe</span>
          <span className="auth-mdp">
            <input
              // Le type bascule, `autoComplete` ne bouge pas : c'est lui que
              // regardent les gestionnaires de mots de passe.
              type={voirMotDePasse ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              aria-invalid={error ? true : undefined}
              className="auth-saisie"
            />
            <button
              type="button"
              className="auth-oeil"
              onClick={() => setVoirMotDePasse((v) => !v)}
              aria-label={voirMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={voirMotDePasse}
            >
              <IconeOeil ouvert={voirMotDePasse} />
            </button>
          </span>
        </label>

        <p className="auth-ligne-oubli">
          <Link href="/forgot/">Mot de passe oublié ?</Link>
        </p>

        {messageErreur}

        {/* La vérification anti-robot est intacte : même widget, même jeton à
            usage unique, même contrôle serveur. Seule sa place change. */}
        <div className="auth-turnstile">
          <Turnstile
            onToken={setTurnstileToken}
            onIndisponible={signalerWidgetIndisponible}
            poignee={turnstile}
          />
        </div>

        <button type="submit" disabled={loading} className="auth-bouton">
          {loading && <span className="auth-rotative" aria-hidden="true" />}
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="auth-bascule">
        Pas encore de compte ?{" "}
        <Link href={planChoisi ? `/register/?plan=${planChoisi}` : "/register/"}>
          Créer un compte
        </Link>
      </p>
    </>
  );

  // ARRIVÉE DEPUIS UN TARIF : le décor de paiement garde son sens.
  //
  // « Retour aux offres » et « Compte → Paiement → Confirmation » disent alors
  // d'où l'on vient et ce qui reste à faire. Sur une connexion ordinaire, ils
  // annonçaient une transaction qui n'aurait pas lieu — ils n'y sont plus.
  if (planChoisi) {
    return (
      <AuthShell planId={planChoisi}>
        <div className="w-full">
          <h1 className="mb-2 text-2xl font-semibold">Heureux de vous revoir</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Connectez-vous pour retrouver votre offre et continuer.
          </p>
          {corps}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthPremium
      titre="Heureux de vous revoir"
      intro="Connectez-vous pour retrouver vos conversations, vos documents et vos connecteurs."
    >
      {corps}
    </AuthPremium>
  );
}
