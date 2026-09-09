# Audit du 9 septembre 2026 — incrément, non certification juridique

## Version publique

15 réponses assistant-ia : domaine, www, alias Pages, déploiement 1fd9425c et requête paramétrée, chacun avec Mozilla/Googlebot/Bingbot. Toutes HTTP 200, même titre actuel. Le titre « Un assistant IA pour vos tâches. » est attendu ; les marqueurs « De la question au travail accompli. » et « Avant de commencer. » appartiennent à Tchad.

SHA256 UTF-8 domaine/www/bypass : B4B62E04BFA8E30E9906718B0920ED3762186A37B666100CA9DD9A98BF85F523.
SHA256 Pages alias/immutable : EF07F99BAB17AFCE6E7FEE49768B8C6FFA2C9B605AFD681150D30D5CB9CD85FA.
Première différence à 39738 : script Cloudflare Web Analytics ajouté avant la fermeture body sur le domaine. Aucun contenu éditorial ancien identifié. CF-Cache-Status DYNAMIC ; Age/ETag/Last-Modified absents. IPv6 non testable : résolution curl -6 échouée. UAs simulés ne sont pas de véritables IP Google/Bing ni une mesure mondiale.

Static export Next.js, pas d’ISR. Service worker public/sw.js : réseau d’abord pour navigation, cache en secours hors ligne ; donc une ancienne copie hors ligne reste possible. Workers routes zone : liste vide. OAuth wrangler valide pour Pages et zone read, sans Cache Purge ; lecture settings/browser_cache_ttl, rulesets et DNS refusée 403 code10000. Purge précédente 401 : aucun succès de purge revendiqué. Il faut un accès zone Cache Purge pour purger, ainsi que Cache Rules Read, Zone Settings Read et DNS Read pour compléter l’inspection. Documentation : https://developers.cloudflare.com/fundamentals/api/reference/permissions/

## Corrections documentaires fondées sur le code

| Sujet | Preuve | Correction |
|---|---|---|
| Actions | backend services/agent_nlu_service.py permet execute_action sans nouvelle confirmation ; orchestrateur distinct utilise confirm | Retrait de la promesse universelle de confirmation |
| Suppression compte | routers/user.py delete_account appelle delete_user_data, peut renvoyer auth_deleted=false | Ne plus garantir une purge universelle immédiate |
| Partage | routers/chat.py shared accessible sans authentification, masque seulement owner_name en anonyme | Distinguer nom masqué, contenu et copies externes |
| Cache local | frontend lib/swr-cache.ts et public/sw.js | Ajouter stockage local et limites hors ligne |
| Audience | HTML public contient static.cloudflareinsights.com | Mentionner Cloudflare Web Analytics |
| Propriété modèles | routage vers fournisseurs tiers, absence de preuve de propriété de tous poids | Réserver les droits et licences tiers |
| Paiement | intégration Moneroo sandbox distincte des droits commerciaux | Préserver sandbox, prix 3000/9000 FCFA et 30 jours manuels |
| SEO juridique | canonical hérité | Canonicals dédiés, métadonnées sociales, sommaires statiques |

## Validation juridique et technique restant nécessaire

Pas d’avis juridique ni de certification de conformité. Faire valider localement : clause de droit tchadien, plafond de responsabilité (actuellement 12 mois, zéro gratuit), mineurs/âge, identité juridique du responsable, bases légales, droits et voies de recours selon pays desservis, remboursements et obligations de conservation. Aucun texte tchadien inventé.

Compléter le registre réel des fournisseurs/modèles et contrats, pays de traitement, durées exactes par catégorie/backups, usage effectif pour entraînement, et autorisations des partenaires linguistiques. Le code ne prouve pas les engagements contractuels. Référence méthodologique de transparence, sans présumer l’application territoriale du RGPD : https://www.cnil.fr/fr/informer-les-personnes

Vérifier séparément la suppression effective R2, les sauvegardes et l’échec partiel auth_deleted=false. Les corrections de texte ne réparent pas ces éventuels écarts d’exécution. Auditer les chemins automatiques avant toute promesse de confirmation systématique.
