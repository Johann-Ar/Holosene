/**
 * Bandes de flou CSS (haut et bas de l'écran, barre du haut, côtés des pistes, haut des fiches) : même grain et même
 * colorisation que le bord des vignettes (WebGL), avec les mêmes teintes vivantes (fx-config.js, hueAt).
 * - Chaque bande reçoit un calque .fx : un dégradé conique des 4 teintes, fixé sur l'écran (même répartition que dans
 *   le WebGL : 0° à droite, 90° en bas), fondu en « écran » (clair : les sombres se teintent, les blancs restent blancs)
 *   ou en « produit » (sombre : les clairs se teintent, le noir reste noir), et le grain (texture en tuile).
 * - Côtés des pistes : leur fondu vertical est le complément exact de celui des bandes haut et bas ; dans les coins, les
 *   deux se relaient au lieu de se superposer (un seul flou continu).
 * Les couleurs sont recalculées environ 8 fois par seconde, seulement sur ces calques (aucun recalcul de la page).
 */
import { IRIS_STOPS } from '../design/logo-kit/src/iris.js'
import { FX, hueAt } from './fx-config.js'

const LUMA = [0.299, 0.587, 0.114]
const DARK_TINT_GAIN = 2.4   // sombre : teintes éclaircies (comme dans le WebGL)
const STOPS = IRIS_STOPS.map(([p, h]) => [p, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)])
// couleur de la roue du kit à une position, avec la même convention que irisAt() du WebGL (décalage d'un demi-tour)
function wheel(t) {
  const u = ((t + 0.5) % 1 + 1) % 1
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [p0, a] = STOPS[i], [p1, b] = STOPS[i + 1]
    if (u >= p0 && u <= p1) { const k = (u - p0) / (p1 - p0 || 1); return a.map((v, j) => v + (b[j] - v) * k) }
  }
  return STOPS[0][1]
}
const css = (c) => `rgb(${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(' ')})`

export function startFxCss({ reduced }) {
  const root = document.documentElement
  // un calque .fx dans chaque bande de flou
  const hosts = [...document.querySelectorAll('.edge, .topbar__glass')]
  // côtés des pistes : deux bandes réelles par piste (plus de pseudo-éléments), pour y poser le calque
  const pins = [...document.querySelectorAll('.work__pin')]
  for (const pin of pins) for (const side of ['l', 'r']) { const s = document.createElement('div'); s.className = `side side--${side}`; s.setAttribute('aria-hidden', 'true'); pin.append(s); hosts.push(s) }
  const layers = hosts.map((h) => { const f = document.createElement('span'); f.className = 'fx'; f.setAttribute('aria-hidden', 'true'); h.append(f); return f })

  let last = -1e9
  function tick(now) {
    requestAnimationFrame(tick)
    // côtés : position de chaque piste dans l'écran (fondu vertical complémentaire des bandes haut et bas)
    for (const pin of pins) {
      const top = Math.round(pin.getBoundingClientRect().top)
      if (pin._pt !== top) { pin._pt = top; pin.style.setProperty('--pt', `${top}px`) }
      if (pin._vh !== innerHeight) { pin._vh = innerHeight; pin.style.setProperty('--vh', `${innerHeight}px`) }
    }
    if (now - last < 120) return
    last = now
    const t = reduced ? 0 : now / 1000
    const vars = []
    for (let i = 0; i < 4; i++) {
      const c = wheel(hueAt(i, t)), l = c[0] * LUMA[0] + c[1] * LUMA[1] + c[2] * LUMA[2]
      const tint = c.map((v) => (v + (l - v) * FX.palDesat) * FX.palDark)
      vars.push([`--fxl${i}`, css(tint)], [`--fxd${i}`, css(tint.map((v) => v * DARK_TINT_GAIN))])
    }
    vars.push(['--fx-a', String(FX.bandStrength * (FX.colorStrength > 0 ? 1 : 0))])
    for (const f of layers) for (const [k, v] of vars) f.style.setProperty(k, v)
  }
  requestAnimationFrame(tick)
  return { root }
}
