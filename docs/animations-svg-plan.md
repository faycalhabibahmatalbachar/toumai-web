# Animations SVG au tracé — plan de mise en œuvre

**Statut :** plan validé techniquement, non implémenté.
**Source des règles techniques :** skills officiels GreenSock installés dans
`.claude/skills/` (`gsap-core`, `gsap-timeline`, `gsap-plugins`, `gsap-react`,
`gsap-scrolltrigger`, `gsap-performance`, `gsap-utils`, `gsap-frameworks`).

---

## 0. La question à trancher avant d'écrire une ligne

Cinq noms ont été demandés : *Line Drawing Animation*, *SVG Stroke Animation*,
*Stroke Reveal / Draw-on*, *Hand-drawn Line Animation*, *SVG stroke logo
animation*, plus le *morphing organique*.

**Quatre de ces cinq noms désignent la même technique.** « Line drawing »,
« SVG stroke animation », « stroke reveal » et « draw-on » sont des appellations
commerciales du même mécanisme : animer `stroke-dashoffset` pour faire
apparaître un trait comme s'il était tracé. Seuls deux mécanismes distincts
existent réellement :

| Ce qui est demandé | Mécanisme réel | Outil |
|---|---|---|
| Line drawing / stroke / draw-on / stroke reveal | `stroke-dasharray` + `stroke-dashoffset` | **DrawSVGPlugin** |
| Hand-drawn (aspect « fait main ») | Le tracé ci-dessus **+ irrégularité du chemin lui-même** | DrawSVG + travail en amont dans l'outil de dessin |
| Morphing organique | Interpolation de l'attribut `d` | **MorphSVGPlugin** |
| Circulation le long d'un chemin | Position suivant une trajectoire | **MotionPathPlugin** |

Le distinguer compte : c'est la différence entre un chantier de deux techniques
et un chantier fantasmé de six.

**L'aspect « fait main » ne s'obtient pas au code.** Un tracé parfaitement lisse
animé lentement reste un tracé de machine. L'irrégularité doit être *dans le
chemin SVG* — épaisseur variable, extrémités non fermées, léger tremblé. Cela se
décide dans Illustrator ou Figma, pas dans GSAP. Toute promesse inverse serait
fausse.

---

## 1. Ce que ça coûte, dit avant de commencer

Ce point vient en premier parce qu'il peut annuler le projet, et qu'il serait
malhonnête de le mettre en annexe.

La page d'accueil a été allégée délibérément : code propre à ~15 Ko gzip, LCP
descendu de 256 Ko à 53 Ko. Ajouter GSAP y ajoute, en ordre de grandeur :

| Paquet | gzip approx. |
|---|---|
| `gsap` (cœur) | ~23 Ko |
| `DrawSVGPlugin` | ~3 Ko |
| `MorphSVGPlugin` | ~9 Ko |
| `@gsap/react` | ~1 Ko |
| **Total** | **~36 Ko** |

C'est **plus du double du code propre actuel de la page**. Trois conclusions
qui en découlent, et qui structurent tout le reste du plan :

1. **Import dynamique obligatoire.** GSAP ne doit jamais entrer dans le paquet
   initial. Il se charge après le premier rendu, et uniquement si la section
   animée approche du champ de vision.
2. **MorphSVG seulement s'il sert vraiment.** À 9 Ko pour un effet, il faut au
   moins deux emplacements qui l'utilisent, sinon on paie une démonstration
   technique.
3. **Le système actuel n'est pas remplacé.** Les apparitions au défilement
   (`data-reveal`, `useInView`, `useReducedMotion` dans
   `components/landing/primitives.tsx`) coûtent zéro octet de bibliothèque et
   fonctionnent. GSAP vient pour ce qu'elles ne savent pas faire — tracer et
   morpher — pas pour refaire ce qui marche.

---

## 2. Prérequis

```bash
npm install gsap @gsap/react
```

Aucun jeton, aucun registre privé, aucune adhésion. Depuis le rachat de GSAP
par Webflow, **tous les plugins sont gratuits, y compris en usage commercial** —
MorphSVG et SplitText compris. Toute instruction demandant un `.npmrc` avec un
jeton GreenSock ou le registre `npm.greensock.com` est périmée : ne pas la
suivre.

Enregistrement, une seule fois, jamais dans un composant qui se rend à nouveau :

```ts
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MorphSVGPlugin);
```

`useGSAP` est lui-même un plugin et doit être enregistré.

---

## 3. Les règles non négociables du tracé

Tirées du skill `gsap-plugins`, section DrawSVG. Chacune a coûté du temps à
quelqu'un :

- **Le trait doit exister.** DrawSVG n'agit que sur le `stroke`, jamais sur le
  `fill`. Un chemin sans `stroke` ni `stroke-width` ne dessine **rien** — et
  l'échec est silencieux. C'est la première cause de « ça ne marche pas ».
- **Un chemin, un segment.** Les `<path>` multi-segments s'affichent
  bizarrement selon les navigateurs. Un dessin complexe se découpe en plusieurs
  `<path>` simples, orchestrés par une timeline.
- **`drawSVG` décrit un SEGMENT VISIBLE, pas une progression.** `"0% 100%"` =
  trait entier ; `"20% 80%"` = trait visible seulement entre 20 % et 80 %, avec
  des trous aux deux bouts. La valeur cible est un état, pas une durée.
- **Formes primitives à convertir.** `<circle>`, `<rect>`, `<ellipse>`,
  `<line>` doivent passer par `MorphSVGPlugin.convertToPath()` avant tout
  morphing — l'appel **remplace l'élément dans le DOM**.
- **`type: "rotational"`** quand un morphing linéaire produit des plis ou des
  torsions. C'est le premier réglage à essayer, avant de retoucher les chemins.

Écriture type :

```ts
gsap.fromTo("#trait", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 1.2 });
```

---

## 4. Intégration dans CE dépôt

### 4.1 `useGSAP`, jamais `useEffect`

```tsx
const zone = useRef<HTMLDivElement>(null);

useGSAP(() => {
  const tl = gsap.timeline();
  tl.fromTo(".trait", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 1.1, stagger: 0.14 });
}, { scope: zone });
```

Le `scope` n'est pas cosmétique : sans lui, un sélecteur `.trait` attrape les
traits de **toutes** les illustrations de la page. Le nettoyage au démontage est
automatique — c'est la raison principale de préférer ce hook.

### 4.2 Mouvement réduit — trois obligations, pas une

Le projet a déjà `useReducedMotion()`. Il ne suffit pas :

1. **Rendre l'état final immédiatement**, pas un état vide. Un dessin non tracé
   est un dessin invisible : la personne ne voit rien du tout.
2. **Utiliser `gsap.matchMedia()`** plutôt qu'un `if` — la préférence peut
   changer pendant la session, et `matchMedia` rejoue la configuration.
3. **Ne pas confondre avec le repli sans JavaScript.** Le projet pose déjà la
   classe `tm-js` sur `<html>` avant le premier rendu : sans script, tout reste
   visible. Les SVG animés doivent suivre la même règle — trait complet par
   défaut dans le balisage, état « non tracé » posé par le script seulement.

```ts
const mm = gsap.matchMedia();
mm.add("(prefers-reduced-motion: no-preference)", () => {
  /* la timeline ne vit QUE dans cette branche */
});
```

### 4.3 Déclenchement

Ne pas installer ScrollTrigger pour ça. `useInView` existe déjà dans
`primitives.tsx`, ne coûte rien, et suffit à lancer une timeline à l'entrée dans
le champ de vision. ScrollTrigger ne se justifierait que pour un tracé **lié au
défilement** (`scrub`) — et le skill `gsap-scrolltrigger` déconseille d'épingler
plus d'une ou deux sections par page.

### 4.4 Performance

- Animer `transform` et `opacity`. `stroke-dashoffset` est l'exception admise :
  c'est le mécanisme même du tracé.
- `will-change: transform` **uniquement** sur les éléments réellement animés.
  Le poser partout « au cas où » dégrade au lieu d'améliorer.
- Mesurer sur un téléphone d'entrée de gamme, pas sur ce poste. C'est le parc
  réel des utilisateurs de Toumaï AI, et c'est là que le morphing coûte cher.

---

## 5. Où ça s'applique sur toumaiai.com

Par ordre de rapport valeur/risque. **Rien de tout ceci n'est décidé** — c'est
une proposition à arbitrer.

### Étape 1 — Le logo Toumaï qui se trace (le plus visible, le moins risqué)

Le « T » du logo se dessine au chargement du hero, une fois par session.
Un seul chemin, DrawSVG seul, **pas besoin de MorphSVG**. Environ 26 Ko gzip
avec l'import dynamique. C'est l'étape qui prouve la chaîne avant d'investir.

**Condition d'arrêt :** si le logo n'existe pas en `<path>` avec `stroke` — il
est aujourd'hui en aplats de couleur — il faut d'abord une version au trait.
C'est du travail de dessin, pas de code.

### Étape 2 — Les icônes des connecteurs qui se tracent en cascade

`Connectors.tsx` affiche des icônes déjà en SVG. Les tracer en cascade à
l'entrée de la section, `stagger: 0.08`, **maximum 8 éléments** — au-delà, les
derniers paraissent en retard (règle du skill de conception).

### Étape 3 — Le morphing narratif dans l'aiguillage

`Intelligence.tsx` fait déjà défiler sept demandes vers sept moteurs, avec un
changement toutes les 3,4 s. Une forme unique qui **se métamorphose** d'un
moteur au suivant remplacerait sept apparitions par une transformation
continue : le mouvement raconterait l'aiguillage au lieu de l'illustrer.

C'est le seul emplacement qui justifie vraiment les 9 Ko de MorphSVG, et le
seul où le morphing porte du sens plutôt que de l'effet.

### Ce qu'il ne faut PAS animer

- **Les deux maquettes produit** (`chat-mobile`, `voix-mobile`). Ce sont des
  captures réelles ; les animer les rendrait douteuses.
- **`StageVoix`** dans la vitrine, déjà animé en direct et sans bibliothèque.
- **La sphère du mode vocal.** Elle est déjà un canvas piloté image par image,
  avec pause quand l'onglet passe en arrière-plan. GSAP y serait une seconde
  boucle d'animation concurrente.

---

## 6. Le pipeline de dessin, qui est le vrai goulot

Le code est la partie facile. Ce qui bloquera :

1. **Obtenir les illustrations en chemins au trait.** Un logo en aplats ne se
   trace pas. Il faut une version *outline*, en un seul segment par forme.
2. **Nommer les chemins** (`id` stables) — sans quoi les sélecteurs de la
   timeline cassent au prochain export.
3. **Pour chaque morphing, deux formes au MÊME nombre de sous-chemins.**
   MorphSVG sait ajouter des points, pas deviner qu'un dessin en trois morceaux
   doit devenir un dessin en un seul.
4. **Nettoyer les exports.** Illustrator et Figma produisent des `<g>`
   imbriqués, des `clip-path` et des transformations qui faussent les
   longueurs de tracé.

**Estimation honnête :** l'étape 1 est une demi-journée si le logo au trait
existe, plusieurs jours s'il faut le dessiner. Le code de l'étape 3 tient en une
heure ; préparer ses deux formes compatibles en prend beaucoup plus.

---

## 7. Décision demandée

Avant d'écrire du code, trois questions :

1. **Assume-t-on ~26 Ko gzip sur la page d'accueil** pour l'étape 1 seule,
   après l'avoir délibérément allégée ?
2. **Le logo Toumaï existe-t-il en version au trait**, ou faut-il le dessiner ?
3. **Va-t-on jusqu'au morphing** (étape 3, +9 Ko), ou s'arrête-t-on au tracé ?

Une réponse « oui, oui, non » donne un chantier d'une journée pour un résultat
visible dès le premier écran. Une réponse « oui, non, oui » en fait un chantier
de dessin avant d'être un chantier de code.
