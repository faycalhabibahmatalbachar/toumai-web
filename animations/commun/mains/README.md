# Les mains

Sorties une seule fois des scènes livrées par `outils/extraire_mains.py`, puis
remises à la taille utile et encodées en WebP.

| Fichier | D'où elle vient | Avant | Après |
|---|---|---|---|
| `main-1.webp` | recopiée 6 fois dans le puzzle, le labyrinthe, le morpion et le Puissance 4 | 952 × 1100 PNG, 133 Ko × 6 | 595 × 687, **29 Ko**, une fois |
| `main-2.webp` | 2 fois dans le code secret | 238 × 275 PNG, 8 Ko | inchangée en taille, **4 Ko** |

La main droite n'est pas un second fichier : c'est la même image retournée
(`transform="translate(238 0) scale(-1 1)"`).

Ne pas les grossir. `main-2` est nativement à sa taille d'affichage ; l'agrandir
« pour uniformiser » l'a fait passer de 4 à 28 Ko sans ajouter un détail — c'est
l'essai qui a mis le garde-fou dans le script.
