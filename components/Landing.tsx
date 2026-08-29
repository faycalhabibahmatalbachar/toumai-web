"use client";

/**
 * PAGE D'ACCUEIL DE TOUMAÏ AI.
 *
 * Ce fichier ne fait plus que l'ordre du récit. Chaque mouvement vit dans
 * `components/landing/`, avec sa propre logique et ses propres animations.
 *
 * L'ORDRE EST UN ARGUMENT
 * -----------------------
 *  1. La promesse, démontrée tout de suite (le hero joue le produit).
 *  2. Les langues qui défilent — la preuve la plus courte de la promesse.
 *  3. Ce que ça fait, vraiment : huit capacités, huit scènes distinctes.
 *  4. Pourquoi lui plutôt qu'un autre.
 *  5. Où il vous rejoint : Web, WhatsApp, Android.
 *  6. Ce qu'il y a dessous : la famille de modèles et l'aiguillage.
 *  7. Ce qu'il peut faire POUR vous : les connecteurs.
 *  8. Les objections, puis l'invitation.
 *
 * TOUT CE QUI EXISTAIT CONTINUE D'EXISTER
 * ----------------------------------------
 * Les ancres `#capacites`, `#modeles` et `#contact` sont conservées, ainsi que
 * chaque route de l'ancien pied de page. Les chiffres publics restent servis
 * par l'API — et restent masqués tant qu'ils sont trop bas pour dire quelque
 * chose. Rien n'a été inventé pour remplir la page.
 */

import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { LangMarquee, Why } from "@/components/landing/Why";
import { Showcase } from "@/components/landing/Showcase";
import { Everywhere } from "@/components/landing/Everywhere";
import { Intelligence } from "@/components/landing/Intelligence";
import { Connectors } from "@/components/landing/Connectors";
import { Faq, FinalCta, Footer } from "@/components/landing/Closing";
import { RevealRoot } from "@/components/landing/primitives";

export function Landing() {
  return (
    <div className="tm flex flex-1 flex-col">
      <RevealRoot />
      {/* Au clavier, c'est le tout premier arrêt : il saute la navigation et
       * dépose directement dans le contenu. Invisible tant qu'il n'a pas le
       * focus. */}
      <a href="#contenu" className="tm-skip tm-btn tm-btn-primary tm-btn-sm">
        Aller au contenu
      </a>
      <Nav />
      <main id="contenu" tabIndex={-1}>
        <Hero />
        <LangMarquee />
        <Showcase />
        <Why />
        <Everywhere />
        <Intelligence />
        <Connectors />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
