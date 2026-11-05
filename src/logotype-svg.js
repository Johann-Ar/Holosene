/**
 * Composant « logotype » : HOLOSENE ou JOHANN ARATA en SVG dans la page (inline), à partir des fichiers du pack
 * (public/logotypes/svg/, export Figma). Rien n'est redessiné : chaque lettre (ou morceau soudé : JOH, ANN, ARATA) reste un <path class="lettre"> à part
 * (les lettres se chevauchent, les ligatures ne doivent pas devenir des trous), remplie en currentColor.
 * Utilisé à la compilation par src/render.js.
 *
 *   logotypeSvg({ mot: 'holosene' | 'johann-arata', animation: 'apparition' | 'vague' | 'flottement' | 'trace',
 *                 className: '...', id: 'unique', decoratif: true, empile: true })
 *
 * - animation : classe du pack (src/logotype-animations.css) ; sans animation, rien ne bouge.
 * - decoratif : quand le texte est déjà lu ailleurs (titre caché pour lecteurs d'écran) → aria-hidden, sans <title>.
 * - empile    : JOHANN au-dessus de ARATA, centrés (accueil sur mobile).
 * - balayage  : apparition de gauche à droite où chaque endroit du mot passe, à son tour, de flou et transparent à net
 *               et plein (comme les mots des textes, mais en continu). Trois copies du mot (très floue, un peu floue,
 *               nette), chacune découverte par un masque en dégradé (ARRETS arrêts répartis sur la largeur du mot) ;
 *               main.js (sweep) recalcule l'opacité de chaque arrêt selon l'avancée (data-bande, data-retenue). Une
 *               marge (--m) autour du dessin laisse la place au halo du flou ; le CSS la compense par des marges
 *               négatives : le mot reste exactement à sa place.
 * Taille : par le CSS (largeur), la hauteur suit le dessin ; couleur : propriété CSS color.
 */
import { readFileSync } from 'node:fs'

const MOTS = { 'holosene': 'HOLOSENE', 'johann-arata': 'JOHANN ARATA' }
const ANIMS = ['apparition', 'vague', 'flottement', 'trace']
const sources = {}
const lire = (mot) => sources[mot] ??= readFileSync(new URL(`../public/logotypes/svg/${mot}.svg`, import.meta.url), 'utf8')

// JOHANN ARATA empilé : le dessin est en 3 morceaux soudés (data-lettre JOH, ANN, ARATA) ; JOHANN = JOH + ANN
// (x 6 à 1631), ARATA (x 1667 à 3046) est ramené sous JOHANN, centré, 400 unités plus bas (hauteur 344 + interligne)
const EMPILE = { bas: 'ARATA', dx: (6 + 1631) / 2 - (1667 + 3046) / 2, dy: 400, viewBox: '0 -14 1637 772' }

// balayage — réglages :
//   flous   : flou des deux copies floues (unités du dessin)
//   bande   : largeur de la zone de passage du flou au net, en part de la largeur du mot
//   retenue : 0 = chaque endroit devient net et plein dès que la bande l'a traversé ; 1 = rien n'est entièrement net
//             et plein avant la fin : la première lettre continue de se préciser jusqu'à l'arrivée de la dernière, et
//             tout le nom devient net en même temps (valeurs intermédiaires : entre les deux)
//   marge   : marge autour du dessin pour le halo (≥ 3 × le plus grand flou)
const BAL = { flous: [26, 11], bande: 0.4, retenue: 1, marge: 80 }
const ARRETS = 33   // arrêts des dégradés, répartis sur la largeur du mot

let compteur = 0
// numérotation des id internes : remise à zéro au début de chaque page (render.js), pour que les pages FR et EN aient
// exactement les mêmes id. Le changement de langue sans rechargement (lang-swap.js) recopie l'attribut href des <use>
// de l'autre page : avec des numéros différents, le nom pointait vers un dessin absent et disparaissait.
export const resetLogotypes = () => { compteur = 0 }
export function logotypeSvg({ mot = 'holosene', animation = '', className = '', id = '', decoratif = false, empile = false, balayage = false } = {}) {
  if (!MOTS[mot]) throw new Error(`logotype inconnu : ${mot}`)
  if (animation && !ANIMS.includes(animation)) throw new Error(`animation inconnue : ${animation}`)
  const src = lire(mot)
  let viewBox = src.match(/viewBox="([^"]+)"/)[1]
  let lettres = src.match(/<path [^>]*\/>/g)
  if (empile) {
    if (mot !== 'johann-arata') throw new Error('empile : seulement pour johann-arata')
    const enBas = (p) => p.includes(`data-lettre="${EMPILE.bas}"`)
    if (!lettres.some(enBas)) throw new Error(`empile : morceau ${EMPILE.bas} introuvable dans johann-arata.svg`)
    lettres = [...lettres.filter((p) => !enBas(p)),
      `<g transform="translate(${EMPILE.dx} ${EMPILE.dy})">`, ...lettres.filter(enBas), '</g>']
    viewBox = EMPILE.viewBox
  }
  const tid = `${id || `logotype-${mot}`}-titre-${++compteur}`   // id de <title> unique sur la page
  const classes = ['logotype', `logotype-${mot}`, animation && `anim-${animation}`, className].filter(Boolean).join(' ')
  const a11y = decoratif ? 'aria-hidden="true" focusable="false"' : `role="img" aria-labelledby="${tid}"`
  const titre = decoratif ? '' : `<title id="${tid}">${MOTS[mot]}</title>`
  const motG = (attrs = '') => `<g class="mot" fill="currentColor" fill-rule="evenodd"${attrs}>${lettres.join('')}</g>`
  if (!balayage) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${classes}"${id ? ` id="${id}"` : ''} ${a11y}>${titre}${motG()}</svg>`

  const [x, y, w, h] = viewBox.split(/\s+/).map(Number), M = BAL.marge
  const box = `x="${x - M}" y="${y - M}" width="${w + 2 * M}" height="${h + 2 * M}"`
  const u = tid.replace(/-titre-/, '-')   // suffixe unique des id internes
  // dégradés : de x à x + w ; au départ, mot entièrement net (copie nette seule : rendu sans JavaScript)
  const defs = [0, 0, 1].map((a, k) => `<linearGradient id="bal-g${k}-${u}" class="bal-g" gradientUnits="userSpaceOnUse" x1="${x}" x2="${x + w}" y1="0" y2="0">`
      + Array.from({ length: ARRETS }, (_, i) => `<stop offset="${(i / (ARRETS - 1)).toFixed(4)}" stop-color="#fff" stop-opacity="${a}"/>`).join('') + '</linearGradient>'
      + `<mask id="bal-m${k}-${u}" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="url(#bal-g${k}-${u})"/></mask>`).join('')
    + BAL.flous.map((f, k) => `<filter id="bal-f${k}-${u}" filterUnits="userSpaceOnUse" ${box} color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${f}"/></filter>`).join('')
    + `<g id="bal-l-${u}">${motG()}</g>`
  // copies floues : un rectangle invisible de la taille de la marge agrandit la boîte du groupe flouté (Safari limite
  // sinon le flou à la boîte des lettres et coupe net le halo)
  const couche = (k) => `<g class="bal-c bal-c${k}" mask="url(#bal-m${k}-${u})">` + (k < 2
    ? `<g filter="url(#bal-f${k}-${u})"><rect ${box} fill="#000" fill-opacity="0"/><use href="#bal-l-${u}"/></g>`
    : `<use href="#bal-l-${u}"/>`) + '</g>'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - M} ${y - M} ${w + 2 * M} ${h + 2 * M}" class="${classes} logotype--balayage"${id ? ` id="${id}"` : ''} ${a11y}`
    + ` data-bande="${BAL.bande}" data-retenue="${BAL.retenue}" style="--m:${(M / w).toFixed(5)}">`
    + `${titre}<defs>${defs}</defs>${couche(0)}${couche(1)}${couche(2)}</svg>`
}
