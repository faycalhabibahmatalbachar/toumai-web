# Refonte IA au Tchad — 9 septembre 2026

## Périmètre
Une seule URL migrée : /intelligence-artificielle-tchad/. Les autres pages,
les prix, la facturation et l'authentification restent inchangés.

## Avant
- LegalLayout, texte linéaire, aucune preuve produit ni vrai hero.
- Titre répété par le template racine : Toumaï AI deux fois.
- Hreflang arabe vers une présentation différente, pas une traduction équivalente.
- Claims non étayés : corpus collecté localement, trente langages, application
  Android native publiée, fonctionnalités gratuites sans quotas, superlatif historique.
- Mesure navigateur de production ponctuelle : TTFB 490 ms, DOMContentLoaded
  1136 ms, DOM sérialisé 51 756 caractères. Pas une mesure terrain de CWV.

## Après
- Hero produit, palette sombre Sahel, terracotta et vrai logo existant.
- Réutilisation des primitives de la homepage. Exemple de rédaction explicitement
  illustratif, pas une transaction, réponse live ou mesure de performance.
- Sections contexte, capacités, langues (arabe RTL), réseau, contrôle, origine,
  FAQ native et CTA. Aucun JS ajouté par ces composants serveur, aucune vidéo.
- Title absolu, canonical inchangé, métadonnées sociales dédiées.
- WebPage + BreadcrumbList + FAQPage. Identité reliée à #organisation ; pas de
  nouvelle Person ou de certifications inventées. Aucun faux hreflang traduit.
- Corpus non documenté retiré ; Android limité à l'accès navigateur vérifiable.
- Réseau : lib/swr-cache.ts et lib/network-quality.ts confirment cache et suivi
  de liaison vocale, pas de fonctionnement génératif hors ligne.
- Modèles, fichiers et connecteurs présentés avec leurs conditions de disponibilité.

## Comparaison de structures, pas de copie
Pages consultées : https://claude.com/product/overview,
https://chatgpt.com/overview/, https://deepmind.google/models/gemini/,
https://mistral.ai/products/vibe/. Principes retenus : promesse lisible, preuve
visible, capacités regroupées, CTA et contrôle. Perplexity : contenu non exploitable
dans l'outil de recherche, donc pas de conclusion détaillée sur sa structure.

## Contrôles
Build réussi ; lint ciblé réussi ; tests existants réussis ; contrôle spécifique
title/canonical/FAQ/schema/RTL/liens réussi. Captures avant/après conservées dans
output/playwright. Largeurs 375/390/430/768/1024/1440 : un H1, aucun débordement.
FAQ native testée à l'ouverture. Serveur statique local : trois 404 de prefetch RSC
sur des liens ; les HTML cibles existent. Vérifier également le comportement CDN.
Ne pas présenter ces tests comme audit WCAG complet ni score Core Web Vitals.

## Pages suivantes — pas migrées avant validation de cette page
1. /assistant-ia/ — produit, même fondation visuelle.
2. /whatsapp/ — produit/connecteur, vérifier disponibilité et permissions.
3. /models/ — produit, catalogue réel et limites.
4. /a-propos/, /en/about/, /ar/about/, /press/ — entreprise.
5. /security/, /privacy/, /terms/ — confiance, garder une lecture documentaire.
6. /arabe-tchadien/ — SEO linguistique uniquement après documentation des capacités.
7. /recherche-web/, /documents/, /voix/ — produit, après preuves vérifiables.
8. /agent-navigateur/, /automatisations/, /connecteurs/ — produit, après audit.
Documentation : aucune nouvelle URL /docs/ ou /help/ créée sans contenu spécifique.
