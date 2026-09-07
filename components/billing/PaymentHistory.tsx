"use client";
import { useEffect, useState } from "react";
import { http } from "@/lib/http";
import { PLAN_CATALOG, publicPlanId } from "@/lib/plan-catalog";
import { paymentDate, type Payment } from "@/lib/payment-types";
import { StatusBadge } from "./BillingUI";

export function PaymentHistory() {
  const [result, setResult] = useState<{paiements: Payment[]; has_more: boolean} | null>(null);
  const [error, setError] = useState(false);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    http.get<{paiements: Payment[]; has_more: boolean}>(`/paiements/historique?offset=${offset}&limite=20`).then(data => {
      if (!Array.isArray(data?.paiements)) throw new Error("Historique indisponible");
      if (active) setResult(data);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [offset, attempt]);
  function move(value: number) { setResult(null); setError(false); setOffset(value); }
  return <section className="billing-card"><h2>Historique des paiements</h2><p className="billing-muted">Vos transactions et leurs reçus, réunis ici.</p>
    {error ? <div role="alert"><p>L’historique ne peut pas être chargé pour le moment.</p><button className="billing-button" onClick={() => {setError(false);setAttempt(n => n + 1);}}>Réessayer</button></div> : !result ? <p role="status">Chargement des transactions…</p> : result.paiements.length === 0 ? <p className="billing-notice">Aucun paiement à afficher.</p> : <div className="billing-table-wrap"><table className="billing-table"><caption className="sr-only">Transactions de votre compte</caption><thead><tr><th scope="col">Date</th><th scope="col">Plan</th><th scope="col">Montant</th><th scope="col">Statut</th><th scope="col">Document</th></tr></thead><tbody>{result.paiements.map(p => {
      const id = publicPlanId(p.plan_code);
      return <tr key={p.reference}><td>{paymentDate(p.created_at)}</td><td>{id ? PLAN_CATALOG[id].publicName : p.plan_code}</td><td>{p.montant_xaf.toLocaleString("fr-FR")} {p.devise === "XAF" ? "FCFA" : p.devise}</td><td><StatusBadge status={p.statut}/></td><td>{p.statut === "success" ? <a href={`/recu/${encodeURIComponent(p.reference)}/`}>Voir le reçu</a> : p.statut === "test_success" ? "Aucun reçu réel" : <a href={`/abonnement/retour/?ref=${encodeURIComponent(p.reference)}`}>Voir le paiement</a>}</td></tr>;
    })}</tbody></table></div>}
    <div className="billing-actions">{offset > 0 && <button className="billing-button" onClick={() => move(Math.max(0,offset - 20))}>Précédent</button>}{result?.has_more && <button className="billing-button" onClick={() => move(offset + 20)}>Suivant</button>}</div>
  </section>;
}
