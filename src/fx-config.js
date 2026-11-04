/**
 * Zones floues des vignettes (bords de la piste, haut et bas de l'écran), à la manière de l'affiche française de « 2001 » :
 * la couleur monte avec le flou, seuls les sombres se teintent (gradient map), teintes sourdes par grandes zones, fines
 * franges de couleur, grain argentique, halation. Tout est fait dans les passes WebGL qui dessinent déjà les vignettes
 * (gl.js) : aucune passe ni texture en plus. Le texte et l'interface ne sont jamais touchés.
 *
 * Désactiver un effet : mettre sa valeur à 0. Tout couper : ?fx=0 dans l'adresse (comparaison avant / après).
 */
export const FX = {
  colorStrength: 0.65,  // force de la colorisation dans le flou (0 : aucune ; 1 : pleine au ras du bord)
  aberration: 0.003,    // franges magenta / cyan, en fraction de la largeur de la vignette (0 : aucune ; jamais sur mobile)
  grain: 0.05,          // grain argentique (0 : aucun) ; thème sombre : × 0,7
  grainChroma: 0.35,    // part colorée du grain
  halation: 0.1,        // irrégularité de l'aspiration aux bords (± 10 %), pour que le sombre « bave » (0 : aucune)
  // teintes : 4 positions sur la roue du kit, tirées au hasard à chaque chargement et qui dérivent lentement (comme les
  // couleurs du fond), rendues sourdes : désaturées (palDesat) puis assombries (palDark). Elles se répartissent par
  // angle autour du centre de l'écran (0° : droite, 90° : bas, sens horaire), avec des transitions douces.
  pal: [{ deg: 0 }, { deg: 90 }, { deg: 180 }, { deg: 270 }],
  palDesat: 0.5,        // 0 : couleurs de la roue telles quelles, 1 : gris
  palDark: 0.55,        // luminosité gardée (sombre, jamais néon)
  palDrift: 0.008,      // tours par seconde (un tour complet en un peu plus de 2 min)
  palWobble: 0.04,      // en plus, chaque teinte ondule doucement autour de sa place (tours)
  bandStrength: 0.5,    // colorisation des bandes de flou CSS (haut, bas, côtés, barre du haut)
  bg: { B: null, A: null, n: 0, scroll: 0 },   // formes du fond (backdrop.js) : centre (px, page), rayon, teinte ; intensité
  version: 0,           // incrémenté quand un réglage change (panneau ?debug=iris) : gl.js renvoie les valeurs au GPU
}

if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('fx') === '0') {
  Object.assign(FX, { colorStrength: 0, aberration: 0, grain: 0, halation: 0 })
}

// teintes vivantes, partagées par le WebGL (vignettes) et les bandes de flou CSS : tirées au hasard au chargement, à un
// quart de tour environ les unes des autres, puis dérive lente et ondulation propre à chacune (temps en secondes)
const hueBase = Math.random()
const hueJitter = [0, 1, 2, 3].map(() => (Math.random() - 0.5) * 0.12)
export const hueAt = (i, t) => hueBase + i * 0.25 + hueJitter[i] + t * FX.palDrift + FX.palWobble * Math.sin(t * 0.11 + i * 1.7)
