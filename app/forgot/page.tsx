"use client";

import { useState } from "react";
import Link from "next/link";

import { requestPasswordReset } from "@/lib/api";
import { AuthPremium, IconeAlerte, IconeInfo } from "@/components/auth/AuthPremium";
import { GuestOnly } from "@/components/auth/GuestOnly";
import { LangProvider, useLang, type Lang } from "@/lib/i18n/context";

const COPY: Record<Lang, {
  title: string;
  intro: string;
  email: string;
  placeholder: string;
  submit: string;
  submitting: string;
  back: string;
  successBefore: string;
  successAfter: string;
  error: string;
}> = {
  fr: {
    title: "Mot de passe oublié",
    intro: "Entrez votre adresse e-mail. Nous vous enverrons un lien pour réinitialiser votre mot de passe.",
    email: "Adresse e-mail",
    placeholder: "votre@email.com",
    submit: "Envoyer le lien",
    submitting: "Envoi…",
    back: "Retour à la connexion",
    successBefore: "Si un compte existe pour",
    successAfter: "un e-mail de réinitialisation vient d’être envoyé.",
    error: "Échec de l’envoi.",
  },
  "ar-td": {
    title: "نسيت كلمة المرور",
    intro: "اكتب إيميلك، ونرسل ليك رابط عشان تغيّر كلمة المرور.",
    email: "الإيميل",
    placeholder: "name@email.com",
    submit: "أرسل الرابط",
    submitting: "جاري الإرسال…",
    back: "ارجع للدخول",
    successBefore: "لو في حساب مربوط بـ",
    successAfter: "رسلنا ليك إيميل فيه رابط تغيير كلمة المرور.",
    error: "الإرسال ما تم.",
  },
  ar: {
    title: "نسيت كلمة المرور",
    intro: "أدخل بريدك الإلكتروني وسنرسل إليك رابطًا لإعادة تعيين كلمة المرور.",
    email: "البريد الإلكتروني",
    placeholder: "name@email.com",
    submit: "إرسال الرابط",
    submitting: "جارٍ الإرسال…",
    back: "العودة إلى تسجيل الدخول",
    successBefore: "إذا كان هناك حساب مرتبط بـ",
    successAfter: "فقد أرسلنا رسالة لإعادة تعيين كلمة المرور.",
    error: "تعذر إرسال الرابط.",
  },
  en: {
    title: "Forgot password",
    intro: "Enter your email address and we’ll send you a link to reset your password.",
    email: "Email address",
    placeholder: "your@email.com",
    submit: "Send reset link",
    submitting: "Sending…",
    back: "Back to sign in",
    successBefore: "If an account exists for",
    successAfter: "a password reset email has just been sent.",
    error: "Unable to send the reset link.",
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

function IconeFleche() {
  return (
    <svg className="auth-bouton-fleche" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ForgotPasswordContent() {
  const { lang } = useLang();
  const text = COPY[lang];
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPremium titre={text.title} intro={text.intro} langueActive>
      {sent ? (
        <>
          <p role="status" className="auth-avis auth-forgot-success">
            <IconeInfo />
            <span>
              {text.successBefore} <strong>{email}</strong>, {text.successAfter}
            </span>
          </p>
          <p className="auth-bascule auth-forgot-back">
            <Link href="/login/">{text.back}</Link>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={submit} className="auth-formulaire auth-forgot-form">
            <label className="auth-champ">
              <span className="auth-etiquette">{text.email}</span>
              <span className="auth-input-wrap">
                <IconeEmail />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={text.placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  aria-invalid={error ? true : undefined}
                  className="auth-saisie"
                />
              </span>
            </label>

            {error && (
              <p role="alert" className="auth-erreur">
                <IconeAlerte />
                <span>{error}</span>
              </p>
            )}

            <button type="submit" disabled={loading} className="auth-bouton">
              {loading && <span className="auth-rotative" aria-hidden="true" />}
              {loading ? text.submitting : text.submit}
              {!loading && <IconeFleche />}
            </button>
          </form>

          <p className="auth-bascule auth-forgot-back">
            <Link href="/login/">{text.back}</Link>
          </p>
        </>
      )}
    </AuthPremium>
  );
}

export default function ForgotPasswordPage() {
  return (
    <GuestOnly>
      <LangProvider>
        <ForgotPasswordContent />
      </LangProvider>
    </GuestOnly>
  );
}
