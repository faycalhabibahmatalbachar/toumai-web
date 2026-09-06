/**
 * Catalogue public des offres Toumaï AI.
 *
 * Le backend reste l'autorité finale pour le prix et les quotas. Ce catalogue
 * porte uniquement la présentation et les identifiants nécessaires à la
 * navigation ; une carte ne peut donc jamais fournir un montant au checkout.
 */

export type PublicPlanId = "decouverte" | "essentiel" | "toumai_5" | "entreprise";

export type PublicPlan = {
  id: PublicPlanId;
  backendCode: "gratuit" | "essentiel" | "pro" | "entreprise";
  publicName: string;
  amount: number;
  currency: "XAF";
  billingInterval: "month" | null;
  checkoutEnabled: boolean;
  visible: boolean;
  legacyAliases: string[];
  quotas: string[];
};

export const PLAN_CATALOG: Record<PublicPlanId, PublicPlan> = {
  decouverte: {
    id: "decouverte", backendCode: "gratuit", publicName: "Découverte",
    amount: 0, currency: "XAF", billingInterval: null, checkoutEnabled: false,
    visible: true, legacyAliases: ["gratuit", "free"],
    quotas: ["20 messages par jour", "5 images par mois", "3 documents analysés par mois", "1 connecteur", "50 Mo de fichiers"],
  },
  essentiel: {
    id: "essentiel", backendCode: "essentiel", publicName: "Essentiel",
    amount: 3000, currency: "XAF", billingInterval: "month", checkoutEnabled: true,
    visible: true, legacyAliases: [],
    quotas: ["200 messages par jour", "60 images par mois", "40 documents par mois", "30 minutes de voix par mois", "5 connecteurs", "5 automatisations", "500 messages WhatsApp par mois", "1 Go de fichiers"],
  },
  toumai_5: {
    id: "toumai_5", backendCode: "pro", publicName: "Toumaï 5",
    amount: 9000, currency: "XAF", billingInterval: "month", checkoutEnabled: true,
    visible: true, legacyAliases: ["pro", "toumai5"],
    quotas: ["Messages illimités", "Documents illimités", "300 images par mois", "2 h 30 de voix par mois", "200 tâches Agent Navigateur", "Connecteurs illimités", "30 automatisations", "10 Go de fichiers"],
  },
  entreprise: {
    id: "entreprise", backendCode: "entreprise", publicName: "Entreprise",
    amount: 0, currency: "XAF", billingInterval: null, checkoutEnabled: false,
    visible: true, legacyAliases: ["enterprise"],
    quotas: ["Utilisation étendue", "Comptes et rôles gérés", "Facturation sur devis", "Accompagnement au déploiement"],
  },
};

export function publicPlanId(value: string | null | undefined): PublicPlanId | null {
  const candidate = (value ?? "").trim().toLowerCase().replace(/-/g, "_");
  for (const plan of Object.values(PLAN_CATALOG)) {
    if (plan.id === candidate || plan.backendCode === candidate || plan.legacyAliases.includes(candidate)) {
      return plan.id;
    }
  }
  return null;
}

export function checkoutUrl(planId: PublicPlanId): string {
  return `/checkout?plan=${encodeURIComponent(planId)}`;
}

export function registerUrl(planId: PublicPlanId): string {
  return `/register?plan=${encodeURIComponent(planId)}`;
}
