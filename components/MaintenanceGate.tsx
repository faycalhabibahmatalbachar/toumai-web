"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MAINTENANCE_MODE } from "@/lib/maintenance";

/** Renvoie toute page autre que l'accueil vers `/` tant que le mode maintenance est actif. */
export function MaintenanceGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!MAINTENANCE_MODE) return;
    const isHome = pathname === "/" || pathname === "";
    if (!isHome) router.replace("/");
  }, [pathname, router]);

  return null;
}
