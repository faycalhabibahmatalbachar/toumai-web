# PROMPT — Finaliser la console d'administration SaaS de Toumaï AI

> À copier-coller tel quel dans une IA de développement (« vibe coding »).
> Objectif : compléter la console admin de Toumaï AI de bout en bout, **en données 100 % réelles**, sans aucune donnée simulée.

---

## 0. TON RÔLE

Tu es **Lead Fullstack Engineer + Product Designer** d'un produit SaaS d'IA grand public (Toumaï AI, assistant IA francophone pour le Tchad et l'Afrique francophone). Tu dois **terminer la console d'administration web** au niveau d'un vrai produit SaaS (comparable à la console d'Anthropic / OpenAI / Intercom / Langfuse), en branchant **chaque écran sur de vraies données** issues du backend et de la base.

### Règles absolues (ne jamais enfreindre)
1. **AUCUNE DONNÉE MOCK / SIMULÉE / EN DUR.** Chaque chiffre, liste, graphe doit venir d'un endpoint réel. Si la donnée n'existe pas encore, tu **crées l'endpoint backend + la requête SQL** qui la produit — tu ne l'inventes pas. Si une donnée est vraiment indisponible, affiche « — » ou un état vide honnête, jamais une valeur fictive.
2. **Ne casse jamais l'existant.** Le site public (landing, chat, WhatsApp…) et l'app mobile partagent le même backend. Toute évolution d'endpoint doit être **rétrocompatible** (ajouter des champs/params optionnels, jamais en retirer).
3. **Chaque page gère 4 états explicites** : chargement (skeleton), vide, erreur (avec « Réessayer »), données présentes.
4. **Pagination serveur partout** ; jamais de `SELECT *` sans limite ; graphes en lazy-load.
5. **Accessibilité AA**, navigation clavier, `aria-label` sur les icônes cliquables, thème **sombre par défaut** + bascule clair.
6. **Français par défaut**, structure i18n prête pour l'arabe et l'anglais.
7. **TypeScript strict**, composants réutilisables, zéro duplication.
8. **Ne PAS implémenter Mobile Money / paiement** (hors périmètre pour l'instant) — mais préparer la place des écrans Facturation.
9. **Commits** : auteur `Faycal Habib Ahmat <iamfaycalhabib@gmail.com>`, **jamais** de `Co-Authored-By`.

---

## 1. ARCHITECTURE & STACK (existant — respecter)

| Élément | Détail |
|---|---|
| **Frontend** | `chadgpt-web` — **Next.js 16 (App Router) en export statique** (`output: "export"`, `trailingSlash: true`), hébergé sur **GitHub Pages**. **PAS de SSR, pas de route API Next, pas de Server Component data-fetch, pas de route dynamique `[id]` sans `generateStaticParams`.** L'admin est une **SPA cliente** qui appelle le backend REST. React 19, Tailwind v4. Design system **TailAdmin** (MIT) recoloré en terracotta Sahel. Charts : **ApexCharts** (import dynamique `ssr:false`). |
| **Backend** | `sayibiai_backend` — **FastAPI + Supabase/PostgreSQL**, déployé sur **Northflank**. Client `service_role` (bypass RLS). Réponses au format `{ success, message, data }`. Auth admin séparée : `POST /api/v1/admin/auth/login` → JWT 8 h ; toutes les routes `/api/v1/admin/*` exigent ce jeton. |
| **API base** | `NEXT_PUBLIC_API_BASE` (voir `lib/config.ts`). |
| **Déploiement** | Push `main` → GitHub Actions (`.github/workflows/deploy.yml`) fait `npm ci` + `npm run build` → Pages. **⚠️ Toujours valider avec `rm -rf node_modules && npm ci && npm run build` PROPRE avant de pousser** (un `next build` sur un `node_modules` sale masque les deps manquantes). `.npmrc` = `legacy-peer-deps=true`. **Ne jamais lancer deux `npm install` en parallèle** (course sur `package.json`). |

### Contraintes de l'export statique (pièges à éviter)
- Pas de `useSearchParams()` sans `<Suspense>` → lire les query params via `window.location.search` dans un `useEffect`.
- Le détail d'une entité (utilisateur, conversation) se fait via **drawer/panneau client** (pas de route `/admin/users/[id]`).
- Providers (thème, sidebar, toasts) dans `app/admin/layout.tsx` ; le chrome (sidebar/header) + garde d'auth dans un composant client englobant chaque page (`AdminChrome`), **sauf la page login**.

---

## 2. CLIENT API & COMPOSANTS (réutiliser, ne pas réinventer)

- `lib/admin-api.ts` : client typé (login, session localStorage, `adminRequest` qui déballe `data`, gestion 401/403). **Ajoute-y** chaque nouvel endpoint typé.
- `components/admin/kit.tsx` : `PageHeader`, `Card`, `Button`, `Badge`/`StatusBadge`, `Table/Th/Td`, `DataState` (les 4 états), `BlockState`, `Pagination`, `SearchInput`, `Placeholder`, formatteurs `fmtNum/fmtDate/fmtDateTime`.
- `components/admin/Drawer.tsx`, `components/admin/Chart.tsx` (LineChart/BarChart/DonutChart), `components/admin/AdminChrome.tsx`.
- Navigation : `layout/AppSidebar.tsx` (menu Toumaï).

---

## 3. ÉTAT ACTUEL — ce qui est FAIT vs PLACEHOLDER

**Fait, branché données réelles :**
- Auth admin (login), Dashboard (KPIs `fn_dashboard_kpis` + contrôle à distance de l'app mobile : maintenance, annonce, feature flags).
- **Utilisateurs** : liste (filtres plan/statut/langue/**type de compte inscrits-vs-invités**/recherche), profil 360° à onglets (Général, Utilisation IA, Conversations, Activité, Modération, Intelligence avec scores engagement/churn/upsell/LTV/santé). Distinction comptes invités anonymes (`guest-…@guest.toumaiai.com`) vs inscrits.
- **Conversations** : explorateur (bandeau KPI, filtres modèle/langue/signalées/tri, table user-joint), drawer replay (métadonnées par message, feedback 👍/👎, carte user, actions modération, export/copie JSON, liens croisés).
- **Modération** : file (stats, détection IA + barres de gravité, raccourcis clavier j/k/a/w/b, lien conversation).
- **Modèles & IA** (usage réel + donut), **Analytics/vue d'ensemble** (courbe + géo + funnel), **Analytics/rétention** (cohortes M0–M12), **Facturation/overview** (plans + usage), **Équipe**, **Audit**, **Paramètres/Général**, **Paramètres/Sécurité** (santé système).

**Placeholder « Bientôt disponible » (à implémenter en réel) :**
`users/segments`, `users/flagged`, `conversations/moderation`, `models/prompts`, `models/versions`, `moderation/rules`, `billing/plans`, `billing/transactions`, `billing/promos`, `analytics/reports`, `campaigns`, `flags`, `support`, `integrations/api-keys`, `integrations/webhooks`, `integrations/sms`, `settings/locales`.

**Manquant transversal (à créer) :** vrai **2FA TOTP**, **matrice RBAC** éditable, **command palette ⌘K**, **notifications** (cloche + centre), i18n effectif ar/en, exports CSV/PDF, changement du compte admin seed par défaut.

---

## 4. BACKEND DISPONIBLE (réutiliser en priorité)

Routes admin déjà exposées (`routers/admin.py`, `admin_channels.py`, `admin_security.py`, `admin_staff.py`) :
`/auth/login|me|forgot-password|reset-password` · `/dashboard/kpis|realtime` · `/users` (+ `/{id}`, `/{id}/activity`, `/{id}/media`, `/{id}/notes`, `/{id}/tags`, `/{id}/actions`, `/{id}/ban`, `/{id}/status`, `/{id}/reactivate`, `/{id}/data`, `/users/bulk`, `/users/nl-search`, `/users-export/stream`) · `/assistant/chat` · `/analytics/daily|cohorts|funnel|geo` · `/models/stats|endpoints|usage-trend|test` · `/moderation/queue|{id}/decide|stats` · `/billing/overview|usage` · `/system/health|logs` · `/audit/logs` · `/team` · `/settings` (+ `PUT /settings/{key}`) · `/conversations` (+ `/stats`, `/{id}/messages`, `/messages/{id}/flag`) · `/webhooks` · canaux WhatsApp/Facebook · sécurité incidents/blocked-ips.

Tables clés : `users`, `chat_sessions`, `messages` (avec `metadata`, `has_image`, `image_urls`), `message_feedback` (👍/👎), `usage_logs`, `documents`, `generated_files`, `notifications`, `moderation_queue`, `admin_users` (6 rôles + `permissions[]`), `admin_audit_log` (immuable), `admin_settings`, `admin_permissions` (RBAC), `admin_blocked_ips`, `admin_user_tags/notes`, `admin_saved_segments`, `admin_webhooks`. Fonctions : `fn_dashboard_kpis`, `fn_daily_stats`, `fn_user_cohort_retention`, `fn_analytics_funnel`, `fn_conversation_stats`. Vues : `v_admin_users_full`, `v_model_stats`, `v_endpoint_stats`, `v_plan_distribution`, `v_daily_stats`.

**Réalité des données** : ~191 utilisateurs dont ~162 **invités anonymes** (`guest-…@guest.toumaiai.com`) et ~29 inscrits. Toujours distinguer les deux. Pas d'intégration paiement → pas de revenu/ARPU réel (utiliser les scores calculés du moteur user-intel pour churn/LTV, et laisser ARPU vide tant que la facturation n'est pas branchée).

---

## 5. SPÉCIFICATION COMPLÈTE — PAGE PAR PAGE

Pour **chaque** page : titre + breadcrumb + actions à droite ; les 4 états ; pagination serveur ; wired à un endpoint réel **nommé**. Quand un endpoint manque, **crée-le** côté backend (requête SQL/vue/fonction) + ajoute-le à `lib/admin-api.ts`.

### 5.1 Dashboard (fait — à enrichir)
Ajouter : sélecteur de période global (7/30/90 j) qui recalcule les cartes ; mini-sparklines par KPI (`daily_trend`) ; widget « Activité récente » (flux `realtime`/audit) ; widget « Santé système » (`/system/health`) ; bouton « Exporter le rapport » (PDF/CSV).

### 5.2 Utilisateurs
- **Liste** (fait) : garder invités/inscrits, ajouter colonnes **plateforme** (dériver de `has_fcm`, canaux WhatsApp/Facebook via `admin_channels`) et **provider de login** si dispo (sinon ne pas afficher). Ajouter **sélection multiple + actions groupées** (suspendre, notifier, ajouter à un segment, exporter) via `/users/bulk` et `/users-export/stream`. Filtres sauvegardés.
- **Profil 360°** (fait) : ajouter onglets **Sécurité** (email vérifié, 2FA, dernières connexions/IP via `admin_security`/`usage_logs`, sessions actives — créer endpoint `/users/{id}/sessions` si besoin), **Connexions** (Google/Facebook/WhatsApp/Gmail/Drive/Calendar — statut réel des connecteurs OAuth ; créer `/users/{id}/connections`), **Permissions** (voir 5.7), **Notifications** (historique `notifications`). Ajouter graphes **consommation IA** (tokens/jour via `usage_logs`, images/audio/vision/OCR/web/API — créer `/users/{id}/consumption`). Notes internes + tags (endpoints existants).
- **Segments & cohortes** (placeholder → réel) : liste `admin_saved_segments` ; builder de règles (plan, dernière activité, région, langue, type de compte…) avec **aperçu du compte matchant en temps réel** (réutiliser filtres `/users`) ; utilisable comme cible de campagne. Créer endpoints CRUD segments si absents.
- **Signalés / bannis** (placeholder → réel) : `/users?status=banned` + `moderation_queue` par user ; détail avec preuves, actions (ignorer/avertir/suspendre/bannir) tracées en audit.

### 5.3 Conversations
- **Explorateur** (fait) : ajouter **recherche plein-texte dans le contenu** des messages (créer endpoint `/conversations/search` : ilike sur `messages.content`, avec disclaimer confidentialité + réservé aux rôles habilités) ; colonnes satisfaction et coût estimé (dérivé tokens×tarif modèle). Sélection multiple + export.
- **Détail (replay)** (fait — à approfondir) : rendre la fiche **plus détaillée** — panneau latéral droit permanent avec métadonnées de session (modèle, langue, tokens, coût total, durée, satisfaction), timeline horodatée, coût/latence par message (si dispo dans `usage_logs` corrélé), bouton « Marquer comme exemple qualité » (créer table `quality_examples` + endpoint), navigation message↔message, et le « signaler » (fait). Confidentialité : masquer/afficher le contenu selon le rôle.
- **File de modération conversations** (placeholder) : réutiliser la modération 5.4 filtrée sur les messages ; vue « chat replay » avec contexte (2 messages avant/après).

### 5.4 Modération (fait — à compléter)
- **Règles & filtres automatiques** (placeholder → réel) : éditer les seuils d'auto-modération (`admin_settings.moderation_auto_threshold` : sexual/violence/hate/self_harm/spam) ; activer/désactiver actions automatiques. Wired à `PUT /settings/{key}`.
- File : ajouter contexte (messages avant/après), escalade à un admin senior, note interne obligatoire à chaque décision (déjà tracée en audit).

### 5.5 Modèles & IA
- **Configuration** (fait) : ajouter CRUD des modèles connectés (fournisseur, clé API masquée, température/max_tokens/top_p), **bouton « Tester la connexion »** (`/models/test`), modèle par défaut + **fallback par glisser-déposer**. Créer table `ai_models` + endpoints si la config n'est pas déjà en base.
- **Prompts système / personas** (placeholder → réel) : éditeur avec coloration des variables `{{…}}`, compteur de tokens, **versioning** (chaque save = version horodatée), **diff visuel** entre versions, restauration, mini-playground de test (`/models/test` ou `/assistant/chat`), Publier ≠ Enregistrer avec impact (« affectera X utilisateurs actifs »). Créer tables `system_prompts` + `system_prompt_versions` + endpoints.
- **Historique des versions** (placeholder → réel) : liste des versions de prompts/config, diff, restauration.

### 5.6 Facturation & Abonnements (sans paiement)
- **Plans & tarifs** (placeholder → réel) : table des plans (`admin_settings.allowed_plans` + quotas `free/pro_requests_per_day`) avec nb d'abonnés (`v_plan_distribution`), édition inline des limites (`PUT /settings/{key}`) + avertissement d'impact.
- **Transactions / Codes promo** : **écrans préparés mais désactivés** (« Nécessite l'intégration paiement — hors périmètre actuel »). Ne pas simuler de transactions.

### 5.7 Équipe & Rôles / Permissions
- **Équipe** (fait) : ajouter **inviter un membre** (email + rôle → lien d'invitation ; créer endpoint invite), activer/désactiver, changer rôle, forcer 2FA.
- **Matrice RBAC** (à créer) : croisement rôles × modules × actions (CRUD), éditable, wired à la table `admin_permissions` (créer endpoints `GET/PUT /admin/permissions`). Le front masque les entrées de menu/actions selon les permissions (le backend reste l'autorité).

### 5.8 Sécurité & Auth
- **2FA TOTP réel** (à créer) : backend `pyotp` + table `admin_totp_secrets` + endpoints `enroll` (QR otpauth), `verify`, `disable`, `trust-device` (30 j) ; flux front (QR + code 6 chiffres) après login pour Admin/Super Admin. Verrouillage après 5 échecs. Tout tracé en audit.
- **Paramètres/Sécurité** (fait santé système) : ajouter politique mot de passe, durée de session, **whitelist IP** (`admin_blocked_ips` + `admin_security`), forcer 2FA global.

### 5.9 Analytics (fait vue d'ensemble + rétention)
- **Rapports personnalisés** (placeholder → réel) : builder (métriques cochables, type de viz, période) → générer ; bibliothèque de rapports sauvegardés (créer table `admin_reports` + endpoints) ; planification d'envoi email récurrent (créer job).
- Enrichir : heatmap sessions par heure/jour (`usage_logs`), funnel avec taux par étape, **churn** (dérivé cohortes), **LTV/engagement** (scores user-intel agrégés). **ARPU/revenu** = préparés mais vides tant que paiement absent.

### 5.10 Opérations
- **Notifications & Campagnes** (placeholder → réel) : liste campagnes (envoyées/planifiées/brouillons + taux ouverture/clic) ; wizard 3 étapes (Cible = segment/utilisateur/tous → Contenu push/SMS/email/in-app avec aperçu → Planification) → récap + envoi (bouton distinct rouge pour envoi de masse). Réutiliser `notifications` + segments ; créer tables `campaigns` + endpoints d'envoi (FCM déjà présent).
- **Feature Flags & A/B** (placeholder → réel) : les `app_feature_*` de `admin_settings` en toggles + pourcentage de rollout (slider) + ciblage segment ; A/B : variantes, répartition trafic, métrique de succès, significativité. Créer table `feature_flags`/`ab_tests` si besoin.
- **Support & Tickets** (placeholder → réel) : inbox (statut/priorité/canal) ; vue thread façon messagerie, réponses prédéfinies (macros), assignation, tags. Créer tables `support_tickets` + `ticket_messages` + endpoints (canal WhatsApp/Facebook déjà là pour l'origine).
- **Intégrations — Clés API** (placeholder → réel) : liste clés (scope, dernière util, date), générer (affichée une fois), révoquer. Créer table `api_keys` + endpoints.
- **Intégrations — Webhooks** (placeholder → réel) : réutiliser `/webhooks` (existant) : URL, événements, statut, historique des envois (code HTTP), renvoi. Créer table `webhook_deliveries` pour l'historique si absente.
- **Intégrations — Passerelle SMS** (placeholder → réel) : relier au système **235SMS** (appareils Android relais connectés, quota, file d'attente, coût) via `admin_channels`/endpoints dédiés à créer.

### 5.11 Journaux d'audit (fait) — ajouter filtres avancés (admin, type d'action, plage), export conformité CSV, diff ancienne/nouvelle valeur (`changes`).

### 5.12 Paramètres — Général (fait) / Langues & localisation (placeholder → réel : gestion des traductions UI admin + messages système utilisateurs, fr d'abord, structure ar/en).

---

## 6. QUALITÉ, VÉRIFICATION, LIVRAISON

Pour **chaque** lot de travail :
1. Ajoute l'endpoint backend réel (SQL/vue/fonction) si la donnée n'existe pas ; réponse `{success,data}` ; rétrocompatible ; tracé en audit pour les écritures sensibles.
2. Type l'endpoint dans `lib/admin-api.ts`.
3. Construis la page avec les composants de `components/admin/kit.tsx` (4 états, pagination serveur, dark/clair, i18n-ready).
4. **Valide** : `rm -rf node_modules && npm ci && npm run build` doit passer proprement (49+ pages), 0 erreur console, `npx tsc --noEmit` OK.
5. Vérifie le rendu réel dans le navigateur (connexion admin réelle → données réelles ; pas de mock).
6. Commit (auteur Faycal, sans co-auteur) + push `main` (déploie). Backend `sayibiai_backend` → Northflank ; frontend `chadgpt-web` → GitHub Pages.

**Definition of Done d'un « vrai SaaS AI »** : zéro placeholder, zéro donnée mock, chaque écran alimenté par la vraie base, RBAC + 2FA + audit opérationnels, exports fonctionnels, i18n branché, responsive desktop+tablette, thème clair/sombre, et parcours démontrable de bout en bout avec un compte admin réel.

---

## 7. ORDRE D'IMPLÉMENTATION RECOMMANDÉ
1. **Sécurité socle** : 2FA TOTP + RBAC (matrice + application front) + durcissement audit.
2. **Utilisateurs** : compléter le profil (Sécurité, Connexions, Permissions, Consommation IA), segments, signalés/bannis, actions groupées.
3. **Conversations** : recherche plein-texte, détail approfondi, exemples qualité.
4. **Modèles & IA** : config CRUD + prompts versionnés + playground.
5. **Modération** : règles automatiques + contexte + escalade.
6. **Analytics** : rapports personnalisés + heatmaps + churn/engagement.
7. **Opérations** : notifications/campagnes, feature flags/A-B, support/tickets.
8. **Intégrations** : clés API, webhooks (+ historique), passerelle SMS 235SMS.
9. **Facturation** : plans réels (transactions/ARPU laissés désactivés jusqu'à l'intégration paiement).
10. **Paramètres** : langues/i18n, préférences.

Livre par lots, valide et pousse chaque lot, rends compte de ce qui a été fait + migrations DB nécessaires + checklist de test manuel avant le lot suivant.
