"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  demanderCodeWhatsApp,
  estNumeroWhatsappValide,
  isWhatsAppAuthError,
  signalerWhatsappWidgetIndisponible,
  verifierCodeWhatsApp,
  type WhatsAppChallenge,
} from "@/lib/whatsapp-auth";

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
  whatsapp: string;
  whatsappTitle: string;
  whatsappIntro: string;
  whatsappPhone: string;
  whatsappPhonePlaceholder: string;
  whatsappSend: string;
  whatsappSending: string;
  whatsappCodeIntro: string;
  whatsappVerify: string;
  whatsappVerifying: string;
  whatsappChangeNumber: string;
  whatsappError: string;
  whatsappResend: string;
  whatsappResendIn: string;
  whatsappExpiresIn: string;
  whatsappExpired: string;
  whatsappLocked: string;
  whatsappInvalidPhone: string;
  whatsappRateLimited: string;
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
    whatsapp: "Continuer avec WhatsApp",
    whatsappTitle: "Connexion avec WhatsApp",
    whatsappIntro: "Entrez le numéro WhatsApp lié à votre compte Toumaï. Nous vous enverrons un code à six chiffres.",
    whatsappPhone: "Numéro WhatsApp",
    whatsappPhonePlaceholder: "+235 66 00 00 00",
    whatsappSend: "Recevoir le code",
    whatsappSending: "Envoi du code…",
    whatsappCodeIntro: "Si ce numéro est lié à un compte Toumaï, un code de connexion a été envoyé sur WhatsApp.",
    whatsappVerify: "Se connecter",
    whatsappVerifying: "Vérification…",
    whatsappChangeNumber: "Utiliser un autre numéro",
    whatsappError: "Connexion WhatsApp impossible.",
    whatsappResend: "Renvoyer le code",
    whatsappResendIn: "Renvoyer dans {seconds} s",
    whatsappExpiresIn: "Le code expire dans {seconds} s.",
    whatsappExpired: "Ce code a expiré. Demandez-en un nouveau.",
    whatsappLocked: "Trop de tentatives. Demandez un nouveau code.",
    whatsappInvalidPhone: "Entrez un numéro international valide, par exemple +23566000000.",
    whatsappRateLimited: "Trop de demandes de code. Réessayez plus tard.",
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
    invalidCode: "Code invalide ou expiré.",
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
    whatsapp: "واصل بـ WhatsApp",
    whatsappTitle: "الدخول بـ WhatsApp",
    whatsappIntro: "اكتب رقم WhatsApp المربوط بحساب Toumaï. بنرسل ليك كود من ستة أرقام.",
    whatsappPhone: "رقم WhatsApp",
    whatsappPhonePlaceholder: "+235 66 00 00 00",
    whatsappSend: "أرسل الكود",
    whatsappSending: "جاري إرسال الكود…",
    whatsappCodeIntro: "لو الرقم مربوط بحساب Toumaï، اتبعت ليه كود دخول على WhatsApp.",
    whatsappVerify: "ادخل",
    whatsappVerifying: "جاري التحقق…",
    whatsappChangeNumber: "استعمل رقم تاني",
    whatsappError: "الدخول بـ WhatsApp ما تم.",
    whatsappResend: "أرسل الكود تاني",
    whatsappResendIn: "تقدر ترسل بعد {seconds} ثانية",
    whatsappExpiresIn: "الكود بخلص بعد {seconds} ثانية.",
    whatsappExpired: "الكود خلص. اطلب كود جديد.",
    whatsappLocked: "المحاولات كتّرت. اطلب كود جديد.",
    whatsappInvalidPhone: "اكتب رقم دولي صحيح، مثلاً +23566000000.",
    whatsappRateLimited: "طلبات الكود كتّرت. جرّب بعد شوية.",
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
    invalidCode: "الكود غلط أو خلص.",
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
    whatsapp: "المتابعة باستخدام WhatsApp",
    whatsappTitle: "تسجيل الدخول عبر WhatsApp",
    whatsappIntro: "أدخل رقم WhatsApp المرتبط بحساب Toumaï. سنرسل رمزاً من ستة أرقام.",
    whatsappPhone: "رقم WhatsApp",
    whatsappPhonePlaceholder: "+235 66 00 00 00",
    whatsappSend: "إرسال الرمز",
    whatsappSending: "جارٍ إرسال الرمز…",
    whatsappCodeIntro: "إذا كان الرقم مرتبطاً بحساب Toumaï، فقد أُرسل رمز تسجيل الدخول عبر WhatsApp.",
    whatsappVerify: "تسجيل الدخول",
    whatsappVerifying: "جارٍ التحقق…",
    whatsappChangeNumber: "استخدام رقم آخر",
    whatsappError: "تعذر تسجيل الدخول عبر WhatsApp.",
    whatsappResend: "إعادة إرسال الرمز",
    whatsappResendIn: "إعادة الإرسال بعد {seconds} ثانية",
    whatsappExpiresIn: "تنتهي صلاحية الرمز خلال {seconds} ثانية.",
    whatsappExpired: "انتهت صلاحية هذا الرمز. اطلب رمزاً جديداً.",
    whatsappLocked: "محاولات كثيرة. اطلب رمزاً جديداً.",
    whatsappInvalidPhone: "أدخل رقماً دولياً صالحاً، مثل +23566000000.",
    whatsappRateLimited: "طلبات كثيرة للرمز. حاول لاحقاً.",
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
    invalidCode: "الرمز غير صالح أو منتهي الصلاحية.",
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
    whatsapp: "Continue with WhatsApp",
    whatsappTitle: "Sign in with WhatsApp",
    whatsappIntro: "Enter the WhatsApp number linked to your Toumaï account. We’ll send a six-digit code.",
    whatsappPhone: "WhatsApp number",
    whatsappPhonePlaceholder: "+235 66 00 00 00",
    whatsappSend: "Send code",
    whatsappSending: "Sending code…",
    whatsappCodeIntro: "If this number is linked to a Toumaï account, a sign-in code was sent on WhatsApp.",
    whatsappVerify: "Sign in",
    whatsappVerifying: "Verifying…",
    whatsappChangeNumber: "Use another number",
    whatsappError: "WhatsApp sign-in failed.",
    whatsappResend: "Resend code",
    whatsappResendIn: "Resend in {seconds}s",
    whatsappExpiresIn: "Code expires in {seconds}s.",
    whatsappExpired: "This code has expired. Request a new one.",
    whatsappLocked: "Too many attempts. Request a new code.",
    whatsappInvalidPhone: "Enter a valid international number, for example +23566000000.",
    whatsappRateLimited: "Too many code requests. Try again later.",
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
    invalidCode: "Invalid or expired code.",
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

function IconeWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.84 9.84 0 0 0-8.45 14.88L2 22l5.28-1.54A9.9 9.9 0 1 0 12.04 2Zm0 17.98a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.13.91.91-3.05-.2-.31a8.06 8.06 0 1 1 6.85 3.76Zm4.44-6.05c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
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
  const [modeWhatsapp, setModeWhatsapp] = useState(false);
  const [telephoneWhatsapp, setTelephoneWhatsapp] = useState("+235");
  const [defiWhatsapp, setDefiWhatsapp] = useState<WhatsAppChallenge | null>(null);
  const [codeWhatsapp, setCodeWhatsapp] = useState("");
  const [whatsappRequestedAt, setWhatsappRequestedAt] = useState<number | null>(null);
  const [whatsappClock, setWhatsappClock] = useState(0);
  const [whatsappRetryUntil, setWhatsappRetryUntil] = useState<number | null>(null);
  const [whatsappFailures, setWhatsappFailures] = useState(0);
  const [whatsappWidgetUnavailable, setWhatsappWidgetUnavailable] = useState(false);
  const whatsappRequestKey = useRef<string | null>(null);

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

  useEffect(() => {
    if (!defiWhatsapp || !whatsappRequestedAt) return;
    setWhatsappClock(Date.now());
    const timer = window.setInterval(() => setWhatsappClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [defiWhatsapp, whatsappRequestedAt]);

  const whatsappExpiresAt = defiWhatsapp && whatsappRequestedAt
    ? whatsappRequestedAt + defiWhatsapp.expires_in * 1000
    : 0;
  const whatsappResendAt = defiWhatsapp && whatsappRequestedAt
    ? Math.max(
        whatsappRequestedAt + defiWhatsapp.resend_after * 1000,
        whatsappRetryUntil ?? 0,
      )
    : 0;
  const whatsappSecondsLeft = whatsappExpiresAt
    ? Math.max(0, Math.ceil((whatsappExpiresAt - whatsappClock) / 1000))
    : 0;
  const whatsappResendSeconds = whatsappResendAt
    ? Math.max(0, Math.ceil((whatsappResendAt - whatsappClock) / 1000))
    : 0;
  const whatsappExpired = Boolean(defiWhatsapp && whatsappExpiresAt && whatsappClock >= whatsappExpiresAt);
  const whatsappLocked = whatsappFailures >= 5;

  function onTurnstileUnavailable() {
    signalerWidgetIndisponible();
    signalerWhatsappWidgetIndisponible();
    setWhatsappWidgetUnavailable(true);
  }

  function resetWhatsappChallenge() {
    setDefiWhatsapp(null);
    setCodeWhatsapp("");
    setWhatsappRequestedAt(null);
    setWhatsappClock(0);
    setWhatsappRetryUntil(null);
    setWhatsappFailures(0);
    whatsappRequestKey.current = null;
    setTurnstileToken(null);
    turnstile.current?.reinitialiser();
  }

  function resetWhatsapp() {
    setModeWhatsapp(false);
    resetWhatsappChallenge();
    setError(null);
  }

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

  async function envoyerCodeWhatsapp(forceNewKey = false) {
    const phone = telephoneWhatsapp.trim();
    if (!estNumeroWhatsappValide(phone)) {
      setError(text.whatsappInvalidPhone);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (forceNewKey) whatsappRequestKey.current = null;
      if (!whatsappRequestKey.current) {
        whatsappRequestKey.current = `wa-login:${crypto.randomUUID()}`;
      }
      const challenge = await demanderCodeWhatsApp(
        phone,
        turnstileToken,
        whatsappRequestKey.current,
      );
      const requestedAt = Date.now();
      setDefiWhatsapp(challenge);
      setCodeWhatsapp("");
      setWhatsappFailures(0);
      setWhatsappRequestedAt(requestedAt);
      setWhatsappClock(requestedAt);
      setWhatsappRetryUntil(requestedAt + challenge.resend_after * 1000);
      // Les jetons Turnstile sont à usage unique. La vue du code monte un
      // nouveau widget afin qu'un renvoi ne réutilise jamais le premier jeton.
      setTurnstileToken(null);
    } catch (err) {
      if (isWhatsAppAuthError(err) && err.retryAfter) {
        setWhatsappRetryUntil(Date.now() + err.retryAfter * 1000);
        setWhatsappClock(Date.now());
      }
      if (isWhatsAppAuthError(err) && err.code === "RATE_LIMITED") {
        setError(text.whatsappRateLimited);
      } else if (isWhatsAppAuthError(err) && err.code === "RESEND_TOO_SOON") {
        const seconds = err.retryAfter ?? Math.max(1, whatsappResendSeconds);
        setError(text.whatsappResendIn.replace("{seconds}", String(seconds)));
      } else {
        setError(messageAuth(err, text.whatsappError));
      }
      turnstile.current?.reinitialiser();
    } finally {
      setLoading(false);
    }
  }

  async function demanderWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    await envoyerCodeWhatsapp(false);
  }

  async function renvoyerWhatsapp() {
    if (!defiWhatsapp || whatsappResendSeconds > 0 || loading) return;
    await envoyerCodeWhatsapp(true);
  }

  async function verifierWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    if (!defiWhatsapp) return;
    if (whatsappExpired) {
      setError(text.whatsappExpired);
      return;
    }
    if (whatsappLocked) {
      setError(text.whatsappLocked);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await verifierCodeWhatsApp(
        telephoneWhatsapp.trim(),
        defiWhatsapp.challenge_id,
        codeWhatsapp.trim(),
      );
      if (result.status === "mfa_required") {
        setDefiMfa(result.pendingToken);
        setModeWhatsapp(false);
        resetWhatsappChallenge();
        return;
      }
      window.location.replace(destination);
    } catch (err) {
      const code = isWhatsAppAuthError(err) ? err.code : null;
      const verificationFailure = [
        "INVALID_CODE",
        "INVALID_CHALLENGE",
        "CODE_EXPIRED",
        "CHALLENGE_ALREADY_USED",
        "TOO_MANY_ATTEMPTS",
      ].includes(code ?? "");

      if (verificationFailure) {
        // IMPORTANT : INVALID_CODE et INVALID_CHALLENGE restent visuellement
        // indistinguables. Cela évite de révéler si le numéro est réellement
        // lié à un compte Toumaï. Le verrouillage UX dépend uniquement du
        // nombre de tentatives faites dans ce navigateur.
        const nextFailures = code === "TOO_MANY_ATTEMPTS"
          ? 5
          : Math.min(5, whatsappFailures + 1);
        setWhatsappFailures(nextFailures);
        setError(nextFailures >= 5 ? text.whatsappLocked : text.invalidCode);
      } else {
        setError(messageAuth(err, text.invalidCode));
      }
      setCodeWhatsapp("");
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

  if (modeWhatsapp) {
    const whatsappCorps = (
      <>
        <form
          onSubmit={defiWhatsapp ? verifierWhatsapp : demanderWhatsapp}
          className="auth-formulaire"
        >
          {!defiWhatsapp ? (
            <>
              <label className="auth-champ">
                <span className="auth-etiquette">{text.whatsappPhone}</span>
                <span className="auth-input-wrap">
                  <IconeWhatsapp />
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder={text.whatsappPhonePlaceholder}
                    value={telephoneWhatsapp}
                    onChange={(e) => {
                      setTelephoneWhatsapp(e.target.value);
                      whatsappRequestKey.current = null;
                      setError(null);
                    }}
                    disabled={loading}
                    aria-invalid={error === text.whatsappInvalidPhone ? true : undefined}
                    className="auth-saisie"
                  />
                </span>
              </label>
              {messageErreur}
              <button type="submit" disabled={loading || !telephoneWhatsapp.trim()} className="auth-bouton">
                {loading && <span className="auth-rotative" aria-hidden="true" />}
                {loading ? text.whatsappSending : text.whatsappSend}
                {!loading && <IconeFleche />}
              </button>
              <div className={`auth-turnstile${turnstileToken ? " auth-turnstile-valide" : ""}`}>
                <Turnstile
                  onToken={setTurnstileToken}
                  onIndisponible={onTurnstileUnavailable}
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
            </>
          ) : (
            <>
              <p className="auth-avis" role="status">
                <IconeInfo />
                <span>{text.whatsappCodeIntro}</span>
              </p>
              <p className="auth-avis" role="status" aria-live="polite">
                <IconeInfo />
                <span>
                  {whatsappExpired
                    ? text.whatsappExpired
                    : whatsappLocked
                      ? text.whatsappLocked
                      : text.whatsappExpiresIn.replace("{seconds}", String(whatsappSecondsLeft))}
                </span>
              </p>
              <label className="auth-champ">
                <span className="auth-etiquette">{text.verificationCode}</span>
                <input
                  autoFocus
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder={text.verificationPlaceholder}
                  value={codeWhatsapp}
                  onChange={(e) => setCodeWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading || whatsappExpired || whatsappLocked}
                  className="auth-saisie auth-code"
                />
              </label>
              {messageErreur}
              <button
                type="submit"
                disabled={
                  loading ||
                  codeWhatsapp.length !== 6 ||
                  whatsappExpired ||
                  whatsappLocked
                }
                className="auth-bouton"
              >
                {loading && <span className="auth-rotative" aria-hidden="true" />}
                {loading ? text.whatsappVerifying : text.whatsappVerify}
                {!loading && <IconeFleche />}
              </button>

              <div className={`auth-turnstile${turnstileToken ? " auth-turnstile-valide" : ""}`}>
                <Turnstile
                  onToken={setTurnstileToken}
                  onIndisponible={onTurnstileUnavailable}
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

              <button
                type="button"
                className="auth-bouton-discret"
                onClick={renvoyerWhatsapp}
                disabled={
                  loading ||
                  whatsappResendSeconds > 0 ||
                  (!turnstileToken && !whatsappWidgetUnavailable)
                }
              >
                {whatsappResendSeconds > 0
                  ? text.whatsappResendIn.replace("{seconds}", String(whatsappResendSeconds))
                  : text.whatsappResend}
              </button>
              <button
                type="button"
                className="auth-bouton-discret"
                onClick={() => {
                  resetWhatsappChallenge();
                  setError(null);
                }}
              >
                {text.whatsappChangeNumber}
              </button>
            </>
          )}
          <button type="button" className="auth-bouton-discret" onClick={resetWhatsapp}>
            {text.back}
          </button>
        </form>
      </>
    );

    if (planChoisi) {
      return (
        <AuthShell planId={planChoisi}>
          <div className="w-full" dir="ltr">
            <h1 className="mb-2 text-2xl font-semibold">{text.whatsappTitle}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{text.whatsappIntro}</p>
            {whatsappCorps}
          </div>
        </AuthShell>
      );
    }

    return (
      <AuthPremium titre={text.whatsappTitle} intro={text.whatsappIntro} langueActive>
        {whatsappCorps}
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
            onIndisponible={onTurnstileUnavailable}
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
        <button
          type="button"
          className="auth-social"
          onClick={() => {
            setModeWhatsapp(true);
            setError(null);
          }}
          disabled={loading}
          aria-label={text.whatsapp}
        >
          <IconeWhatsapp />
          <span>{text.whatsapp}</span>
        </button>
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
