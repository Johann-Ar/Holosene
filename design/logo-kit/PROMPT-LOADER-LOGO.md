Objectif : refaire **le loader** et **le « o » animé du logo** de l'accueil pour qu'ils soient au niveau de mes vignettes en liquid glass : sobres, précis, efficaces, rien d'amateur. Le « o » est la pièce maîtresse de l'identité. Il doit être parfait au repos et vivant sans en faire trop.

Avant tout : lis `CLAUDE.md` (section « Identité visuelle ») et `design/logo-kit/`. La roue, les proportions et les SVG viennent UNIQUEMENT du kit (`src/iris.js`, `src/iris.glsl`, `tokens/iris.json`, `svg/monogram-*.svg`, `ref/*.png`). Si le kit n'est pas encore installé, cherche `logo-kit.zip` (~/Downloads) et lance `install.sh`.

---

## 0. Audit (montre-moi le résultat avant de coder)
Trouve et résume en quelques lignes :
- le code du loader actuel (arc qui passe d'un dégradé gris à la couleur vers une tête arrondie, puis devient un anneau plein) ;
- le shader liquid glass des vignettes de projets (réfraction, bord irisé, lentille au survol) : fichiers, fonctions, paramètres ;
- comment le logo de l'accueil est rendu (SVG + filtre « relief » de `src/render.js` ? canvas ?) ;
- l'anneau de la lentille du curseur dans `src/gl.js`.

Défauts que je vois déjà sur mes captures, à corriger :
1. **Loader** : couleurs ternes, bout de queue vert-noir boueux, queue coupée à plat (seule la tête est arrondie), épaisseur différente du « o » du logo, palette ancienne.
2. **Lentille du curseur** : petit cran/défaut sur le bord droit, à 3 h. C'est sûrement la discontinuité de `atan2` combinée à des dérivées (`fwidth`/mip) sur l'angle. Il y a aussi un liseré clair sur le bord extérieur, qui fait halo.
3. **« o » de l'accueil** : orientation et couleurs pas conformes au kit (le kit, roue v2 = rose #FE46A8 en haut, cyan en bas, bleu/indigo/violet à gauche, corail/jaune/verts à droite). Pas encore de liquid glass.
4. (À côté) Le sous-titre de l'accueil a un retour à la ligne décalé (« captation » indenté). Corrige-le au passage. Et vérifie que le titre « Johann Arata » n'a pas de halo rosé involontaire.

## 1. Architecture : un seul moteur pour l'anneau
Crée un module partagé (ex. `src/iris-ring/`) utilisé par les trois usages : **loader**, **« o » de l'accueil**, **lentille du curseur**. Aucune duplication de shader.
- Géométrie en SDF : anneau `Ri = 0.514 * Ro`. Arc = anneau limité par deux angles, **les deux extrémités en capsule** (bouts arrondis de rayon = demi-épaisseur).
- Couleur : roue du kit via **texture LUT 1D** `irisLUT(1024)` en `REPEAT` + filtrage linéaire. Calcule `t = fract(angle / TAU + offset)` et échantillonne avec `textureLod(..., 0.0)` (ou `textureGrad` avec des dérivées calculées sur un vecteur continu), **jamais** de dérivées sur l'angle brut. C'est ce qui supprime le cran à 3 h.
- Bords : anticrénelage analytique `fwidth(sdf)`, alpha **prémultiplié** partout (canvas `premultipliedAlpha: true`, blending `ONE, ONE_MINUS_SRC_ALPHA`). Aucun halo, aucune frange.
- Anti-banding : dithering bleu (ou hash) de ±0,5/255 sur la sortie.
- DPR : `min(devicePixelRatio, 2)` et rendu net à 1×, 2×, 3×. Taille du canvas = taille CSS × DPR, recalculée au resize.
- Extrais du shader des vignettes une fonction commune `glass(...)` (normale, réfraction, fresnel, spéculaire, dispersion) et utilise-la pour le « o » **avec les mêmes réglages de base**, pour que le logo et les vignettes appartiennent visiblement au même système.

## 2. Le « o » de l'accueil : liquid glass sur le « o » uniquement
- Le **S reste en SVG** (avec son relief actuel). Seul le **« o »** passe en WebGL : masque le `<path id="o">` du SVG et place un canvas exactement par-dessus. Le calage vient des coordonnées du kit (`tokens/iris.json → ring.center / outerRadius`, espace 775×966) converties via le `viewBox` et `getBoundingClientRect()` du SVG. Recalcule au resize et au scroll. Tolérance : 0,5 px.
- **Au repos (t = 0), le rendu doit être identique au « o » de `ref/monogram-iris-dark@2x.png`** (couleurs, orientation, épaisseur). L'animation part de là et y revient.
- Rendu verre (profil de tore) : on considère l'anneau comme un tube de verre. On appelle `d` la distance normalisée à l'axe médian de l'anneau (−1 au bord intérieur, +1 au bord extérieur), et le relief du tube vaut `h = sqrt(1 - d²)`. La normale se déduit de cette hauteur. Réglages de départ (à ajuster dans ces plages, pas au-delà) :
  - lumière : azimut **225°** (haut-gauche), élévation ~45°, comme le filtre « relief » ;
  - réfraction : décalage max **4–8 px CSS** à la taille du logo d'accueil, proportionnel à `Ro`. Comme le fond est sombre et presque uni, la réfraction doit **déplacer l'échantillonnage de la roue** (le liquide coloré vu à travers le verre) et, plus légèrement, le fond derrière le trou du « o » ;
  - dispersion chromatique : **0,5–1,2 px** entre R/G/B, seulement près des bords ;
  - fresnel : bord 0,12–0,22, blanc teinté par la roue (pas de blanc pur qui ferait halo) ;
  - spéculaire : **un** petit reflet net en haut-gauche (≈ 8–12 % de l'épaisseur), un second reflet très faible en bas-droite (≤ 30 %) ;
  - ombre portée : aucune en dark, une ombre très douce et courte en light.
- **Animation passive** (sobre, lente, jamais en boucle visible) :
  - la roue tourne lentement : une rotation complète en **24–40 s**, avec un léger ease plutôt qu'une vitesse purement linéaire ;
  - respiration de l'importance des couleurs : interpolation douce (par position de stop, dans la LUT) entre `final` et 2–3 `IRIS_VARIANTS` d'importance (ex. `bleu-dominant`, `jaune-dominant`, `chaud-froid-equilibres`), cycle de 10–16 s. Mêmes couleurs, **jamais** de changement d'intensité ;
  - liquide : bruit très basse fréquence (0,05–0,12 Hz) qui perturbe **la normale et la réfraction**, pas la silhouette (rayon stable à ±0,5 % max). Le contour du « o » doit rester parfaitement net et circulaire ;
  - pointeur : la lumière et la réfraction suivent très légèrement la souris (inclinaison max ~6°, ressort amorti, retour au repos en ~1,5 s). Rien sur mobile ; option gyroscope uniquement si c'est déjà prévu dans le site.
- Performance : pause quand le logo sort de l'écran (`IntersectionObserver`) ou quand l'onglet est caché, 60 fps visés, et moins de ~1 ms GPU par frame sur un portable. Fallback sans WebGL : le SVG du kit, statique.
- `prefers-reduced-motion` : « o » statique avec le rendu verre au repos, sans aucune animation.

## 3. Le loader : il devient le logo
Principe : le loader **est** le « o ». Il se remplit, se referme, puis se pose à sa place dans le logo de l'accueil.
1. **Piste** : anneau complet très discret (encre à 6–8 % d'opacité), aux dimensions exactes du « o » (0,514).
2. **Progression** : l'arc démarre en haut (12 h) et avance dans le sens horaire. Ses couleurs sont lues **à leur angle absolu sur la roue du kit**, si bien que l'arc dévoile progressivement le vrai « o » et qu'aucune couleur ne change à la fin.
   - Queue → tête : la queue est désaturée **en conservant la luminance** (mélange vers le gris de même luminance, jamais vers le noir : plus de vert boueux), et la saturation remonte à 100 % sur les derniers ~25 % de l'arc. La tête est un peu plus lumineuse (+5–8 %).
   - Les deux extrémités sont en capsule. Un minuscule reflet spéculaire, cohérent avec la lumière à 225°, accompagne la tête.
   - La progression vient du **vrai chargement** (images, textures, polices). Elle est lissée par un ressort à amortissement critique : jamais de saut ni de recul. Durée minimale ~900 ms pour éviter le flash, et si le chargement cale, l'arc continue d'avancer très lentement vers 90 % sans jamais l'atteindre.
3. **Fermeture** : à 100 %, la tête rejoint la queue, les capsules fusionnent (SDF lissé), la désaturation de la queue s'efface en ~350 ms et on obtient l'anneau plein, identique au « o » au repos.
4. **Passage de relais** : le loader se déplace et se redimensionne jusqu'à la position exacte du « o » dans le logo (FLIP, ~700 ms, `cubic-bezier(0.65, 0, 0.35, 1)`). Le S apparaît en fondu, puis l'animation passive du « o » démarre avec le même rendu, sans aucun saut visible. Si l'accueil n'est pas la page d'arrivée, simple fondu de sortie.
5. En dark et en light (fond `#F6F5F2`, encre `#1E1E1E` pour la piste). `prefers-reduced-motion` : anneau qui se remplit sans déplacement, puis fondu.

## 4. Lentille du curseur
Branche-la sur le même module (anneau plein, verre identique, taille actuelle, plus petite sur mobile). Corrige le cran à 3 h et le liseré, et garde son comportement actuel.

## 5. Liseré irisé : titre et boutons (remplace l'effet actuel)
Aujourd'hui, le titre « Johann Arata » a un halo pastel uniforme et flou, et les boutons blancs (« Copier l'adresse »…) ont des taches pastel floues. Ça fait défaut d'affichage. Remplace-les par ce qui a été validé dans Figma (page « 01 — Logo final », section « Liseré irisé — titre & boutons ») :
- **Titre, dark : liseré net, couleur selon l'orientation du bord.** Un bord tourné vers le haut prend `#FE46A8`, vers le bas `#2ACCC7`, vers la gauche `#9F6EFE`, vers la droite `#B4CA3A`, vers le bas-droite `#5AD954` (= la roue du kit, même logique que le « o »).
  - Technique : `text-shadow` sans flou, empilé : `var(--title-fringe)` (défini dans `theme.css`). Les décalages sont en px CSS ; à ajuster proportionnellement à la taille du titre, entre 0,5 et 1,2 px, jamais plus.
  - Uniquement sur le grand titre de l'accueil, jamais sur le texte courant. Variables dans `theme.css` (`--title-fringe`).
- **Titre, light : aucun liseré**, encre `#1E1E1E` seule.
- **Bouton au repos : liseré irisé net de 1,5 px, à l'intérieur du bord**, aux couleurs de la roue, fond uni (blanc en dark, `#1E1E1E` avec texte blanc en light). Supprime les taches et lueurs floues.
  - Technique : pseudo-élément `::before` en `inset: 0`, `border-radius: inherit`, `padding: 1.5px`, `background: var(--iris-conic)`, masqué en anneau avec `mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;` (avec le fallback `-webkit-mask-composite: xor`).
- **Bouton au survol ou au focus : liseré côté ombre seulement** (bas-droite, avec un fondu vers le haut-gauche), 2 px. Même `conic`, multiplié par un masque `linear-gradient(135deg, transparent 35%, #000 75%)`. Transition 200 ms.
- Option : faire tourner les couleurs du liseré des boutons au même rythme que la roue du « o » (variable CSS `--iris-rot` partagée, `@property` pour l'animer). Rien si `prefers-reduced-motion`.
- Contraste : le texte des boutons reste à au moins 4,5:1. Le liseré ne doit jamais griser le fond.

## 6. Réglages
Regroupe tous les paramètres (réfraction, dispersion, fresnel, spéculaire, vitesses, amplitudes, durées, liseré) dans un seul objet `IRIS_GLASS` commenté, avec les plages autorisées. Ajoute un panneau de debug activable par `?debug=iris` (curseurs + bouton « figer à t = 0 ») pour que je puisse affiner moi-même. Il ne doit pas apparaître en production.

## 7. Vérification (obligatoire, montre-moi les preuves)
- Titre et boutons (repos + survol) en dark et light, zoom ×4 : liseré net, pas de flou ni de halo, couleurs conformes à la section Figma « Liseré irisé ».
- Captures Playwright (deviceScaleFactor 2) en dark et en light, en bureau 1440 px et en mobile 390 px :
  - le « o » à t = 0, **côte à côte** avec `ref/monogram-iris-dark@2x.png` / `light` : même orientation, mêmes couleurs, même épaisseur ;
  - le loader à 10 %, 50 %, 90 %, 100 %, puis pendant le passage de relais ;
  - la lentille du curseur au survol d'une vignette.
- Une courte vidéo Playwright (`recordVideo`) du loader jusqu'à l'animation passive.
- Zoom ×4 sur les bords à 1× et 2× : pas de crénelage, pas de halo, pas de cran à 3 h, pas de banding.
- Mesure des fps et du temps GPU. Test `prefers-reduced-motion` et test sans WebGL.
- Commits séparés : (1) module iris-ring + lentille, (2) « o » liquid glass, (3) loader + relais, (4) liseré titre/boutons, (5) réglages/debug. À la fin : captures, vidéo, liste des fichiers modifiés, et ce qui reste à décider.

Critère de réussite : quelqu'un qui voit le site doit se dire « c'est précis », pas « c'est un effet ». En cas de doute, choisis la version la plus sobre.
