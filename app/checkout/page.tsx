"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  CreditCard,
  LockKeyhole,
} from "lucide-react";

import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";
import { authFetch } from "@/lib/http";
import { selectedPaymentPlan } from "@/lib/payment-navigation";
import { PLAN_CATALOG, publicPlanId, registerUrl, type PublicPlanId } from "@/lib/plan-catalog";
import { cacheSeed } from "@/lib/swr-cache";
import type { UserProfile } from "@/lib/user-api";

import styles from "./checkout-premium.module.css";

type PaidPlanId = "essentiel" | "toumai_5";
type PaymentState = "loading" | "ready" | "unavailable";

function isPaidPlan(value: PublicPlanId | null): value is PaidPlanId {
  return value === "essentiel" || value === "toumai_5";
}

function formatPrice(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const parsedPlanId = useMemo(() => publicPlanId(searchParams.get("plan")), [searchParams]);
  const planId = isPaidPlan(parsedPlanId) ? parsedPlanId : null;
  const plan = planId ? PLAN_CATALOG[planId] : null;

  const [paymentState, setPaymentState] = useState<PaymentState>("loading");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverPrice, setServerPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  /* Ce que le serveur déclare RÉELLEMENT payable. L’activation du compte
   * Moneroo n’y suffit pas : il faut une passerelle carte ou crypto branchée.
   * Sans elle, afficher « Visa · Mastercard » serait une promesse creuse. */
  const [moyens, setMoyens] = useState<{ carte: boolean; crypto: boolean }>({ carte: false, crypto: false });
  const [accountEmail] = useState(() => cacheSeed<UserProfile>("user:profile")?.email?.trim() ?? "");
  const checkoutLock = useRef(false);

  useEffect(() => {
    const resetAfterBackNavigation = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      checkoutLock.current = false;
      setLoading(false);
    };
    window.addEventListener("pageshow", resetAfterBackNavigation);
    return () => window.removeEventListener("pageshow", resetAfterBackNavigation);
  }, []);

  useEffect(() => {
    if (authLoading || !planId) return;

    selectedPaymentPlan(new URLSearchParams(`plan=${planId}`));
    if (!session) {
      router.replace(registerUrl(planId));
      return;
    }

    let active = true;
    const priceRequest = fetch(`${API_BASE}/abonnements/plans`)
      .then((response) => response.json())
      .then((body) => {
        const row = body?.data?.plans?.find((candidate: { code: string }) => candidate.code === PLAN_CATALOG[planId].backendCode);
        if (!active) return;
        if (typeof row?.prix_xaf !== "number" || !Number.isFinite(row.prix_xaf) || row.prix_xaf <= 0) {
          throw new Error("Prix indisponible");
        }
        setServerPrice(row.prix_xaf);
      })
      .catch(() => {
        if (active) setPriceError(true);
      });

    const paymentRequest = fetch(`${API_BASE}/paiements/etat`)
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        const moneroo = payload?.data?.moneroo;
        const estSandbox = moneroo?.mode === "sandbox";
        const declares = { carte: moneroo?.moyens?.carte === true, crypto: moneroo?.moyens?.crypto === true };
        setSandbox(estSandbox);
        setMoyens(declares);
        // En live, le bouton n’apparaît que si au moins un moyen est branché :
        // sinon la page Moneroo s’ouvrirait sans rien à payer.
        const payable = estSandbox || declares.carte || declares.crypto;
        setPaymentState(moneroo?.configure && payable ? "ready" : "unavailable");
      })
      .catch(() => {
        if (active) setPaymentState("unavailable");
      });

    void Promise.allSettled([priceRequest, paymentRequest]);
    return () => {
      active = false;
    };
  }, [authLoading, planId, router, session]);

  async function continueToPayment() {
    if (!plan || checkoutLock.current || serverPrice === null || priceError || paymentState !== "ready") return;

    checkoutLock.current = true;
    setLoading(true);
    setServerError("");

    try {
      const response = await authFetch("/paiements/souscrire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Le navigateur ne transmet que l’identifiant public. Le backend reste
        // l’autorité pour le montant XAF, l’idempotence et la création Moneroo.
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false || !payload?.data?.url_paiement) {
        throw new Error(payload?.message || "Le paiement ne peut pas être ouvert pour le moment.");
      }
      window.location.assign(payload.data.url_paiement as string);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Le paiement ne peut pas être ouvert pour le moment.");
      setLoading(false);
      checkoutLock.current = false;
    }
  }

  if (!plan || !planId) {
    return (
      <CheckoutShell>
        <section className={styles.emptyState}>
          <Logo size={48} />
          <h1>Cette offre ne se paie pas ici.</h1>
          <p>Choisissez Essentiel ou Toumaï 5, ou contactez notre équipe pour une offre Entreprise.</p>
          <Link href="/#tarifs" className={styles.payButton}>Voir les offres</Link>
        </section>
      </CheckoutShell>
    );
  }

  const displayedPrice = serverPrice ?? plan.amount;
  const formattedPrice = formatPrice(displayedPrice);
  const checkoutPlanName = planId === "essentiel" ? "Toumaï AI Essentiel" : "Toumaï 5";

  return (
    <CheckoutShell>
      <section className={styles.checkoutLayout}>
        <div className={styles.leftColumn}>
          <div className={styles.leftInner}>
            <header className={styles.brandRow}>
              <Link href="/#tarifs" className={styles.backButton} aria-label="Retour aux offres"><ArrowLeft size={20} /></Link>
              <Link href="/" className={styles.brand}>
                <Logo size={38} className={styles.logo} />
                <span>Toumaï AI</span>
              </Link>
            </header>

            <div className={styles.offerIntro}>
              <p>S’abonner à {checkoutPlanName}</p>
              <div className={styles.heroPrice}>
                <strong>{formattedPrice}</strong>
                <span>pour<br />30 jours</span>
              </div>
            </div>

            <dl className={styles.orderSummary}>
              <div className={styles.planRow}>
                <dt><strong>{checkoutPlanName}</strong><span>30 jours</span></dt>
                <dd>{formattedPrice}</dd>
              </div>
              <div><dt>Sous-total</dt><dd>{formattedPrice}</dd></div>
              <div className={styles.taxRow}><dt>Taxes <span className={styles.infoMark}>i</span></dt><dd>Aucune taxe ajoutée</dd></div>
              <div className={styles.totalRow}><dt>Total à payer</dt><dd>{formattedPrice}</dd></div>
            </dl>

            <footer className={styles.leftFooter}>
              <span><LockKeyhole size={13} /> Paiement sécurisé</span>
              <Link href="/terms/">Conditions</Link>
              <Link href="/privacy/">Confidentialité</Link>
            </footer>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.rightInner}>
            <section className={styles.formSection}>
              <h1>Informations de contact</h1>
              <label className={styles.srOnly} htmlFor="checkout-email">Email</label>
              <div className={styles.inputGroup}>
                <span>Email</span>
                <input
                  id="checkout-email"
                  type="email"
                  value={accountEmail}
                  placeholder="Adresse e-mail du compte connecté"
                  readOnly
                />
              </div>
            </section>

            <section className={styles.formSection}>
              <h2>Paiement</h2>
              {sandbox ? (
                <>
                  <p className={styles.fieldLabel}>Environnement de test</p>
                  <p className={styles.activationNote}>Simulation Moneroo uniquement. Aucun paiement réel, carte et crypto non branchées.</p>
                </>
              ) : moyens.carte || moyens.crypto ? (
                <>
                  <p className={styles.fieldLabel}>Moyens acceptés</p>
                  <div className={styles.paymentOptions}>
                    {moyens.carte ? <div className={styles.paymentOption}><CreditCard size={22} /><strong>Carte bancaire</strong><span>Visa · Mastercard</span></div> : null}
                    {moyens.crypto ? <div className={styles.paymentOption}><Coins size={22} /><strong>Cryptomonnaie</strong><span>Réglée en XAF</span></div> : null}
                  </div>
                  <p className={styles.activationNote}>Vous choisirez le moyen sur la page sécurisée Moneroo.</p>
                </>
              ) : (
                <p className={styles.activationNote}>Les moyens de paiement en ligne sont en cours de branchement.</p>
              )}
            </section>

            <p className={styles.legalCopy}>
              En continuant, vous acceptez les <Link href="/terms/">Conditions d’utilisation</Link> et la <Link href="/privacy/">Politique de confidentialité</Link> de Toumaï AI.
            </p>

            {paymentState === "loading" ? <p className={styles.statusText} role="status">Préparation du paiement…</p> : null}
            {paymentState === "unavailable" ? (
              <div className={styles.unavailableBox} role="status">
                <strong>Le paiement en ligne n’est pas encore ouvert.</strong>
                <p>Le bouton sera activé dès que la passerelle sera prête.</p>
              </div>
            ) : null}
            {priceError ? <div className={styles.errorBox} role="alert">Le tarif n’a pas pu être vérifié. Rechargez la page pour réessayer.</div> : null}
            {serverError ? <div className={styles.errorBox} role="alert">{serverError}</div> : null}

            {paymentState === "ready" ? (
              <button
                type="button"
                className={styles.payButton}
                onClick={continueToPayment}
                disabled={loading || serverPrice === null || priceError}
              >
                <span>{loading ? "Préparation du paiement…" : `${sandbox ? "Tester" : "Payer"} ${formattedPrice}`}</span>
                {loading ? null : <ArrowRight size={20} />}
              </button>
            ) : null}

            <div className={styles.secureFooter}><LockKeyhole size={14} /> Vos informations de paiement sont protégées par Moneroo.</div>
          </div>
        </div>
      </section>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: ReactNode }) {
  return <main className={styles.page}>{children}</main>;
}

function CheckoutLoading() {
  return (
    <CheckoutShell>
      <section className={styles.emptyState} role="status">
        <Logo size={48} />
        <h1>Préparation de votre offre…</h1>
      </section>
    </CheckoutShell>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<CheckoutLoading />}><CheckoutContent /></Suspense>;
}
