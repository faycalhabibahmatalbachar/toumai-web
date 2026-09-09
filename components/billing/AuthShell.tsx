import type { ReactNode } from "react";
import { BillingShell } from "./BillingUI";
import { PlanPanel } from "./PlanPanel";

export function AuthShell({ children, planId, register = false }: { children: ReactNode; planId: "essentiel" | "toumai_5" | null; register?: boolean }) {
  return <BillingShell step="account"><div className="billing-auth-grid"><div className="billing-auth-intro"><h1>{planId ? "Il ne reste qu’une étape." : "Votre compte Toumaï AI."}</h1><p className="billing-muted">{planId ? `${register ? "Créez votre compte" : "Connectez-vous"} pour retrouver votre offre et continuer vers le paiement sécurisé.` : "Connectez-vous pour retrouver vos conversations, vos documents et vos connecteurs."}</p>{planId && <PlanPanel planId={planId} />}</div><section className="billing-card billing-auth-card">{children}</section></div></BillingShell>;
}
