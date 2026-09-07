import Link from "next/link";
import type { AccountQuota } from "@/lib/payment-types";

export function AccountQuotas({ quotas }: { quotas?: Record<string, AccountQuota> }) {
  const labels: Record<string,string> = { messages: "Messages / jour", images: "Images / mois", documents: "Documents / mois", voix_sec: "Voix / mois (secondes)", agent_taches: "Tâches de l’agent", stockage_mo: "Fichiers (Mo)" };
  const entries = Object.entries(labels).filter(([key]) => quotas?.[key]);
  return <section className="billing-card"><h2>Votre utilisation</h2>{entries.length ? <div className="billing-usage-grid">{entries.map(([key,label]) => {
    const q = quotas![key];
    return <div className="billing-usage" key={key}><p className="billing-muted">{label}</p><p><strong>{q.utilise.toLocaleString("fr-FR")}</strong> / {q.illimite ? "Illimité" : q.plafond.toLocaleString("fr-FR")}</p>{!q.illimite && q.plafond > 0 && <progress aria-label={label} value={Math.max(0,Math.min(q.utilise,q.plafond))} max={q.plafond}/>}</div>;
  })}</div> : <p className="billing-muted">Les quotas ne sont pas disponibles pour le moment.</p>}<div className="billing-actions"><Link href="/usage" className="billing-button">Tous mes quotas et dates de remise à zéro ↗</Link></div></section>;
}
