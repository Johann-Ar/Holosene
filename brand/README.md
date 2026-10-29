# HOLOSENE — fichiers de marque

Fichiers reconstruits à partir de la planche d'identité (`source/identite-planche.png`) et du monogramme d'origine
(`source/monogramme-source.webp`). **Ne jamais redessiner le logo avec une police ni modifier ces tracés sans accord.**

## Décisions validées par Johann
- « o » : **cercle parfait** (sur la planche il était légèrement ovale, 88 × 77 px).
- « S » : **épaisseur régularisée** (tracé à épaisseur constante, bouts arrondis), forme du dessin d'origine conservée.
- Irisé : deux variantes, chacune liée à son fond — **intérieur lumineux** sur fond clair, **anneau irisé** sur fond sombre.
- Les petites irrégularités de la planche (tuile décalée, logotype irisé sombre plus petit) sont traitées comme des défauts de montage.
- Squircle **carré** (la planche était 7 % plus large, vraisemblablement un étirement d'export).
- Logotype : **Archivo**, graisse 500, largeur 120 %, approche -0,04 em, converti en tracés (largeur du mot = 99,6 % de l'original).

## Mesures (planche)
| Élément | Valeur |
|---|---|
| Noir (tuiles, tracé) | `#1A1A1A` |
| Blanc | `#FFFFFF` (mesuré `#FEFEFE`) |
| Gris neutre | `#5F605F` |
| Épaisseur du « S » | 80 / 1000 de la hauteur du monogramme |
| « o » | rayons 166 et 111 / 1000 (anneau ≈ 17 % du diamètre) |
| Monogramme dans la tuile | hauteur ≈ 74 % de la tuile |
| Squircle | côtés en arc (flèche 8,75 % du côté) + coins arrondis (16,25 %) ; IoU 0,99 avec la planche |

## Dossiers
| Fichier | Usage |
|---|---|
| `monogram/monogram-black.svg`, `-white.svg` | monogramme plein (contours vectorisés), noir ou blanc |
| `monogram/monogram-iris-light.svg` | sur fond clair : anneau noir, intérieur irisé avec cœur blanc |
| `monogram/monogram-iris-dark.svg` | sur fond sombre : « S » blanc, anneau irisé |
| `monogram/monogram-centerline.svg` | tracé central modifiable (6 courbes de Bézier + cercle), à épaisseur de trait |
| `squircle/squircle-black.svg`, `-white.svg` | forme des tuiles (cadres, cartes, boutons, icônes) |
| `icons/icon-*.svg` | monogramme dans le squircle : noir, blanc, et versions irisées |
| `icons/icon-maskable.svg` | icône pleine (sans coins transparents) pour Android / iOS |
| `icons/favicon.svg` | favicon (squircle noir, anneau irisé) |
| `png/` | exports : monogrammes 1024 px, icônes 512 px, `icon-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180 px), `favicon.ico` (16, 32, 48) |
| `logotype/logotype-black.svg`, `-white.svg` | logotype « Holosene » en tracés (la police n'est pas nécessaire) |
| `logotype/logotype-iris-light.svg` | sur fond clair : « o » à intérieur irisé lumineux |
| `logotype/logotype-iris-dark.svg` | sur fond sombre : « o » en anneau irisé |
| `png/logotype-*-1200.png` | logotype en PNG, 1200 px de large |
| `png/share-1200x630.png` | image de partage (Open Graph / Twitter) |
| `iridescent/iridescent.css` | irisé en CSS (`--iris-conic`, `.iris-fill`, `.iris-ring`) |
| `iridescent/iridescent.glsl` | même irisé en GLSL (`iris(uv)`, `irisCore(r)`) pour la 3D |
| `iridescent/iridescent-swatch.svg` | arrêts de couleur de l'irisé |
| `validation/` | comparaisons avec l'original (superpositions, côte à côte, polices candidates) |
| `tools/` | scripts : `python3 tools/build.py` (monogramme, squircle, icônes), `python3 tools/logotype.py` (logotype), `node tools/render.mjs` (PNG) |
| `tools/data/` | données de construction, instance d'Archivo utilisée et sa licence (`ARCHIVO-OFL.txt`, SIL Open Font License 1.1) |

## Irisé
Dégradé **conique** autour du « o » (angles : 0° = droite) : menthe `#98E2B4` (0°), bleu lavande `#99C1DD` (45°),
mauve `#DA9BC2` (90°), rose `#FE9AD5` (135°), rose vif `#FF97F0` (180°), rose `#F99DD0` (225°), mauve `#D99CC3` (270°),
bleu lavande `#9BC1DE` (315°). Version claire : cœur blanc radial. **Rare** : le « o », un survol, le curseur,
le chargement, une lumière dans la 3D. Jamais pour du texte sur fond clair (contraste ≈ 1,5:1).

## Typographie
- **Logotype et titres** : Archivo (Omnibus-Type, SIL Open Font License 1.1 — usage web et commercial libres).
  Pour l'interface, la version variable (axes graisse et largeur) peut servir aux titres.
- Le logotype est fourni **en tracés** : ne jamais le recomposer au clavier.
