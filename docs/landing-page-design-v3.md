# Page d'accueil v3 — design éditorial niveau startup (Anthropic/OpenAI)

## 0. Méthode

Demande : « utiliser Claude Design pour designer premièrement la page, ensuite
écrire un plan complet, et implémenter ». L'outil Claude Design (DesignSync)
n'est pas accessible dans cet environnement (authentification interactive
indisponible) — la même méthode a été appliquée en local : maquette HTML
haute-fidélité d'abord ([docs/design/landing-v3.html](design/landing-v3.html)),
validée visuellement section par section dans le navigateur, puis ce plan,
puis l'implémentation Next.js.

## 1. Analyse des références (Google, OpenAI, Anthropic)

Ce qui distingue ces pages d'un « site vitrine » :
- **La typographie porte le design** : un display serif éditorial (Anthropic)
  ou un sans gigantesque (OpenAI), pas des cartes colorées.
- **Une seule idée de couleur** : Anthropic = ivoire chaud + terracotta ;
  OpenAI = noir/blanc. Jamais 5 dégradés en compétition.
- **Le produit est le héros** : une vraie fenêtre d'application en haut de
  page, pas des icônes emoji.
- **Grille bento** pour les capacités (Apple/Vercel/Anthropic) : tuiles de
  tailles variées, chacune avec une vignette du produit réel.
- **Beaucoup d'air** : sections espacées de ~100px, largeurs de lecture
  contenues.

## 2. Identité retenue pour Toumaï AI

Le logo est bleu/or/rouge — les couleurs du drapeau tchadien. Le design
l'assume :

| Jeton | Clair | Sombre | Usage |
|---|---|---|---|
| `--landing-bg` | `#FAF7F2` ivoire | `#211D18` charbon chaud | fond |
| `--landing-ink` | `#1F1B16` | `#EDE7DB` | texte, boutons pleins |
| `--landing-muted` | `#6B6257` | `#A79E8E` | texte secondaire |
| `--landing-faint` | `#98907F` | `#7A7264` | légendes |
| `--landing-line` | `#E5DFD3` | `#3A342C` | bordures |
| `--landing-card` | `#FFFFFF` | `#2A251F` | tuiles |
| `--landing-terra` | `#C2562F` | `#D97757` | accent unique |
| `--landing-gold` | `#D9A441` | `#D9A441` | em du CTA final |

- **Titres** : Fraunces (serif variable, via `next/font/google`), italique
  terracotta sur le mot-clé. Corps : Inter/system sans (existant).
- **Boutons** : pilule sombre `--landing-ink` (pas le violet de l'app — la
  landing a sa propre voix éditoriale, le violet reste dans le produit).
- Emoji bannis du design (sauf le drapeau 🇹🇩 du footer).

## 3. Structure de la page (implémentée)

1. **Nav** : logo, Capacités / Modèles / Contact (ancres), Se connecter,
   pilule sombre « Ouvrir Toumaï AI ».
2. **Hero** centré : eyebrow « Conçu au Tchad, pour le monde », H1 serif
   76px « L'assistant IA qui parle *votre langue.* », sous-titre, CTA sombre
   + lien flèche.
3. **Fenêtre produit** : maquette fidèle de l'app (sidebar conversations,
   échange Fibonacci avec bloc de code, composer) — le produit réel, pas une
   illustration.
4. **Bande de faits** (remplace la barre de logos mensongère de la maquette
   ChatGPT) : GRATUIT · FRANÇAIS ARABE ANGLAIS · WEB & MOBILE · SANS CARTE
   BANCAIRE — uniquement des faits vérifiables.
5. **Bento « Capacités »** (6 tuiles, 2 hautes) : Mode vocal (orbe
   terracotta), Code (tuile sombre avec snippet), Images (vignette dégradé
   avec la vraie signature « Toumaï AI » en coin — le watermark réellement
   incrusté par le backend), Agent Navigateur (mini-fenêtre navigateur + 3
   étapes), Connecteurs (3 lignes de statut), Multilingue (Bonjour / مرحبا /
   Hello en serif).
6. **Modèles** : « Deux modèles, *zéro confusion.* » — Sao 4 et Toumaï 5
   uniquement (les seuls réels).
7. **CTA final** : bloc charbon arrondi, « Commencez *la conversation.* »,
   bouton crème.
8. **Footer** multi-colonnes : Produit (Chat, Agent, Connecteurs), Compte
   (Créer un compte, Se connecter), Contact (email réel), note Toumaï +
   « Conçu au Tchad 🇹🇩 ».

## 4. Honnêteté du contenu (« n'invente rien »)

- Aucun logo d'entreprise tierce, aucun chiffre d'utilisateurs inventé.
- « Chaque capacité déjà disponible » — les 6 tuiles correspondent à des
  fonctionnalités livrées et testées cette session ou avant.
- 2 modèles affichés = 2 modèles réels dans le sélecteur.
- La vignette « génération d'images » montre la signature en coin parce que
  le backend l'incruste réellement dans les pixels désormais.

## 5. Fichiers

- `docs/design/landing-v3.html` — maquette design autonome (référence).
- `app/page.tsx` — page réécrite selon la maquette.
- `components/Navbar.tsx` — restylée aux jetons landing.
- `app/globals.css` — jetons `--landing-*` (clair + sombre) et police.
- `app/layout.tsx` ou `app/page.tsx` — chargement Fraunces via next/font.
