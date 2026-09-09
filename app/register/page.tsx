"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Turnstile, type TurnstilePoignee } from "@/components/Turnstile";
import { signalerWidgetIndisponible } from "@/lib/api";
import { checkoutUrl, PLAN_CATALOG, publicPlanId } from "@/lib/plan-catalog";

import { AuthShell } from "@/components/billing/AuthShell";
import {
  AuthPremium,
  IconeAlerte,
  IconeOeil,
} from "@/components/auth/AuthPremium";
import { messageAuth } from "@/components/auth/messages";
import { usePaymentLocation, usePaymentPlan } from "@/hooks/use-payment-navigation";

export default function RegisterPage() {
  const router = useRouter();
  const { registerAccount, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  /* Appelé pour son effet : il garde le plan en mémoire quand on arrive avec
   * `?plan=`. Le décor de paiement, lui, ne se fie qu'à l'adresse : avoir
   * regardé un tarif ne doit pas transformer une inscription ordinaire en
   * tunnel de commande. */
  usePaymentPlan();
  /* `usePaymentLocation` passe par `useSyncExternalStore` avec un instantané
   * serveur vide : lire `window.location` directement ferait diverger le
   * rendu prégénéré du rendu client. */
  const location = usePaymentLocation();
  const planUrl = publicPlanId(
    new URLSearchParams(location.split("?")[1]).get("plan"),
  );
  const planChoisi =
    planUrl === "essentiel" || planUrl === "toumai_5" ? planUrl : null;
  const turnstile = useRef<TurnstilePoignee | null>(null);

  const destination = planChoisi ? checkoutUrl(planChoisi) : "/chat";

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
      const loggedIn = await registerAccount(email, password, name, turnstileToken);
      if (loggedIn) {
        router.replace(destination);
      } else {
        setInfo(planChoisi
          ? "Compte créé. Confirmez votre e-mail, puis reconnectez-vous pour reprendre votre paiement."
          : "Compte créé. Confirmez votre e-mail avant de vous connecter.");
      }
    } catch (err) {
      setError(messageAuth(err, "Échec de l’inscription."));
      // Le jeton Turnstile est à usage unique : sans cette remise à zéro, la
      // deuxième tentative échouerait sur un jeton déjà consommé.
      turnstile.current?.reinitialiser();
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
      setError(messageAuth(err, "Échec de connexion Google."));
    } finally {
      setLoading(false);
    }
  }

  const corps = (
    <>
      {planChoisi && (
        <p className="auth-offre">
          Vous avez choisi <strong>{PLAN_CATALOG[planChoisi].publicName}</strong>,{" "}
          {PLAN_CATALOG[planChoisi].amount.toLocaleString("fr-FR")} FCFA pour 30 jours.
          Créez votre compte pour continuer.
        </p>
      )}

      <div className="auth-google">
        <GoogleSignInButton onCredential={onGoogleCredential} />
      </div>

      <p className="auth-separateur">ou</p>

      <form onSubmit={submit} className="auth-formulaire">
        <label className="auth-champ">
          <span className="auth-etiquette">Nom</span>
          <input
            type="text"
            required
            autoComplete="name"
            placeholder="Votre nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="auth-saisie"
          />
        </label>

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
            className="auth-saisie"
          />
        </label>

        <label className="auth-champ">
          <span className="auth-etiquette">Mot de passe</span>
          <span className="auth-mdp">
            <input
              type={voirMotDePasse ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="8 caractères au minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
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

        <label className="auth-conditions">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
          />
          <span>
            J&apos;accepte les <Link href="/terms/">conditions générales</Link> et la{" "}
            <Link href="/privacy/">politique de confidentialité</Link>.
          </span>
        </label>

        {error && (
          <p role="alert" className="auth-erreur">
            <IconeAlerte />
            <span>{error}</span>
          </p>
        )}
        {info && (
          <p role="status" className="auth-info">
            {info}
          </p>
        )}

        <div className="auth-turnstile">
          <Turnstile
            onToken={setTurnstileToken}
            onIndisponible={signalerWidgetIndisponible}
            poignee={turnstile}
          />
        </div>

        <button type="submit" disabled={loading || !acceptedTerms} className="auth-bouton">
          {loading && <span className="auth-rotative" aria-hidden="true" />}
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p className="auth-bascule">
        Déjà un compte ?{" "}
        <Link href={planChoisi ? `/login/?plan=${planChoisi}` : "/login/"}>Se connecter</Link>
      </p>
    </>
  );

  // ARRIVÉE DEPUIS UN TARIF : le décor de paiement garde son sens.
  if (planChoisi) {
    return (
      <AuthShell planId={planChoisi} register>
        <div className="w-full">
          <h1 className="mb-2 text-2xl font-semibold">Créez votre compte</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Il ne manque plus que cela pour continuer vers le paiement.
          </p>
          {corps}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthPremium
      titre="Créez votre compte"
      intro="Quelques secondes suffisent. Vos conversations, vos documents et vos connecteurs vous attendent ensuite."
    >
      {corps}
    </AuthPremium>
  );
}
