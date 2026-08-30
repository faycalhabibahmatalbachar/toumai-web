# Pub Toumaï AI — Scène « Connecteur WhatsApp »

Version : 29/08/2026 · Format 16:9 (+ recadrage 9:16) · Master 20 s, cut 15 s
Outil de génération retenu : **Higgsfield AI** (Seedance multi-plans, Veo 3.1 paysages/son, Kling personnages)

---

## 1. Ce que le produit fait VRAIMENT (vérifié dans le code)

Source : `sayibiai_backend/services/wa_autopilot.py`, `services/tools/whatsapp_tool.py`
(23 outils), `whatsapp_account_tool.py` (8 outils), `sayibi-ai/lib/features/connectors/`.

| Élément de la scène ChatGPT | Réalité |
|---|---|
| « Il clique sur Connecter, connexion instantanée » | **Faux.** Code de jumelage à 8 chiffres, saisi dans WhatsApp → ⋮ → Appareils connectés → Lier avec un numéro. Appareil lié (Baileys), pas l'API Cloud officielle de Meta. |
| « Intention détectée / Priorité haute » | **Écran inventé.** N'existe pas dans l'app. La console affiche : Messages traités · Conversations · Taux de réussite · Temps moyen · Escalades, et les tags Auto-pilote / À valider / Bloqué. |
| « Réponse suggérée [Envoyer] [Modifier] » | **Vrai** — c'est le mode `suggest`. Mais il existe aussi le mode `auto` (répond seul) et `off`. |
| « Supervision » | **Très en dessous de la réalité** : texte, **note vocale → transcription Whisper → réponse → note vocale TTS**, image, document, vidéo, règles déclenchées par mot-clé/expéditeur/heure, clone du style d'écriture, pause de frappe humaine + présence « en train d'écrire », anti-ban, escalade vers l'humain, journal d'audit, analytics. |
| « Toumaï pilote tout le compte » | **Limite dure** : aucun appel sortant possible (WhatsApp l'interdit depuis un appareil lié — l'outil `whatsapp_call` le refuse explicitement). Groupes exclus par défaut. Auto-reply strictement opt-in. |

**Conclusion** : la scène est bonne, mais elle survend la magie de la connexion et
sous-vend l'intelligence. Le vrai « wow » au Tchad, c'est **le vocal en arabe
tchadien**, pas un badge « intention détectée ».

## 2. Interdits dans la pub

1. Ne jamais laisser croire à un partenariat Meta / « API officielle WhatsApp ».
   Mention légale en fin de film : *« WhatsApp est une marque de Meta Platforms.
   Toumaï AI n'est pas affilié à Meta. »*
2. Ne jamais générer l'interface par IA (texte illisible = écran faux). On filme
   l'app réelle. Règle Toumaï : aucun mock en vitrine.
3. Ne pas montrer une IA qui répond seule à tout le monde sans le consentement :
   montrer l'opt-in et le tag « À valider ».
4. Aucun vrai numéro / vrai nom de client à l'écran.

---

## 3. Scène master — 20 secondes

### PLAN 1 — LA SURCHARGE · 0:00 → 0:03
Bureau à N'Djamena, 7 h. Lumière rasante orangée, poussière dans le faisceau.
Un commerçant/entrepreneur, téléphone posé sur un cahier de commandes.
Le téléphone s'allume : notifications WhatsApp qui s'empilent, dont **une note
vocale**. Il le retourne face contre table, fatigué.
*Caméra* : travelling avant lent, 50 mm, faible profondeur de champ.
*Son* : ambiance rue + notifications qui saturent.

### PLAN 2 — LA LIAISON · 0:03 → 0:07 · **capture d'écran réelle**
Écran Toumaï AI : « Reliez votre WhatsApp » → *Obtenir le code de jumelage* →
code à 8 chiffres, compte à rebours, et la ligne :
« Vos messages ne sont jamais stockés sur nos serveurs. »
Puis, dans WhatsApp : Appareils connectés → Lier avec un numéro → saisie du code.
Bascule : badge **Connecté**.
*Caméra* : macro sur l'écran, léger parallaxe, reflets contrôlés.
*Son* : deux clics feutrés, un souffle grave qui monte.

### PLAN 3 — LA VOIX (le différenciateur) · 0:07 → 0:12 · **capture réelle**
Une note vocale arrive **en arabe tchadien**. Toumaï la transcrit à l'écran,
comprend la demande, et **répond par une note vocale** dans la même langue.
Incrustation sobre : *Note vocale · arabe tchadien · répondu en 6 s*.
*Caméra* : plan fixe serré sur la bulle audio, forme d'onde qui s'anime.
*Son* : la voix off se tait, on entend la note vocale.

### PLAN 4 — LE CONTRÔLE · 0:12 → 0:16 · **capture réelle**
Console WhatsApp de Toumaï : KPI réels (Messages traités · Taux de réussite ·
Temps moyen · Escalades). Une conversation porte le tag **À valider** :
l'entrepreneur lit, corrige un mot, envoie. Une autre porte **Auto-pilote**.
Texte à l'écran : *Vous gardez la main. Toujours.*
*Caméra* : plan large de l'écran qui recule, l'homme entre dans le cadre, il sourit.

### PLAN 5 — LA VISION · 0:16 → 0:20 · **génération IA**
Sortie du bureau vers le Sahel au lever du jour. Le sable se soulève et forme un
réseau de points lumineux dorés, qui converge vers le logo.

> **TOUMAÏ AI**
> Votre WhatsApp. Votre voix.
> Une intelligence qui veille.
>
> *L'intelligence au service de l'Afrique.*

Mention légale 2 s. Fondu au noir.

### Cut 15 s (réseaux)
Supprimer le plan 4, réduire le plan 1 à 2 s, garder vocal + logo. En 9:16,
recadrer sur le téléphone et remonter les incrustations au tiers supérieur.

### Voix off (FR)
> « Chaque matin, les messages s'accumulent. »
> « Reliez votre WhatsApp à Toumaï AI. »
> « Il écoute, comprend l'arabe tchadien… et répond de vive voix. »
> « Vous validez, vous corrigez, vous gardez la main. »
> « Toumaï AI. L'intelligence au service de l'Afrique. »

---

## 4. Méthode de production (hybride — non négociable)

| Plan | Source | Outil |
|---|---|---|
| 1 | Génération IA | Higgsfield → Kling 3.0 (personnage) |
| 2, 3, 4 | **Écran réel** enregistré (scrcpy / enregistrement d'écran Android), incrusté dans une plaque IA de téléphone/bureau | Montage : DaVinci Resolve ou CapCut (tracking planaire) |
| 5 | Génération IA | Higgsfield → Veo 3.1 (paysage + son), puis Seedance pour la transition sable → réseau |
| Liant | Cohérence personnage/lumière entre plans | Higgsfield Cinema Studio + jeu de références |

Références à téléverser dans Higgsfield (cohérence) : 1 portrait de l'acteur
(3 angles), 1 photo du bureau, 1 photo du téléphone tenu en main, 1 paysage
sahélien à l'aube, le logo Toumaï sur fond noir, une planche couleur
(sable #D9C3A0, noir profond #0B0B0C, or #E8B45A).

## 5. Prompts (anglais — meilleurs résultats)

**Plan 1 — Kling 3.0 / Seedance**
> Cinematic advertising shot, early morning in a modern office in N'Djamena, Chad.
> A young African entrepreneur in a clean shirt sits at a wooden desk with an order
> notebook. His smartphone lights up with stacking chat notifications. He flips the
> phone face down, tired but composed. Warm low golden sunlight through blinds,
> visible dust particles, shallow depth of field, 50mm lens, slow dolly-in.
> Photoreal, 24fps, film grain, no text overlays. Leave all screens black and empty.

**Plan 5 — Veo 3.1**
> Cinematic wide shot of the Sahel at sunrise, wind lifting fine sand across dunes.
> The sand grains slowly rise and reorganize into a glowing golden network of
> connected light points floating above the desert, elegant and restrained, not
> flashy. Camera cranes up slowly. Deep black sky gradient, warm gold accents,
> ambient wind sound with a low cinematic drone. Photoreal, no text, no logos.

**Plans de liaison — Seedance multi-shot**
> Three connected shots, same character and lighting: (1) close-up of a hand placing
> a phone on a desk, (2) over-the-shoulder of a laptop screen glowing softly, screen
> left blank and black, (3) the man leaning back, exhaling, satisfied.
> Warm golden interior light, photoreal, consistent wardrobe and skin tone,
> shallow depth of field. Leave all screens black and empty.

**Negative prompt (tous les plans)**
> text, letters, logos, user interface, app screenshots, watermark, distorted hands,
> extra fingers, plastic skin, oversaturated colors, cartoon, anime, stock-photo smile

⚠️ Toujours exiger « leave all screens black and empty » : les écrans réels sont
ajoutés au montage.
