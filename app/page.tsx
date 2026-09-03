import { PageAccueil } from "@/components/accueil/PageAccueil";
import { MaintenancePage } from "@/components/MaintenancePage";
import { MAINTENANCE_MODE } from "@/lib/maintenance";

/**
 * L'ACCUEIL DU SITE.
 *
 * Depuis le 3 septembre 2026, c'est la maquette éditoriale (portrait,
 * manifeste, quatre démonstrations animées) — voir
 * `components/accueil/PageAccueil.tsx`.
 *
 * L'ANCIENNE PAGE N'A PAS ÉTÉ SUPPRIMÉE. `components/Landing.tsx` et tout
 * `components/landing/` sont intacts : remplacer `PageAccueil` par `Landing`
 * ci-dessous suffit à revenir en arrière, sans rien réécrire. C'est délibéré —
 * une refonte d'accueil se juge sur plusieurs jours de trafic, pas le jour du
 * déploiement, et un retour en arrière qui demande une reconstruction n'est
 * pas un retour en arrière.
 */
export default function Home() {
  return MAINTENANCE_MODE ? <MaintenancePage /> : <PageAccueil />;
}
