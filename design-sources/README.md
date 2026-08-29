# Sources d'images

Les originaux pleine taille vivent ICI, et non dans `public/` : tout ce qui est
dans `public/` est publié, y compris ce que personne ne télécharge. Le hero
original pesait 561 Ko et n'était plus servi à personne — il partait quand même
dans chaque déploiement.

Régénérer les variantes servies (alpha préservé, ce que ffmpeg ne sait pas
faire pour l'AVIF) :

```python
from PIL import Image
src = Image.open('design-sources/hero-afrique-source.webp').convert('RGBA')
for larg in (1200, 800):
    h = round(src.height * larg / src.width)
    im = src.resize((larg, h), Image.LANCZOS)
    im.save(f'public/landing/hero-afrique-{larg}.avif', quality=44, speed=3)
    im.save(f'public/landing/hero-afrique-{larg}.webp', quality=68, method=6)
```
