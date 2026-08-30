# Prompts de génération des maquettes — page d'accueil toumaiai.com

À coller dans ChatGPT (GPT Image). Un prompt = une maquette. Les trois que vous
avez déjà fournies suivent la même grammaire visuelle ; ces prompts la
reproduisent pour que les nouvelles s'accordent aux anciennes.

---

## La charte commune — à ne changer sous aucun prétexte

Ce bloc se colle **à la fin de chaque prompt**. C'est lui qui fait que les
maquettes forment une série et non une collection.

```
STYLE OBLIGATOIRE — identique sur toutes les maquettes de la série :
rendu produit photoréaliste d'un iPhone 15 Pro vu de face, strictement de face,
aucune perspective, aucune inclinaison. Châssis titane foncé, bords nets.
Fond parfaitement TRANSPARENT (PNG alpha), aucune ombre portée, aucun reflet de
sol, aucun décor. Format portrait 2:3.
Interface en mode sombre : fond #1A1512, cartes #241D18, texte principal
#F5EFE9, texte secondaire #A99C90. Accent terracotta #E8552A pour la bulle de
l'utilisateur et les pastilles numérotées.
Typographie sans-serif géométrique, très lisible, taille généreuse.
Barre d'état : 13:20, réseau plein, wifi plein, batterie pleine.
En haut : icône menu à trois traits à gauche ; à droite, horloge d'historique,
icône nouvelle conversation, puis trois points verticaux.
En bas : champ « Demander à Toumaï AI », bouton +, pastille « Sao 4 »,
icône micro, et un bouton rond crème avec une forme d'onde sonore.
Aucune marque tierce visible — pas de logo Apple, pas de nom d'application
autre que « Toumaï AI ».
Texte français PARFAITEMENT orthographié, accents compris. Aucune faute.
```

> **Le point qui rate le plus souvent :** le texte. Faites relire chaque
> maquette caractère par caractère avant intégration — un « Toumai » sans tréma
> ou un accent manquant se voit immédiatement sur une page d'accueil.

---

## 1. Le contexte tchadien — conversation en arabe tchadien

**Remplace :** `showcase` dans la vitrine, scène « arabe tchadien ».

```
Maquette d'écran d'application mobile Toumaï AI, conversation en cours.

Bulle utilisateur (terracotta, alignée à droite) :
« Traduis ça en arabe tchadien : Comment vas-tu aujourd'hui ? »

Réponse de l'assistant, alignée à gauche, précédée du petit logo Toumaï
(un « T » stylisé aux couleurs chaudes) :
— sur une ligne, en GRAND et en arabe, écrit de droite à gauche :
  إنت كيف اليوم؟
— en dessous, en plus petit et en gris : « Littéralement : toi comment
  aujourd'hui. C'est la formule courante à N'Djamena. »
— puis une troisième ligne : « En arabe littéraire : كيف حالك اليوم؟ »

L'arabe doit être calligraphié correctement, lettres liées, sens droite-à-gauche
respecté.

[coller ici LA CHARTE COMMUNE]
```

---

## 2. Le résumé de note vocale — WhatsApp

**Remplace :** l'illustration de la section connecteurs.

```
Maquette d'écran d'application mobile Toumaï AI, conversation en cours.

Bulle utilisateur (terracotta, à droite) :
« Résume-moi le message vocal d'Ahmat. »

Réponse de l'assistant à gauche, dans une carte sombre :
« Il confirme la livraison de vendredi et demande une facture au nom de la
coopérative. »
Au-dessus de cette carte, une petite ligne grise : « Note vocale · 1 min 12 »
avec une forme d'onde audio miniature en terracotta.

Puis une seconde bulle utilisateur (terracotta, à droite) :
« Réponds-lui d'accord. »

Enfin, une carte de confirmation bordée de terracotta, fond très sombre :
« Message prêt. Je l'envoie ? »  avec deux boutons côte à côte :
« Envoyer » (plein terracotta) et « Modifier » (contour gris).

[coller ici LA CHARTE COMMUNE]
```

---

## 3. L'écran d'accueil — premier contact

**Remplace :** rien pour l'instant ; à garder en réserve pour le hero mobile.

```
Maquette d'écran d'accueil de l'application mobile Toumaï AI, conversation vide.

Au centre haut, en très grand, dans une serif élégante : « Bonsoir. »
Juste en dessous, en gris et plus petit : « Par quoi commence-t-on ? »

En dessous, trois suggestions empilées, chacune dans une carte arrondie sombre,
texte clair, alignées à gauche :
« Traduire en arabe tchadien »
« Résumer un document »
« Générer une image »

Le reste de l'écran est vide et respire — beaucoup d'espace négatif.

[coller ici LA CHARTE COMMUNE]
```

---

## 4. La rédaction en direct — annonce de boutique

**C'est celle que vous avez décrite.** Elle est conçue pour que l'écriture soit
**simulée en temps réel par le code**, pas dessinée dans l'image.

```
Maquette d'écran d'application mobile Toumaï AI, conversation en cours.

Bulle utilisateur (terracotta, à droite), sur trois lignes :
« Rédige un message pour annoncer l'ouverture de ma boutique samedi
à N'Djaména. »

Réponse de l'assistant à gauche, dans une carte sombre, texte clair :
« Grande ouverture samedi ! Venez découvrir notre boutique au marché de Dembé
dès 8h. Vêtements, accessoires et tissus — prix de lancement toute la journée. »

Sous cette carte, une rangée de cinq petites icônes rondes en gris :
haut-parleur, copier, régénérer, pouce levé, pouce baissé.

IMPORTANT : la réponse doit être ENTIÈREMENT écrite, sans curseur, sans points
de suspension, sans indicateur de frappe. L'animation d'écriture sera ajoutée
par-dessus, en code.

[coller ici LA CHARTE COMMUNE]
```

### Comment l'écriture en temps réel s'ajoute par-dessus

C'est le point à comprendre avant de générer l'image : **on ne veut pas d'une
maquette qui montre l'écriture en cours.** Une image figée d'un texte à moitié
écrit est un mensonge visuel — elle ne bougera jamais.

Le composant existant `Streamed` (`components/landing/primitives.tsx`) écrit
déjà un texte mot à mot en CSS pur, sans bibliothèque. La maquette sert de
**décor** : le châssis, le fond, la bulle utilisateur, les icônes. Le texte de
la réponse, lui, est du vrai texte HTML posé au-dessus, animé par `Streamed`.

Trois conséquences pour la génération :

1. La zone de réponse doit avoir un **fond uni et régulier**, pour que du texte
   HTML puisse s'y superposer sans qu'on voie le raccord.
2. Le texte de la réponse dans l'image doit être **exactement** celui du
   dictionnaire `lib/i18n/fr.ts` — sinon les quatre langues divergeront.
3. Prévoir une **hauteur généreuse** pour cette zone : l'arabe et l'anglais ne
   font pas la même longueur que le français.

---

## 5. La génération d'image — déjà couverte

`maquette2.png` remplit ce rôle. Aucun prompt nécessaire.

---

## Ce qu'il ne faut PAS générer

- **Le mode vocal** : `MODEVOCAL.png` est intégré, et la vitrine anime déjà cet
  écran en direct.
- **Une image « générée par l'IA » à mettre dans la démo de génération
  d'images** : elle doit venir de Toumaï AI lui-même, pas de ChatGPT. Le
  moteur `gemini-3-pro-image` est maintenant accessible — c'est lui qui doit la
  produire, sinon la démonstration ment sur ce qu'elle démontre.
- **Des logos de partenaires** : il n'y en a pas encore.

---

## Après génération — la checklist d'intégration

1. Vérifier le **fond transparent** : ouvrir sur un fond clair ET sur un fond
   sombre. Un fond gris « presque transparent » se voit sur la page.
2. Relire **chaque caractère** du texte français et arabe.
3. Me transmettre le PNG : la conversion AVIF + WebP en deux largeurs, la
   pose des textes alternatifs dans les quatre langues et le branchement sont
   automatisés côté code.

> Ne pas convertir vous-même en AVIF avec ffmpeg : il **supprime le canal
> alpha** — le téléphone détouré arriverait en rectangle noir. C'est mesuré, et
> c'est pour cette raison que la conversion passe par Pillow.
