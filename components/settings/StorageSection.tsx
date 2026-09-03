"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  formaterOctets,
  getStockage,
  viderStockage,
  type UsageStockage,
} from "@/lib/user-api";
import { Panel, Row } from "./Rows";

/**
 * Ce que l'on occupe, et comment le reprendre.
 *
 * POURQUOI R2 ET PAS LES 15 Go DE GOOGLE
 * ---------------------------------------
 * La question s'est posée : si R2 ne suffit pas, faut-il inviter les gens à
 * stocker chez Google, qui offre 15 Go ? Trois obstacles :
 *
 * 1. Ces 15 Go sont PARTAGÉS entre Gmail, Photos et Drive — chez la plupart
 *    des gens ils sont déjà presque pleins. Offrir un espace déjà occupé
 *    n'offre rien.
 * 2. L'accès à Drive est un « scope sensible » chez Google : vérification
 *    annuelle avec audit de sécurité, des mois d'attente, refus possible.
 * 3. Les fichiers atterriraient chez l'utilisateur, qui peut les déplacer ou
 *    les supprimer sans nous prévenir : chaque image d'une conversation
 *    deviendrait un lien qui casse un jour.
 *
 * La bonne réponse n'est donc pas de déporter le problème, mais de le rendre
 * VISIBLE. On stockait sans jamais rien montrer : personne ne savait ce qu'il
 * occupait, ni ne pouvait faire le ménage.
 */
export function StorageSection() {
  const { session } = useAuth();
  const invite = !session || session.is_guest;
  const [usage, setUsage] = useState<UsageStockage | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [aVider, setAVider] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const charger = useCallback(() => {
    if (invite) return;
    getStockage()
      .then((u) => {
        setUsage(u);
        setErreur(null);
      })
      .catch((e) => {
        setUsage(null);
        setErreur(e instanceof Error ? e.message : "Occupation indisponible");
      });
  }, [invite]);

  useEffect(charger, [charger]);

  async function vider(cle: string) {
    setAVider(null);
    setEnCours(cle);
    setErreur(null);
    try {
      const r = await viderStockage(cle);
      setFait(
        r.supprimes === 0
          ? "Rien à supprimer."
          : `${r.supprimes} fichier${r.supprimes > 1 ? "s" : ""} supprimé${r.supprimes > 1 ? "s" : ""} — ${formaterOctets(r.octets_liberes)} libérés.`,
      );
      charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setEnCours(null);
    }
  }

  if (invite) {
    return (
      <Panel title="Stockage">
        <Row
          label="Réservé aux comptes"
          description="Une session invitée ne conserve rien au-delà de l'appareil : il n'y a pas d'espace à gérer."
        >
          <Link
            href="/register"
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition"
            style={{ background: "var(--primary)" }}
          >
            Créer un compte
          </Link>
        </Row>
      </Panel>
    );
  }

  const part =
    usage && usage.quota_octets > 0
      ? Math.min(100, (usage.total_octets / usage.quota_octets) * 100)
      : 0;
  const serre = part >= 80;

  return (
    <>
      {erreur && (
        <p className="mb-4 rounded-xl border border-[var(--error)] px-3 py-2 text-sm text-[var(--error)]">
          {erreur}
        </p>
      )}
      {fait && (
        <p className="mb-4 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          {fait}
        </p>
      )}

      <Panel title="Espace occupé">
        {usage === null ? (
          <Row
            label={erreur ? "Occupation indisponible" : "Chargement…"}
            description={
              erreur ? "Rechargez la page dans un instant." : undefined
            }
          />
        ) : !usage.disponible ? (
          // ON NE DIT PAS « 0 OCTET » QUAND ON NE SAIT PAS.
          // Ce serait un mensonge tranquille : l'utilisateur croirait n'avoir
          // rien stocké et ne chercherait plus.
          <Row
            label="Impossible de mesurer"
            description="Le stockage n'est pas joignable en ce moment. Vos fichiers ne sont pas perdus — c'est la mesure qui manque, pas eux."
          />
        ) : (
          <>
            <Row
              label={`${formaterOctets(usage.total_octets)} sur ${formaterOctets(usage.quota_octets)}`}
              description={
                serre
                  ? "Vous approchez de la limite. Faites le ménage ci-dessous avant d'être bloqué."
                  : "Compté directement sur le stockage, pas sur un compteur qui pourrait avoir dérivé."
              }
              stacked
            >
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--hover)]">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${part}%`,
                    background: serre ? "var(--error)" : "var(--primary)",
                  }}
                />
              </div>
            </Row>
          </>
        )}
      </Panel>

      {usage?.disponible && (
        <Panel title="Par catégorie">
          {usage.familles.map((f) => (
            <Row
              key={f.cle}
              label={f.nom}
              description={`${f.detail} — ${f.fichiers} fichier${f.fichiers > 1 ? "s" : ""}, ${formaterOctets(f.octets)}.`}
              stacked={aVider === f.cle}
            >
              {aVider === f.cle ? (
                <div className="flex items-center gap-2">
                  {/* LA CONFIRMATION DIT CE QU'ELLE SUPPRIME, ET COMBIEN.
                      « Êtes-vous sûr ? » ne renseigne sur rien ; le nombre de
                      fichiers, si — c'est lui qui fait renoncer, ou pas. */}
                  <span className="text-xs text-[var(--error)]">
                    Supprimer définitivement {f.fichiers} fichier
                    {f.fichiers > 1 ? "s" : ""} ?
                  </span>
                  <button
                    onClick={() => setAVider(null)}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => vider(f.cle)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition"
                    style={{ background: "var(--error)" }}
                  >
                    Supprimer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAVider(f.cle)}
                  disabled={f.fichiers === 0 || enCours !== null}
                  className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--error)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[var(--text-tertiary)] disabled:opacity-60"
                >
                  {enCours === f.cle ? "…" : "Libérer"}
                </button>
              )}
            </Row>
          ))}
        </Panel>
      )}

      <Panel title="Où vivent vos fichiers">
        <Row
          label="Sur notre stockage, pas sur le vôtre"
          description="Vos fichiers sont chez Cloudflare R2, sous notre compte. Nous n'utilisons pas les 15 Go de Google : ils sont partagés avec Gmail et Photos — donc déjà presque pleins chez la plupart des gens — et un fichier rangé dans votre Drive peut être déplacé ou supprimé sans que nous le sachions, ce qui casserait les images de vos conversations."
        />
        <Row
          label="Supprimer est définitif"
          description="Il n'y a pas de corbeille. Une image générée que vous libérez ici disparaît aussi de la conversation où elle apparaissait."
        />
        <Row
          label="Besoin de plus de place ?"
          description="Écrivez-nous depuis Aide & Support. La limite existe pour garder le service gratuit, pas pour vous bloquer."
        />
      </Panel>
    </>
  );
}
