# Vérification publique — 9 septembre 2026

## Page Tchad : aucune refonte supplémentaire
curl Windows, réponses HTTP 200, UA Mozilla, curl, Googlebot et Bingbot :
trois marqueurs présents (« De la question au travail accompli. », « Reproduction
de l… », « Avant de commencer. »), ancien bloc h2 Essayer absent.

Cache-Control: public, max-age=0, must-revalidate ; CF-Cache-Status: DYNAMIC.
Age, ETag et Last-Modified absents des réponses observées, pas égaux à zéro.
Le CF-Ray situe ces contrôles au point de présence GIG. Changer de User-Agent
ne reproduit pas l'adresse IP réelle d'un crawler ni tous les points de présence.

Sans slash : 308 vers slash. Domaine principal, www et URL immuable
https://9c21b67c.toumaiai-web.pages.dev/intelligence-artificielle-tchad/
servent la refonte. Cloudflare Pages lie ce déploiement production main à 48ffbfd.
Le projet utilise output: export, pas de serveur Next.js ni ISR à invalider.
www répond 200 et non par redirection ; le canonical désigne le domaine sans www.

Conclusion : aucune ancienne variante reproduite. Pas de purge ou rebuild
nécessaire pour Tchad. Une copie externe ancienne est une hypothèse ; il faut
la date, l'URL finale, les en-têtes et le mécanisme de cache de l'outil externe
pour attribuer la cause avec certitude. Pas de garantie « tous les crawlers ».

## Routes suivantes
Les quatre routes existent. Assistant IA, Modèles et À propos étaient des pages
LegalLayout ; migration vers le système EditorialDocument, textes conservés,
preuve illustrative de rédaction issue des primitives produit, CTA et footer.
Claims modèles atténués et métadonnées sociales dédiées.

/whatsapp/ est un dashboard avec useExigerCompte et API de statut/activité.
Fonctions conservées : métadonnées propres et noindex ajoutés, aucune fausse
page publique ni schema marketing du dashboard. Une landing distincte reste à
définir sans déplacer les liens existants. Privacy/Terms inchangées.
