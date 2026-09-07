"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { http } from "@/lib/http";
import { PLAN_CATALOG, publicPlanId } from "@/lib/plan-catalog";
import { BillingShell, BillingLoading, PriceDisplay } from "@/components/billing/BillingUI";

type Billing = {
  plan: { code: string; nom: string; prix_xaf: number };
  abonnement: { actif: boolean; debut_le: string | null; fin_le: string | null };
};

function AccountBilling() {
  const [result, setResult] = useState<{data?: Billing; error?: boolean}>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    http.get<Billing>("/abonnements/moi").then(data => {
      if (!data?.plan || !data.abonnement || !Number.isFinite(data.plan.prix_xaf)) throw new Error("Invalid billing response");
      if (active) setResult({data});
    }).catch(() => { if (active) setResult({error: true}); });
    return () => { active = false; };
  }, [attempt]);

  if (result.error) return <section className="billing-card" role="alert"><h1>Les informations sont indisponibles.</h1><p>Votre offre n’a pas été modifiée. Réessayez dans quelques instants.</p><div className="billing-actions"><button className="billing-button" onClick={() => {setResult({}); setAttempt(n => n + 1);}}>Réessayer</button></div></section>;
  if (!result.data) return <BillingLoading />;
  const {plan, abonnement} = result.data;
  const planId = publicPlanId(plan.code);
  const planName = planId ? PLAN_CATALOG[planId].publicName : plan.nom;
  return <div className="billing-grid">
    <section className="billing-card">
      <p className="billing-kicker">Plan et facturation</p><h1>{planName}</h1>
      <PriceDisplay amount={plan.prix_xaf} />
      <p className="billing-muted">{plan.prix_xaf > 0 ? "XAF · tarif du catalogue pour 30 jours" : "Votre offre gratuite"}</p>
      <dl className="billing-summary">
        <div><dt>Statut</dt><dd>{abonnement.actif ? "Actif" : "Offre par défaut"}</dd></div>
        {abonnement.debut_le && <div><dt>Début</dt><dd>{new Date(abonnement.debut_le).toLocaleDateString("fr-FR")}</dd></div>}
        {abonnement.fin_le && <div><dt>Fin de validité</dt><dd>{new Date(abonnement.fin_le).toLocaleDateString("fr-FR")}</dd></div>}
      </dl>
      <Link href="/usage" className="billing-button">Consulter mes quotas</Link>
    </section>
    <section className="billing-card">
      <h2>À votre rythme.</h2>
      <p className="billing-muted">Le renouvellement est manuel. Aucun prochain prélèvement automatique n’est programmé. Pour changer d’offre, consultez les tarifs et vérifiez votre commande avant de payer.</p>
      <div className="billing-actions"><Link className="billing-button billing-button-primary" href="/#tarifs">Voir les offres</Link><Link className="billing-button" href="/contact">Une question sur votre paiement ?</Link></div>
    </section>
  </div>;
}

export default function BillingPage() {
  const {session, loading} = useAuth();
  return <BillingShell>{loading ? <BillingLoading /> : !session || session.is_guest ? <section className="billing-card"><p className="billing-kicker">Votre compte</p><h1>Plan et facturation</h1><p className="billing-muted">Connectez-vous pour retrouver votre offre et sa période de validité.</p><div className="billing-actions"><Link href="/login?next=%2Fbilling" className="billing-button billing-button-primary">Se connecter</Link></div></section> : <AccountBilling key={session.user_id} />}</BillingShell>;
}
