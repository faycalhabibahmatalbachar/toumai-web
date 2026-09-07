import type { ReactNode } from "react";
import { BillingShell } from "./BillingUI";
import { PlanPanel } from "./PlanPanel";

export function AuthShell({ children, planId, register = false }: { children: ReactNode; planId: "essentiel" | "toumai_5" | null; register?: boolean }) {
  return <BillingShell step="account"><div className="billing-auth-grid"><div className="billing-auth-intro"><p className="billing-kicker">Votre espace Toumaï AI</p><h1>{planId ? "Votre prochaine étape commence ici." : "Vos idées méritent un espace."}</h1><p className="billing-muted">{planId ? `${register ? "Créez votre compte" : "Connectez-vous"} pour retrouver votre offre et continuer vers le paiement sécurisé.` : "Écrivez, cherchez, créez. Retrouvez vos conversations et vos outils dans un seul espace."}</p>{planId && <PlanPanel planId={planId} />}</div><section className="billing-card billing-auth-card">{children}</section></div></BillingShell>;
}
