"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Turnstile, type TurnstilePoignee } from "@/components/Turnstile";
import { loadSession, signalerWidgetIndisponible } from "@/lib/api";
import { useLang, type Lang } from "@/lib/i18n/context";
import {
  demanderCodeEnrolementWhatsApp,
  etatEnrolementWhatsApp,
  signalerWhatsappWidgetIndisponible,
  verifierCodeEnrolementWhatsApp,
  type WhatsAppChallenge,
} from "@/lib/whatsapp-auth";
import styles from "./verify-whatsapp.module.css";

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  securityTitle: string;
  securityBody: string;
  point1: string;
  point2: string;
  point3: string;
  stepPhone: string;
  stepCode: string;
  stepOf: (step: number) => string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneHint: string;
  send: string;
  sending: string;
  codeTitle: string;
  codeBody: (destination: string) => string;
  codeLabel: string;
  verify: string;
  verifying: string;
  resendIn: (seconds: number) => string;
  resend: string;
  change: string;
  checking: string;
  alreadyDone: string;
  success: string;
  genericError: string;
  invalidCode: string;
  sessionMissing: string;
  footer: string;
  backLogin: string;
};

const COPY: Record<Lang, Copy> = {
  fr: {
    eyebrow: "Sécurité du compte",
    title: "Vérifiez votre numéro WhatsApp",
    subtitle: "Une vérification unique protège votre compte et associe votre numéro à votre identité Toumaï.",
    securityTitle: "Une étape de sécurité, une seule fois",
    securityBody: "Après cette vérification, vous pourrez utiliser Toumaï normalement. Nous ne vous redemanderons pas ce code à chaque connexion.",
    point1: "Code à 6 chiffres valable 5 minutes",
    point2: "Numéro lié uniquement après un code correct",
    point3: "Protection contre le rejeu et les tentatives répétées",
    stepPhone: "Numéro",
    stepCode: "Code",
    stepOf: (step) => `Étape ${step} sur 2`,
    phoneLabel: "Numéro WhatsApp",
    phonePlaceholder: "+235 66 00 00 00",
    phoneHint: "Utilisez le numéro WhatsApp que vous souhaitez associer durablement à ce compte.",
    send: "Envoyer le code",
    sending: "Envoi sécurisé…",
    codeTitle: "Saisissez le code reçu",
    codeBody: (destination) => `Nous avons envoyé un code à ${destination}. Saisissez-le ci-dessous pour confirmer que ce numéro vous appartient.`,
    codeLabel: "Code de vérification",
    verify: "Vérifier et continuer",
    verifying: "Vérification…",
    resendIn: (seconds) => `Nouveau code disponible dans ${seconds} s`,
    resend: "Renvoyer un nouveau code",
    change: "Modifier le numéro",
    checking: "Vérification de l’état de votre compte…",
    alreadyDone: "Votre numéro WhatsApp est déjà vérifié.",
    success: "Numéro vérifié. Ouverture de votre espace Toumaï…",
    genericError: "La vérification WhatsApp n’a pas pu être effectuée.",
    invalidCode: "Le code est invalide ou expiré.",
    sessionMissing: "Votre session de connexion n’est plus disponible. Reconnectez-vous pour continuer.",
    footer: "Toumaï AI · Authentification sécurisée",
    backLogin: "Retour à la connexion",
  },
  en: {
    eyebrow: "Account security",
    title: "Verify your WhatsApp number",
    subtitle: "A one-time verification protects your account and links your number to your Toumaï identity.",
    securityTitle: "One security step, once",
    securityBody: "After verification, you can use Toumaï normally. We will not ask for this enrollment code at every sign-in.",
    point1: "6-digit code valid for 5 minutes",
    point2: "Number linked only after a correct code",
    point3: "Replay and repeated-attempt protection",
    stepPhone: "Number",
    stepCode: "Code",
    stepOf: (step) => `Step ${step} of 2`,
    phoneLabel: "WhatsApp number",
    phonePlaceholder: "+235 66 00 00 00",
    phoneHint: "Use the WhatsApp number you want to keep linked to this account.",
    send: "Send verification code",
    sending: "Sending securely…",
    codeTitle: "Enter the code you received",
    codeBody: (destination) => `We sent a code to ${destination}. Enter it below to confirm that you control this number.`,
    codeLabel: "Verification code",
    verify: "Verify and continue",
    verifying: "Verifying…",
    resendIn: (seconds) => `New code available in ${seconds}s`,
    resend: "Send a new code",
    change: "Change number",
    checking: "Checking your account security status…",
    alreadyDone: "Your WhatsApp number is already verified.",
    success: "Number verified. Opening your Toumaï workspace…",
    genericError: "WhatsApp verification could not be completed.",
    invalidCode: "The code is invalid or expired.",
    sessionMissing: "Your sign-in session is no longer available. Sign in again to continue.",
    footer: "Toumaï AI · Secure authentication",
    backLogin: "Back to sign in",
  },
  ar: {
    eyebrow: "أمان الحساب",
    title: "تحقق من رقم WhatsApp الخاص بك",
    subtitle: "تحقق لمرة واحدة يحمي حسابك ويربط رقمك بهويتك في Toumaï.",
    securityTitle: "خطوة أمان واحدة، لمرة واحدة",
    securityBody: "بعد التحقق ستستخدم Toumaï بشكل طبيعي، ولن نطلب رمز الربط هذا عند كل تسجيل دخول.",
    point1: "رمز من 6 أرقام صالح لمدة 5 دقائق",
    point2: "لا يتم ربط الرقم إلا بعد إدخال رمز صحيح",
    point3: "حماية من إعادة الاستخدام والمحاولات المتكررة",
    stepPhone: "الرقم",
    stepCode: "الرمز",
    stepOf: (step) => `الخطوة ${step} من 2`,
    phoneLabel: "رقم WhatsApp",
    phonePlaceholder: "+235 66 00 00 00",
    phoneHint: "استخدم رقم WhatsApp الذي تريد ربطه بهذا الحساب بشكل دائم.",
    send: "إرسال الرمز",
    sending: "جارٍ الإرسال بأمان…",
    codeTitle: "أدخل الرمز الذي استلمته",
    codeBody: (destination) => `أرسلنا رمزاً إلى ${destination}. أدخله أدناه لتأكيد ملكيتك للرقم.`,
    codeLabel: "رمز التحقق",
    verify: "تحقق وتابع",
    verifying: "جارٍ التحقق…",
    resendIn: (seconds) => `يمكن إرسال رمز جديد بعد ${seconds} ث`,
    resend: "إرسال رمز جديد",
    change: "تغيير الرقم",
    checking: "جارٍ التحقق من حالة أمان حسابك…",
    alreadyDone: "تم التحقق من رقم WhatsApp بالفعل.",
    success: "تم التحقق من الرقم. جارٍ فتح مساحة Toumaï…",
    genericError: "تعذر إكمال التحقق عبر WhatsApp.",
    invalidCode: "الرمز غير صحيح أو منتهي الصلاحية.",
    sessionMissing: "جلسة تسجيل الدخول لم تعد متاحة. سجل الدخول من جديد للمتابعة.",
    footer: "Toumaï AI · مصادقة آمنة",
    backLogin: "العودة إلى تسجيل الدخول",
  },
  "ar-td": {
    eyebrow: "حماية الحساب",
    title: "أكد رقم WhatsApp بتاعك",
    subtitle: "تأكيد مرة واحدة يحمي حسابك ويربط رقمك بهويتك في Toumaï.",
    securityTitle: "خطوة أمان مرة واحدة",
    securityBody: "بعد التأكيد تستعمل Toumaï عادي، وما بنطلب منك كود الربط دا كل مرة تدخل.",
    point1: "كود 6 أرقام صالح 5 دقائق",
    point2: "الرقم ما بيتربط إلا بعد كود صحيح",
    point3: "حماية من إعادة استعمال الكود والمحاولات الكثيرة",
    stepPhone: "الرقم",
    stepCode: "الكود",
    stepOf: (step) => `الخطوة ${step} من 2`,
    phoneLabel: "رقم WhatsApp",
    phonePlaceholder: "+235 66 00 00 00",
    phoneHint: "اكتب رقم WhatsApp الداير تربطه بالحساب دا بصورة دائمة.",
    send: "أرسل الكود",
    sending: "جاري الإرسال بأمان…",
    codeTitle: "اكتب الكود الجاك",
    codeBody: (destination) => `رسلنا كود لـ ${destination}. اكتبه تحت عشان نتأكد إن الرقم بتاعك.`,
    codeLabel: "كود التأكيد",
    verify: "أكد وواصل",
    verifying: "جاري التأكيد…",
    resendIn: (seconds) => `تقدر ترسل كود جديد بعد ${seconds} ث`,
    resend: "أرسل كود جديد",
    change: "غيّر الرقم",
    checking: "جاري فحص حماية حسابك…",
    alreadyDone: "رقم WhatsApp متأكد من قبل.",
    success: "الرقم اتأكد. جاري فتح Toumaï…",
    genericError: "تأكيد WhatsApp ما تم.",
    invalidCode: "الكود غلط أو انتهت مدته.",
    sessionMissing: "جلسة الدخول انتهت. ادخل من جديد عشان تواصل.",
    footer: "Toumaï AI · دخول آمن",
    backLogin: "ارجع للدخول",
  },
};

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/chat";
  if (value.startsWith("/verify-whatsapp")) return "/chat";
  return value;
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.7 20 6v5.2c0 5-3.2 8.6-8 10.1-4.8-1.5-8-5.1-8-10.1V6l8-3.3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m8.7 12 2.1 2.1 4.6-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.84 9.84 0 0 0-8.45 14.88L2 22l5.28-1.54A9.9 9.9 0 1 0 12.04 2Zm0 17.98a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.13.91.91-3.05-.2-.31a8.06 8.06 0 1 1 6.85 3.76Zm4.44-6.05c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

export default function VerifyWhatsAppPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useLang();
  const t = COPY[lang];
  const next = useMemo(() => safeNext(params.get("next")), [params]);
  const rtl = lang === "ar" || lang === "ar-td";

  const [checking, setChecking] = useState(true);
  const [phone, setPhone] = useState("+235");
  const [challenge, setChallenge] = useState<WhatsAppChallenge | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstilePoignee | null>(null);
  const requestKey = useRef<string | null>(null);

  useEffect(() => {
    if (!challenge || seconds <= 0) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, seconds]);

  useEffect(() => {
    let active = true;
    async function check() {
      if (!loadSession()) {
        if (active) {
          setError(t.sessionMissing);
          setChecking(false);
        }
        return;
      }
      try {
        const state = await etatEnrolementWhatsApp();
        if (!active) return;
        if (!state.required || state.enrolled) {
          setSuccess(state.enrolled ? t.alreadyDone : null);
          window.setTimeout(() => router.replace(next), state.enrolled ? 500 : 0);
          return;
        }
      } catch {
        if (active) setError(t.genericError);
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [next, router, t.alreadyDone, t.genericError, t.sessionMissing]);

  function widgetUnavailable() {
    signalerWidgetIndisponible();
    signalerWhatsappWidgetIndisponible();
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const normalized = phone.trim();
    if (normalized.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      requestKey.current = `wa-enroll:${crypto.randomUUID()}`;
      const result = await demanderCodeEnrolementWhatsApp(
        normalized,
        turnstileToken,
        requestKey.current,
      );
      setChallenge(result);
      setCode("");
      setSeconds(result.resend_after || 60);
      turnstile.current?.reinitialiser();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
      turnstile.current?.reinitialiser();
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || !/^\d{6}$/.test(code) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifierCodeEnrolementWhatsApp(phone.trim(), challenge.challenge_id, code);
      setSuccess(t.success);
      window.setTimeout(() => router.replace(next), 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.invalidCode);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  function changeNumber() {
    setChallenge(null);
    setCode("");
    setSeconds(0);
    setError(null);
    requestKey.current = null;
  }

  if (checking) {
    return (
      <main className={styles.loadingPage} dir={rtl ? "rtl" : "ltr"}>
        <div className={styles.loadingCard}>
          <span className={styles.spinner} aria-hidden="true" />
          <p>{t.checking}</p>
        </div>
      </main>
    );
  }

  const step = challenge ? 2 : 1;

  return (
    <main className={styles.page} dir={rtl ? "rtl" : "ltr"}>
      <div className={styles.shell}>
        <aside className={styles.trustPanel}>
          <div>
            <Link href="/" className={styles.brand} aria-label="Toumaï AI">
              <span className={styles.brandMark}>T</span>
              <span>Toumaï AI</span>
            </Link>
            <div className={styles.trustIcon}><ShieldIcon /></div>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h2>{t.securityTitle}</h2>
            <p className={styles.trustBody}>{t.securityBody}</p>
          </div>

          <ul className={styles.proofList}>
            {[t.point1, t.point2, t.point3].map((item) => (
              <li key={item}>
                <span className={styles.check}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className={styles.footer}>{t.footer}</p>
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.formInner}>
            <div className={styles.mobileBrand}>
              <span className={styles.brandMark}>T</span>
              <span>Toumaï AI</span>
            </div>

            <div className={styles.progressHeader}>
              <span>{t.stepOf(step)}</span>
              <div className={styles.steps} aria-label={t.stepOf(step)}>
                <span className={`${styles.stepDot} ${styles.stepActive}`}>1</span>
                <span className={`${styles.stepLine} ${step === 2 ? styles.stepLineActive : ""}`} />
                <span className={`${styles.stepDot} ${step === 2 ? styles.stepActive : ""}`}>2</span>
              </div>
              <div className={styles.stepLabels}>
                <span>{t.stepPhone}</span>
                <span>{t.stepCode}</span>
              </div>
            </div>

            <div className={styles.heading}>
              <div className={styles.whatsappBadge}><WhatsAppIcon /></div>
              <p className={styles.eyebrowDark}>{t.eyebrow}</p>
              <h1>{challenge ? t.codeTitle : t.title}</h1>
              <p>{challenge ? t.codeBody(challenge.destination) : t.subtitle}</p>
            </div>

            {error && (
              <div className={styles.alert} role="alert">
                <span aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            )}
            {success && (
              <div className={styles.success} role="status">
                <span aria-hidden="true">✓</span>
                <p>{success}</p>
              </div>
            )}

            {!challenge ? (
              <form className={styles.form} onSubmit={sendCode}>
                <label className={styles.field}>
                  <span>{t.phoneLabel}</span>
                  <div className={styles.phoneInputWrap}>
                    <span className={styles.inputIcon}><WhatsAppIcon /></span>
                    <input
                      autoFocus
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t.phonePlaceholder}
                      minLength={6}
                      maxLength={40}
                      required
                    />
                  </div>
                  <small>{t.phoneHint}</small>
                </label>

                <div className={styles.turnstile}>
                  <Turnstile
                    onToken={setTurnstileToken}
                    onIndisponible={widgetUnavailable}
                    poignee={turnstile}
                    language={lang === "ar-td" ? "ar" : lang}
                    appearance="always"
                    size="flexible"
                  />
                </div>

                <button className={styles.primaryButton} type="submit" disabled={busy || phone.trim().length < 6}>
                  {busy && <span className={styles.buttonSpinner} aria-hidden="true" />}
                  <span>{busy ? t.sending : t.send}</span>
                  {!busy && <span aria-hidden="true">→</span>}
                </button>
              </form>
            ) : (
              <form className={styles.form} onSubmit={verifyCode}>
                <label className={styles.field}>
                  <span>{t.codeLabel}</span>
                  <input
                    className={styles.otpInput}
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    aria-label={t.codeLabel}
                    required
                  />
                </label>

                <button className={styles.primaryButton} type="submit" disabled={busy || code.length !== 6}>
                  {busy && <span className={styles.buttonSpinner} aria-hidden="true" />}
                  <span>{busy ? t.verifying : t.verify}</span>
                  {!busy && <span aria-hidden="true">→</span>}
                </button>

                <div className={styles.secondaryActions}>
                  <button type="button" className={styles.textButton} onClick={changeNumber} disabled={busy}>
                    {t.change}
                  </button>
                  {seconds > 0 ? (
                    <span className={styles.timer}>{t.resendIn(seconds)}</span>
                  ) : (
                    <button type="button" className={styles.textButtonStrong} onClick={() => void sendCode()} disabled={busy}>
                      {t.resend}
                    </button>
                  )}
                </div>
              </form>
            )}

            {!loadSession() && (
              <Link href="/login" className={styles.backLink}>{t.backLogin}</Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
