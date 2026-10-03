"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  securityCenter: string;
  secureSession: string;
  title: string;
  subtitle: string;
  requiredBadge: string;
  optionalBadge: string;
  stepIdentity: string;
  stepVerify: string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneHelp: string;
  send: string;
  sending: string;
  codeTitle: string;
  codeBody: (destination: string) => string;
  codeLabel: string;
  verify: string;
  verifying: string;
  resend: string;
  resendIn: (seconds: number) => string;
  change: string;
  securityHeading: string;
  securityText: string;
  securityPoint1: string;
  securityPoint2: string;
  securityPoint3: string;
  connectorHeading: string;
  connectorText: string;
  privacy: string;
  checking: string;
  success: string;
  alreadyDone: string;
  genericError: string;
  sessionMissing: string;
  backLogin: string;
  support: string;
};

const COPY: Record<Lang, Copy> = {
  fr: {
    securityCenter: "Centre de sécurité",
    secureSession: "Vérification d’identité",
    title: "Sécurisez votre compte avec WhatsApp",
    subtitle: "Confirmez une seule fois le numéro que vous utiliserez comme identité de sécurité Toumaï.",
    requiredBadge: "Vérification requise",
    optionalBadge: "Vérification recommandée",
    stepIdentity: "Numéro",
    stepVerify: "Code de sécurité",
    phoneLabel: "Numéro WhatsApp de sécurité",
    phonePlaceholder: "+235 66 00 00 00",
    phoneHelp: "Choisissez un numéro auquel vous avez un accès personnel et durable. Il ne sera lié qu’à ce compte Toumaï.",
    send: "Continuer avec WhatsApp",
    sending: "Demande du code…",
    codeTitle: "Confirmez votre numéro",
    codeBody: (destination) => `Un code à 6 chiffres a été demandé pour ${destination}. Ouvrez WhatsApp et saisissez-le ici.`,
    codeLabel: "Code de sécurité",
    verify: "Vérifier le numéro",
    verifying: "Vérification…",
    resend: "Renvoyer un code",
    resendIn: (seconds) => `Nouveau code disponible dans ${seconds} s`,
    change: "Utiliser un autre numéro",
    securityHeading: "Ce numéro protège votre identité",
    securityText: "Il sert à confirmer que vous êtes bien propriétaire du compte Toumaï lors des parcours de sécurité.",
    securityPoint1: "Un seul numéro de sécurité actif par compte",
    securityPoint2: "Un numéro ne peut sécuriser qu’un seul compte Toumaï",
    securityPoint3: "Code unique, expiration courte et protection anti-rejeu",
    connectorHeading: "Ce n’est pas l’accès de l’IA à vos messages",
    connectorText: "Connecter un compte WhatsApp à Toumaï AI pour lire ou envoyer des messages est une opération séparée, autorisée ensuite par QR ou code de jumelage.",
    privacy: "Toumaï enregistre une empreinte sécurisée du numéro pour l’identité. La vérification n’autorise pas automatiquement l’IA à accéder à vos conversations WhatsApp.",
    checking: "Vérification de votre état de sécurité…",
    success: "Numéro vérifié. Votre identité WhatsApp est maintenant protégée.",
    alreadyDone: "Votre numéro de sécurité WhatsApp est déjà vérifié.",
    genericError: "La vérification WhatsApp est momentanément indisponible.",
    sessionMissing: "Votre session a expiré. Reconnectez-vous avant de vérifier votre numéro.",
    backLogin: "Retour à la connexion",
    support: "Besoin d’aide ? Contactez le support Toumaï AI.",
  },
  en: {
    securityCenter: "Security center",
    secureSession: "Identity verification",
    title: "Secure your account with WhatsApp",
    subtitle: "Verify once the number you want to use as your Toumaï security identity.",
    requiredBadge: "Verification required",
    optionalBadge: "Verification recommended",
    stepIdentity: "Number",
    stepVerify: "Security code",
    phoneLabel: "Security WhatsApp number",
    phonePlaceholder: "+235 66 00 00 00",
    phoneHelp: "Use a number you personally control long term. It can secure only this Toumaï account.",
    send: "Continue with WhatsApp",
    sending: "Requesting code…",
    codeTitle: "Confirm your number",
    codeBody: (destination) => `A 6-digit code was requested for ${destination}. Open WhatsApp and enter it here.`,
    codeLabel: "Security code",
    verify: "Verify number",
    verifying: "Verifying…",
    resend: "Send another code",
    resendIn: (seconds) => `New code available in ${seconds}s`,
    change: "Use another number",
    securityHeading: "This number protects your identity",
    securityText: "It is used to prove account ownership during Toumaï security flows.",
    securityPoint1: "One active security number per account",
    securityPoint2: "One number can secure only one Toumaï account",
    securityPoint3: "Single-use code, short expiry and replay protection",
    connectorHeading: "This does not give the AI access to your messages",
    connectorText: "Connecting a WhatsApp account for Toumaï AI to read or send messages is a separate action, later authorized by QR or pairing code.",
    privacy: "Toumaï stores a protected fingerprint for identity purposes. Verification does not automatically grant access to your WhatsApp conversations.",
    checking: "Checking your security status…",
    success: "Number verified. Your WhatsApp identity is now protected.",
    alreadyDone: "Your WhatsApp security number is already verified.",
    genericError: "WhatsApp verification is temporarily unavailable.",
    sessionMissing: "Your session expired. Sign in again before verifying your number.",
    backLogin: "Back to sign in",
    support: "Need help? Contact Toumaï AI support.",
  },
  ar: {
    securityCenter: "مركز الأمان",
    secureSession: "التحقق من الهوية",
    title: "أمّن حسابك باستخدام WhatsApp",
    subtitle: "تحقق مرة واحدة من الرقم الذي ستستخدمه كهوية أمان في Toumaï.",
    requiredBadge: "التحقق مطلوب",
    optionalBadge: "التحقق موصى به",
    stepIdentity: "الرقم",
    stepVerify: "رمز الأمان",
    phoneLabel: "رقم WhatsApp للأمان",
    phonePlaceholder: "+235 66 00 00 00",
    phoneHelp: "استخدم رقماً تملكه وتستطيع الوصول إليه باستمرار. لا يمكن ربطه إلا بحساب Toumaï واحد.",
    send: "المتابعة عبر WhatsApp",
    sending: "جارٍ طلب الرمز…",
    codeTitle: "أكد رقمك",
    codeBody: (destination) => `تم طلب رمز من 6 أرقام للرقم ${destination}. افتح WhatsApp وأدخله هنا.`,
    codeLabel: "رمز الأمان",
    verify: "تأكيد الرقم",
    verifying: "جارٍ التحقق…",
    resend: "إرسال رمز جديد",
    resendIn: (seconds) => `يمكن طلب رمز جديد خلال ${seconds} ث`,
    change: "استخدام رقم آخر",
    securityHeading: "هذا الرقم يحمي هويتك",
    securityText: "يستخدم لإثبات ملكية حساب Toumaï أثناء عمليات الأمان.",
    securityPoint1: "رقم أمان نشط واحد لكل حساب",
    securityPoint2: "كل رقم يمكنه حماية حساب Toumaï واحد فقط",
    securityPoint3: "رمز للاستخدام مرة واحدة مع انتهاء سريع وحماية من إعادة الاستخدام",
    connectorHeading: "هذا لا يمنح الذكاء الاصطناعي الوصول إلى رسائلك",
    connectorText: "ربط WhatsApp بالذكاء الاصطناعي للقراءة أو الإرسال عملية منفصلة يتم اعتمادها لاحقاً عبر QR أو رمز الربط.",
    privacy: "يحفظ Toumaï بصمة محمية للرقم لغرض الهوية. التحقق لا يمنح وصولاً تلقائياً إلى محادثات WhatsApp.",
    checking: "جارٍ التحقق من حالة الأمان…",
    success: "تم تأكيد الرقم. أصبحت هوية WhatsApp الخاصة بك محمية.",
    alreadyDone: "تم التحقق من رقم WhatsApp الأمني مسبقاً.",
    genericError: "التحقق عبر WhatsApp غير متاح مؤقتاً.",
    sessionMissing: "انتهت جلستك. سجل الدخول من جديد قبل التحقق من الرقم.",
    backLogin: "العودة إلى تسجيل الدخول",
    support: "تحتاج مساعدة؟ تواصل مع دعم Toumaï AI.",
  },
  "ar-td": {
    securityCenter: "مركز الحماية",
    secureSession: "تأكيد الهوية",
    title: "أمّن حسابك بـ WhatsApp",
    subtitle: "أكد مرة واحدة الرقم الداير تستعمله لحماية هويتك في Toumaï.",
    requiredBadge: "التأكيد مطلوب",
    optionalBadge: "التأكيد أحسن للحماية",
    stepIdentity: "الرقم",
    stepVerify: "كود الحماية",
    phoneLabel: "رقم WhatsApp للحماية",
    phonePlaceholder: "+235 66 00 00 00",
    phoneHelp: "استعمل رقم بتاعك وعندك وصول ليه بصورة دائمة. الرقم دا بيرتبط بحساب Toumaï واحد بس.",
    send: "واصل بـ WhatsApp",
    sending: "جاري طلب الكود…",
    codeTitle: "أكد رقمك",
    codeBody: (destination) => `طلبنا كود من 6 أرقام للرقم ${destination}. افتح WhatsApp واكتب الكود هنا.`,
    codeLabel: "كود الحماية",
    verify: "أكد الرقم",
    verifying: "جاري التأكيد…",
    resend: "أرسل كود جديد",
    resendIn: (seconds) => `كود جديد متاح بعد ${seconds} ث`,
    change: "استعمل رقم تاني",
    securityHeading: "الرقم دا بحمي هويتك",
    securityText: "بنستعمله عشان نتأكد إن حساب Toumaï فعلاً بتاعك في خطوات الأمان.",
    securityPoint1: "رقم حماية واحد نشط لكل حساب",
    securityPoint2: "أي رقم بحمي حساب Toumaï واحد بس",
    securityPoint3: "كود مرة واحدة، مدة قصيرة وحماية من إعادة الاستعمال",
    connectorHeading: "دا ما بيدي الذكاء الاصطناعي وصول لرسائلك",
    connectorText: "ربط WhatsApp عشان Toumaï AI يقرأ أو يرسل رسائل خطوة مختلفة، وبتوافق عليها بعدين بـ QR أو كود الربط.",
    privacy: "Toumaï بحفظ بصمة محمية للرقم للهوية. التأكيد ما بيدي وصول تلقائي لمحادثات WhatsApp.",
    checking: "جاري فحص حماية حسابك…",
    success: "الرقم اتأكد. هوية WhatsApp بتاعتك بقت محمية.",
    alreadyDone: "رقم WhatsApp للحماية متأكد من قبل.",
    genericError: "تأكيد WhatsApp ما متاح حالياً.",
    sessionMissing: "جلسة الدخول انتهت. ادخل من جديد قبل تأكيد الرقم.",
    backLogin: "ارجع لتسجيل الدخول",
    support: "محتاج مساعدة؟ تواصل مع دعم Toumaï AI.",
  },
};

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/chat";
  if (value.startsWith("/verify-whatsapp")) return "/chat";
  return value;
}

function Icon({ name }: { name: "shield" | "whatsapp" | "lock" | "check" | "info" }) {
  if (name === "whatsapp") {
    return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.84 9.84 0 0 0-8.45 14.88L2 22l5.28-1.54A9.9 9.9 0 1 0 12.04 2Zm0 17.98a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.13.91.91-3.05-.2-.31a8.06 8.06 0 1 1 6.85 3.76Zm4.44-6.05c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" /></svg>;
  }
  if (name === "check") return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "info") return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 10.5v6M12 7.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (name === "lock") return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M8.5 10V7.7a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.8 20 6v5.2c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="m8.6 12 2.2 2.2 4.7-4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function VerifyWhatsAppPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useLang();
  const t = COPY[lang];
  const rtl = lang === "ar" || lang === "ar-td";
  const next = useMemo(() => safeNext(params.get("next")), [params]);

  const [checking, setChecking] = useState(true);
  const [required, setRequired] = useState(false);
  const [phone, setPhone] = useState("+235");
  const [challenge, setChallenge] = useState<WhatsAppChallenge | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstilePoignee | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!loadSession()) {
        if (alive) {
          setError(t.sessionMissing);
          setChecking(false);
        }
        return;
      }
      try {
        const state = await etatEnrolementWhatsApp();
        if (!alive) return;
        setRequired(Boolean(state.required));
        if (state.enrolled) {
          setSuccess(t.alreadyDone);
          window.setTimeout(() => router.replace(next), 900);
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : t.genericError);
      } finally {
        if (alive) setChecking(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [next, router, t.alreadyDone, t.genericError, t.sessionMissing]);

  useEffect(() => {
    if (!challenge || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [challenge, seconds]);

  function widgetUnavailable() {
    signalerWidgetIndisponible();
    signalerWhatsappWidgetIndisponible();
  }

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy || phone.trim().length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const result = await demanderCodeEnrolementWhatsApp(
        phone.trim(),
        turnstileToken,
        `wa-enroll:${crypto.randomUUID()}`,
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

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge || busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifierCodeEnrolementWhatsApp(phone.trim(), challenge.challenge_id, code);
      setSuccess(t.success);
      window.setTimeout(() => router.replace(next), 850);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  function changeNumber() {
    if (busy) return;
    setChallenge(null);
    setCode("");
    setSeconds(0);
    setError(null);
  }

  if (checking) {
    return <main className={styles.loadingPage} dir={rtl ? "rtl" : "ltr"}><div className={styles.loadingCard}><span className={styles.spinner} /><span>{t.checking}</span></div></main>;
  }

  const step = challenge ? 2 : 1;

  return (
    <main className={styles.page} dir={rtl ? "rtl" : "ltr"}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Toumaï AI">
          <span className={styles.brandMark}>T</span>
          <span>Toumaï AI</span>
        </Link>
        <div className={styles.topbarContext}><Icon name="shield" /><span>{t.securityCenter}</span></div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <div className={styles.contextRow}>
            <span className={styles.contextIcon}><Icon name="lock" /></span>
            <div><span>{t.secureSession}</span><strong className={required ? styles.requiredBadge : styles.optionalBadge}>{required ? t.requiredBadge : t.optionalBadge}</strong></div>
          </div>

          <div className={styles.heading}>
            <h1>{challenge ? t.codeTitle : t.title}</h1>
            <p>{challenge ? t.codeBody(challenge.destination) : t.subtitle}</p>
          </div>

          <div className={styles.progress} aria-label={`${step}/2`}>
            <div className={`${styles.progressItem} ${styles.progressActive}`}><span>1</span><small>{t.stepIdentity}</small></div>
            <div className={`${styles.progressLine} ${step === 2 ? styles.progressLineActive : ""}`} />
            <div className={`${styles.progressItem} ${step === 2 ? styles.progressActive : ""}`}><span>2</span><small>{t.stepVerify}</small></div>
          </div>

          {error && <div className={styles.errorBox} role="alert"><span>!</span><p>{error}</p></div>}
          {success && <div className={styles.successBox} role="status"><span><Icon name="check" /></span><p>{success}</p></div>}

          {!success && !challenge && (
            <form className={styles.form} onSubmit={sendCode}>
              <label className={styles.field}>
                <span className={styles.label}>{t.phoneLabel}</span>
                <div className={styles.phoneField}><span className={styles.waIcon}><Icon name="whatsapp" /></span><input autoFocus type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} minLength={6} maxLength={40} required /></div>
                <small>{t.phoneHelp}</small>
              </label>
              <div className={styles.turnstile}><Turnstile onToken={setTurnstileToken} onIndisponible={widgetUnavailable} poignee={turnstile} language={lang === "ar-td" ? "ar" : lang} appearance="always" size="flexible" /></div>
              <button className={styles.primaryButton} disabled={busy || phone.trim().length < 6} type="submit">{busy ? <span className={styles.buttonSpinner} /> : <Icon name="whatsapp" />}<span>{busy ? t.sending : t.send}</span></button>
            </form>
          )}

          {!success && challenge && (
            <form className={styles.form} onSubmit={verifyCode}>
              <label className={styles.field}>
                <span className={styles.label}>{t.codeLabel}</span>
                <input className={styles.otpInput} autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
              </label>
              <button className={styles.primaryButton} disabled={busy || code.length !== 6} type="submit">{busy ? <span className={styles.buttonSpinner} /> : <Icon name="shield" />}<span>{busy ? t.verifying : t.verify}</span></button>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={changeNumber} disabled={busy}>{t.change}</button>
                {seconds > 0 ? <span className={styles.timer}>{t.resendIn(seconds)}</span> : <button type="button" className={styles.linkButton} onClick={() => void sendCode()} disabled={busy}>{t.resend}</button>}
              </div>
            </form>
          )}

          {!loadSession() && <Link href="/login" className={styles.backLink}>{t.backLogin}</Link>}
        </div>

        <aside className={styles.sidePanel}>
          <div className={styles.sideHeader}><span className={styles.sideIcon}><Icon name="shield" /></span><div><span className={styles.sideKicker}>Toumaï Identity</span><h2>{t.securityHeading}</h2></div></div>
          <p className={styles.sideText}>{t.securityText}</p>
          <ul className={styles.securityList}>{[t.securityPoint1, t.securityPoint2, t.securityPoint3].map((item) => <li key={item}><span><Icon name="check" /></span><p>{item}</p></li>)}</ul>
          <div className={styles.divider} />
          <div className={styles.infoCard}><span className={styles.infoIcon}><Icon name="info" /></span><div><h3>{t.connectorHeading}</h3><p>{t.connectorText}</p></div></div>
          <p className={styles.privacyNote}><Icon name="lock" /> <span>{t.privacy}</span></p>
          <div className={styles.sideFooter}><span>© Toumaï AI</span><span>•</span><span>{t.support}</span></div>
        </aside>
      </section>
    </main>
  );
}
