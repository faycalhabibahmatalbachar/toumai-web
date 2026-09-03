"use client";

/**
 * ACCUEIL SIMPLE — une seule chose à faire, et elle est sous le curseur.
 *
 * CE QUI DISTINGUE CETTE PAGE DE L'AUTRE
 * ---------------------------------------
 * L'accueil actuel raconte le produit en neuf mouvements : les langues, les
 * capacités, les modèles, les connecteurs, les objections. C'est une bonne
 * page de vente. Ce n'en est pas une bonne pour quelqu'un qui a déjà décidé
 * d'essayer — il doit descendre pour trouver où écrire.
 *
 * Ici, le champ de saisie EST la page. Une phrase, un champ, quatre entrées
 * possibles. Tout ce qui reste tient au-dessous de la ligne de flottaison et
 * ne se lit que si l'on descend.
 *
 * LA SAISIE MARCHE VRAIMENT
 * --------------------------
 * Elle ne pré-remplit pas le chat pour qu'on appuie une seconde fois sur
 * Entrée : elle POSE la question et la conversation démarre. Un champ
 * d'accueil qui ne fait que recopier ailleurs est un décor, et un décor qui
 * imite une commande est pire qu'un lien.
 *
 * CLAIR PAR DÉFAUT, MAIS PAS IMPOSÉ
 * ----------------------------------
 * La page est pensée sur fond crème — c'est là que la sérif respire. Les
 * couleurs viennent toutes des variables du thème : qui a choisi le sombre
 * garde le sombre, sans qu'aucune valeur ne soit écrite en dur.
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Trace } from "@/components/accueil/Trace";

/** Les quatre entrées. Chacune pose une VRAIE question, pas un mot-clé.
 *
 * « Écrire » seul laisse l'utilisateur devant la même page blanche qu'avant.
 * Une phrase complète démarre la conversation et montre, au passage, le
 * niveau de détail qu'on peut donner. */
const ENTREES: { titre: string; question: string }[] = [
  {
    titre: "Écrire",
    question:
      "Aide-moi à rédiger un message professionnel. Je te donne le contexte, tu me proposes trois formulations.",
  },
  {
    titre: "Traduire",
    question:
      "Traduis ce texte en arabe tchadien, celui qu'on parle au marché — pas l'arabe littéraire.",
  },
  {
    titre: "Coder",
    question: "Explique-moi ce que fait ce code, ligne par ligne, puis dis-moi ce qui cloche.",
  },
  {
    titre: "Comprendre",
    question: "Explique-moi simplement un sujet que je ne connais pas, avec un exemple concret.",
  },
];

export default function AccueilSimple() {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  /** Pose la question et part vers la conversation.
   *
   * `sessionStorage` plutôt qu'un paramètre d'adresse : une question peut
   * faire trois cents caractères, contenir des retours à la ligne et des
   * accents. Dans une URL, elle se retrouverait encodée dans l'historique du
   * navigateur, dans les journaux du serveur, et dans le référent envoyé aux
   * pages suivantes. Une question n'a rien à faire dans une adresse.
   */
  const poser = useCallback(
    (texte: string) => {
      const t = texte.trim();
      if (!t) return;
      try {
        window.sessionStorage.setItem("toumai:question", t);
      } catch {
        // Stockage refusé : on emmène quand même vers le chat, où la
        // personne pourra retaper. Mieux vaut un geste perdu qu'un bouton
        // qui ne répond pas.
      }
      router.push("/chat");
    },
    [router],
  );

  return (
    <div className="ac flex min-h-screen flex-col">
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <header className="ac-nav">
        <div className="ac-wrap flex h-16 items-center justify-between gap-4">
          <Link href="/accueil" className="flex items-center gap-2.5" aria-label="Toumaï AI">
            <Logo size={28} />
            <span className="landing-serif text-[19px] font-semibold tracking-tight">
              Toumaï AI
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-[14.5px] md:flex">
            <Link href="/models" className="ac-lien">
              Modèles
            </Link>
            <Link href="/whatsapp" className="ac-lien">
              WhatsApp
            </Link>
            <Link href="/" className="ac-lien">
              Découvrir
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="ac-lien hidden px-2 text-[14.5px] sm:inline">
              Connexion
            </Link>
            <Link href="/chat" className="ac-btn ac-btn-plein">
              Essayer gratuitement
            </Link>
          </div>
        </div>
      </header>

      {/* ── Le premier écran ────────────────────────────────────────────── */}
      <main className="flex-1">
        <section className="ac-wrap grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <div>
            <h1 className="landing-serif ac-titre">
              Parlez comme
              <br />
              chez vous
            </h1>

            <p className="ac-lead mt-5 max-w-[34ch]">
              Toumaï AI comprend le français, l&apos;anglais et l&apos;arabe — y
              compris l&apos;arabe tchadien, celui qu&apos;on parle au marché.
            </p>

            {/* LE CHAMP EST LE PRODUIT.
                Un formulaire, et non un bouton qui mène à un formulaire :
                Entrée envoie, comme partout ailleurs. */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                poser(question);
              }}
              className="ac-champ mt-8"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Comment puis-je vous aider aujourd'hui ?"
                aria-label="Votre question"
                className="ac-champ-saisie"
              />
              <button type="submit" className="ac-btn ac-btn-plein ac-champ-envoi">
                Demander
                <span aria-hidden="true" className="ac-fleche">
                  ↑
                </span>
              </button>
            </form>

            <ul className="mt-3.5 flex flex-wrap gap-2">
              {ENTREES.map((e) => (
                <li key={e.titre}>
                  <button onClick={() => poser(e.question)} className="ac-puce">
                    {e.titre}
                  </button>
                </li>
              ))}
            </ul>

            <p className="ac-fin mt-6">
              Gratuit, sans carte bancaire — et rien de ce que vous écrivez
              n&apos;est revendu.
            </p>
          </div>

          <div className="relative hidden justify-self-center lg:block">
            <Trace className="h-[440px] w-auto" />
          </div>
        </section>

        {/* ── Ce qu'il faut savoir, et rien de plus ──────────────────────── */}
        <section className="ac-bande">
          <div className="ac-wrap grid gap-8 py-14 sm:grid-cols-3 sm:gap-10">
            {[
              {
                t: "Il parle tchadien",
                d: "L'arabe du marché, pas celui des manuels. C'est la seule chose que les assistants venus d'ailleurs ne savent pas faire.",
              },
              {
                t: "Sur WhatsApp aussi",
                d: "Rien à installer. On écrit à un numéro, il répond — sur le réseau que tout le monde a déjà.",
              },
              {
                t: "Il ne revend rien",
                d: "Vos conversations vous appartiennent. On peut les effacer, et voir à tout moment ce qui a été retenu de vous.",
              },
            ].map((b) => (
              <article key={b.t}>
                <h2 className="landing-serif mb-2 text-[21px] tracking-tight">{b.t}</h2>
                <p className="ac-lead text-[15px]">{b.d}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* ── Pied ────────────────────────────────────────────────────────── */}
      <footer className="ac-bande">
        <div className="ac-wrap flex flex-wrap items-center justify-between gap-4 py-7 text-[13.5px]">
          <span className="ac-fin">Conçu à N&apos;Djaména, pour le monde.</span>
          <nav className="flex flex-wrap gap-5">
            <Link href="/privacy" className="ac-lien">
              Confidentialité
            </Link>
            <Link href="/terms" className="ac-lien">
              Conditions
            </Link>
            <Link href="/" className="ac-lien">
              La présentation complète
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
