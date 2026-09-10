"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

/** Garde les écrans d'authentification réservés aux visiteurs. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [admisCommeVisiteur, setAdmisCommeVisiteur] = useState(false);

  useEffect(() => {
    if (loading || admisCommeVisiteur) return;
    if (session) {
      router.replace("/chat");
      return;
    }

    // La session a été contrôlée et le visiteur peut utiliser le formulaire.
    // Ce verrou reste vrai si ce même formulaire ouvre ensuite une session :
    // sa redirection propre (checkout, next ou chat) garde alors la priorité.
    const frame = window.requestAnimationFrame(() => {
      setAdmisCommeVisiteur(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [admisCommeVisiteur, loading, router, session]);

  // Évite d'afficher brièvement un formulaire pendant la lecture de la session
  // ou avant que la navigation d'un membre déjà connecté soit lancée.
  if (loading || !admisCommeVisiteur) return null;
  return children;
}
