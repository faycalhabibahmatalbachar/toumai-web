# Images de la page d'accueil — prompts à donner à ChatGPT

Ce document sert à **remplacer les images de la page d'accueil**. Chaque section
correspond à un emplacement précis du code : format, rôle, et le prompt à copier
tel quel dans ChatGPT.

## Comment on procède

1. Vous copiez un prompt, vous le donnez à ChatGPT, vous récupérez l'image.
2. Vous me renvoyez le fichier (PNG ou JPG, la plus grande taille possible).
3. Je m'occupe du reste : recadrage exact, conversion AVIF + WebP, génération des
   deux tailles servies, intégration dans le composant, et vérification du poids.
   **Vous n'avez pas à redimensionner ni à optimiser quoi que ce soit.**

---

## Les règles communes à TOUTES les images

À rappeler dans chaque prompt (elles y sont déjà, c'est pour votre information) :

| Contrainte | Pourquoi |
|---|---|
| **Fond charbon chaud `#14110e`**, ou fond noir uni | La page est sombre. Une image sur fond blanc ou gris froid fait une tache. |
| **Aucun texte, aucun mot, aucun logo, aucune signature** | Le site existe en 4 langues. Un mot gravé dans l'image serait faux dans 3 d'entre elles. Les libellés sont ajoutés en HTML. |
| **Palette : terracotta `#dd6039`, ambre `#e8a13c`, indigo `#3f63d8`, ivoire `#f6f0e5`** | Ce sont les couleurs du logo, donc du drapeau tchadien. C'est la signature visuelle du site. |
| **Aucun visage reconnaissable** | Personne n'a donné son accord pour figurer sur le site. |
| **Pas d'esthétique « banque d'images »** : pas de personne souriante devant un écran, pas de mains sur un clavier, pas de globe bleu, pas de circuit imprimé, pas de robot | C'est exactement ce que le brief demandait d'éviter. |
| **Composition qui laisse de la place** — le sujet occupe une moitié, l'autre s'éteint dans le noir | Ces images vivent à côté d'un texte, pas toutes seules. |

> **Note sur les dimensions.** ChatGPT ne produit que trois formats : carré
> (1024×1024), paysage (1536×1024) et portrait (1024×1536). Demandez celui
> indiqué ; je recadre ensuite au format exact du site.

---

## Image 1 — « Il connaît le contexte d'ici »

- **Fichier actuel** : `public/landing/marche-800.avif` / `marche-1200.avif`
- **Où** : section « Pourquoi Toumaï AI », première raison
- **Format à demander** : paysage (1536×1024)
- **Ce qu'elle doit dire** : Toumaï AI connaît le Tchad réel — ses lieux, ses
  usages — sans tomber dans la carte postale.
- **Ce qui ne va pas dans l'actuelle** : c'est un fil de fer doré générique, qui
  pourrait illustrer n'importe quel souk d'Afrique du Nord ou du Golfe. Rien n'y
  est tchadien, et l'esthétique « low-poly filaire » est celle de tous les sites
  d'IA depuis dix ans.

```
Photographie d'architecture, à l'heure bleue juste après le coucher du soleil, au
Sahel tchadien. Une façade de banco (terre crue) aux angles arrondis, ses
contreforts verticaux et ses petites ouvertures carrées, éclairée en lumière
rasante par les dernières lueurs chaudes venant de la gauche. Devant elle, une
natte tissée et deux paniers de vannerie posés au sol, vides. Personne dans le
cadre.

Le mur occupe la moitié droite de l'image. La moitié gauche est une pénombre
profonde, presque noire, où la construction se dissout dans l'ombre — de la
place pour du texte.

Palette exclusivement : terre cuite orangée, ocre ambré, ivoire poussiéreux, et
un ciel indigo profond en haut du cadre. Fond général très sombre, valeur
charbon chaud. Grain photographique fin.

Rendu photographique documentaire, mise au point nette sur la matière du mur, on
doit voir le grain de la terre et les traces de main. Objectif 50 mm, faible
profondeur de champ.

Sans aucun texte, sans aucun mot, sans logo, sans filigrane, sans personne,
sans visage. Pas de rendu 3D, pas de fil de fer, pas de réseau de points
lumineux, pas d'illustration.
```

---

## Image 2 — « Toumaï AI choisit le bon moteur »

- **Fichier actuel** : `public/landing/prisme-800.avif` / `prisme-1200.avif`
- **Où** : section « L'intelligence derrière Toumaï », à côté du schéma de routage
- **Format à demander** : paysage (1536×1024)
- **Ce qu'elle doit dire** : une seule demande entre, plusieurs intelligences en
  sortent — chacune sa spécialité.
- **Ce qui ne va pas dans l'actuelle** : le prisme qui décompose la lumière est
  l'image la plus vue du monde (pochette de Pink Floyd, fonds d'écran, slides
  d'entreprise). Elle n'appartient pas à Toumaï AI, et le dégradé arc-en-ciel
  sort de la palette.

```
Image abstraite, macro, sur fond noir charbon chaud absolu.

Un faisceau de lumière unique et fin entre par la gauche du cadre. Il rencontre
une arête de sable — une crête de dune vue de très près, en contre-jour — et en
ressort divisé en sept traits de lumière distincts qui s'écartent vers la droite,
comme les branches d'une main ouverte.

Les sept faisceaux ne sont PAS un arc-en-ciel : ils vont uniquement du bleu
indigo profond au violet, puis à l'or ambré, puis au terracotta. Aucun vert,
aucun rose, aucun cyan.

Les grains de sable en suspension rendent les faisceaux visibles, comme de la
poussière dans un rayon de soleil. Les traits s'éteignent progressivement en
approchant du bord droit.

Très haut contraste, 80 % de l'image est noire. Grain fin. Rendu photographique
de studio, pas d'illustration, pas de 3D lisse, pas de reflets de lentille
exagérés.

Sans aucun texte, sans logo, sans filigrane, sans prisme de verre, sans triangle,
sans personnage, sans circuit imprimé.
```

---

## Image 3 — L'image « générée par Toumaï AI »

- **Fichier actuel** : `public/landing/showcase.webp` / `showcase.avif`
- **Où** : deux endroits, les plus vus de la page — la scène « Image » de la
  console du hero, et la capacité « Génération d'images » de la vitrine.
- **Format à demander** : paysage (1536×1024)
- **Ce qu'elle doit dire** : voilà ce que Toumaï AI produit quand on lui demande
  une image. **C'est la seule preuve visible de la fonction.** Si elle est
  moyenne, la fonction paraît moyenne.
- **Ce qui ne va pas dans l'actuelle** : les dunes sont correctes mais le fichier
  fait 760 × 570 px — il est affiché plus grand que sa taille réelle, donc flou
  sur un écran moderne. Et la signature est un texte gris collé dans un coin.
- **Important** : ne demandez PAS d'y écrire « Toumaï AI ». La signature est
  ajoutée proprement par-dessus, en HTML — elle reste nette et se traduit.

Le prompt reprend exactement la demande affichée à l'écran à côté de l'image
(« les dunes du Sahara au crépuscule, ciel indigo, lumière rasante, très grand
format »), pour que la promesse et le résultat coïncident :

```
Photographie de paysage, grand format, très haute définition.

Les dunes du Sahara à la tombée du jour. Trois crêtes de dunes se croisent en
diagonale dans le cadre, leurs arêtes dessinant des lignes nettes qui séparent
la face éclairée de la face dans l'ombre. La lumière vient de très bas à
l'horizon, presque rasante : elle allume le sable en ambre et en cuivre, et
laisse le versant opposé dans un brun profond.

Le ciel occupe le tiers supérieur : un dégradé continu de l'indigo sombre en
haut vers l'or pâle juste au-dessus de l'horizon. Une seule étoile, discrète.
Aucun nuage.

Le vent soulève un voile de sable très fin sur la crête la plus haute.

Ambiance silencieuse et monumentale. Aucune trace de pas, aucune végétation,
aucune construction, aucun animal, aucune personne, aucun véhicule.

Rendu photographique réaliste, netteté sur toute la profondeur, gamme tonale
riche, grain argentique fin. Style photographie de paysage de grand format.

Sans aucun texte, sans signature, sans filigrane, sans cadre, sans bordure.
```

---

## Image 4 — (optionnelle) le bandeau du dernier appel à l'action

- **Fichier** : n'existe pas encore — `public/landing/horizon-*.avif`
- **Où** : derrière le bloc final « Dites-lui bonjour. Dans votre langue. »
- **Format à demander** : paysage (1536×1024), je le recadre en bandeau très large
- **Ce qu'elle apporte** : la page se referme sur la même lumière que celle avec
  laquelle elle s'est ouverte. Aujourd'hui, ce bloc n'a qu'un halo CSS.
- **À faire seulement si les trois premières sont réussies** — c'est du confort,
  pas un manque.

```
Photographie d'un horizon sahélien, à l'aube, cadrage très large et très bas.

Les neuf dixièmes inférieurs de l'image sont une plaine de sable dans une
pénombre chaude, presque noire, où l'on devine à peine les ondulations. Le
dixième supérieur est une bande de lumière : un lever de soleil qui commence,
en or ambré, se dissolvant vers le haut dans un indigo profond.

Aucun élément saillant. Pas de dune marquée, pas d'arbre, pas de silhouette, pas
de construction. C'est une image de lumière et de vide, pas de paysage.

Très sombre dans l'ensemble : elle doit pouvoir passer derrière du texte blanc
sans jamais le gêner. Grain fin, aucun contraste dur.

Sans aucun texte, sans logo, sans filigrane, sans personne, sans soleil visible
dans le cadre.
```

---

## Ce qu'on ne remplace pas

**`hero-afrique-*`** — le visage en particules d'or qui se prolonge en carte de
l'Afrique. On la garde : c'est le motif du logo à l'échelle de l'écran, et c'est
la seule image du lot qui appartient vraiment à Toumaï AI.

Si vous voulez malgré tout une version plus définie (l'actuelle est servie en
800 et 1200 px de large, ce qui suffit aujourd'hui), le prompt serait :

```
Un profil humain de trois quarts, tourné vers la gauche, entièrement composé de
points de lumière dorés et de fines lignes qui les relient — un réseau, pas un
visage plein. À droite du profil, le même réseau de points se réorganise
progressivement pour dessiner le contour du continent africain, avec quelques
nœuds plus lumineux répartis à l'intérieur.

Uniquement de l'or, de l'ambre et du cuivre sur fond parfaitement noir. Aucune
autre couleur.

Les points se raréfient sur les bords de l'image et se dissolvent complètement
avant de l'atteindre : aucun contour net, aucun cadre.

Sans texte, sans logo, sans filigrane, sans traits de visage détaillés (pas
d'œil, pas de bouche dessinés) — seulement la ligne du profil suggérée par la
densité des points.
```

---

## Quand vous me renvoyez les images

Dites-moi simplement laquelle correspond à quel numéro. Je vérifie le rendu à
l'écran, en clair comme en sombre, et dans les quatre langues — une image trop
claire derrière du texte ivoire se voit tout de suite en thème clair, et c'est le
genre de détail qui ne se remarque qu'une fois en place.
