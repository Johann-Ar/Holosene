# Mise à jour du logo : roue v2 + nouvelle animation « flux »

J'ai téléchargé une nouvelle version de `logo-kit.zip` (dans ~/Downloads ; sinon cherche `logo-kit.zip`). Elle **remplace** l'ancien kit. Installe-la : décompresse-la, puis lance `sh <chemin>/logo-kit/install.sh` depuis la racine du projet (cette commande écrase `design/logo-kit/` et les `public/media/monogram-*.svg`). Relis ensuite `CLAUDE.md` (section « Identité visuelle ») et `design/logo-kit/`. Commit séparé : « chore: logo-kit v2 ».

Deux changements :
1. **Nouvelle roue de couleurs (v2), mieux répartie.**
2. **Nouvelle animation du « o ».** L'animation actuelle, qui fait tourner la roue, ne me convient pas : **le rond ne doit plus tourner.**

---

## 1. Roue v2 partout
La roue a été refaite : 10 teintes sans doublon (le violet-magenta en trop est remplacé par un corail), chacune sur une part égale de l'anneau (36°), avec des luminosités rapprochées. L'ordre est : cyan `#2ACCC7` (en bas) → bleu `#529DFE` → indigo `#727EFE` → violet `#C357FE` → magenta `#FB35E7` → rose `#FE46A8` (en haut) → corail `#FF7B3E` → jaune `#DEBA26` → vert-jaune `#7CD84A` → vert `#43DA58`. Les interpolations sont calculées en OKLab (stops denses dans `IRIS_STOPS`).

- Cherche et remplace **toutes** les anciennes couleurs de la roue, dans le code, le CSS, les shaders, les SVG inline, le canvas, `theme-color`, le favicon et le manifest : `#F42D9D #F126DE #E22AF8 #B333F2 #5A5BFB #3D92FB #40DAD4 #F5D147 #93F063 #5AED6B #51E78E`, plus les anciens pastels (`#D757E6`, etc.). Il ne doit plus en rester aucune en dur. Tout passe par le kit : `IRIS_STOPS` / `cssConic()` / `irisLUT()` (`src/iris.js`), `irisColor()` (`src/iris.glsl`), les variables `--iris-*` et `--iris-conic` de `tokens/theme.css`.
- Le liseré du titre utilise `var(--title-fringe)` et les boutons utilisent `var(--iris-conic)` : ils prennent la roue v2 automatiquement.
- Le « o » au repos doit être **identique** à `design/logo-kit/ref/monogram-iris-dark@2x.png` / `light` : rose en haut, cyan en bas, même épaisseur (Ri = 0,514 × Ro).
- Commit : « feat: roue iris v2 ».

## 2. Supprimer l'animation par rotation
Retire tout ce qui fait tourner la roue : offset d'angle qui augmente avec le temps, `rotate` CSS, rotation de la texture, enchaînement des `IRIS_VARIANTS` de rotation, etc. `IRIS_VARIANTS` reste dans le kit pour des planches figées, mais il ne sert plus à animer le logo.

## 3. Nouvelle animation « flux » (passif sur l'accueil + loader)
Ce que je veux : un rond qui ne tourne pas, mais où **les couleurs vivent**. Certaines zones grossissent et poussent leurs voisines, puis dégrossissent. Des vagues traversent l'anneau **dans les deux sens**. Ça doit évoquer un chargement, une respiration, quelque chose d'organique, sans boucle visible.

Le moteur est déjà écrit et testé : `design/logo-kit/src/iris-flow.js`. **Utilise-le tel quel**, n'en réinvente pas un.
- `irisFlowLUT(t, cfg, 512)` renvoie une texture 1D RGBA à ré-uploader à chaque frame (`texSubImage2D`), lue par le shader du « o » à la place de la LUT statique : même convention d'angle que `IRIS_STOPS` (`from 180deg`, sens horaire). En CSS ou en fallback : `irisFlowCss(t, cfg)`.
- Ce que fait le moteur :
  - chaque couleur garde sa place et son ordre, seule sa largeur varie (entre 0,45× et 2,4× sa part en mode passif) ;
  - la surface totale est conservée et chaque couleur reste toujours visible ;
  - deux vagues se déplacent en sens opposés, une troisième fait un va-et-vient, et une respiration propre à chaque couleur s'y ajoute ;
  - les fréquences sont choisies pour que le mouvement ne boucle jamais de façon visible ;
  - le rose reste ancré en haut, avec une dérive de ±6° au maximum. **Il n'y a pas de rotation globale.**
- Avec `amount = 0`, on obtient exactement la roue finale. Fais toujours partir et revenir les transitions de là.
- Réglages : `IRIS_FLOW.idle` (logo de l'accueil, lent et subtil) et `IRIS_FLOW.loading` (loader, plus vif). `irisFlowMix(m)` interpole entre les deux. Les plages autorisées sont indiquées en commentaire, ne sors pas de ces plages. Branche ces réglages sur le panneau `?debug=iris` s'il existe.
- Aperçu de référence : ouvre `design/logo-kit/ref/iris-flow-preview.html` (via un petit serveur local). C'est le comportement attendu. Ton rendu dans le site doit lui ressembler.

### Accueil (logo passif)
- Mode `idle` en continu, avec le temps réel (`performance.now()/1000`).
- Garde tout le reste du rendu actuel du « o » : liquid glass, relief, lumière à 225°, bords nets. La réfraction et le verre restent sur le « o » uniquement. Seules les couleurs bougent : la silhouette ne bouge pas.
- Au chargement de la page, monte `amount` de 0 à 1 en ~1,2 s (ease-out). Mets en pause quand le logo n'est plus visible ou quand l'onglet est caché.
- `prefers-reduced-motion` : `amount = 0` (roue finale figée).

### Loader
- Mode `loading` pendant le chargement. La progression réelle peut moduler l'intensité : `irisFlowMix(0.6 + 0.4 * (1 - progress))`. Plus ça avance, plus ça se calme.
- Si le loader a déjà un arc de progression, garde-le : l'arc révèle les couleurs **animées** du flux, lues à leur angle absolu.
- À 100 %, transition de `loading` vers `idle` en ~600 ms, puis passage de relais vers le logo de l'accueil (FLIP) **sans aucun saut de couleur** : le loader et le logo utilisent la même horloge `t` et le même moteur.
- `prefers-reduced-motion` : roue finale fixe qui se remplit, sans flux.

### Performance
Calcule la LUT une seule fois par frame, partagée par le loader, le logo et la lentille du curseur. `irisFlowLUT` accepte un buffer réutilisable : n'alloue rien à chaque frame. Vise 60 fps et moins de 0,5 ms CPU par frame pour la LUT (mesure-le).

## 4. Vérifications (montre-moi les preuves)
1. Captures Playwright (deviceScaleFactor 2) du « o » à t = 0 avec `amount = 0`, côte à côte avec `ref/monogram-iris-dark@2x.png` et `light` : elles doivent être identiques.
2. Une planche de 8 captures du logo de l'accueil, à t = 0, 1,5, 3, 4,5, 6, 7,5, 9 et 12 s : les couleurs changent de largeur, le rose reste en haut, rien ne tourne.
3. Une courte vidéo Playwright (`recordVideo`) du loader jusqu'au logo de l'accueil.
4. Une recherche dans tout le projet qui montre qu'il ne reste plus aucune des anciennes couleurs listées plus haut.
5. Les fps et le temps CPU de la LUT, puis un test avec `prefers-reduced-motion`.

Commits séparés : (1) kit v2, (2) roue v2 partout, (3) suppression de la rotation et animation flux, (4) loader. Donne-moi à la fin la liste des fichiers modifiés et ce qui reste à décider.
