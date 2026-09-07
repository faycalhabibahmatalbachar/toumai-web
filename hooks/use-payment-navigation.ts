"use client";
import { useEffect, useSyncExternalStore } from "react";
import { publicPlanId } from "@/lib/plan-catalog";
import { selectedPaymentPlan } from "@/lib/payment-navigation";

const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
const serverSnapshot = () => "";
const locationSnapshot = () => window.location.pathname + window.location.search;

export function usePaymentLocation() {
  return useSyncExternalStore(subscribe, locationSnapshot, serverSnapshot);
}

function planSnapshot() {
  const params = new URLSearchParams(window.location.search);
  let value = params.get("plan");
  try { if (!params.has("plan") && !params.has("next")) value = sessionStorage.getItem("toumai.checkout.v1"); } catch { /* Optional storage. */ }
  return value ?? "";
}
export function usePaymentPlan() {
  const raw = useSyncExternalStore(subscribe, planSnapshot, serverSnapshot);
  const id = publicPlanId(raw);
  useEffect(() => { selectedPaymentPlan(new URLSearchParams(window.location.search)); }, [raw]);
  return id === "essentiel" || id === "toumai_5" ? id : null;
}
