"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePaymentLocation } from "@/hooks/use-payment-navigation";
import { useAuth } from "@/lib/auth-context";
import { http } from "@/lib/http";
import { PLAN_CATALOG, publicPlanId } from "@/lib/plan-catalog";
import { paymentDate, type Payment } from "@/lib/payment-types";
import { BillingShell, BillingLoading, PriceDisplay, StatusBadge } from "@/components/billing/BillingUI";

function Receipt({ reference }: { reference: string }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    // This endpoint enforces ownership on the server before exposing any data.
    http.get<Payment>(`/paiements/intention/${encodeURIComponent(reference)}`).then(data => {
      if (data?.reference !== reference || !Number.isFinite(data.montant_xaf)) throw new Error("Reçu indisponible");
      if (active) setPayment(data);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [reference]);
  if (error) return <section className="billing-card billing-state" role="alert"><h1>Reçu indisponible.</h1><p>Vérifiez que vous êtes connecté au compte ayant effectué ce paiement.</p><div className="billing-actions"><button className="billing-button" onClick={() => window.location.reload()}>Réessayer</button><Link href="/billing" className="billing-button">Ma facturation</Link></div></section>;
  if (!payment) return <BillingLoading/>;
  if (payment.statut !== "success") return <section className="billing-card billing-state"><StatusBadge status={payment.statut}/><h1>{payment.statut === "test_success" ? "Cette opération était un test." : "Le reçu n’est pas encore disponible."}</h1><p>{payment.statut === "test_success" ? "Aucun paiement réel n’a été reçu et aucun reçu commercial ne peut être émis." : "Un reçu est émis uniquement pour un paiement confirmé."}</p><Link className="billing-button" href={payment.statut === "test_success" ? "/billing" : `/abonnement/retour?ref=${encodeURIComponent(reference)}`}>{payment.statut === "test_success" ? "Ma facturation" : "Suivre le paiement"}</Link></section>;
  const id = publicPlanId(payment.plan_code);
  return <article className="billing-card billing-receipt"><p className="billing-kicker">Toumaï AI · Paiement Moneroo</p><h1>Reçu de paiement</h1><StatusBadge status={payment.statut}/><dl className="billing-summary"><div><dt>Référence</dt><dd>{payment.reference}</dd></div><div><dt>Demande créée le</dt><dd>{paymentDate(payment.cree_le)}</dd></div><div><dt>Offre</dt><dd>{id ? PLAN_CATALOG[id].publicName : payment.plan_code}</dd></div><div><dt>Durée achetée</dt><dd>30 jours</dd></div><div><dt>Devise</dt><dd>{payment.devise}</dd></div></dl><p className="billing-kicker">Montant payé</p><PriceDisplay amount={payment.montant_xaf} currency={payment.devise}/><p className="billing-notice">Renouvellement manuel, sans prélèvement automatique.</p><div className="billing-actions"><button className="billing-button billing-button-primary" onClick={() => window.print()}>Imprimer / Enregistrer en PDF</button><Link className="billing-button" href="/billing">Ma facturation</Link></div></article>;
}

function ReceiptContent() {
  const { session, loading } = useAuth();
  const params = useSearchParams();
  const location = usePaymentLocation();
  const pathReference = location.split("?")[0].match(/^\/recu\/([A-Za-z0-9_-]+)\/?$/)?.[1];
  const reference = pathReference || params.get("ref") || "";
  if (loading) return <BillingLoading/>;
  if (!session) return <section className="billing-card billing-state"><h1>Votre reçu est privé.</h1><p>Connectez-vous au compte utilisé pour le paiement.</p><Link className="billing-button billing-button-primary" href={`/login?next=${encodeURIComponent(`/recu?ref=${encodeURIComponent(reference)}`)}`}>Se connecter</Link></section>;
  if (!reference) return <section className="billing-card"><h1>Retrouvez vos reçus.</h1><Link className="billing-button" href="/billing">Ouvrir ma facturation</Link></section>;
  return <Receipt key={`${session.user_id}:${reference}`} reference={reference}/>;
}

export default function ReceiptPage() {
  return <BillingShell><Suspense fallback={<BillingLoading/>}><ReceiptContent/></Suspense></BillingShell>;
}
