
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
| Animation du « o » (passif + loader) | `design/logo-kit/src/iris-flow.js` : `irisFlowLUT(t, cfg)` / `irisFlowCss(t, cfg)`, réglages `IRIS_FLOW.idle` / `.loading`. **Jamais de rotation globale de la roue.** |
| Variantes figées (planches, usages secondaires) | `IRIS_VARIANTS[nom]` — ne pas s'en servir pour animer le logo |
| Valeurs brutes | `design/logo-kit/tokens/iris.json` |
| Variables CSS (dark / light) | `design/logo-kit/tokens/theme.css` |

### Constantes
- Dégradé conique : `from 180deg`, sens horaire (0deg = haut). Position 0 = cyan #2ACCC7 (en bas), 0,5 = rose #FE46A8 (en haut). Roue v2 : 10 teintes sans doublon, surface égale, luminosité rapprochée.
- Anneau : rayon intérieur = **0,514 × rayon extérieur**.
- Fonds : dark `#1E1E1E`, light `#F6F5F2`. Encre : blanc sur dark, `#1E1E1E` sur light.
- Dark et light utilisent **exactement la même roue**.

### Exception voulue : anneau de la lentille du curseur (vignettes)
- Son bord **intérieur** est volontairement fondu (choix de Johann) : à mi-chemin par défaut, complet avec la touche J
  maintenue (`SOFT_REST`, `SOFT_W` dans `src/gl.js`). La loupe se resserre d'autant et garde son effet à l'intérieur.
  Ne pas « corriger » ce fondu ; le bord extérieur, les couleurs et l'épaisseur restent ceux du kit.

### Vérification obligatoire avant de dire « fini »
1. Capture d'écran (Playwright, deviceScaleFactor 2) du rendu concerné.
2. Comparaison côte à côte avec `design/logo-kit/ref/*.png` (même orientation des couleurs, même épaisseur d'anneau, bords nets sans halo).
3. Si ça diffère : corriger le code, jamais la référence.
