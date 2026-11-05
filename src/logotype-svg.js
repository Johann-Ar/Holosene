/**
 * Composant « logotype » : HOLOSENE ou JOHANN ARATA en SVG dans la page (inline), à partir des fichiers du pack
 * (public/logotypes/svg/, export Figma). Rien n'est redessiné : chaque lettre reste un <path class="lettre"> à part
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
 *               nette), chacune découverte par un masque en dégradé ; main.js fait glisser les dégradés (attribut
 *               gradientTransform, voir data-bx / data-bw / data-bb). Une marge (--m) autour du dessin laisse la place au
 *               halo du flou ; le CSS la compense par des marges négatives : le mot reste exactement à sa place.
 * Taille : par le CSS (largeur), la hauteur suit le dessin ; couleur : propriété CSS color.
 */
import { readFileSync } from 'node:fs'

const MOTS = { 'holosene': 'HOLOSENE', 'johann-arata': 'JOHANN ARATA' }
const ANIMS = ['apparition', 'vague', 'flottement', 'trace']
const sources = {}
const lire = (mot) => sources[mot] ??= readFileSync(new URL(`../public/logotypes/svg/${mot}.svg`, import.meta.url), 'utf8')

// JOHANN ARATA empilé : JOHANN = lettres --i 0 à 5 (x 6 à 1724), ARATA = --i 6 à 12 avec ses deux liaisons
// (x 1785 à 3265) ; ARATA est ramené sous JOHANN, centré, 400 unités plus bas (hauteur du dessin 343 + interligne)
const EMPILE = { dx: (6 + 1724) / 2 - (1785 + 3265) / 2, dy: 400, viewBox: '0 -14 1730 774' }

// balayage : flou des deux copies floues (unités du dessin), largeur de la bande de transition (part de la largeur du
// mot), marge autour du dessin (≥ 3 × le plus grand flou)
const BAL = { flous: [26, 11], bande: 0.4, marge: 80 }
// poids de chaque copie (très floue, un peu floue, nette) selon l'avancée locale s (0 : pas encore touché, 1 : net),
// échantillonnés en s = 1, 0,75, 0,5, 0,25, 0 (de gauche à droite dans la bande) ; leur somme vaut s
const POIDS = [[0, 0, 0, 0.125, 0], [0, 0.375, 0.5, 0.125, 0], [1, 0.375, 0, 0, 0]]

let compteur = 0
export function logotypeSvg({ mot = 'holosene', animation = '', className = '', id = '', decoratif = false, empile = false, balayage = false } = {}) {
  if (!MOTS[mot]) throw new Error(`logotype inconnu : ${mot}`)
  if (animation && !ANIMS.includes(animation)) throw new Error(`animation inconnue : ${animation}`)
  const src = lire(mot)
  let viewBox = src.match(/viewBox="([^"]+)"/)[1]
  let lettres = src.match(/<path [^>]*\/>/g)
  if (empile) {
    if (mot !== 'johann-arata') throw new Error('empile : seulement pour johann-arata')
    const rang = (p) => +p.match(/--i:(\d+)/)[1]
    lettres = [...lettres.filter((p) => rang(p) < 6),
      `<g transform="translate(${EMPILE.dx} ${EMPILE.dy})">`, ...lettres.filter((p) => rang(p) >= 6), '</g>']
    viewBox = EMPILE.viewBox
  }
  const tid = `${id || `logotype-${mot}`}-titre-${++compteur}`   // id de <title> unique sur la page
  const classes = ['logotype', `logotype-${mot}`, animation && `anim-${animation}`, className].filter(Boolean).join(' ')
  const a11y = decoratif ? 'aria-hidden="true" focusable="false"' : `role="img" aria-labelledby="${tid}"`
  const titre = decoratif ? '' : `<title id="${tid}">${MOTS[mot]}</title>`
  const motG = (attrs = '') => `<g class="mot" fill="currentColor" fill-rule="evenodd"${attrs}>${lettres.join('')}</g>`
  if (!balayage) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${classes}"${id ? ` id="${id}"` : ''} ${a11y}>${titre}${motG()}</svg>`

  const [x, y, w, h] = viewBox.split(/\s+/).map(Number), M = BAL.marge, B = Math.round(w * BAL.bande)
  const box = `x="${x - M}" y="${y - M}" width="${w + 2 * M}" height="${h + 2 * M}"`
  const u = tid.replace(/-titre-/, '-')   // suffixe unique des id internes
  // dégradés : de x à x + B, de « net » (à gauche) à « pas encore touché » (à droite) ; au départ, glissés tout à droite
  // de la bande (mot entièrement découvert : rendu sans JavaScript)
  const defs = POIDS.map((ps, k) => `<linearGradient id="bal-g${k}-${u}" class="bal-g" gradientUnits="userSpaceOnUse" x1="${x}" x2="${x + B}" y1="0" y2="0" gradientTransform="translate(${w + B} 0)">`
      + ps.map((a, i) => `<stop offset="${i / 4}" stop-color="#fff" stop-opacity="${a}"/>`).join('') + '</linearGradient>'
      + `<mask id="bal-m${k}-${u}" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="url(#bal-g${k}-${u})"/></mask>`).join('')
    + BAL.flous.map((f, k) => `<filter id="bal-f${k}-${u}" filterUnits="userSpaceOnUse" ${box} color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${f}"/></filter>`).join('')
    + `<g id="bal-l-${u}">${motG()}</g>`
  // copies floues : un rectangle invisible de la taille de la marge agrandit la boîte du groupe flouté (Safari limite
  // sinon le flou à la boîte des lettres et coupe net le halo)
  const couche = (k) => `<g class="bal-c bal-c${k}" mask="url(#bal-m${k}-${u})">` + (k < 2
    ? `<g filter="url(#bal-f${k}-${u})"><rect ${box} fill="#000" fill-opacity="0"/><use href="#bal-l-${u}"/></g>`
    : `<use href="#bal-l-${u}"/>`) + '</g>'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - M} ${y - M} ${w + 2 * M} ${h + 2 * M}" class="${classes} logotype--balayage"${id ? ` id="${id}"` : ''} ${a11y}`
    + ` data-bx="${x}" data-bw="${w}" data-bb="${B}" style="--m:${(M / w).toFixed(5)}">`
    + `${titre}<defs>${defs}</defs>${couche(0)}${couche(1)}${couche(2)}</svg>`
}
