/**
 * Zones floues des vignettes (bords de la piste, haut et bas de l'écran), à la manière de l'affiche française de « 2001 » :
 * la couleur monte avec le flou, seuls les sombres se teintent (gradient map), teintes sourdes par grandes zones, fines
 * franges de couleur, grain argentique, halation. Tout est fait dans les passes WebGL qui dessinent déjà les vignettes
 * (gl.js) : aucune passe ni texture en plus. Le texte et l'interface ne sont jamais touchés.
 *
 * Désactiver un effet : mettre sa valeur à 0. Tout couper : ?fx=0 dans l'adresse (comparaison avant / après).
 */
export const FX = {
  colorStrength: 1,     // force de la colorisation dans le flou (0 : aucune ; 1 : pleine au ras du bord)
  aberration: 0.003,    // franges magenta / cyan, en fraction de la largeur de la vignette (0 : aucune ; jamais sur mobile)
  grain: 0.05,          // grain argentique (0 : aucun) ; thème sombre : × 0,7
  grainChroma: 0.35,    // part colorée du grain
  halation: 0.1,        // irrégularité de l'aspiration aux bords (± 10 %), pour que le sombre « bave » (0 : aucune)
  // teintes : ta roue (kit v2), désaturées d'environ 50 % et assombries, placées par angle autour du centre de l'écran
  // (0° : droite, 90° : bas, sens horaire) ; entre deux, transition douce
  pal: [
    { hex: '#376C6B', deg: 0 },     // bleu-vert (cyan #2ACCC7) : droite
    { hex: '#672849', deg: 90 },    // bordeaux (rose #FE46A8) : bas
    { hex: '#603B29', deg: 160 },   // brun (corail #FF7B3E) : bas-gauche, gauche
    { hex: '#683385', deg: 225 },   // violet (#C357FE) : haut-gauche
  ],
  version: 0,           // incrémenté quand un réglage change (panneau ?debug=iris) : gl.js renvoie les valeurs au GPU
}

if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('fx') === '0') {
  Object.assign(FX, { colorStrength: 0, aberration: 0, grain: 0, halation: 0 })
}
