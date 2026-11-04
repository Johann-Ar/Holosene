J'ai téléchargé un kit d'identité visuelle : `logo-kit.zip` (normalement dans ~/Downloads ; sinon cherche `logo-kit.zip` ou un dossier `logo-kit` sur ma machine). Il vient de mon Figma et c'est désormais la SOURCE DE VÉRITÉ du site pour le logo, la roue irisée et les couleurs. Débrouille-toi pour tout faire, je ne veux rien avoir à faire à la main.

## 1. Installer le kit
- Trouve le zip, dézippe-le, puis depuis la racine du projet lance `sh <chemin>/logo-kit/install.sh` (il copie le kit dans `design/logo-kit/`, les SVG dans `public/media/`, et ajoute les règles à `CLAUDE.md`).
- Lis ensuite `CLAUDE.md` (section « Identité visuelle ») et tout `design/logo-kit/` avant de toucher au code. Ces règles priment sur tout ce que tu as fait avant.
- Commite cette étape seule (« chore: ajout du logo-kit Figma »).

## 2. Audit des anciennes couleurs (avant de modifier)
Fais l'inventaire de TOUT ce qui utilise des couleurs dans le site : CSS/SCSS, variables, styles inline, JS (`src/render.js`, `src/gl.js`…), shaders, SVG inline, canvas, filtres SVG, meta `theme-color`, favicon, manifest.
- Cherche les hex/rgb/hsl en dur, l'ancienne fonction `iris()`, les anciens dégradés, les anciens SVG du logo.
- Montre-moi un tableau : fichier · ligne · ancienne valeur · rôle (fond, texte, accent, roue…) · remplacement prévu. Attends que je valide si un remplacement est ambigu ; sinon continue.

## 3. Appliquer la palette partout
- Importe `design/logo-kit/tokens/theme.css` en premier dans les styles globaux et remplace les couleurs en dur par les variables (`--bg`, `--ink`, `--iris-*`, `--iris-conic`).
- Tout ce qui est « irisé » (logo, lentille du curseur, accents, survols, dégradés) utilise UNIQUEMENT la roue du kit : `cssConic()` / `IRIS_STOPS` (`src/iris.js`) en JS/CSS, `irisColor()` + `irisRing()` (`src/iris.glsl`) ou `irisLUT()` en WebGL. Supprime l'ancienne `iris()` une fois plus rien ne l'utilise.
- Logo : uniquement les SVG de `public/media/monogram-*.svg` du kit. Ne retrace rien, ne simplifie aucun tracé.
- Anneau de la lentille du curseur (`src/gl.js`) : identique au « o » du logo (mêmes couleurs, `Ri = 0.514 * Ro`, bords nets anticrénelés à toutes les densités, pas de trame ni de halo) ; garde le comportement actuel (suivi du curseur, apparition/disparition, taille réduite sur mobile). Garde le relief existant (lumière haut-gauche, azimut 225°, petit reflet spéculaire) s'il est déjà en place.
- Pour les couleurs neutres secondaires dont le kit ne parle pas (bordures, textes atténués…), dérive-les de `--ink` et `--bg` (opacité / color-mix), jamais de nouvelles teintes.
- Les variantes `IRIS_VARIANTS` (rotations, importance des couleurs) servent seulement à de l'animation passive ou à des usages secondaires : propose où en mettre, sans les imposer.

## 4. Ajouter le light mode
- Le site suit `prefers-color-scheme` par défaut, avec un bouton pour basculer dark/light qui pose `data-theme` sur `<html>` et retient le choix (localStorage, protégé par try/catch). Pas de flash au chargement : applique le thème dans un petit script inline dans `<head>`.
- Dark : fond `#1E1E1E`, encre blanche, `monogram-iris-dark.svg`. Light : fond `#F6F5F2`, encre `#1E1E1E`, `monogram-iris-light.svg`. La roue irisée est la même dans les deux modes.
- Vérifie tout ce qui était pensé pour le noir : images, ombres, filtre « relief » de `src/render.js`, canvas/WebGL (couleur de clear, blending), contrastes des textes (AA minimum), focus visibles, `theme-color`.

## 5. Vérifier avant de dire « fini »
- Captures Playwright (deviceScaleFactor 2) en dark ET light, bureau 1440 px et mobile 390 px : accueil, une page avec vignettes, et le survol d'une vignette (lentille visible).
- Compare côte à côte avec `design/logo-kit/ref/*.png` : orientation des couleurs (rose en haut, cyan en bas), épaisseur de l'anneau, netteté des bords.
- Refais une recherche des anciennes couleurs : il ne doit plus rester de hex en dur hors du kit (liste-moi les exceptions justifiées).
- Montre-moi les captures, un résumé des fichiers modifiés et ce qui reste à décider. Commits séparés par étape.
