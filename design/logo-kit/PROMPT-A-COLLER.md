Lis `CLAUDE.md` (section « Identité visuelle ») et `design/logo-kit/`. À partir de maintenant, le logo S·o et la roue irisée viennent UNIQUEMENT de ce kit : SVG pour le logo, `src/iris.js` / `src/iris.glsl` / `tokens/iris.json` pour les couleurs.

Tâche : dans `src/gl.js`, refais l'anneau irisé de la lentille du curseur (survol des vignettes) pour qu'il soit identique au « o » de `public/media/monogram-iris-dark.svg` :
- couleurs : `irisColor()` de `design/logo-kit/src/iris.glsl` (ou la texture `irisLUT()`), pas l'ancienne fonction `iris()` ;
- proportion : `Ri = 0.514 * Ro` ;
- bords : `irisRing()` (anticrénelage `fwidth`), aucune trame ni halo, net à toutes les densités ;
- garde le comportement actuel (suivi du curseur, apparition/disparition, taille réduite sur mobile).

Puis remplace `public/media/monogram-iris-*.svg` par ceux du kit si différents. Vérifie en capture (bureau 1440px et mobile 390px, dpr 2) au survol d'une vignette, côte à côte avec `design/logo-kit/ref/monogram-iris-dark@2x.png`, et montre-moi les captures.
