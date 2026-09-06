"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Logo } from "@/components/Logo";
import { BillingShell, BillingLoading, PriceDisplay } from "@/components/billing/BillingUI";
import { authHeaders } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";
import { PLAN_CATALOG, publicPlanId, registerUrl, type PublicPlanId } from "@/lib/plan-catalog";

type Etat = "loading" | "ready" | "unavailable" | "error";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const planId = useMemo(() => publicPlanId(searchParams.get("plan")), [searchParams]);
  const [etat, setEtat] = useState<Etat>("loading");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [prixServeur, setPrixServeur] = useState<number | null>(null);
  const [sandbox, setSandbox] = useState(false);

  const plan = planId && PLAN_CATALOG[planId];
  const planPayant = planId === "essentiel" || planId === "toumai_5";

  useEffect(() => {
    if (authLoading || !planPayant) return;
    if (!session || session.is_guest) {
      router.replace(registerUrl(planId as PublicPlanId));
      return;
    }
    let actif = true;
    fetch(`${API_BASE}/abonnements/plans`).then(r => r.json()).then(body => {
      const row = body?.data?.plans?.find((p: {code:string}) => p.code === PLAN_CATALOG[planId as PublicPlanId].backendCode);
      if (actif && typeof row?.prix_xaf === "number") setPrixServeur(row.prix_xaf);
    }).catch(() => {});
    fetch(`${API_BASE}/paiements/etat`)
      .then((r) => r.json())
      .then((charge) => {
        if (!actif) return;
        setSandbox(charge?.data?.moneroo?.mode === "sandbox");
        setEtat(charge?.data?.moneroo?.configure ? "ready" : "unavailable");
      })
      .catch(() => actif && setEtat("unavailable"));
    return () => { actif = false; };
  }, [authLoading, planId, planPayant, router, session]);

  async function payer() {
    if (!plan || !planPayant) return;
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`${API_BASE}/paiements/souscrire`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        // Le navigateur envoie l'identifiant public seulement. Le backend
        // résout lui-même le code DB, le montant XAF et l'adresse du compte.
        body: JSON.stringify({ plan_code: plan.id }),
      });
      const charge = await response.json().catch(() => ({}));
      if (!response.ok || charge?.success === false || !charge?.data?.url_paiement) {
        throw new Error(charge?.message || "Le paiement ne peut pas être ouvert pour le moment.");
      }
      window.location.assign(charge.data.url_paiement as string);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "Le paiement ne peut pas être ouvert pour le moment.");
      setEnvoi(false);
    }
  }

  if (!plan || !planPayant) {
    return <EtatSimple titre="Cette offre ne se paie pas ici." texte="Les offres Entreprise sont préparées avec notre équipe. Les autres offres restent accessibles gratuitement." />;
  }

  return (
    <section className="billing-card billing-state">
      <Logo size={44} />
      <p className="mt-6 text-sm text-[var(--text-secondary)]">Votre choix</p>
      <h1 className="mt-1 text-3xl font-semibold">{plan.publicName}</h1>
      {prixServeur !== null ? <PriceDisplay amount={prixServeur}/> : <p role="status">Chargement du prix…</p>}
      <p className="billing-muted">XAF · accès pendant 30 jours · renouvellement manuel</p>
      <ul className="billing-features">{plan.quotas.map(q => <li key={q}>{q}</li>)}</ul>
      <p className="mt-3 max-w-md text-sm text-[var(--text-secondary)]">
        Vérifiez votre offre, puis continuez vers Moneroo pour le paiement.
      </p>

      {etat === "loading" && <p className="mt-8 text-sm text-[var(--text-secondary)]">Préparation du paiement…</p>}
      {sandbox && <p className="billing-notice">Mode test Moneroo. Les paiements réels ne sont pas encore ouverts. N’utilisez pas de moyen de paiement réel.</p>}
      {etat === "ready" && (
        <button onClick={payer} disabled={envoi || prixServeur === null} className="billing-button billing-button-primary mt-8">
          {envoi ? "Ouverture sécurisée…" : `${sandbox ? "Tester" : "Continuer"} — ${prixServeur?.toLocaleString("fr-FR")} FCFA`}
        </button>
      )}
      {etat === "unavailable" && (
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left text-sm">
          <p className="font-semibold">Le paiement en ligne n’est pas encore ouvert.</p>
          <p className="mt-2 text-[var(--text-secondary)]">Votre compte et vos conversations restent disponibles. Nous activerons ce bouton après la validation complète du prestataire de paiement.</p>
        </div>
      )}
      {erreur && <p role="alert" className="mt-5 text-sm text-[var(--error)]">{erreur}</p>}
      <Link href="/#tarifs" className="mt-8 text-sm underline underline-offset-4">Revenir aux offres</Link>
    </section>
  );
}

function EtatSimple({ titre, texte }: { titre: string; texte: string }) {
  return <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center gap-5 px-6 text-center"><Logo size={44} /><h1 className="text-2xl font-semibold">{titre}</h1><p className="text-sm text-[var(--text-secondary)]">{texte}</p><Link href="/contact" className="tm-btn tm-btn-primary">Nous contacter</Link></main>;
}

export default function CheckoutPage() {
  return <BillingShell><Suspense fallback={<BillingLoading />}><CheckoutContent /></Suspense></BillingShell>;
}
