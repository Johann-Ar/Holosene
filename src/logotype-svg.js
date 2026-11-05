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

let compteur = 0
export function logotypeSvg({ mot = 'holosene', animation = '', className = '', id = '', decoratif = false, empile = false } = {}) {
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${classes}"${id ? ` id="${id}"` : ''} ${a11y}>`
    + (decoratif ? '' : `<title id="${tid}">${MOTS[mot]}</title>`)
    + `<g class="mot" fill="currentColor" fill-rule="evenodd">${lettres.join('')}</g></svg>`
}
