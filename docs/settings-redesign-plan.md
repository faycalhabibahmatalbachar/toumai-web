# Refonte de la page Paramètres — Plan design / prompt / build

## 1. Référence

Capture fournie par l'utilisateur : page "Connecteurs & Intégrations API" de style
macOS — carte profil (photo + nom + rôle) dans une colonne de gauche, navigation
verticale, barre de recherche, grille de cartes de connecteurs (icône carrée,
badge de statut avec point coloré + horodatage, description, bouton d'action),
et un tableau "Logs d'Activité Récente (Dernières 48h)" en bas de page.

## 2. Prompt de design utilisé (reformulé, niveau "Claude design")

> Redessine la page Paramètres de Toumaï AI pour qu'elle respire la même
> rigueur visuelle que Claude.ai / ChatGPT : colonne de gauche avec une carte
> d'identité (photo, nom réel ou "Session invité", formule d'abonnement) suivie
> d'une navigation par onglets (Profil, Préférences, Connecteurs, Aide &
> Support). Le contenu principal doit rester dans une grille responsive
> (1 colonne mobile → 2 → 3 colonnes desktop) pour les cartes de connecteur,
> chaque carte affichant : icône, nom, description, statut vivant (connecté /
> non connecté / en attente / vérification…) avec horodatage relatif
> ("vérifié à l'instant", "il y a 3 min"), et une zone d'action contextuelle
> (bouton connecter/déconnecter, formulaire inline, code d'appairage). Ajouter
> une recherche pour filtrer les connecteurs par nom, et un journal d'activité
> réel (pas de données factices) qui trace les connexions/déconnexions
> effectives de la session en cours. Respecter strictement les tokens CSS
> existants (`--card`, `--border`, `--surface`, `--primary`, `--success`,
> `--error`, `--text-*`) pour rester cohérent en thème clair et sombre.

## 3. Ce qui a changé (build réel)

- `app/settings/page.tsx` — colonne de gauche élargie (`md:w-48` → `md:w-56`,
  conteneur `max-w-4xl` → `max-w-5xl`) ; ajout d'une carte profil (photo ou
  logo, nom réel via `getProfile()`, "Formule {plan}" ou "Invité") ; ajout de
  l'onglet "Aide & Support".
- `components/settings/SupportTab.tsx` (nouveau) — contact réel
  (`contact@toumaiai.com`) + guide rapide des fonctionnalités existantes
  (Connecteurs, Agent Navigateur, Mode vocal, Réflexion). Aucun contenu
  inventé : uniquement des fonctionnalités déjà livrées.
- `components/settings/ConnectorCard.tsx` — statut réorganisé en haut à
  droite (point coloré + libellé + horodatage relatif via un helper
  `timeAgo()`), icône en haut à gauche, conforme à la référence.
- `components/settings/ConnectorsTab.tsx` — réécriture complète :
  - grille responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (au lieu
    d'un empilement vertical `max-w-lg`) ;
  - barre de recherche filtrant les cartes par nom (masquage CSS `hidden`,
    pas de démontage, pour ne jamais perdre l'état d'un connecteur en cours
    de liaison — ex. code d'appairage WhatsApp en attente) ;
  - `lastChecked` réel : chaque connecteur passe un `Date` posé au moment où
    sa requête de statut aboutit réellement (pas une valeur figée) ;
  - journal d'activité réel : un callback `onLog(label, detail)` remonté
    depuis chaque connecteur (Google, Mail, WhatsApp) à chaque connexion /
    déconnexion effective (succès d'auth Google, envoi du code WhatsApp,
    connexion mail confirmée…), affiché dans une liste chronologique en bas
    de page. Aucune entrée factice — si aucune action n'a eu lieu dans la
    session, le journal l'indique explicitement au lieu d'afficher de faux
    logs.
- `components/settings/ProfileTab.tsx`, `PreferencesTab.tsx` — non modifiés :
  déjà alignés sur les mêmes tokens (`--card`, `--border`, boutons pill,
  labels tertiaires), cohérents avec le nouveau langage visuel sans
  changement nécessaire.

## 4. Écarts assumés par rapport à la référence

- Pas de tableau de logs strict "Dernières 48h" avec pagination : le journal
  est limité aux 20 dernières actions de la session en cours (le backend ne
  persiste pas d'historique de connexions par connecteur pour le moment).
  Construire un vrai historique 48h nécessiterait une table dédiée côté
  backend — hors périmètre de cette passe de design, à envisager si le
  besoin se confirme.
- Le connecteur Météo reste toujours "connecté" (aucune authentification
  requise), donc pas d'horodatage ni de log associé — comportement correct,
  pas un oubli.

## 5. Vérification

- `npx tsc --noEmit` (chadgpt-web) — à exécuter avant commit.
- `npm run build` (export statique) — à exécuter avant commit.
- Test navigateur : recherche filtrant les cartes, connexion/déconnexion
  Google/Mail/WhatsApp mettant à jour le badge + horodatage + journal en
  temps réel, sur mobile (1 colonne) et desktop (3 colonnes).
