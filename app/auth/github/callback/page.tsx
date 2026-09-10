"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthPremium, IconeAlerte } from "@/components/auth/AuthPremium";
import { API_BASE } from "@/lib/config";
import { saveSession, type TokenPayload } from "@/lib/api";
import { LangProvider, useLang, type Lang } from "@/lib/i18n/context";

type CallbackData = TokenPayload & { next?: string };
type ApiEnvelope<T> = { success: boolean; message?: string; data?: T };

const COPY: Record<Lang, { title: string; loading: string; back: string; generic: string; errors: Record<string, string> }> = {
  fr: {
    title: "Connexion GitHub",
    loading: "Finalisation de votre connexion…",
    back: "Revenir à la connexion",
    generic: "La connexion GitHub n’a pas pu être finalisée.",
    errors: {
      not_configured: "La connexion GitHub n’est pas encore activée côté serveur.",
      access_denied: "Vous avez annulé l’autorisation GitHub.",
      invalid_callback: "Le retour GitHub est incomplet.",
      invalid_state: "Cette tentative de connexion a expiré. Recommencez.",
      github_failed: "GitHub n’a pas pu confirmer votre identité.",
      verified_email_required: "Votre compte GitHub doit avoir au moins une adresse e-mail vérifiée.",
      account_failed: "Impossible de préparer votre compte Toumaï AI.",
      account_blocked: "Ce compte Toumaï AI est actuellement indisponible.",
    },
  },
  "ar-td": {
    title: "الدخول بـ GitHub",
    loading: "قاعدين نكمّل دخولك…",
    back: "ارجع للدخول",
    generic: "ما قدرنا نكمّل الدخول بـ GitHub.",
    errors: {
      not_configured: "الدخول بـ GitHub لسه ما اتفعّل في السيرفر.",
      access_denied: "إنت لغيت سماح GitHub.",
      invalid_callback: "رجعة GitHub ناقصة.",
      invalid_state: "محاولة الدخول انتهت. جرّب من جديد.",
      github_failed: "GitHub ما قدر يأكد هويتك.",
      verified_email_required: "لازم يكون عندك إيميل موثّق في GitHub.",
      account_failed: "ما قدرنا نجهّز حساب Toumaï AI.",
      account_blocked: "حساب Toumaï AI دا ما متاح هسع.",
    },
  },
  ar: {
    title: "تسجيل الدخول عبر GitHub",
    loading: "جارٍ إكمال تسجيل الدخول…",
    back: "العودة إلى تسجيل الدخول",
    generic: "تعذر إكمال تسجيل الدخول عبر GitHub.",
    errors: {
      not_configured: "لم يتم تفعيل تسجيل الدخول عبر GitHub على الخادم بعد.",
      access_denied: "لقد ألغيت تفويض GitHub.",
      invalid_callback: "استجابة GitHub غير مكتملة.",
      invalid_state: "انتهت محاولة تسجيل الدخول. أعد المحاولة.",
      github_failed: "تعذر على GitHub تأكيد هويتك.",
      verified_email_required: "يجب أن يحتوي حساب GitHub على بريد إلكتروني موثّق واحد على الأقل.",
      account_failed: "تعذر إعداد حساب Toumaï AI.",
      account_blocked: "حساب Toumaï AI هذا غير متاح حاليًا.",
    },
  },
  en: {
    title: "GitHub sign-in",
    loading: "Finishing your sign-in…",
    back: "Back to sign in",
    generic: "GitHub sign-in could not be completed.",
    errors: {
      not_configured: "GitHub sign-in is not enabled on the server yet.",
      access_denied: "You cancelled GitHub authorization.",
      invalid_callback: "The GitHub callback is incomplete.",
      invalid_state: "This sign-in attempt has expired. Please try again.",
      github_failed: "GitHub could not confirm your identity.",
      verified_email_required: "Your GitHub account must have at least one verified email address.",
      account_failed: "Toumaï AI could not prepare your account.",
      account_blocked: "This Toumaï AI account is currently unavailable.",
    },
  },
};

function safeNext(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/chat";
  }
  return value;
}

function GithubCallbackContent() {
  const { lang } = useLang();
  const text = COPY[lang];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const code = params.get("error");
      const ticket = params.get("ticket");

      // Le ticket est bref et ne doit pas rester dans l'historique du navigateur.
      window.history.replaceState({}, "", window.location.pathname);

      if (code) {
        if (!cancelled) setError(text.errors[code] ?? text.generic);
        return;
      }
      if (!ticket) {
        if (!cancelled) setError(text.generic);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/google/github/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        });
        const body = (await response.json().catch(() => ({}))) as ApiEnvelope<CallbackData>;
        if (!response.ok || body.success === false || !body.data?.access_token || !body.data?.refresh_token) {
          throw new Error(body.message || text.generic);
        }

        const { next, ...session } = body.data;
        saveSession(session as TokenPayload);
        window.location.replace(safeNext(next));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error && err.message ? err.message : text.generic);
        }
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <AuthPremium titre={text.title} intro={error ? text.generic : text.loading} langueActive>
      {error ? (
        <>
          <p role="alert" className="auth-erreur">
            <IconeAlerte />
            <span>{error}</span>
          </p>
          <p className="auth-bascule">
            <Link href="/login/">{text.back}</Link>
          </p>
        </>
      ) : (
        <div className="auth-bouton" aria-live="polite" aria-busy="true">
          <span className="auth-rotative" aria-hidden="true" />
          {text.loading}
        </div>
      )}
    </AuthPremium>
  );
}

export default function GithubCallbackPage() {
  return (
    <LangProvider>
      <GithubCallbackContent />
    </LangProvider>
  );
}
