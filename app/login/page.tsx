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
  IconeInfo,
  IconeOeil,
} from "@/components/auth/AuthPremium";
import { messageAuth } from "@/components/auth/messages";
import { safeAccountReturn } from "@/lib/payment-navigation";
import { usePaymentPlan, usePaymentLocation } from "@/hooks/use-payment-navigation";

function IconeEmail() {
  return (
    <svg className="auth-input-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeCadenas() {
  return (
    <svg className="auth-input-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.8" strokeLinecap="round" />
    </svg>
  );
}

function IconeFleche() {
  return (
    <svg className="auth-bouton-fleche" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeGithub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .9A11.3 11.3 0 0 0 8.4 23c.56.1.77-.24.77-.54v-2.1c-3.12.68-3.78-1.33-3.78-1.33-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.49-.28-5.1-1.24-5.1-5.54 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.46 3.1-1.15 3.1-1.15.61 1.54.23 2.68.11 2.96.72.78 1.16 1.78 1.16 3 0 4.3-2.62 5.25-5.11 5.53.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.3 11.3 0 0 0 12 .9Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, finirAvecCode, loginWithGoogle } = useAuth();
  const [defiMfa, setDefiMfa] = useState<string | null>(null);
  const [codeMfa, setCodeMfa] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  usePaymentPlan();
  const location = usePaymentLocation();
  const parametres = new URLSearchParams(location.split("?")[1]);
  const retourCompte = safeAccountReturn(parametres.get("next"));
  const turnstile = useRef<TurnstilePoignee | null>(null);
  const sessionExpiree = parametres.has("expired");

  const planUrl = publicPlanId(parametres.get("plan"));
  const planChoisi =
    planUrl === "essentiel" || planUrl === "toumai_5" ? planUrl : null;
  const destination = planChoisi ? checkoutUrl(planChoisi) : retourCompte ?? "/chat";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const defi = await loginWithPassword(email, password, turnstileToken);
      if (defi) {
        setDefiMfa(defi.mfaPendingToken);
        return;
      }
      router.replace(destination);
    } catch (err) {
      setError(messageAuth(err, "Échec de connexion."));
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
      setError(messageAuth(err, "Code invalide."));
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
      setError(messageAuth(err, "Échec de connexion Google."));
    } finally {
      setLoading(false);
    }
  }

  const messageErreur = error && (
    <p role="alert" className="auth-erreur">
      <IconeAlerte />
      <span>{error}</span>
    </p>
  );

  if (defiMfa) {
    const codeCorps = (
      <form onSubmit={soumettreCode} className="auth-formulaire">
        <label className="auth-champ">
          <span className="auth-etiquette">Code de vérification</span>
          <input
            autoFocus
            required
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
        <button type="submit" disabled={loading || !codeMfa.trim()} className="auth-bouton">
          {loading && <span className="auth-rotative" aria-hidden="true" />}
          {loading ? "Vérification…" : "Continuer"}
          {!loading && <IconeFleche />}
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
      </form>
    );

    const introCode =
      "Saisissez le code à six chiffres de votre application d’authentification.";

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
      <AuthPremium titre="Vérification" intro={introCode}>
        {codeCorps}
      </AuthPremium>
    );
  }

  const corps = (
    <>
      {sessionExpiree && (
        <p role="status" className="auth-avis">
          <IconeInfo />
          <span>
            <strong>Votre session a expiré.</strong> Reconnectez-vous pour continuer.
          </span>
        </p>
      )}

      {planChoisi && (
        <p className="auth-offre">
          Reprenez votre choix : <strong>{PLAN_CATALOG[planChoisi].publicName}</strong>,{" "}
          {PLAN_CATALOG[planChoisi].amount.toLocaleString("fr-FR")} FCFA pour 30 jours.
        </p>
      )}

      <form onSubmit={submit} className="auth-formulaire">
        <label className="auth-champ">
          <span className="auth-etiquette">Adresse e-mail</span>
          <span className="auth-input-wrap">
            <IconeEmail />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-invalid={error ? true : undefined}
              className="auth-saisie"
            />
          </span>
        </label>

        <label className="auth-champ">
          <span className="auth-etiquette">Mot de passe</span>
          <span className="auth-mdp">
            <IconeCadenas />
            <input
              type={voirMotDePasse ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Votre mot de passe"
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
          {!loading && <IconeFleche />}
        </button>
      </form>

      <p className="auth-separateur">Ou continuer avec</p>

      <div className="auth-socials">
        <div className="auth-google">
          <GoogleSignInButton onCredential={onGoogleCredential} />
        </div>
        <button
          type="button"
          className="auth-social"
          onClick={() => setError("La connexion GitHub sera disponible dès que le fournisseur OAuth GitHub sera configuré côté serveur.")}
          aria-label="Continuer avec GitHub"
        >
          <IconeGithub />
          <span>Continuer avec GitHub</span>
        </button>
      </div>

      <p className="auth-bascule">
        Vous n’avez pas encore de compte ?{" "}
        <Link href={planChoisi ? `/register/?plan=${planChoisi}` : "/register/"}>
          Créer un compte
        </Link>
      </p>
    </>
  );

  if (planChoisi) {
    return (
      <AuthShell planId={planChoisi}>
        <div className="w-full">
          <h1 className="mb-2 text-2xl font-semibold">Connexion</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Connectez-vous pour retrouver votre offre et continuer.
          </p>
          {corps}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthPremium titre="Connexion" intro="Bienvenue de retour.">
      {corps}
    </AuthPremium>
  );
}
