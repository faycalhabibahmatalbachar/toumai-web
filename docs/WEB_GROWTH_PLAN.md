# Toumaï AI — Plan d'enrichissement web & visibilité

*Rédigé le 05/07/2026. Objectif : passer d'un produit fonctionnel à une vraie startup visible, crédible et virale au Tchad et dans la zone francophone.*

---

## 1. État des lieux (livré à ce jour)

- ✅ Chat web complet (streaming, édition, régénération, images, documents, recherche web)
- ✅ Actions réelles WhatsApp/mail avec carte de confirmation (plus de « faux envois »)
- ✅ Sessions persistantes (refresh token), URLs par conversation (`/chat?c=<id>`)
- ✅ Partage public de conversation avec règles de confidentialité (`/share?c=<token>`)
- ✅ Mode vocal temps réel + dictée avec ondes animées
- ✅ Paramètres refondus, langue de réponse configurable (fr/en/ar/auto)
- ✅ Custom domain toumaiai.com + robots.txt + sitemap.xml

## 2. Croissance virale intégrée au produit (priorité 1)

Le levier n°1 d'une IA grand public, c'est le partage :

1. **Pages partagées comme canal d'acquisition** — chaque `/share` porte déjà un CTA
   « Commencer gratuitement ». Ajouter : Open Graph dynamique (titre de la
   conversation dans l'aperçu WhatsApp/Facebook), bouton « Partager sur WhatsApp »
   natif (`https://wa.me/?text=...`).
2. **Partage d'images générées** — bouton « Partager sur WhatsApp » sur chaque image
   générée (statut, contact, groupe). Backend : `whatsapp_send_media` accepte déjà
   une URL http(s) ; le chat doit passer l'URL de la dernière image générée quand
   l'utilisateur dit « envoie cette image à +235… » (mémoire de contexte outil).
3. **Watermark intelligent** — les images portent déjà « Toumaï AI » incrusté :
   chaque image partagée est une publicité.

## 3. SEO & découvrabilité (priorité 2)

- [x] robots.txt + sitemap.xml
- [ ] Métadonnées OG/Twitter par page (layout Next `generateMetadata`)
- [ ] JSON-LD `SoftwareApplication` + `FAQPage` sur la landing
- [ ] Pages de contenu ciblées (blog statique) : « IA en français au Tchad »,
  « Assistant WhatsApp IA », « Générer une image gratuite », « CV avec IA » —
  requêtes réelles de la zone, faible concurrence
- [ ] Google Search Console + Bing Webmaster (soumettre le sitemap)
- [ ] Fiches : Product Hunt, AlternativeTo, There's An AI For That, Futurepedia

## 4. Confiance & conformité (priorité 2)

- [ ] Pages `/privacy` et `/terms` (obligatoires pour OAuth Google en production
  et pour la crédibilité) — inclure la politique de partage de conversations
- [ ] Page `/about` : l'histoire (Faycal Habib Ahmat, ingénieur IA tchadien),
  la mission (IA accessible en français/arabe tchadien)
- [ ] Adresse e-mail de contact professionnelle (contact@toumaiai.com — alias)

## 5. Distribution locale (priorité 3)

- Communautés tech tchadiennes (WhatsApp/Facebook/LinkedIn) : démos vidéo courtes
- Partenariats étudiants (INSTA, universités) : Toumaï AI pour les études
- Presse tech africaine : Techpoint, WeAreTech Africa, Afrique IT News
- Programme ambassadeurs : accès Pro contre contenu créé

## 6. Produit — prochaines briques

| Brique | Impact | Effort |
|---|---|---|
| OG dynamique sur /share | Viralité WhatsApp | Faible |
| Envoi d'image générée vers WhatsApp (contexte outil) | Wow-effect | Moyen |
| Sous-domaine `share.toumaiai.com` (optionnel, quand le volume le justifie) | Image pro | Faible |
| PWA installable (manifest + service worker) | Rétention mobile | Moyen |
| Historique multi-appareils déjà OK (backend) — vérifier conflits | Fiabilité | Faible |
| Formule Pro (paiement Mobile Money déjà connecté) | Revenus | Moyen |

## 7. Mesure

- [ ] Analytics respectueux (Umami/Plausible self-host ou Cloudflare Analytics)
- KPIs : visiteurs → invités → comptes → conversations/j → partages/j → réactivation

---

### Migration base requise (à approuver)

Le partage nécessite ces colonnes (déjà dans `sayibiai_backend/sql/chadgpt_migrations.sql`) :

```sql
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS share_anonymous boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz;
```
