"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ArrowUpRight } from "lucide-react";

type Entree = { texte: string; description: string; href: string };
type Colonne = { titre: string; liens: Entree[] };
type Groupe = { id: string; titre: string; sousTitre: string; colonnes: Colonne[] };

const MENUS: Groupe[] = [
  {
    id: "plateforme",
    titre: "Plateforme",
    sousTitre: "Une intelligence artificielle, plusieurs façons de travailler.",
    colonnes: [
      { titre: "Créer et comprendre", liens: [
        { texte: "Assistant Toumaï", description: "Discuter, rédiger et explorer un sujet", href: "/chat" },
        { texte: "Modèles Sao & Toumaï", description: "Découvrir les choix disponibles", href: "/models" },
        { texte: "Documents et fichiers", description: "Analyser et retrouver ses documents", href: "/library" },
        { texte: "Agent navigateur", description: "Accompagner des tâches sur le web", href: "/agent" },
      ] },
      { titre: "Connecter et développer", liens: [
        { texte: "Toumaï Code", description: "Création logicielle — projet en développement", href: "https://code.toumaiai.com/" },
        { texte: "WhatsApp", description: "Conversations, assistance et automatisations", href: "/whatsapp" },
        { texte: "L'assistant IA", description: "Les usages de Toumaï en pratique", href: "/assistant-ia" },
      ] },
    ],
  },
  {
    id: "solutions",
    titre: "Solutions",
    sousTitre: "Construire, appliquer et évaluer l'IA, selon votre besoin.",
    colonnes: [
      { titre: "Construire l'IA", liens: [
        { texte: "Langues africaines", description: "Travail autour de l'arabe tchadien", href: "/recherche#langues" },
        { texte: "Méthodes et évaluation", description: "Critères de qualité et limites connues", href: "/recherche#evaluation" },
        { texte: "Recherche & développement", description: "Découvrir nos axes de travail", href: "/recherche" },
      ] },
      { titre: "Appliquer l'IA", liens: [
        { texte: "Pour les entreprises", description: "Explorer un cas d'usage professionnel", href: "/entreprises" },
        { texte: "Pour les organisations", description: "Écoles, équipes et services", href: "/entreprises" },
        { texte: "Founding Partners", description: "Proposer un pilote encadré", href: "/partenaires-fondateurs" },
      ] },
      { titre: "Évaluer et sécuriser", liens: [
        { texte: "Qualité des réponses", description: "Ce que nous testons et documentons", href: "/recherche#evaluation" },
        { texte: "Sécurité & confidentialité", description: "Comprendre les engagements du produit", href: "/security" },
        { texte: "Parler de votre projet", description: "Échanger avant toute intégration", href: "/contact" },
      ] },
    ],
  },
  {
    id: "recherche",
    titre: "Recherche",
    sousTitre: "Partager des travaux vérifiables, sans annoncer de résultats inexistants.",
    colonnes: [
      { titre: "Explorer", liens: [
        { texte: "Nos axes de recherche", description: "Langues, raisonnement et applications", href: "/recherche" },
        { texte: "Arabe tchadien", description: "Collecte et évaluation linguistique", href: "/recherche#langues" },
        { texte: "Protocoles d'évaluation", description: "Mesurer plutôt que promettre", href: "/recherche#evaluation" },
      ] },
      { titre: "Suivre et contribuer", liens: [
        { texte: "Publications & résultats", description: "État des publications publiques", href: "/recherche#publications" },
        { texte: "Laboratoire et collaborations", description: "Contribuer à un projet de recherche", href: "/recherche#laboratoire" },
        { texte: "Contacter l'équipe", description: "Proposer une collaboration", href: "/contact" },
      ] },
    ],
  },
  {
    id: "ressources",
    titre: "Ressources",
    sousTitre: "Mieux connaître Toumaï AI et trouver les informations utiles.",
    colonnes: [
      { titre: "L'entreprise", liens: [
        { texte: "À propos", description: "Notre mission et notre histoire", href: "/a-propos" },
        { texte: "Intelligence artificielle au Tchad", description: "Contextes et usages locaux", href: "/intelligence-artificielle-tchad" },
        { texte: "Presse", description: "Informations publiques", href: "/press" },
      ] },
      { titre: "Confiance et contact", liens: [
        { texte: "Sécurité", description: "Protection et contrôles", href: "/security" },
        { texte: "Confidentialité", description: "La politique de données", href: "/privacy" },
        { texte: "Nous contacter", description: "Questions et collaborations", href: "/contact" },
      ] },
    ],
  },
];

function Lien({ entree, fermer }: { entree: Entree; fermer: () => void }) {
  const contenu = (
    <>
      <span className="mega-item-title">{entree.texte}<ArrowUpRight size={14} aria-hidden="true" /></span>
      <span className="mega-item-detail">{entree.description}</span>
    </>
  );
  if (entree.href.startsWith("https://")) {
    return <a className="mega-item" href={entree.href} target="_blank" rel="noopener noreferrer" onClick={fermer}>{contenu}</a>;
  }
  return <Link className="mega-item" href={entree.href} onClick={fermer}>{contenu}</Link>;
}

export function NavigationMegaBureau() {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const conteneur = useRef<HTMLElement>(null);
  const groupeActif = MENUS.find((m) => m.id === ouvert);

  useEffect(() => {
    function fermerExterieur(event: PointerEvent) {
      if (conteneur.current && !conteneur.current.contains(event.target as Node)) setOuvert(null);
    }
    document.addEventListener("pointerdown", fermerExterieur);
    return () => document.removeEventListener("pointerdown", fermerExterieur);
  }, []);

  return (
    <nav className="desktop-nav mega-desktop" aria-label="Navigation principale" ref={conteneur}
      onKeyDown={(event) => {
        if (event.key === "Escape" && ouvert) {
          event.preventDefault();
          const bouton = conteneur.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"]');
          setOuvert(null);
          bouton?.focus();
        }
      }}>
      {MENUS.map((menu) => (
        <button key={menu.id} type="button" className={"mega-trigger" + (ouvert === menu.id ? " is-open" : "")}
          aria-expanded={ouvert === menu.id} aria-controls={ouvert === menu.id ? "mega-panel-" + menu.id : undefined}
          onClick={() => setOuvert((id) => id === menu.id ? null : menu.id)}>
          {menu.titre}<ChevronDown size={15} aria-hidden="true" />
        </button>
      ))}
      <a className="mega-plain-link" href="#tarifs" onClick={() => setOuvert(null)}>Tarifs</a>
      {groupeActif && (
        <div className="mega-panel" id={"mega-panel-" + groupeActif.id}>
          <div className="mega-panel-header">
            <div>
              <p className="mega-eyebrow">TOUMAÏ AI / {groupeActif.titre}</p>
              <h2>{groupeActif.sousTitre}</h2>
            </div>
            <Link className="mega-panel-cta" href="/contact" onClick={() => setOuvert(null)}>
              Parlons de votre projet <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="mega-columns">
            {groupeActif.colonnes.map((colonne) => (
              <div className="mega-column" key={colonne.titre}>
                <h3>{colonne.titre}</h3>
                {colonne.liens.map((entree) => <Lien key={entree.texte + entree.href} entree={entree} fermer={() => setOuvert(null)} />)}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export function NavigationMegaMobile({ ouvert, fermer, connecte, deconnexion }: { ouvert: boolean; fermer: () => void; connecte: boolean; deconnexion: () => void }) {
  return (
    <nav className="mobile-nav mega-mobile" id="mobile-nav" aria-label="Navigation mobile" hidden={!ouvert}>
      <a className="mega-mobile-direct" href="#demonstration" onClick={fermer}>Démonstration</a>
      {MENUS.map((menu) => (
        <details key={menu.id} className="mega-mobile-group">
          <summary>{menu.titre}<ChevronDown size={17} aria-hidden="true" /></summary>
          <div className="mega-mobile-content">
            {menu.colonnes.map((colonne) => (
              <div key={colonne.titre}>
                <h3>{colonne.titre}</h3>
                {colonne.liens.map((entree) => <Lien key={entree.texte + entree.href} entree={entree} fermer={fermer} />)}
              </div>
            ))}
          </div>
        </details>
      ))}
      <a className="mega-mobile-direct" href="#tarifs" onClick={fermer}>Tarifs</a>
      <Link className="mega-mobile-direct" href="/entreprises" onClick={fermer}>Entreprises</Link>
      {connecte ? (
        <button type="button" className="mega-mobile-direct mega-mobile-logout" onClick={() => { fermer(); deconnexion(); }}>Déconnexion</button>
      ) : (
        <Link className="mega-mobile-direct" href="/login" onClick={fermer}>Connexion</Link>
      )}
      <Link className="mega-mobile-direct mega-mobile-action" href="/chat" onClick={fermer}>Ouvrir Toumaï</Link>
    </nav>
  );
}
