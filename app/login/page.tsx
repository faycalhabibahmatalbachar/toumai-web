"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Turnstile, type TurnstilePoignee } from "@/components/Turnstile";
import { signalerWidgetIndisponible } from "@/lib/api";
import { API_BASE } from "@/lib/config";
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
import { LangProvider, useLang, type Lang } from "@/lib/i18n/context";
import { GuestOnly } from "@/components/auth/GuestOnly";

const COPY: Record<Lang, {
  title: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  forgot: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  submitting: string;
  continueWith: string;
  github: string;
  noAccount: string;
  createAccount: string;
  expiredTitle: string;
  expiredBody: string;
  loginError: string;
  googleError: string;
  antiBotUnavailable: string;
  antiBotVerified: string;
  verificationTitle: string;
  verificationIntro: string;
  verificationCode: string;
  verificationPlaceholder: string;
  verify: string;
  verifying: string;
  invalidCode: string;
  back: string;
}> = {
  fr: {
    title: "Connexion",
    email: "Adresse e-mail",
    emailPlaceholder: "votre@email.com",
    password: "Mot de passe",
    passwordPlaceholder: "Votre mot de passe",
    forgot: "Mot de passe oublié ?",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    submit: "Se connecter",
    submitting: "Connexion…",
    continueWith: "Ou continuer avec",
    github: "Continuer avec GitHub",
    noAccount: "Vous n’avez pas encore de compte ?",
    createAccount: "Créer un compte",
    expiredTitle: "Votre session a expiré.",
    expiredBody: "Reconnectez-vous pour continuer.",
    loginError: "Échec de connexion.",
    googleError: "Échec de connexion Google.",
    antiBotUnavailable: "Vérification anti-robot indisponible sur ce navigateur. Vous pouvez continuer.",
    antiBotVerified: "Vérification de sécurité réussie",
    verificationTitle: "Vérification",
    verificationIntro: "Saisissez le code à six chiffres de votre application d’authentification.",
    verificationCode: "Code de vérification",
    verificationPlaceholder: "123456",
    verify: "Continuer",
    verifying: "Vérification…",
    invalidCode: "Code invalide.",
    back: "Revenir à la connexion",
  },
  "ar-td": {
    title: "الدخول",
    email: "الإيميل",
    emailPlaceholder: "name@email.com",
    password: "كلمة المرور",
    passwordPlaceholder: "اكتب كلمة المرور",
    forgot: "نسيت كلمة المرور؟",
    showPassword: "ورّيني كلمة المرور",
    hidePassword: "خبّي كلمة المرور",
    submit: "ادخل",
    submitting: "جاري الدخول…",
    continueWith: "أو واصل بـ",
    github: "واصل بـ GitHub",
    noAccount: "ما عندك حساب؟",
    createAccount: "اعمل حساب",
    expiredTitle: "الجلسة خلصت.",
    expiredBody: "ادخل من جديد عشان تواصل.",
    loginError: "الدخول ما تم.",
    googleError: "الدخول بـ Google ما تم.",
    antiBotUnavailable: "فحص الحماية ما اشتغل في المتصفح دا. تقدر تواصل.",
    antiBotVerified: "فحص الحماية تم",
    verificationTitle: "التأكيد",
    verificationIntro: "اكتب الكود المكوّن من ستة أرقام من تطبيق التحقق.",
    verificationCode: "كود التحقق",
    verificationPlaceholder: "123456",
    verify: "واصل",
    verifying: "جاري التحقق…",
    invalidCode: "الكود ما صحيح.",
    back: "ارجع للدخول",
  },
  ar: {
    title: "تسجيل الدخول",
    email: "البريد الإلكتروني",
    emailPlaceholder: "name@email.com",
    password: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    forgot: "نسيت كلمة المرور؟",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    submit: "تسجيل الدخول",
    submitting: "جارٍ تسجيل الدخول…",
    continueWith: "أو تابع باستخدام",
    github: "المتابعة باستخدام GitHub",
    noAccount: "ليس لديك حساب بعد؟",
    createAccount: "إنشاء حساب",
    expiredTitle: "انتهت جلستك.",
    expiredBody: "سجّل الدخول من جديد للمتابعة.",
    loginError: "تعذر تسجيل الدخول.",
    googleError: "تعذر تسجيل الدخول عبر Google.",
    antiBotUnavailable: "التحقق المضاد للروبوت غير متاح على هذا المتصفح. يمكنك المتابعة.",
    antiBotVerified: "تم التحقق الأمني",
    verificationTitle: "التحقق",
    verificationIntro: "أدخل الرمز المكوّن من ستة أرقام من تطبيق المصادقة.",
    verificationCode: "رمز التحقق",
    verificationPlaceholder: "123456",
    verify: "متابعة",
    verifying: "جارٍ التحقق…",
    invalidCode: "الرمز غير صحيح.",
    back: "العودة إلى تسجيل الدخول",
  },
  en: {
    title: "Sign in",
    email: "Email address",
    emailPlaceholder: "your@email.com",
    password: "Password",
    passwordPlaceholder: "Your password",
    forgot: "Forgot password?",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submit: "Sign in",
    submitting: "Signing in…",
    continueWith: "Or continue with",
    github: "Continue with GitHub",
    noAccount: "Don’t have an account yet?",
    createAccount: "Create an account",
    expiredTitle: "Your session has expired.",
    expiredBody: "Sign in again to continue.",
    loginError: "Sign-in failed.",
    googleError: "Google sign-in failed.",
    antiBotUnavailable: "Anti-bot verification is unavailable in this browser. You can continue.",
    antiBotVerified: "Security verification complete",
    verificationTitle: "Verification",
    verificationIntro: "Enter the six-digit code from your authenticator app.",
    verificationCode: "Verification code",
    verificationPlaceholder: "123456",
    verify: "Continue",
    verifying: "Verifying…",
    invalidCode: "Invalid code.",
    back: "Back to sign in",
  },
};

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

function LoginPageContent() {
  const router = useRouter();
  const { lang } = useLang();
  const text = COPY[lang];
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
  const oauthLanguage = lang === "ar-td" ? "ar" : lang;

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
      setError(messageAuth(err, text.loginError));
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
      setError(messageAuth(err, text.invalidCode));
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
      setError(messageAuth(err, text.googleError));
    } finally {
      setLoading(false);
    }
  }

  function onGithub() {
    setError(null);
    const next = destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/chat";
    window.location.assign(
      `${API_BASE}/google/github/start?next=${encodeURIComponent(next)}`,
    );
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
          <span className="auth-etiquette">{text.verificationCode}</span>
          <input
            autoFocus
            required
            inputMode="text"
            autoComplete="one-time-code"
            placeholder={text.verificationPlaceholder}
            aria-label={text.verificationCode}
            value={codeMfa}
            onChange={(e) => setCodeMfa(e.target.value)}
            disabled={loading}
            className="auth-saisie auth-code"
          />
        </label>
        {messageErreur}
        <button type="submit" disabled={loading || !codeMfa.trim()} className="auth-bouton">
          {loading && <span className="auth-rotative" aria-hidden="true" />}
          {loading ? text.verifying : text.verify}
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
          {text.back}
        </button>
      </form>
    );

    if (planChoisi) {
      return (
        <AuthShell planId={planChoisi}>
          <div className="w-full" dir="ltr">
            <h1 className="mb-2 text-2xl font-semibold">Vérification en deux étapes</h1>
            <p className="text-sm text-[var(--text-secondary)]">{text.verificationIntro}</p>
            {codeCorps}
          </div>
        </AuthShell>
      );
    }

    return (
      <AuthPremium titre={text.verificationTitle} intro={text.verificationIntro} langueActive>
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
            <strong>{text.expiredTitle}</strong> {text.expiredBody}
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
          <span className="auth-etiquette">{text.email}</span>
          <span className="auth-input-wrap">
            <IconeEmail />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={text.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-invalid={error ? true : undefined}
              className="auth-saisie"
            />
          </span>
        </label>

        <label className="auth-champ">
          <span className="auth-etiquette">{text.password}</span>
          <span className="auth-mdp">
            <IconeCadenas />
            <input
              type={voirMotDePasse ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder={text.passwordPlaceholder}
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
              aria-label={voirMotDePasse ? text.hidePassword : text.showPassword}
              aria-pressed={voirMotDePasse}
            >
              <IconeOeil ouvert={voirMotDePasse} />
            </button>
          </span>
        </label>

        <p className="auth-ligne-oubli">
          <Link href="/forgot/">{text.forgot}</Link>
        </p>

        {messageErreur}

        <button type="submit" disabled={loading} className="auth-bouton">
          {loading && <span className="auth-rotative" aria-hidden="true" />}
          {loading ? text.submitting : text.submit}
          {!loading && <IconeFleche />}
        </button>

        <div className={`auth-turnstile${turnstileToken ? " auth-turnstile-valide" : ""}`}>
          <Turnstile
            onToken={setTurnstileToken}
            onIndisponible={signalerWidgetIndisponible}
            poignee={turnstile}
            language={oauthLanguage}
            appearance="always"
            size="normal"
            unavailableText={text.antiBotUnavailable}
          />
          {turnstileToken ? (
            <p className="auth-turnstile-ok" role="status">✓ {text.antiBotVerified}</p>
          ) : null}
        </div>
      </form>

      <p className="auth-separateur">{text.continueWith}</p>

      <div className="auth-socials">
        <div className="auth-google">
          <GoogleSignInButton
            onCredential={onGoogleCredential}
            width={400}
            locale={oauthLanguage}
          />
        </div>
        <button
          type="button"
          className="auth-social"
          onClick={onGithub}
          disabled={loading}
          aria-label={text.github}
        >
          <IconeGithub />
          <span>{text.github}</span>
        </button>
      </div>

      <p className="auth-bascule">
        {text.noAccount}{" "}
        <Link href={planChoisi ? `/register/?plan=${planChoisi}` : "/register/"}>
          {text.createAccount}
        </Link>
      </p>
    </>
  );

  if (planChoisi) {
    return (
      <AuthShell planId={planChoisi}>
        <div className="w-full" dir="ltr">
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
    <AuthPremium titre={text.title} langueActive>
      {corps}
    </AuthPremium>
  );
}

export default function LoginPage() {
  return (
    <GuestOnly>
      <LangProvider>
        <LoginPageContent />
      </LangProvider>
    </GuestOnly>
  );
}
