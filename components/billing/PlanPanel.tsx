import { PLAN_CATALOG, type PublicPlanId } from "@/lib/plan-catalog";
import { PriceDisplay } from "./BillingUI";

/** Structure du pack paiement, catalogue et identité visuelle du produit. */
export function PlanPanel({ planId, amount }: { planId: PublicPlanId; amount?: number | null }) {
  const plan = PLAN_CATALOG[planId];
  const price = amount === undefined ? plan.amount : amount;
  return <section className="billing-card billing-plan">
    <div className="billing-plan-top"><div><p className="billing-kicker">Votre offre</p><h2>{plan.publicName}</h2><p className="billing-muted">{planId === "toumai_5" ? "Pour aller plus loin, avec le raisonnement et l’agent navigateur." : "Pour votre quotidien, avec la voix et les connecteurs."}</p></div>
      <div>{price === null ? <p role="status">Vérification du tarif…</p> : <PriceDisplay amount={price} />}<p className="billing-muted">pour 30 jours</p></div></div>
    <ul className="billing-features">{plan.quotas.map(feature => <li key={feature}>{feature}</li>)}</ul>
    <p className="billing-notice">30 jours d’utilisation, renouvellement manuel, sans prélèvement automatique.</p>
  </section>;
}
