"use client";

/**
 * LA PAGE D'USAGE — tout ce que le compte a consommé, et quand ça repart.
 *
 * POURQUOI UNE PAGE ENTIÈRE À CÔTÉ DE LA JAUGE
 * ----------------------------------------------
 * La jauge du chat répond à une question, une seule : « puis-je encore
 * envoyer ce message ? ». Elle montre donc la fenêtre la plus contraignante et
 * se tait le reste du temps. C'est le bon comportement au-dessus d'un champ de
 * saisie, et c'est insuffisant dès qu'on veut décider de changer de plan.
 *
 * Ici, l'inverse : TOUT est montré, tout le temps, groupé par fenêtre. Les
 * cinq heures d'abord parce que c'est celle qui bloque en premier, puis le
 * jour, la semaine, le mois, et enfin ce qui ne se remet jamais à zéro.
 *
 * CE QUE CETTE PAGE NE FAIT PAS
 * ------------------------------
 * Elle ne décide rien. Elle lit `/abonnements/moi`, qui lit la base. Aucun
 * quota n'est calculé ici : deux implémentations d'une même règle finissent
 * toujours par diverger, et c'est le client qui aurait tort.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE } from "@/lib/config";
import { authHeaders } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";

type Quota = {
  utilise: number;
  plafond: number;
  illimite: boolean;
  restant: number | null;
  fenetre: string;
  remise_a_zero_le: string | null;
  secondes_restantes: number | null;
};

type Etat = {
  plan: { code: string; nom: string; prix_xaf: number; periode: string };
  abonnement: { actif: boolean; source: string; fin_le: string | null };
  quotas: Record<string, Quota>;
};

/** Les libellés du produit. Une métrique absente d'ici s'affiche sous son nom
 *  technique : laid, jamais bloquant. Une fonctionnalité nouvelle ne doit pas
 *  faire tomber la page faute d'entrée dans un dictionnaire. */
const LIBELLES: Record<string, { nom: string; quoi: string }> = {
  messages_5h: { nom: "Messages", quoi: "Ce que vous envoyez au modèle." },
  messages: { nom: "Messages", quoi: "Ce que vous envoyez au modèle." },
  messages_semaine: { nom: "Messages", quoi: "Ce que vous envoyez au modèle." },
  images: { nom: "Images générées", quoi: "Chaque image produite compte pour une." },
  documents: { nom: "Documents analysés", quoi: "PDF, Word, feuilles de calcul." },
  voix_sec: { nom: "Voix", quoi: "Secondes de synthèse et de dictée." },
  connecteurs: { nom: "Connecteurs branchés", quoi: "Mail, agenda, WhatsApp, Drive." },
  connecteur_actions: { nom: "Actions de connecteur", quoi: "Tout ce qui SORT : un envoi, un rendez-vous posé." },
  whatsapp_msg: { nom: "Messages WhatsApp", quoi: "Envoyés depuis votre compte." },
  agent_taches: { nom: "Tâches de l’agent", quoi: "L’agent navigateur, une tâche par mission." },
  automatisations: { nom: "Automatisations", quoi: "Les règles qui tournent seules." },
  code_exec: { nom: "Exécutions de code", quoi: "Code Studio et outils de calcul." },
  cv: { nom: "CV générés", quoi: "CV Studio." },
  memoire_elements: { nom: "Souvenirs", quoi: "Ce que Toumaï retient de vous." },
  stockage_mo: { nom: "Stockage", quoi: "Vos fichiers, en mégaoctets." },
};

/** LES HORAIRES, DANS L'HEURE DE CELUI QUI LIT.
 *
 * Le serveur découpe ses fenêtres en UTC. La page annonçait ces heures telles
 * quelles — « les blocs commencent à minuit, 5 h, 10 h… » — et c'était faux
 * pour presque tous nos utilisateurs : le Tchad est à UTC+1 toute l'année, si
 * bien que les blocs commencent en réalité à 1 h, 6 h, 11 h, 16 h et 21 h, et
 * que la journée repart à 1 h du matin.
 *
 * Quelqu'un à N'Djamena qui attendait minuit pour réécrire restait bloqué une
 * heure de plus, sans comprendre pourquoi. On convertit donc les bornes réelles
 * dans le fuseau du navigateur : juste au Tchad, juste aussi pour la diaspora.
 */
function heureLocale(heureUtc: number): string {
  const d = new Date();
  d.setUTCHours(heureUtc, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** « 01:00, 06:00, 11:00, 16:00 et 21:00 » — la liste, dans l'heure du lecteur. */
function bornesDesBlocs(): string {
  const heures = [0, 5, 10, 15, 20].map(heureLocale);
  return `${heures.slice(0, -1).join(", ")} et ${heures[heures.length - 1]}`;
}

/** L'ordre d'affichage des fenêtres : de celle qui bloque en premier à celle
 *  qui ne bloque jamais. C'est l'ordre dans lequel on se pose la question. */
const FENETRES: { cle: string; titre: string; explication: string }[] = [
  {
    cle: "5h",
    titre: "Limite de 5 heures",
    explication:
      "Elle protège le service des rafales. Les blocs commencent à " +
      bornesDesBlocs() +
      ", à votre heure.",
  },
  {
    cle: "jour",
    titre: "Limite du jour",
    explication: `Remise à zéro chaque jour à ${heureLocale(0)}, à votre heure.`,
  },
  {
    cle: "semaine",
    titre: "Limite de la semaine",
    explication:
      `Elle repart le dimanche à ${heureLocale(0)}, pour que la semaine pleine ` +
      "soit devant vous le lundi.",
  },
  { cle: "mois", titre: "Limite du mois", explication: "Remise à zéro le 1er." },
  {
    cle: "toujours",
    titre: "Sans remise à zéro",
    explication: "Ce n’est pas une consommation, c’est un état.",
  },
];

function enClair(secondes: number | null): string {
  if (secondes === null) return "";
  if (secondes < 90) return "moins d’une minute";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures < 24)
    return reste ? `${heures} h ${String(reste).padStart(2, "0")}` : `${heures} h`;
  const jours = Math.floor(heures / 24);
  return jours === 1 ? "1 jour" : `${jours} jours`;
}

function Barre({ q }: { q: Quota }) {
  if (q.illimite) return null;
  const part = q.plafond > 0 ? Math.min(1, q.utilise / q.plafond) : 0;
  const chaud = part >= 0.75;
  const plein = part >= 1;
  return (
    <span
      aria-hidden="true"
      className="mt-2 block h-1 w-full overflow-hidden rounded-full"
      style={{ background: "var(--border)" }}
    >
      <span
        className="block h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${Math.max(2, part * 100)}%`,
          background: plein
            ? "var(--danger, #c0573a)"
            : chaud
              ? "#c08b2c"
              : "var(--primary)",
        }}
      />
    </span>
  );
}

export default function PageUsage() {
  const { session, loading } = useAuth();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState("");

  const relire = useCallback(async () => {
    try {
      const reponse = await fetch(`${API_BASE}/abonnements/moi`, {
        headers: authHeaders(),
      });
      if (reponse.status === 401) {
        setErreur("Connectez-vous pour voir votre usage.");
        return;
      }
      if (!reponse.ok) {
        setErreur("Usage indisponible pour le moment.");
        return;
      }
      const charge = await reponse.json();
      if (charge?.data) {
        setEtat(charge.data as Etat);
        setErreur("");
      }
    } catch {
      setErreur("Pas de réseau. Réessayez dans un instant.");
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    void relire();
    // Une relecture par minute : le compte à rebours doit avancer sans qu'on
    // recharge la page, et une minute suffit pour un affichage qui parle en
    // heures. Interroger toutes les secondes coûterait soixante fois plus
    // pour la même information.
    const minuterie = window.setInterval(() => void relire(), 60_000);
    return () => window.clearInterval(minuterie);
  }, [relire, loading, session]);

  const groupes = FENETRES.map((f) => ({
    ...f,
    entrees: Object.entries(etat?.quotas ?? {}).filter(
      ([, q]) => q.fenetre === f.cle,
    ),
  })).filter((g) => g.entrees.length > 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 flex flex-col gap-4">
        <Logo size={34} />
        <h1 className="text-[1.9rem] font-semibold tracking-tight sm:text-[2.3rem]">
          Votre usage
        </h1>
        {etat && (
          <p className="text-[14.5px] opacity-70">
            Plan <strong>{etat.plan.nom}</strong>
            {etat.plan.prix_xaf > 0
              ? ` — ${etat.plan.prix_xaf.toLocaleString("fr-FR")} FCFA par ${etat.plan.periode}`
              : " — gratuit"}
            {etat.abonnement.fin_le
              ? `, jusqu’au ${new Date(etat.abonnement.fin_le).toLocaleDateString("fr-FR")}`
              : ""}
            .
          </p>
        )}
      </header>

      {erreur && (
        <div
          className="mb-8 rounded-xl border px-4 py-3 text-[14px]"
          style={{ borderColor: "var(--border)" }}
          role="alert"
        >
          {erreur}{" "}
          {erreur.includes("Connectez") && (
            <Link href="/login" className="underline underline-offset-4">
              Se connecter
            </Link>
          )}
        </div>
      )}

      {!etat && !erreur && (
        <p className="text-[14px] opacity-60">Lecture de vos compteurs…</p>
      )}

      <div className="flex flex-col gap-10">
        {groupes.map((groupe) => {
          // Toutes les métriques d'une même fenêtre repartent au même instant :
          // on prend le premier compte à rebours non nul du groupe.
          const rebours = groupe.entrees
            .map(([, q]) => q.secondes_restantes)
            .find((s) => s !== null && s !== undefined);

          return (
            <section key={groupe.cle} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[17px] font-semibold">{groupe.titre}</h2>
                {rebours ? (
                  <span className="text-[13px] opacity-60">
                    Réinitialisation dans {enClair(rebours)}
                  </span>
                ) : null}
              </div>
              <p className="-mt-2 text-[13px] opacity-55">{groupe.explication}</p>

              <ul className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                {groupe.entrees.map(([cle, q]) => {
                  const libelle = LIBELLES[cle] ?? { nom: cle, quoi: "" };
                  return (
                    <li key={cle} className="py-3.5">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[14.5px] font-medium">{libelle.nom}</span>
                          {libelle.quoi && (
                            <span className="text-[12.5px] opacity-55">{libelle.quoi}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-right text-[14px] tabular-nums">
                          {q.illimite ? (
                            <span className="opacity-60">illimité</span>
                          ) : (
                            <>
                              <strong>{q.utilise}</strong>
                              <span className="opacity-50"> / {q.plafond}</span>
                            </>
                          )}
                        </span>
                      </div>
                      <Barre q={q} />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* LES RÈGLES, ÉCRITES. Un quota qu'on subit sans comprendre passe pour
          de l'arbitraire. Ces quatre lignes disent exactement ce que fait le
          garde-fou, y compris ce qu'il fait EN NOTRE DÉFAVEUR. */}
      {etat && (
        <section className="mt-14 flex flex-col gap-3 border-t pt-8"
                 style={{ borderColor: "var(--border)" }}>
          <h2 className="text-[15px] font-semibold">Comment ça marche</h2>
          <ul className="flex flex-col gap-2.5 text-[13.5px] leading-relaxed opacity-70">
            <li>
              Le compteur avance <strong>avant</strong> que le modèle réponde, jamais
              après. Une réponse qui ne part pas ne vous est pas comptée.
            </li>
            <li>
              Trois limites encadrent les messages : cinq heures, le jour, la semaine.
              C’est toujours la plus courte qui bloque en premier, et c’est celle-là
              qui vous est annoncée, parce que c’est celle qui repart le plus tôt.
            </li>
            <li>
              Si l’une des trois refuse, les deux autres vous sont{" "}
              <strong>rendues</strong>. Une action qui n’a pas eu lieu ne coûte rien.
            </li>
            <li>
              Seules les actions qui <strong>sortent</strong> comptent comme action de
              connecteur : envoyer un message, poser un rendez-vous. Lire vos courriels
              ne compte pas.
            </li>
            <li>
              Une panne de nos compteurs vous laisse passer. Un quota est une limite
              commerciale, pas une serrure.
            </li>
          </ul>

          {etat.plan.code === "gratuit" && (
            <Link
              href="/#tarifs"
              className="tm-btn tm-btn-primary mt-4 w-fit"
            >
              Voir les offres
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
