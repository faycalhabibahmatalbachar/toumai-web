# Toumaï AI — Founding Partners : guide d'exécution

**Préparation :** 18 octobre 2026. **Statut :** prospection et candidature ; **aucun partenaire, revenu ou pilote signé n'est présumé**.

## Objectif et périmètre

Identifier et vérifier **20 organisations**, qualifier leurs besoins, puis sélectionner **3 à 5 pilotes** si la faisabilité, les moyens et les accords le permettent. Un pilote durerait **30 à 60 jours**, durée indicative à confirmer par écrit.

**Livré :** page `/partenaires-fondateurs`, démonstrations interactives scénarisées **sans IA ni données réelles**, candidature envoyée via l'API `POST /api/v1/contact`, modèles opérationnels.

**Non livré :** CRM, clients connectés, agents B2B déployés, accords, paiement, statistiques réelles et test de réception de courriel de bout en bout.

## Recherche et qualification de 20 cibles

Utiliser `founding-partners-pipeline-template.csv` comme **liste de segments à rechercher**, et non comme liste de prospects confirmés. Aucune organisation n'est inventée. Vérifier pour chaque cible l'existence, l'activité, la pertinence, le canal de contact professionnel autorisé et la source.

Ne **jamais** committer les noms, adresses, numéros, courriels, contrats ou notes d'entretien dans ce dépôt public. Conserver la version remplie dans un espace privé, avec accès restreint et politique de conservation définie. Pas de démarchage de masse ni de sollicitations WhatsApp automatisées sans base légitime et opt-in.

### Score de qualification sur 100

| Critère | Max | Preuve attendue |
|---|---:|---|
| Problème concret, fréquent et mesurable | 25 | Tâches et fréquence |
| Référent métier disponible | 20 | Fonction et engagement vérifiés |
| Données de test autorisées et sûres | 20 | Jeu fictif ou autorisation écrite |
| Faisabilité, budget et plafonds | 20 | Coût par tâche, limites et calendrier |
| Indicateur de réussite | 15 | Baseline et cible explicites |

**Règle interne proposée :** score ≥ 70, **sans aucun blocage sécurité, confidentialité, conformité ou coût**. La sélection reste humaine ; un score n'est ni une promesse ni un contrat.

## Parcours opérationnel

1. **Vérification :** 20 fiches documentées à partir de sources autorisées.
2. **Prospection personnalisée :** utiliser les messages de `founding-partners-messages.md`, noter seulement les envois et réponses réellement constatés.
3. **Entretien (20–30 min) :** problème, volume, public, langue, données, référent, indicateur, calendrier.
4. **Cadrage écrit :** périmètre, données autorisées, validation humaine, plafond FCFA, durée, responsabilités, incident, résiliation et réversibilité.
5. **Démonstrateur :** scénario fictif approuvé ; ne pas le présenter comme une connexion IA réelle.
6. **Pilote :** seulement après accord, avec limites techniques, coût plafonné et supervision.
7. **Bilan :** scorecard, baseline, mesures observées, coût réel, incidents et décision.
8. **Offre commerciale :** devis séparé uniquement si la valeur et la marge sont défendables.

## Démonstrateurs à prototyper

| Secteur | Parcours | Données permises | Indicateurs à tester |
|---|---|---|---|
| Éducation | FAQ d'inscription et orientation | FAQ validée par l'établissement | Exactitude vérifiée, délai de réponse |
| Commerce | Catalogue et tri des demandes | Catalogue fictif puis autorisé | Temps de première réponse, corrections |
| Organisation | Recherche documentaire avec citations | Documents autorisés et expurgés | Précision des références, temps de recherche |

La démo publique est **déterministe**, ne sollicite aucun modèle et n'utilise aucun document privé. Chaque intégration réelle nécessite son propre cadrage et ses tests.

## Feuille de route 30 / 60 / 90 jours

| Période | Travail | Critère de sortie vérifiable |
|---|---|---|
| J1–30 | Publier la page, tester la réception du formulaire, vérifier 20 cibles, préparer les messages, qualifier les réponses | Page déployée, courriel de test réellement reçu, fiches sourcées dans un espace privé |
| J31–60 | Tenir les entretiens, noter les scores, préparer 1–2 démonstrations fictives et estimer les coûts | Scorecards, budget plafond, autorisations ; aucun pilote sans accord |
| J61–90 | Lancer jusqu'à 3–5 pilotes **si** les moyens le permettent, mesurer et faire les bilans | Résultats réels, décisions GO / ITERATE / STOP et éventuels devis |

**Tous les nombres sont des objectifs, pas des résultats déjà obtenus.**

## Budget de test en FCFA (hypothèses internes)

Simulation de trésorerie pour **3 pilotes**, à recalculer avant tout engagement :

| Poste | Plafond fictif |
|---|---:|
| Consommation technique, 3 × 20 000 FCFA | 60 000 |
| Connexion et communications | 15 000 |
| Déplacements et démonstrations | 30 000 |
| Réserve imprévus | 25 000 |
| **Total simulé** | **130 000 FCFA** |

**Ce budget n'est ni un coût observé ni un financement disponible.** Chiffrer en plus le temps humain, les coûts d'hébergement, les taxes et les frais contractuels. Si les fonds manquent, limiter l'activité à une démo distante sur données fictives sans dépense nouvelle. Chaque pilote exige un plafond individuel et une règle d'arrêt.

## KPI : définitions et preuves

- **Cible vérifiée :** organisation et source réellement contrôlées.
- **Contact envoyé :** message effectivement transmis via un canal autorisé.
- **Réponse :** retour réellement reçu ; une ouverture supposée ne compte pas.
- **Entretien :** rencontre effectivement tenue.
- **Pilote actif :** accord écrit et date de début.
- **Valeur :** mesure contre la baseline, validée par le partenaire.
- **CA encaissé :** paiement réellement reçu et rapproché.
- **Marge :** recettes encaissées moins coûts techniques, support, déplacements et charges attribuables.

Suivi hebdomadaire via `founding-partners-scorecard-template.csv` dans un espace privé. Ne jamais présenter des objectifs comme des réalisations.

## Garde-fous

- Aucun accès aux conversations, fichiers, prompts ou messages WhatsApp privés des utilisateurs pour la prospection ou le sponsoring.
- Pas de dossiers médicaux, crédit, identité ou décisions sensibles sans revue dédiée.
- Pas de promesse de gratuité illimitée, d'autonomie totale, de délai garanti ou de revenu.
- Le formulaire est un **relais e-mail**, pas un CRM. Vérifier la réception réelle, les erreurs 429/502/503 et le mécanisme de réponse avant la prospection.
- Respecter les règles applicables à la protection des données, aux messages commerciaux et à Meta/WhatsApp.
- Aucun logo, témoignage, chiffre d'audience ou partenaire annoncé sans preuve et autorisation.

## Décision de commercialisation

**GO** seulement avec : accord écrit, valeur mesurée, coûts et marge estimés positifs à volume borné, sécurité validée, supervision humaine, capacité de support et contrat adapté. Sinon **ITERATE / STOP**.

Utiliser `founding-partners-brief-pilote.md` pour chaque cadrage, et demander une validation humaine des textes, conditions et budgets avant toute proposition contractuelle.
