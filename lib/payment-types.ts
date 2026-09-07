export type Payment = { reference: string; statut: string; plan_code: string; montant_xaf: number; devise: string; environnement?: "sandbox" | "live"; created_at?: string; cree_le?: string };
export type AccountQuota = { utilise: number; plafond: number; illimite: boolean; fenetre: string; remise_a_zero_le: string | null };
export function paymentDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}
