"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  CreditCard,
  FileText,
  Globe2,
  Headphones,
  HelpCircle,
  Image as ImageIcon,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Workflow,
  Zap,
  type LucideProps,
} from "lucide-react";

import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";
import { authFetch } from "@/lib/http";
import { selectedPaymentPlan } from "@/lib/payment-navigation";
import { PLAN_CATALOG, publicPlanId, registerUrl, type PublicPlanId } from "@/lib/plan-catalog";

import styles from "./checkout-premium.module.css";

type PaidPlanId = "essentiel" | "toumai_5";
type PaymentState = "loading" | "ready" | "unavailable";
type FeatureIcon = ComponentType<LucideProps>;

const PLAN_PRESENTATION: Record<PaidPlanId, {
  accent: string;
  description: string;
  icons: FeatureIcon[];
}> = {
  essentiel: {
    accent: "Essentiel",
    description: "Pour un usage quotidien de Toumaï AI avec plus de messages, de fichiers et d’outils.",
    icons: [Bot, ImageIcon, FileText, Headphones, Globe2, Workflow, Zap, WalletCards],
  },
  toumai_5: {
    accent: "Le plus complet",
    description: "Pour les usages avancés, avec plus de raisonnement, d’automatisation et l’agent navigateur.",
    icons: [Bot, FileText, ImageIcon, Headphones, Sparkles, Globe2, Workflow, WalletCards],
  },
};

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
  const presentation = planId ? PLAN_PRESENTATION[planId] : null;

  const [paymentState, setPaymentState] = useState<PaymentState>("loading");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverPrice, setServerPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [sandbox, setSandbox] = useState(false);
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
        setSandbox(payload?.data?.moneroo?.mode === "sandbox");
        setPaymentState(payload?.data?.moneroo?.configure ? "ready" : "unavailable");
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

  if (!plan || !presentation) {
    return (
      <PremiumShell>
        <section className={styles.emptyState}>
          <Logo size={48} />
          <h1>Cette offre ne se paie pas ici.</h1>
          <p>Choisissez Essentiel ou Toumaï 5, ou contactez notre équipe pour une offre Entreprise.</p>
          <Link href="/#tarifs" className={styles.payButton}>Voir les offres</Link>
        </section>
      </PremiumShell>
    );
  }

  const displayedPrice = serverPrice ?? plan.amount;
  const formattedPrice = formatPrice(displayedPrice);

  return (
    <PremiumShell>
      <div className={styles.progressShell}>
        <div className={styles.progressInner}>
          <Link href="/#tarifs" className={styles.backLink}>
            <ArrowLeft size={15} /> Retour aux offres
          </Link>
          <div className={styles.steps} aria-label="Étapes de souscription">
            <div className={`${styles.step} ${styles.stepDone}`}><span className={styles.stepIndex}>1</span><span>Compte</span></div>
            <span className={styles.stepLine} aria-hidden="true" />
            <div className={`${styles.step} ${styles.stepActive}`} aria-current="step"><span className={styles.stepIndex}>2</span><span>Paiement</span></div>
            <span className={styles.stepLine} aria-hidden="true" />
            <div className={styles.step}><span className={styles.stepIndex}>3</span><span>Confirmation</span></div>
          </div>
        </div>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroBadge}><Sparkles size={14} /> Abonnement Toumaï AI</div>
        <h1>Vérifiez votre offre avant de payer.</h1>
        <p>Tout est résumé ici : votre plan, ce qu’il inclut et le montant à régler. Ensuite, Moneroo prend le relais pour le paiement sécurisé.</p>
      </section>

      <section className={styles.checkoutGrid}>
        <div className={styles.leftColumn}>
          <article className={`${styles.card} ${styles.planCard}`}>
            <div className={styles.planHeader}>
              <div>
                <div className={styles.kicker}>Votre offre</div>
                <div className={styles.planTitleRow}>
                  <h2>{plan.publicName}</h2>
                  <span className={styles.planBadge}>{presentation.accent}</span>
                </div>
                <p className={styles.planDescription}>{presentation.description}</p>
              </div>
              <div className={styles.planPrice}>
                <strong>{formattedPrice}</strong>
                <span>pour 30 jours</span>
              </div>
            </div>

            <div className={styles.divider} />
            <div className={styles.featureGrid}>
              {plan.quotas.map((label, index) => {
                const Icon = presentation.icons[index] ?? Check;
                return (
                  <div key={label} className={styles.featureItem}>
                    <div className={styles.featureIcon}><Icon size={16} strokeWidth={1.9} /></div>
                    <span>{label}</span>
                    <Check size={16} className={styles.featureCheck} />
                  </div>
                );
              })}
            </div>

            <div className={styles.renewalBox}>
              <BadgeCheck size={18} />
              <div><strong>30 jours d’utilisation</strong><span>Renouvellement manuel, sans prélèvement automatique.</span></div>
            </div>
          </article>

          <div className={styles.trustGrid}>
            <div className={styles.trustCard}>
              <ShieldCheck size={21} />
              <div><strong>Paiement vérifié</strong><span>Le plan n’est activé qu’après confirmation côté serveur.</span></div>
            </div>
            <div className={styles.trustCard}>
              <LockKeyhole size={21} />
              <div><strong>Données protégées</strong><span>Toumaï AI ne conserve pas les informations complètes de paiement.</span></div>
            </div>
          </div>
        </div>

        <aside className={`${styles.card} ${styles.summaryCard}`}>
          <div className={styles.summaryHeader}>
            <div><span className={styles.summaryEyebrow}>Récapitulatif</span><h3>Votre abonnement</h3></div>
            <CreditCard size={21} />
          </div>
          <div className={styles.divider} />
          <dl className={styles.summaryList}>
            <div><dt>Plan</dt><dd>{plan.publicName}</dd></div>
            <div><dt>Durée</dt><dd>30 jours</dd></div>
            <div><dt>Devise</dt><dd>XAF · Franc CFA</dd></div>
            <div><dt>Renouvellement</dt><dd>Manuel</dd></div>
          </dl>

          <div className={styles.totalBlock}>
            <span>Total à régler</span>
            <div className={styles.totalPrice}>{formattedPrice}</div>
            <small>Accès pendant 30 jours, sans prélèvement automatique.</small>
          </div>

          <div className={styles.paymentMethods}>
            <div className={styles.paymentMethodsTitle}>Paiement traité via Moneroo</div>
            <div className={styles.methodPill}>Moyens disponibles proposés sur la page sécurisée</div>
            <p>Les options de paiement dépendent de la devise, de l’environnement et de la configuration active chez Moneroo.</p>
          </div>

          {sandbox && (
            <div className={styles.sandboxNotice}>
              <div className={styles.sandboxIcon}>T</div>
              <div><strong>Mode test Moneroo</strong><p>La passerelle simule le paiement sans débit réel. Aucun abonnement commercial ni reçu réel ne sera créé.</p></div>
            </div>
          )}

          {paymentState === "loading" && <p className={styles.statusText} role="status">Préparation du paiement…</p>}
          {paymentState === "unavailable" && (
            <div className={styles.unavailableBox} role="status">
              <strong>Le paiement en ligne n’est pas encore ouvert.</strong>
              <p>Votre compte reste disponible. Le bouton sera activé dès que la passerelle de paiement sera prête.</p>
            </div>
          )}
          {priceError && (
            <div className={styles.errorBox} role="alert">
              Le tarif n’a pas pu être vérifié auprès du serveur. Rechargez la page pour réessayer.
            </div>
          )}
          {serverError && <div className={styles.errorBox} role="alert">{serverError}</div>}

          {paymentState === "ready" && (
            <button
              type="button"
              className={styles.payButton}
              onClick={continueToPayment}
              disabled={loading || serverPrice === null || priceError}
            >
              <span>{loading ? "Préparation du paiement…" : `${sandbox ? "Tester" : "Continuer"} — ${formattedPrice}`}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          )}
          <div className={styles.secureFooter}><LockKeyhole size={14} /> Paiement sécurisé via Moneroo</div>
        </aside>
      </section>
    </PremiumShell>
  );
}

function PremiumShell({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <div className={styles.logoWrap}><Logo size={42} className={styles.logo} /></div>
            <div><div className={styles.brandName}>Toumaï AI</div><div className={styles.brandMeta}>Intelligence artificielle</div></div>
          </Link>
          <Link href="/contact/" className={styles.helpLink}><HelpCircle size={15} /> Besoin d’aide ?</Link>
        </div>
      </header>
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}><strong>Toumaï AI</strong><span>À vos côtés, à chaque étape.</span></div>
        <nav aria-label="Liens légaux">
          <Link href="/privacy/">Confidentialité</Link><Link href="/terms/">Conditions</Link><Link href="/security/">Sécurité</Link><Link href="/contact/">Contact</Link>
        </nav>
      </footer>
    </main>
  );
}

function PremiumLoading() {
  return (
    <PremiumShell>
      <section className={styles.emptyState} role="status">
        <Logo size={48} />
        <h1>Préparation de votre offre…</h1>
      </section>
    </PremiumShell>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<PremiumLoading />}><CheckoutContent /></Suspense>;
}
