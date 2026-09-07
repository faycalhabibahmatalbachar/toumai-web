import { publicPlanId } from "./plan-catalog";

const KEY = "toumai.checkout.v1";
/** Only a public plan identifier is persisted. Never a price or payment status. */
export function selectedPaymentPlan(params: URLSearchParams) {
  let value = params.get("plan");
  try {
    if (params.has("plan")) {
      const id = publicPlanId(value);
      if (id === "essentiel" || id === "toumai_5") sessionStorage.setItem(KEY, id);
      else sessionStorage.removeItem(KEY);
    } else if (!params.has("next")) value = sessionStorage.getItem(KEY);
  } catch { /* Navigation remains available without browser storage. */ }
  const id = publicPlanId(value);
  return id === "essentiel" || id === "toumai_5" ? id : null;
}

export function clearPaymentPlan() {
  try { sessionStorage.removeItem(KEY); } catch { /* Optional persistence. */ }
}

export function safeAccountReturn(value: string | null): string | null {
  if (!value) return null;
  if (/^\/(billing|recu)\/?$/.test(value) || /^\/recu\/[A-Za-z0-9_-]+\/?$/.test(value)) return value;
  if (/^\/abonnement\/retour\/?\?ref=[A-Za-z0-9_%.-]+$/.test(value)) return value;
  if (/^\/checkout\/?\?plan=(essentiel|toumai_5)$/.test(value)) return value;
  if (/^\/recu\/?\?ref=[A-Za-z0-9_%.-]+$/.test(value)) return value;
  return null;
}
