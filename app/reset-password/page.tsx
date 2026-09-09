"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { resetPassword } from "@/lib/api";
import {
  AuthPremium,
  IconeAlerte,
  IconeInfo,
  IconeOeil,
} from "@/components/auth/AuthPremium";
import { LangProvider, useLang, type Lang } from "@/lib/i18n/context";

const COPY: Record<Lang, {
  title: string;
  intro: string;
  password: string;
  passwordPlaceholder: string;
  confirm: string;
  confirmPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  submitting: string;
  tooShort: string;
  mismatch: string;
  invalidLink: string;
  invalidTitle: string;
  invalidBody: string;
  requestNew: string;
  resetError: string;
  success: string;
  back: string;
}> = {
  fr: {
    title: "Nouveau mot de passe",
    intro: "Choisissez un nouveau mot de passe sécurisé pour votre compte.",
    password: "Nouveau mot de passe",
    passwordPlaceholder: "8 caractères au minimum",
    confirm: "Confirmer le mot de passe",
    confirmPlaceholder: "Saisissez-le une seconde fois",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    submit: "Mettre à jour le mot de passe",
    submitting: "Mise à jour…",
    tooShort: "Choisissez un mot de passe d'au moins 8 caractères.",
    mismatch: "Les deux mots de passe ne correspondent pas.",
    invalidLink: "Lien invalide ou expiré — redemandez un e-mail de réinitialisation.",
    invalidTitle: "Ce lien n’est plus valide",
    invalidBody: "Les liens de réinitialisation expirent après un moment et ne fonctionnent qu’une seule fois.",
    requestNew: "Demander un nouveau lien",
    resetError: "Échec de la réinitialisation.",
    success: "Mot de passe mis à jour. Redirection vers la connexion…",
    back: "Retour à la connexion",
  },
  "ar-td": {
    title: "كلمة مرور جديدة",
    intro: "اختار كلمة مرور جديدة وآمنة لحسابك.",
    password: "كلمة المرور الجديدة",
    passwordPlaceholder: "على الأقل 8 حروف",
    confirm: "أكد كلمة المرور",
    confirmPlaceholder: "اكتبها مرة تانية",
    showPassword: "ورّيني كلمة المرور",
    hidePassword: "خبّي كلمة المرور",
    submit: "حدّث كلمة المرور",
    submitting: "جاري التحديث…",
    tooShort: "اختار كلمة مرور فيها 8 حروف على الأقل.",
    mismatch: "كلمتا المرور ما متطابقات.",
    invalidLink: "الرابط ما صالح أو انتهى — اطلب رابط جديد.",
    invalidTitle: "الرابط دا ما عاد صالح",
    invalidBody: "روابط تغيير كلمة المرور بتنتهي بعد فترة وبتشتغل مرة واحدة بس.",
    requestNew: "اطلب رابط جديد",
    resetError: "تغيير كلمة المرور ما تم.",
    success: "تم تحديث كلمة المرور. حنرجعك لصفحة الدخول…",
    back: "ارجع للدخول",
  },
  ar: {
    title: "كلمة مرور جديدة",
    intro: "اختر كلمة مرور جديدة وآمنة لحسابك.",
    password: "كلمة المرور الجديدة",
    passwordPlaceholder: "8 أحرف على الأقل",
    confirm: "تأكيد كلمة المرور",
    confirmPlaceholder: "أدخلها مرة أخرى",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    submit: "تحديث كلمة المرور",
    submitting: "جارٍ التحديث…",
    tooShort: "اختر كلمة مرور تتكون من 8 أحرف على الأقل.",
    mismatch: "كلمتا المرور غير متطابقتين.",
    invalidLink: "الرابط غير صالح أو منتهي الصلاحية — اطلب رسالة إعادة تعيين جديدة.",
    invalidTitle: "هذا الرابط لم يعد صالحًا",
    invalidBody: "تنتهي صلاحية روابط إعادة تعيين كلمة المرور بعد فترة، ولا تعمل إلا مرة واحدة.",
    requestNew: "طلب رابط جديد",
    resetError: "تعذر إعادة تعيين كلمة المرور.",
    success: "تم تحديث كلمة المرور. جارٍ تحويلك إلى صفحة تسجيل الدخول…",
    back: "العودة إلى تسجيل الدخول",
  },
  en: {
    title: "New password",
    intro: "Choose a new secure password for your account.",
    password: "New password",
    passwordPlaceholder: "At least 8 characters",
    confirm: "Confirm password",
    confirmPlaceholder: "Enter it again",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submit: "Update password",
    submitting: "Updating…",
    tooShort: "Choose a password with at least 8 characters.",
    mismatch: "The passwords do not match.",
    invalidLink: "Invalid or expired link — request a new password reset email.",
    invalidTitle: "This link is no longer valid",
    invalidBody: "Password reset links expire after a while and can only be used once.",
    requestNew: "Request a new link",
    resetError: "Password reset failed.",
    success: "Password updated. Redirecting to sign in…",
    back: "Back to sign in",
  },
};

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

/** Supabase place le jeton de récupération dans le fragment d'URL. On le lit
 * exclusivement côté client. Une fois récupéré, on enlève le fragment de la
 * barre d'adresse afin d'éviter qu'un jeton sensible reste visible ou soit
 * recopié par erreur. */
function useRecoveryToken(): { token: string | null; ready: boolean } {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const recoveryToken = params.get("access_token");
    setToken(recoveryToken);
    setReady(true);

    if (recoveryToken && window.location.hash) {
      window.history.replaceState(
        null,
        document.title,
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  return { token, ready };
}

function ResetPasswordContent() {
  const router = useRouter();
  const { lang } = useLang();
  const text = COPY[lang];
  const { token, ready } = useRecoveryToken();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(text.tooShort);
      return;
    }
    if (password !== confirm) {
      setError(text.mismatch);
      return;
    }
    if (!token) {
      setError(text.invalidLink);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      window.setTimeout(() => router.push("/login/"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.resetError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPremium titre={text.title} intro={text.intro} langueActive>
      {done ? (
        <div className="auth-info" role="status" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <IconeInfo />
          <span>{text.success}</span>
        </div>
      ) : (
        <>
          {ready && !token && (
            <div className="auth-erreur" role="alert">
              <IconeAlerte />
              <span>
                <strong>{text.invalidTitle}</strong><br />
                {text.invalidBody}{" "}
                <Link href="/forgot/" style={{ color: "var(--auth-accent-2)", textDecoration: "underline" }}>
                  {text.requestNew}
                </Link>
              </span>
            </div>
          )}

          <form onSubmit={submit} className="auth-formulaire">
            <PasswordField
              label={text.password}
              placeholder={text.passwordPlaceholder}
              value={password}
              onChange={setPassword}
              showLabel={text.showPassword}
              hideLabel={text.hidePassword}
            />
            <PasswordField
              label={text.confirm}
              placeholder={text.confirmPlaceholder}
              value={confirm}
              onChange={setConfirm}
              showLabel={text.showPassword}
              hideLabel={text.hidePassword}
            />

            {error && (
              <p className="auth-erreur" role="alert">
                <IconeAlerte />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !ready || !token}
              className="auth-bouton"
            >
              {loading && <span className="auth-rotative" aria-hidden="true" />}
              {loading ? text.submitting : text.submit}
              {!loading && <IconeFleche />}
            </button>
          </form>
        </>
      )}

      <p className="auth-bascule">
        <Link href="/login/">{text.back}</Link>
      </p>
    </AuthPremium>
  );
}

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  showLabel,
  hideLabel,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="auth-champ">
      <span className="auth-etiquette">{label}</span>
      <span className="auth-mdp">
        <IconeCadenas />
        <input
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="auth-saisie"
        />
        <button
          type="button"
          className="auth-oeil"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
        >
          <IconeOeil ouvert={visible} />
        </button>
      </span>
    </label>
  );
}

export default function ResetPasswordPage() {
  return (
    <LangProvider>
      <ResetPasswordContent />
    </LangProvider>
  );
}
