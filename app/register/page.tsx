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
import { AuthPremium, IconeAlerte, IconeOeil } from "@/components/auth/AuthPremium";
import { messageAuth } from "@/components/auth/messages";
import { usePaymentLocation, usePaymentPlan } from "@/hooks/use-payment-navigation";
import { LangProvider, useLang, type Lang } from "@/lib/i18n/context";
import { API_BASE } from "@/lib/config";
import { GuestOnly } from "@/components/auth/GuestOnly";

const COPY: Record<Lang, {
  title: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  acceptPrefix: string;
  terms: string;
  and: string;
  privacy: string;
  create: string;
  creating: string;
  continueWith: string;
  already: string;
  signIn: string;
  passwordShort: string;
  termsRequired: string;
  registerError: string;
  googleError: string;
  github: string;
  antiBotUnavailable: string;
  antiBotVerified: string;
  created: string;
  createdPlan: string;
  selectedPlan: string;
}> = {
  fr: {
    title: "Créer un compte",
    name: "Nom",
    namePlaceholder: "Votre nom",
    email: "Adresse e-mail",
    emailPlaceholder: "vous@exemple.com",
    password: "Mot de passe",
    passwordPlaceholder: "8 caractères au minimum",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    acceptPrefix: "J’accepte les",
    terms: "conditions générales",
    and: "et la",
    privacy: "politique de confidentialité",
    create: "Créer mon compte",
    creating: "Création…",
    continueWith: "Ou continuer avec",
    already: "Déjà un compte ?",
    signIn: "Se connecter",
    passwordShort: "Choisissez un mot de passe d'au moins 8 caractères.",
    termsRequired: "Vous devez accepter les conditions générales et la politique de confidentialité.",
    registerError: "Échec de l’inscription.",
    googleError: "Échec de connexion Google.",
    github: "Continuer avec GitHub",
    antiBotUnavailable: "Vérification anti-robot indisponible sur ce navigateur. Vous pouvez continuer.",
    antiBotVerified: "Vérification de sécurité réussie",
    created: "Compte créé. Confirmez votre e-mail avant de vous connecter.",
    createdPlan: "Compte créé. Confirmez votre e-mail, puis reconnectez-vous pour reprendre votre paiement.",
    selectedPlan: "Vous avez choisi",
  },
  "ar-td": {
    title: "اعمل حساب",
    name: "الاسم",
    namePlaceholder: "اسمك",
    email: "الإيميل",
    emailPlaceholder: "name@email.com",
    password: "كلمة المرور",
    passwordPlaceholder: "8 حروف على الأقل",
    showPassword: "ورّيني كلمة المرور",
    hidePassword: "خبّي كلمة المرور",
    acceptPrefix: "أنا موافق على",
    terms: "شروط الاستخدام",
    and: "و",
    privacy: "سياسة الخصوصية",
    create: "اعمل حساب",
    creating: "جاري إنشاء الحساب…",
    continueWith: "أو واصل بـ",
    already: "عندك حساب؟",
    signIn: "ادخل",
    passwordShort: "اختار كلمة مرور فيها 8 حروف على الأقل.",
    termsRequired: "لازم توافق على شروط الاستخدام وسياسة الخصوصية.",
    registerError: "إنشاء الحساب ما تم.",
    googleError: "الدخول بـ Google ما تم.",
    github: "واصل بـ GitHub",
    antiBotUnavailable: "فحص الحماية ما اشتغل في المتصفح دا. تقدر تواصل.",
    antiBotVerified: "فحص الحماية تم",
    created: "الحساب اتعمل. أكّد إيميلك قبل ما تدخل.",
    createdPlan: "الحساب اتعمل. أكّد إيميلك وبعدها ادخل من جديد عشان تواصل الدفع.",
    selectedPlan: "إنت اخترت",
  },
  ar: {
    title: "إنشاء حساب",
    name: "الاسم",
    namePlaceholder: "اسمك",
    email: "البريد الإلكتروني",
    emailPlaceholder: "name@email.com",
    password: "كلمة المرور",
    passwordPlaceholder: "8 أحرف على الأقل",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    acceptPrefix: "أوافق على",
    terms: "شروط الاستخدام",
    and: "و",
    privacy: "سياسة الخصوصية",
    create: "إنشاء حسابي",
    creating: "جارٍ إنشاء الحساب…",
    continueWith: "أو تابع باستخدام",
    already: "لديك حساب بالفعل؟",
    signIn: "تسجيل الدخول",
    passwordShort: "اختر كلمة مرور لا تقل عن 8 أحرف.",
    termsRequired: "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية.",
    registerError: "تعذر إنشاء الحساب.",
    googleError: "تعذر تسجيل الدخول عبر Google.",
    github: "المتابعة باستخدام GitHub",
    antiBotUnavailable: "التحقق المضاد للروبوت غير متاح على هذا المتصفح. يمكنك المتابعة.",
    antiBotVerified: "تم التحقق الأمني",
    created: "تم إنشاء الحساب. أكّد بريدك الإلكتروني قبل تسجيل الدخول.",
    createdPlan: "تم إنشاء الحساب. أكّد بريدك الإلكتروني ثم سجّل الدخول مجددًا لمتابعة الدفع.",
    selectedPlan: "لقد اخترت",
  },
  en: {
    title: "Create an account",
    name: "Name",
    namePlaceholder: "Your name",
    email: "Email address",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    showPassword: "Show password",
    hidePassword: "Hide password",
    acceptPrefix: "I accept the",
    terms: "Terms of Use",
    and: "and",
    privacy: "Privacy Policy",
    create: "Create my account",
    creating: "Creating…",
    continueWith: "Or continue with",
    already: "Already have an account?",
    signIn: "Sign in",
    passwordShort: "Choose a password with at least 8 characters.",
    termsRequired: "You must accept the Terms of Use and Privacy Policy.",
    registerError: "Account creation failed.",
    googleError: "Google sign-in failed.",
    github: "Continue with GitHub",
    antiBotUnavailable: "Anti-bot verification is unavailable in this browser. You can continue.",
    antiBotVerified: "Security verification complete",
    created: "Account created. Confirm your email before signing in.",
    createdPlan: "Account created. Confirm your email, then sign in again to continue your payment.",
    selectedPlan: "You selected",
  },
};

const GOOGLE_LOCALE: Record<Lang, string> = { fr: "fr", "ar-td": "ar", ar: "ar", en: "en" };

function IconeNom() {
  return (
    <svg className="auth-input-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5" strokeLinecap="round" />
    </svg>
  );
}

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

function IconeGithub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .9A11.3 11.3 0 0 0 8.4 23c.56.1.77-.24.77-.54v-2.1c-3.12.68-3.78-1.33-3.78-1.33-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.49-.28-5.1-1.24-5.1-5.54 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.46 3.1-1.15 3.1-1.15.61 1.54.23 2.68.11 2.96.72.78 1.16 1.78 1.16 3 0 4.3-2.62 5.25-5.11 5.53.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.3 11.3 0 0 0 12 .9Z" />
    </svg>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const { lang } = useLang();
  const text = COPY[lang];
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

  usePaymentPlan();
  const location = usePaymentLocation();
  const planUrl = publicPlanId(new URLSearchParams(location.split("?")[1]).get("plan"));
  const planChoisi = planUrl === "essentiel" || planUrl === "toumai_5" ? planUrl : null;
  const turnstile = useRef<TurnstilePoignee | null>(null);
  const destination = planChoisi ? checkoutUrl(planChoisi) : "/chat";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError(text.passwordShort);
      return;
    }
    if (!acceptedTerms) {
      setError(text.termsRequired);
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await registerAccount(email, password, name, turnstileToken);
      if (loggedIn) {
        router.replace(destination);
      } else {
        setInfo(planChoisi ? text.createdPlan : text.created);
      }
    } catch (err) {
      setError(messageAuth(err, text.registerError));
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
      setError(messageAuth(err, text.googleError));
    } finally {
      setLoading(false);
    }
  }

  function onGithub() {
    const next = destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/chat";
    window.location.assign(
      `${API_BASE}/google/github/start?next=${encodeURIComponent(next)}`,
    );
  }

  const corps = (
    <>
      {planChoisi && (
        <p className="auth-offre">
          {text.selectedPlan} <strong>{PLAN_CATALOG[planChoisi].publicName}</strong>,{" "}
          {PLAN_CATALOG[planChoisi].amount.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} FCFA / 30 jours.
        </p>
      )}

      <form onSubmit={submit} className="auth-formulaire">
        <label className="auth-champ">
          <span className="auth-etiquette">{text.name}</span>
          <span className="auth-input-wrap">
            <IconeNom />
            <input
              type="text"
              required
              autoComplete="name"
              placeholder={text.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="auth-saisie"
            />
          </span>
        </label>

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
              autoComplete="new-password"
              required
              minLength={8}
              placeholder={text.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
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

        <label className="auth-conditions">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
          />
          <span>
            {text.acceptPrefix} <Link href="/terms/">{text.terms}</Link> {text.and}{" "}
            <Link href="/privacy/">{text.privacy}</Link>.
          </span>
        </label>

        {error && (
          <p role="alert" className="auth-erreur">
            <IconeAlerte />
            <span>{error}</span>
          </p>
        )}
        {info && <p role="status" className="auth-info">{info}</p>}

        <button type="submit" disabled={loading || !acceptedTerms} className="auth-bouton">
          {loading && <span className="auth-rotative" aria-hidden="true" />}
          {loading ? text.creating : text.create}
        </button>

        <div className={`auth-turnstile${turnstileToken ? " auth-turnstile-valide" : ""}`}>
          <Turnstile
            onToken={setTurnstileToken}
            onIndisponible={signalerWidgetIndisponible}
            poignee={turnstile}
            language={GOOGLE_LOCALE[lang]}
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
        <div className="auth-google auth-google-register">
          <GoogleSignInButton
            onCredential={onGoogleCredential}
            width={400}
            locale={GOOGLE_LOCALE[lang]}
          />
        </div>
        <button type="button" className="auth-social" onClick={onGithub} disabled={loading}>
          <IconeGithub />
          <span>{text.github}</span>
        </button>
      </div>

      <p className="auth-bascule">
        {text.already}{" "}
        <Link href={planChoisi ? `/login/?plan=${planChoisi}` : "/login/"}>{text.signIn}</Link>
      </p>
    </>
  );

  if (planChoisi) {
    return (
      <AuthShell planId={planChoisi} register>
        <div className="w-full">
          <h1 className="mb-2 text-2xl font-semibold">{text.title}</h1>
          {corps}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthPremium titre={text.title} langueActive variante="register">
      {corps}
    </AuthPremium>
  );
}

export default function RegisterPage() {
  return (
    <GuestOnly>
      <LangProvider>
        <RegisterPageContent />
      </LangProvider>
    </GuestOnly>
  );
}
