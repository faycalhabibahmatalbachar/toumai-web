# Les scènes animées de Toumaï

Dossier source des démonstrations animées de l'accueil. Ce qui est **servi** vit
dans `public/accueil-medias/animations/` ; ce qui se **décide** vit ici.

---

## 1. Ce que les cinq scènes actuelles prouvent — et ce qu'elles ne prouvent pas

Puzzle, labyrinthe, morpion, code secret, Puissance 4. Toutes les cinq sont des
**jeux**, et toutes les cinq prouvent la même chose : *ça réfléchit*.

C'est déjà beaucoup, et c'est bien fait — le morpion et le Puissance 4 tournent
sur une vraie recherche (blocage des menaces, minimax à quatre coups). Personne
ne peut regarder ces scènes et croire à une animation scriptée.

Mais quelqu'un qui cherche un outil de travail ne se demande pas si Toumaï sait
jouer. Il se demande si Toumaï sait **faire son travail**. Entre « il gagne au
Puissance 4 » et « il vide ma boîte mail », il n'y a aucun pont — et c'est le
pont qui vend.

D'où l'orientation de ce dossier : **les prochaines scènes montrent du travail
réel, pas de l'intelligence abstraite.**

---

## 2. Ce que dit la recherche, et ce qu'on en retient

| Ce qui est établi | Ce qu'on en fait |
|---|---|
| Le standard 2026 des sections héro : montrer la valeur du produit **en 3 à 5 secondes**, pas l'annoncer. Notion, Linear, Framer montrent le produit avant qu'on ait scrollé. | Une scène doit être lisible sans légende. Si elle a besoin du paragraphe à côté pour se comprendre, elle a raté. |
| La tendance forte est la **démonstration déterministe** placée haut : un workflow réel, des écrans réels, pas une illustration. | Chaque scène est adossée à une capacité qui existe **déjà** côté serveur. Pas de scène pour une fonction qu'on n'a pas. |
| Les démos polies mentent : « les éditeurs montrent des démos parfaites, la réalité est plus désordonnée ». | On montre aussi l'échec : l'essai raté, la reprise, la confirmation demandée. C'est ce qui distingue une preuve d'une publicité. |
| Le mouvement qui gagne est **retenu** : micro-animations qui guident l'attention, pas décor qui l'occupe. Une animation sobre lit comme de la confiance. | Une action par seconde, pas trois. Le vide entre deux gestes fait partie de la scène. |
| Budget publié : **< 80 Ko pour une animation de section héro**, et `prefers-reduced-motion` obligatoire. Une seconde de chargement en plus coûte 7 % de conversions. | Voir §4. Aucune de nos scènes ne tient ce budget aujourd'hui. |
| Sur les repères d'agents (OSWorld, WebArena, GAIA), les meilleurs systèmes 2026 sont passés à **4 points du niveau humain**, et au-dessus sur OSWorld (73–82 % contre 72,4 % pour l'humain). | Le geste « une main qui fait la tâche » n'est plus une métaphore flatteuse : c'est une description à peu près juste de l'état de l'art. |
| Mais : des chercheurs de Berkeley ont montré en avril 2026 que **les huit grands repères d'agents peuvent être saturés sans résoudre les tâches**. | On ne met aucun chiffre de benchmark sur le site. On montre le travail, on ne cite pas de score. |

Sources : [SaaSFrame — tendances 2026](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples),
[SaaSHero — sections héro B2B](https://www.saashero.net/design/landing-page-design-inspiration-2026/),
[SVGator — budgets d'animation SaaS](https://www.svgator.com/blog/svg-animations-for-saas-products/),
[CSS-Tricks — prefers-reduced-motion](https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/),
[AgentAtlas (arXiv)](https://arxiv.org/html/2605.20530v1),
[Berkeley RDI — les repères cassés](https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/).

---

## 3. Le catalogue — ce qu'on peut montrer, et ce que ça prouve

Chaque scène est adossée à une capacité **qui tourne déjà** dans
`sayibiai_backend`. Une scène sans capacité derrière serait un mensonge animé,
et c'est exactement ce que la charte du projet interdit.

### Rang 1 — les trois qui vendent

**A. La boîte qui se vide.**
Une pile d'enveloppes. La main en ouvre une, la lit, la classe ; ouvre la
suivante, la classe ; à la troisième, elle prend un stylo et écrit une réponse —
le texte s'écrit en flux. Puis elle **s'arrête** : une petite carte monte,
« Envoyer ? », avec deux cases. Rien ne part tant qu'on n'a pas répondu.
→ *Prouve* : le connecteur mail, la rédaction, et surtout **le garde-fou**.
→ *Existe déjà* : `services/tools/` (mail SMTP/IMAP), confirmation obligatoire
des actions sensibles dans `ToolRegistry`.
→ *Pourquoi elle est première* : l'objection n°1 d'un acheteur n'est pas « est-ce
que ça sait faire », c'est « est-ce que ça va faire une bêtise en mon nom ». La
scène répond à l'objection au lieu de la contourner.

**B. Le rendez-vous qui se pose tout seul.**
Un message arrive dans une bulle WhatsApp : « on se voit jeudi 15 h ? ». La main
le lit, se tourne vers un calendrier, y pose un bloc sur jeudi 15 h, revient vers
la bulle et répond « c'est noté ». Deux outils, une seule intention.
→ *Prouve* : le **chaînage** — la seule chose qui sépare un chatbot d'un agent.
→ *Existe déjà* : passerelle WhatsApp Baileys + Google Calendar (OAuth), boucle
ReAct multi-étapes dans `services/agents/`.

**C. Le fournisseur qui tombe, et la phrase qui continue.**
Huit pastilles alignées en haut. La première s'allume, du texte s'écrit dessous.
La pastille s'éteint brutalement — la deuxième s'allume dans le même souffle, et
**la phrase ne s'interrompt pas**. Puis une troisième tombe. La phrase finit.
→ *Prouve* : la cascade à huit fournisseurs. C'est le différenciateur réel de
Toumaï, celui qu'aucun concurrent local n'a, et il est aujourd'hui invisible.
→ *Existe déjà* : `services/llm_cascade.py`, y compris la reprise en cours de
phrase.
→ *Note* : c'est la seule scène qui montre une **panne**. C'est précisément pour
ça qu'elle est crédible.

### Rang 2 — solides, plus spécifiques

**D. La facture qui devient tableau.** Un PDF tombe sur la table, la main le
balaie, les chiffres s'envolent et se rangent dans les cellules d'un tableau, le
total s'écrit en dernier. → extraction de documents (Gemini PDF, `ocr_service`).

**E. Le CV qui se compose.** Feuille blanche ; la main pose les blocs les uns
après les autres, la mise en page se réorganise seule quand un bloc est trop
long, et un tampon « lisible par un robot RH » tombe à la fin. → `cv_engine`
(ReportLab, huit familles, contrôle ATS).

**F. La réponse qui montre ses sources.** La main va chercher trois fiches sur
une étagère, les épingle au mur, puis écrit la réponse — et chaque phrase tire un
fil vers la fiche qui la porte. → recherche web + citations, l'anti-hallucination
rendue visible.

**G. La question en arabe tchadien.** Une bulle en arabe tchadien, la main écrit
la réponse dans la même langue, puis la relit à voix haute (une onde). → le
différenciateur territorial ; corpus + voix.

### Rang 3 — jolies, mais elles ne prouvent rien

**H. La lampe, le livre et le verre d'eau** *(votre scène)*.
La main tire le cordon, la lampe s'allume, le livre s'ouvre, « INTRODUCTION
TOUMAÏ 5 » s'écrit en flux.

C'est la plus belle image du lot, et je pense qu'il faut la garder — **mais pas
dans la section « capacités »**. Elle ne démontre aucune tâche : elle installe une
atmosphère, elle annonce un chapitre. Mise entre le morpion et le Puissance 4,
elle casse la promesse de la section (« voici ce que je sais faire ») ; mise
**en haut de page, à la place du portrait fixe**, elle devient l'ouverture du
site — le geste qui allume Toumaï avant qu'on ait lu une ligne.

Ma recommandation : la construire, mais comme **générique d'ouverture**, et
laisser la section capacités aux scènes A, B et C. Le nom qui s'écrit dans le
livre y gagne aussi : « Toumaï 5 » lu sous une lampe, c'est un titre ; « Toumaï 5 »
coincé entre deux jeux, c'est une quatrième démo.

---

## 4. Le budget, et le problème mesuré

    1 090 Ko de base64 répartis dans les cinq scènes,
    pour DEUX images distinctes.

La main principale — 952 × 1100 pixels, 133 Ko — est recopiée **six fois**. Elle
est affichée dans un carré de 238 × 275 unités SVG, soit ~233 px à l'écran : on
envoie quatre fois la résolution utile, six fois de suite, et le navigateur ne
peut rien mettre en cache puisque l'image est *dans* le HTML.

Remise à la taille utile et encodée en WebP, la même main pèse **29 Ko**
(`commun/mains/main-1.webp`), la seconde **4 Ko**. Trente-trois kilo-octets pour
toutes les mains de toutes les scènes, contre 1 090.

Le budget publié pour une animation de section héro est de 80 Ko. Aucune scène
actuelle ne le tient ; toutes le tiendront dès que la main sortira du fichier.

Extraction reproductible : `python outils/extraire_mains.py`.

---

## 5. La grammaire technique (lue dans les scènes livrées)

Elle est bonne. On la garde, on ne la réinvente pas.

- **Scène** : un seul `<svg viewBox="0 0 1200 720">` (5:3), aucune image externe
  hors les mains, tout le décor en formes SVG.
- **Main** : une image posée dans un `<g>` qu'on déplace par `transform`. La main
  droite est la **même image miroir** (`translate(238 0) scale(-1 1)`) — d'où une
  seule image à charger.
- **Point de préhension** : chaque main a un `grip` (le point des doigts, pas le
  coin de l'image). Un objet « tenu » est simplement placé à
  `position_main + grip`. C'est ce détail qui fait que la main *tient* au lieu de
  *pousser*.
- **Mouvement** : `requestAnimationFrame` + une interpolation avec cubique
  d'assouplissement, plus un arc (`sin(π·t)`) sur la trajectoire. Une main qui va
  en ligne droite ressemble à un curseur ; une main qui décrit un arc ressemble à
  un bras.
- **Décision** : la logique est **réelle** (recherche des menaces, minimax). On
  ne scripte pas la partie. Une scène scriptée finit toujours par se voir.
- **Boucle** : `while (true)` avec fondu et remise à zéro, ou rappel récursif avec
  garde `runId` (voir `04-code-secret`, la mieux écrite des cinq).
- **Accessibilité** : `<title>` + `<desc>` renseignés, et `prefers-reduced-motion`
  qui rend **l'état final fixe** au lieu de rien.
- **Intégration** : `pointer-events: none` sur le cadre (la scène ne vole pas les
  clics), et le `src` posé seulement à l'entrée dans la vue — sans quoi le rAF ne
  bat pas et la scène démarre dans le noir (voir `components/accueil/PageAccueil.tsx`).

---

## 6. Ce qui a été construit depuis

**A — la boîte qui se vide** (`scenes/06-boite-mail.html`, 4 septembre 2026).
Écrite telle que le rang 1 la décrivait, à une chose près : la deuxième lettre
ne monte plus sur la feuille de travail. Elle part directement au classement,
sans être ouverte. C'était d'abord une coupe de durée ; c'est devenu le meilleur
plan de la scène, parce que c'est le seul qui dit « la règle est acquise » sans
l'écrire.

Elle prend la grande place finale de l'accueil. Le **Puissance 4** la lui cède :
des cinq scènes de jeu, c'était celle dont la preuve était déjà portée par le
morpion — deux agents qui s'observent et se bloquent. Une section qui se termine
sur un jeu se termine sur « ça réfléchit » ; elle se termine maintenant sur « ça
travaille, et ça demande ». Le fichier est sorti de `scenes/` pour ne pas être
publié sans être lu ; il reste dans l'historique.

Mesures de la scène A, sur la version produite :

| | |
|---|---|
| Poids | 20,9 Ko — budget 80 Ko |
| Boucle | 16,0 s |
| Premier objet affiché | 1,9 s |
| Carte « Envoyer ? » | 10,4 s, tenue 3,5 s |
| Mouvement réduit | état final complet : boîte vide, deux lettres classées, réponse écrite, carte posée |

La première version durait 23,9 s et la carte arrivait à la 18e seconde —
c'est-à-dire jamais, pour qui fait défiler une page. Trois coupes l'ont ramenée
à 16 s : la main ne rentre plus entre deux lettres, la réponse tient sur une
ligne, et la deuxième lettre ne passe plus par la feuille.

**Ce qui reste du rang 1** : B (le rendez-vous qui se pose tout seul) et C (le
fournisseur qui tombe, et la phrase qui continue). C est la seule qui montrerait
la cascade à huit fournisseurs, qui est aujourd'hui le différenciateur le plus
réel et le plus invisible de Toumaï.

---

## 7. Le socle

`commun/scene.js` n'a pas été écrit avant les scènes : il en a été extrait, une
fois qu'elles tournaient. Un socle écrit avant sa première scène est un socle
deviné.
