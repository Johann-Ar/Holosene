## Identité visuelle — logo S·o et roue irisée (NE PAS IMPROVISER)

Source de vérité : `design/logo-kit/` (export exact du Figma « 01 — Logo final »).
Tout ce qui touche au logo, au « o » irisé ou à l'anneau de la lentille du curseur DOIT venir de ce dossier.

### Interdits
- Redessiner, retracer, vectoriser ou « approximer » le logo à partir d'un PNG ou d'une capture.
- Inventer une fonction de couleur (HSV, `iris()` procédural, palette « proche ») pour la roue.
- Modifier à la main `design/logo-kit/src/*` ou `tokens/*` (fichiers générés).

### À utiliser
| Besoin | Fichier |
|---|---|
| Logo / monogramme (web, HTML, SVG) | `design/logo-kit/svg/monogram-*.svg` (copiés dans `public/media/`) |
| Couleurs de la roue en JS / CSS | `import { IRIS_STOPS, cssConic, sampleIris, irisLUT, IRIS_INNER_RATIO } from 'design/logo-kit/src/iris.js'` |
| Roue en WebGL / shader | `design/logo-kit/src/iris.glsl` (`irisColor(p)`, `irisRing(p, Ro)`) ou texture 1D `irisLUT()` |
| Variantes (rotation / importance, animation passive) | `IRIS_VARIANTS[nom]` — mêmes couleurs, même intensité, seule la disposition change |
| Valeurs brutes | `design/logo-kit/tokens/iris.json` |

### Constantes
- Dégradé conique : `from 180deg`, sens horaire (0deg = haut). Position 0 = vert (en bas), 0,5 = rose #F42D9D (en haut).
- Anneau : rayon intérieur = **0,514 × rayon extérieur**.
- Fonds : dark `#1E1E1E`, light `#F6F5F2`. Encre : blanc sur dark, `#1E1E1E` sur light.
- Dark et light utilisent **exactement la même roue**.

### Vérification obligatoire avant de dire « fini »
1. Capture d'écran (Playwright, deviceScaleFactor 2) du rendu concerné.
2. Comparaison côte à côte avec `design/logo-kit/ref/*.png` (même orientation des couleurs, même épaisseur d'anneau, bords nets sans halo).
3. Si ça diffère : corriger le code, jamais la référence.
