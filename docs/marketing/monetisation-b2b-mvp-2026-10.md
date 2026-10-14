# Toumaï AI — Monétisation B2B sans paiement direct des utilisateurs

**Version :** 14 octobre 2026  
**Statut :** cadrage commercial + page de demande de partenariat en PR ; aucune vente, recette ou annonceur présumés.

## Objectif et priorités

Conserver l'usage gratuit du produit grand public et financer son fonctionnement par des **contrats professionnels**, **sponsors** et **partenariats**. La publicité à la performance reste secondaire tant que l'inventaire, l'éligibilité et les coûts de diffusion ne sont pas mesurés.

Priorités pour une équipe avec un budget limité :

1. **Toumaï Business :** démonstration / cadrage d'un assistant pour une école, une PME, un commerce ou un service ; contrat B2B de configuration, support et consommation encadrée.
2. **Sponsoring direct :** financer une ressource, une initiative ou un emplacement public, annoncé comme sponsorisé ; pas d'ingérence dans les réponses IA.
3. **Partenariats / commissions :** relation commerciale consentie, attribution vérifiable, paiement uniquement sur résultat défini par contrat.
4. **Publicité automatisée :** uniquement après revue d'éligibilité, consentement, exigences de chaque régie, analytics fiables et rendement net.

## MVP livré dans cette branche

- \`/entreprises\` : offres décrites comme projets à étudier, sans capacité technique ou client fictif.
- Formulaire léger et accessible : nom, e-mail, organisation, secteur, type de demande, besoin, consentement de contact.
- Réutilisation de \`POST /api/v1/contact\` : échappement HTML côté serveur, limite par IP (5/h dans le processus), honeypot, relais Resend et échec explicite si l'envoi est indisponible.
- CTA depuis la section Entreprise de l'accueil, lien en pied de page, lien sur /contact, route SEO.
- Aucun SDK publicitaire, cookie de profilage, collecte des conversations ou nouveau coût d'infrastructure.

**Limite importante :** ce formulaire transmet les demandes par courriel ; ce n'est pas un CRM avec stockage, pipeline, attribution ou facturation. La délivrabilité Resend doit être vérifiée sur l'environnement réellement déployé.

## Offres test (hypothèses — ne pas présenter comme tarifs officiels)

| Produit | Unité de vente | Exemple pour calculs internes | Condition |
|---|---|---:|---|
| Toumaï Business | Installation + mensuel | 150 000 XAF/mois | Définir le volume et les coûts d'inférence |
| Sponsoring | Campagne forfaitaire | 50 000 XAF/campagne | Définir placement, période et audience réelle |
| Mise en relation | Prospect commercial **qualifié** | 2 000 XAF/prospect | Consentement, critères d'attribution et preuve |
| Campagnes à impressions | 1 000 impressions servies et éligibles | 300 XAF RPM | Hypothèse, pas une promesse ni un tarif Google |

Ne jamais fixer un tarif contractuel sans connaître le coût d'inférence, les coûts humains, les commissions de paiement, le nombre de clients simultanés et les obligations du contrat.

### Équation de marge

\`CA net encaissé - (inférence + hébergement + stockage + communications + support + frais de paiement + taxes applicables) = marge opérationnelle estimée\`.

**Seuil test :** une offre ne doit pas être vendue en illimité sans plafonds techniques et budgétaires. Calculer coûts médian et P95 par tâche, projections à 100 et 1000 interactions et un plan de repli.

## Processus commercial minimum

1. Réception de la demande dans la boîte de contact. Étiqueter en B2B-BUSINESS, B2B-SPONSOR ou B2B-PARTNER.
2. Réponse humaine : accusé de prise en charge, besoin, nombre d'utilisateurs, données manipulées, langues, canaux, environnement, budget éventuel.
3. Qualification : pertinence, preuve de budget, conformité, faisabilité opérationnelle. Pas d'accès aux données privées du grand public.
4. Démonstration sur jeux de données fournis pour le test et autorisés ; pas de promesses d'autonomie non certifiées.
5. Devis écrit avec périmètre, prix, SLA réaliste, responsabilités, confidentialité, limites de volume, réversibilité.
6. Facturation / encaissement avec la méthode autorisée au nom de l'entreprise, rapprochement comptable et confirmation humaine.
7. Suivi de l'usage agrégé et des coûts, renouvellement ou clôture.

## Indicateurs hebdomadaires

- Visites /entreprises (agrégées avec outil déjà autorisé), clics CTA, formulaires envoyés **réellement** avec succès.
- Demandes qualifiées, rendez-vous fixés, démonstrations, devis, contrats signés, CA encaissé, charges et marge.
- MRR B2B **encaissé**, churn, coût de support/client, coût d'inférence/contrat, revenus de sponsoring livrés.
- Pour campagnes futures : inventaire approuvé, impressions vérifiées, clics antifraude, facturation approuvée, consentement et taux de plaintes.

**Ne pas** déclarer des impressions, ventes, « demandes reçues » ou partenaires sans preuves observables.

## Architecture cible pour la phase suivante (non implémentée)

### Gestion des prospects / CRM

- \`b2b_leads\` : id, created_at, organization_name, contact_name, contact_email, segment, lead_type, description, state, assigned_staff_id, consent_at, source, retention_until.
- États : \`new -> qualified -> meeting -> proposal -> won|lost\`, historisation des transitions.
- Contrôle strict par rôle pour lecture/admin, export audité, suppression selon politique et lois applicables.
- Notifications événementielles avec déduplication ; pas de PII dans les logs.

### Toumaï Ads — vente directe seulement en premier

- \`advertisers\` : identité commerciale vérifiée et facturation.
- \`campaigns\` : start/end, budget cap, currency XAF, objective, placement whitelist, status (\`draft/pending_review/approved/paused/ended\`), review_owner.
- \`creatives\` : titre, texte, visuel autorisé, URL HTTPS soumise à validation, marquage « Sponsorisé ».
- \`events_aggregate_daily\` : campaign_id, placement_id, date, impressions_validated, clicks_validated, sans conversation, identifiant personnel brut ou empreinte de message.
- \`invoices\` et \`payments\` : rapprochement comptable ; ne pas exposer le trafic public au système de paiement.
- **Désactivation par défaut** et contrôle manuel avant chaque diffusion ; aucun ciblage par contenu privé du chat, des pièces jointes ou de WhatsApp.
- Anti-fraude (dédoublonnage, plafond d'affichage, trafic non humain), audit des liens sortants, droits de retrait et signalement.

### Barrières de lancement

- Revue des règles AdSense / AdMob et des réglementations locales avant activation.
- WhatsApp Business et Meta : vérifier le cas d'usage de l'assistant commercial, les permissions et les règles de messages sponsorisés ; ne jamais injecter de publicité dans les échanges privés.
- Contrôle d'accès aux données, consentement, documentation commerciale des limites et revue sécurité / juridique.
- Tests automatisés des droits, de l'absence de ciblage conversationnel et de non-diffusion des annonces non approuvées.

## Exécution 90 jours

| Échéance | Travail | Condition de sortie |
|---|---|---|
| J1–15 | Page, canal de contact, contrôle API, coûts par tâche, grille pilote | Un prospect peut envoyer une demande et recevoir un vrai accusé ; coût documenté |
| J16–30 | Approcher 15–20 organisations identifiées avec une proposition adaptée | Rendez-vous et retours enregistrés ; aucune statistique inventée |
| J31–60 | Pilote de 1–2 assistants B2B, supervision, devis, mesure de marge | Validation fonctionnelle et budget borné, contrat signé avant facturation |
| J61–90 | Tester 1 sponsor direct, un tableau de bord minimal, processus comptable | Campagne approuvée et métriques vérifiables ; décision d'extension |

## Mesures immédiates et exclusions

- Pas de publicité déguisée en réponse naturelle de l'IA.
- Pas de revente de conversations, prompts, contacts ou données privées.
- Pas de collecte intrusive ; pas de transmission des conversations WhatsApp aux annonceurs.
- Pas de facturation automatique du grand public et pas de promesse de revenus.
- Aucun changement au pipeline de paiement, chat, WhatsApp, authentification ou stockage existant dans ce MVP.

### Vérification avant mise en production

Exécuter \`npm run typecheck\`, \`npm run lint\`, \`npm run test:b2b\`, et vérifier sur l'environnement de préproduction :
- affichage mobile / desktop et thème sombre / clair ;
- soumission valide, e-mail de réception, échec 429 et 503, offline ;
- absence de double soumission et de données sensibles dans analytics / console ;
- canonical / sitemap, liens d'entrée, mentions de confidentialité ;
- déploiement et rollback documentés.

**Remarque :** l'intégration HTTP a été prévue depuis le code existant ; la validation d'e-mail en production n'est pas attestée par la simple existence du formulaire.
