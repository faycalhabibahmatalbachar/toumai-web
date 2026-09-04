"use client";

/**
 * LA PAGE DE RETOUR APRÈS PAIEMENT.
 *
 * Moneroo renvoie la personne ici une fois la carte saisie. Cette page a un
 * seul travail : dire si le paiement est passé, sans jamais le décider
 * elle-même.
 *
 * POURQUOI ELLE INTERROGE EN BOUCLE
 * ----------------------------------
 * Moneroo ajoute `paymentStatus` à l'adresse de retour. On pourrait s'en
 * contenter et afficher « c'est bon ». Ce serait faux : ce paramètre vient du
 * navigateur, donc de la personne, qui peut le changer dans la barre
 * d'adresse. Ce que cette page affiche vient de NOTRE serveur, qui a lui-même
 * redemandé le statut à Moneroo.
 *
 * Il y a un décalage : la personne arrive souvent avant le rappel. La page
 * interroge donc `/paiements/intention/{ref}` toutes les deux secondes pendant
 * une minute. Si le rappel n'arrive jamais, la réconciliation côté serveur
 * finit le travail, et il suffit de recharger plus tard.
 *
 * `ref` est NOTRE référence. Elle est ajoutée à l'adresse de retour au moment
 * où l'intention est créée, parce que Moneroo ne renvoie que son identifiant à
 * lui, et que nous avons besoin du nôtre.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { API_BASE } from "@/lib/config";
import { authHeaders } from "@/lib/api";
import { Logo } from "@/components/Logo";

/** Une minute d'attente, par pas de deux secondes. Au-delà, ce n'est plus un
 *  décalage de rappel, c'est un problème, et il vaut mieux le dire. */
const PAS_MS = 2000;
const ESSAIS_MAX = 30;

type Etat = "attente" | "success" | "failed" | "expired" | "introuvable";

function Contenu() {
  const parametres = useSearchParams();
  const reference = parametres.get("ref") ?? "";

  const [etat, setEtat] = useState<Etat>("attente");
  const [plan, setPlan] = useState<string>("");
  const [essais, setEssais] = useState(0);
  const arrete = useRef(false);

  const interroger = useCallback(async () => {
    if (!reference) {
      setEtat("introuvable");
      return true;
    }
    try {
      const reponse = await fetch(
        `${API_BASE}/paiements/intention/${encodeURIComponent(reference)}`,
        { headers: authHeaders() },
      );
      if (reponse.status === 404) {
        setEtat("introuvable");
        return true;
      }
      if (!reponse.ok) return false;
      const charge = await reponse.json();
      const statut = charge?.data?.statut as string | undefined;
      if (charge?.data?.plan_code) setPlan(charge.data.plan_code);
      if (statut === "success" || statut === "failed" || statut === "expired") {
        setEtat(statut);
        return true;
      }
      return false;
    } catch {
      // Réseau coupé au retour de la banque : on réessaie, on ne conclut pas.
      return false;
    }
  }, [reference]);

  useEffect(() => {
    arrete.current = false;

    (async () => {
      for (let i = 0; i < ESSAIS_MAX; i += 1) {
        if (arrete.current) return;
        const fini = await interroger();
        if (fini || arrete.current) return;
        setEssais(i + 1);
        await new Promise((r) => setTimeout(r, PAS_MS));
      }
    })();

    return () => {
      arrete.current = true;
    };
  }, [interroger]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size={44} />

      {etat === "attente" && (
        <>
          <h1 className="text-2xl font-semibold">Nous vérifions votre paiement.</h1>
          <p className="text-sm opacity-70">
            La confirmation vient de notre serveur, pas de votre navigateur. Cela
            prend quelques secondes.
          </p>
          <div
            className="h-1 w-48 overflow-hidden rounded-full"
            style={{ background: "var(--tm-line)" }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={ESSAIS_MAX}
            aria-valuenow={essais}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.min(100, (essais / ESSAIS_MAX) * 100)}%`,
                background: "var(--tm-accent, #d97857)",
              }}
            />
          </div>
        </>
      )}

      {etat === "success" && (
        <>
          <h1 className="text-2xl font-semibold">Paiement confirmé.</h1>
          <p className="text-sm opacity-70">
            Votre abonnement {plan ? `« ${plan} » ` : ""}est actif. Bonne route.
          </p>
          <Link href="/chat" className="tm-btn tm-btn-primary">
            Ouvrir Toumaï
          </Link>
        </>
      )}

      {etat === "failed" && (
        <>
          <h1 className="text-2xl font-semibold">Le paiement n’est pas passé.</h1>
          <p className="text-sm opacity-70">
            Rien n’a été débité. Vous pouvez réessayer, ou nous écrire si votre
            banque vous dit le contraire.
          </p>
          <Link href="/#tarifs" className="tm-btn tm-btn-primary">
            Revenir aux offres
          </Link>
        </>
      )}

      {etat === "expired" && (
        <>
          <h1 className="text-2xl font-semibold">La demande a expiré.</h1>
          <p className="text-sm opacity-70">
            Une demande de paiement reste ouverte quinze minutes. Relancez-en une,
            cela prend quelques secondes.
          </p>
          <Link href="/#tarifs" className="tm-btn tm-btn-primary">
            Revenir aux offres
          </Link>
        </>
      )}

      {etat === "introuvable" && (
        <>
          <h1 className="text-2xl font-semibold">Nous ne retrouvons pas ce paiement.</h1>
          <p className="text-sm opacity-70">
            Si votre banque vous a débité, écrivez-nous : nous avons la trace de
            chaque transaction et nous la retrouverons.
          </p>
          <a href="mailto:contact@toumaiai.com" className="tm-btn tm-btn-primary">
            Nous écrire
          </a>
        </>
      )}
    </main>
  );
}

export default function PageRetourPaiement() {
  // `useSearchParams` impose une frontière de suspension dans une page
  // exportée en statique. Sans elle, la compilation échoue.
  return (
    <Suspense fallback={null}>
      <Contenu />
    </Suspense>
  );
}
