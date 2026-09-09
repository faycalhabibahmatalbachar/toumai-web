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

const COPY: Record<Lang, {
  title: string;
  intro: string;
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
  created: string;
  createdPlan: string;
  selectedPlan: string;
}> = {
  fr: {
    title: "Créer un compte",
    intro: "Rejoignez Toumaï AI en quelques secondes.",
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
    created: "Compte créé. Confirmez votre e-mail avant de vous connecter.",
    createdPlan: "Compte créé. Confirmez votre e-mail, puis reconnectez-vous pour reprendre votre paiement.",
    selectedPlan: "Vous avez choisi",
  },
  "ar-td": {
    title: "اعمل حساب",
    intro: "ادخل عالم Toumaï AI في ثواني.",
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
    created: "الحساب اتعمل. أكّد إيميلك قبل ما تدخل.",
    createdPlan: "الحساب اتعمل. أكّد إيميلك وبعدها ادخل من جديد عشان تواصل الدفع.",
    selectedPlan: "إنت اخترت",
  },
  ar: {
    title: "إنشاء حساب",
    intro: "انضم إلى Toumaï AI خلال ثوانٍ.",
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
    created: "تم إنشاء الحساب. أكّد بريدك الإلكتروني قبل تسجيل الدخول.",
    createdPlan: "تم إنشاء الحساب. أكّد بريدك الإلكتروني ثم سجّل الدخول مجددًا لمتابعة الدفع.",
    selectedPlan: "لقد اخترت",
  },
  en: {
    title: "Create an account",
    intro: "Join Toumaï AI in just a few seconds.",
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

        <div className="auth-turnstile">
          <Turnstile
            onToken={setTurnstileToken}
            onIndisponible={signalerWidgetIndisponible}
            poignee={turnstile}
          />
        </div>

        <button type="submit" disabled={loading || !acceptedTerms} className="auth-bouton">
          {loading && <span className="auth-rotative" aria-hidden="true" />}
          {loading ? text.creating : text.create}
        </button>
      </form>

      <p className="auth-separateur">{text.continueWith}</p>
      <div className="auth-google auth-google-register">
        <GoogleSignInButton
          onCredential={onGoogleCredential}
          width={240}
          locale={GOOGLE_LOCALE[lang]}
        />
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
          <p className="text-sm text-[var(--text-secondary)]">{text.intro}</p>
          {corps}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthPremium titre={text.title} intro={text.intro} langueActive>
      {corps}
    </AuthPremium>
  );
}

export default function RegisterPage() {
  return (
    <LangProvider>
      <RegisterPageContent />
    </LangProvider>
  );
}
