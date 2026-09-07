import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import "./billing.css";

export function BillingShell({ children, step }: { children: ReactNode; step?: "account" | "checkout" | "return" }) {
  return <div className="billing-shell"><header className="billing-header"><Link href="/" className="billing-brand"><Logo size={36} /><span>Toumaï AI<small>Intelligence artificielle</small></span></Link><Link href="/contact">Besoin d’aide ? ↗</Link></header><main className="billing-main"><div className="billing-topline"><Link href="/#tarifs">← Retour aux offres</Link>{step && <ol className="billing-steps" aria-label="Étapes de votre abonnement">{([ ["account", "Compte"], ["checkout", "Paiement"], ["return", "Confirmation"] ] as const).map(([id, name], i) => <li key={id} aria-current={step === id ? "step" : undefined}><span>{i + 1}</span>{name}</li>)}</ol>}</div>{children}</main><footer className="billing-footer"><span>Toumaï AI · À vos côtés, à chaque étape.</span><nav aria-label="Informations de facturation"><Link href="/privacy">Confidentialité</Link><Link href="/terms">Conditions</Link><Link href="/security">Sécurité</Link><Link href="/contact">Contact</Link></nav></footer></div>;
}

const STATUSES: Record<string, string> = {success:"Confirmé", pending:"En attente", failed:"Non confirmé", cancelled:"Annulé", expired:"Expiré", refunded:"Remboursé", verifying:"Vérification", unavailable:"Indisponible"};
export function StatusBadge({ status }: { status: string }) {
  return <span className="billing-badge" data-status={status}>{STATUSES[status] ?? "À vérifier"}</span>;
}
export function PriceDisplay({ amount, currency="XAF" }: { amount: number; currency?: string }) {
  return <span className="billing-price">{amount.toLocaleString("fr-FR")} <small>{currency === "XAF" ? "FCFA" : currency}</small></span>;
}
export function BillingLoading() {
  return <div className="billing-card" role="status"><p className="billing-kicker">Un instant</p><h1>Nous préparons les informations.</h1><div className="billing-skeleton" /><div className="billing-skeleton" /><span className="billing-muted">Chargement en cours…</span></div>;
}
export function PaymentState({ status, title, children }: { status: string; title: string; children: ReactNode }) {
  return <section className="billing-card billing-state" aria-live="polite"><div className="billing-state-icon" aria-hidden="true">{status === "success" ? "✓" : status === "failed" ? "!" : status === "cancelled" ? "—" : "· · ·"}</div><StatusBadge status={status} /><h1>{title}</h1>{children}</section>;
}
