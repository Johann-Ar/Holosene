/**
 * Bandes de flou CSS (haut et bas de l'écran, barre du haut, côtés des pistes, haut des fiches) : même grain et même
 * colorisation que le bord des vignettes (WebGL), avec les mêmes teintes vivantes (fx-config.js, hueAt).
 * - Chaque bande reçoit un calque .fx : un dégradé dont les couleurs sont lues dans le fond, aux endroits que couvre
 *   la bande (elles défilent donc avec le fond), fondu en « éclaircir » (clair : seuls les sombres se teintent, les blancs restent blancs)
 *   ou en « assombrir » (sombre : les clairs se teintent, le noir reste noir), et le grain (texture en tuile).
 * - Côtés des pistes : leur fondu vertical est le complément exact de celui des bandes haut et bas ; dans les coins, les
 *   deux se relaient au lieu de se superposer (un seul flou continu).
 * Les couleurs sont recalculées à chaque défilement et environ 8 fois par seconde, seulement sur ces calques.
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
  // le haut (barre du menu, fondu du haut) garde son fondu d'origine, sans calque : seulement le bas et les côtés
  const hosts = [...document.querySelectorAll('.edge--bottom')]
  // côtés des pistes : deux bandes réelles par piste (plus de pseudo-éléments), pour y poser le calque
  const pins = [...document.querySelectorAll('.work__pin')]
  for (const pin of pins) for (const side of ['l', 'r']) { const s = document.createElement('div'); s.className = `side side--${side}`; s.setAttribute('aria-hidden', 'true'); pin.append(s); hosts.push(s) }
  const layers = hosts.map((h) => { const f = document.createElement('span'); f.className = 'fx'; f.setAttribute('aria-hidden', 'true'); h.append(f); return f })

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  // couleur du fond à un point de l'écran : formes du fond (backdrop.js) pondérées comme dans le fond lui-même ;
  // là où il est neutre, teintes mouvantes réparties autour du centre de l'écran (comme dans le WebGL)
  function colorAt(x, y, t) {
    const bg = FX.bg, py = y + bg.scroll
    let r = 0, g = 0, b = 0, sum = 0
    if (bg.B) for (let i = 0; i < bg.n; i++) {
      const j = i * 4, dx = (x - bg.B[j]) / bg.B[j + 2], dy = (py - bg.B[j + 1]) / bg.B[j + 2]
      const k = Math.min(1, bg.A[i]) * Math.exp(-(dx * dx + dy * dy))
      if (k < 1e-4) continue
      const c = wheel(bg.B[j + 3]); r += c[0] * k; g += c[1] * k; b += c[2] * k; sum += k
    }
    const ang = ((Math.atan2(y - innerHeight / 2, x - innerWidth / 2) * 180 / Math.PI) + 360) % 360
    const seg = Math.floor(ang / 90), f = smooth(0, 1, (ang - seg * 90) / 90)
    const p0 = wheel(hueAt(seg % 4, t)), p1 = wheel(hueAt((seg + 1) % 4, t))
    const pal = p0.map((v, j) => v + (p1[j] - v) * f)
    const w = smooth(0.02, 0.35, sum)
    return sum > 0 ? [r / sum, g / sum, b / sum].map((v, j) => pal[j] + (v - pal[j]) * w) : pal
  }
  const tone = (c, dark) => {
    const l = c[0] * LUMA[0] + c[1] * LUMA[1] + c[2] * LUMA[2]
    const tint = c.map((v) => (v + (l - v) * FX.palDesat) * FX.palDark)
    return css(dark ? tint.map((v) => v * DARK_TINT_GAIN) : tint)
  }
  const SAMPLES = 6
  const items = layers.map((f) => ({ f, host: f.parentElement, vertical: f.parentElement.classList.contains('side') }))
  let last = -1e9, lastScroll = -1
  function tick(now) {
    requestAnimationFrame(tick)
    // côtés : position de chaque piste dans l'écran (fondu vertical complémentaire des bandes haut et bas)
    for (const pin of pins) {
      const top = Math.round(pin.getBoundingClientRect().top)
      if (pin._pt !== top) { pin._pt = top; pin.style.setProperty('--pt', `${top}px`) }
      if (pin._vh !== innerHeight) { pin._vh = innerHeight; pin.style.setProperty('--vh', `${innerHeight}px`) }
    }
    // couleurs : à chaque défilement (elles suivent le fond), sinon environ 8 fois par seconde (teintes mouvantes)
    if (scrollY === lastScroll && now - last < 120) return
    last = now; lastScroll = scrollY
    const t = reduced ? 0 : now / 1000
    const rootDark = root.dataset.theme === 'dark', chosen = root.classList.contains('theme-chosen')
    const a = String(FX.bandStrength * (FX.colorStrength > 0 ? 1 : 0))
    for (const it of items) {
      const r = it.host.getBoundingClientRect()
      if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue
      const dark = rootDark || (!chosen && !!it.host.closest('.fiche'))
      const stops = []
      for (let k = 0; k < SAMPLES; k++) {
        const u = k / (SAMPLES - 1)
        const x = it.vertical ? r.left + r.width / 2 : r.left + u * r.width, y = it.vertical ? r.top + u * r.height : r.top + r.height / 2
        stops.push(tone(colorAt(x, y, t), dark))
      }
      it.f.style.backgroundImage = `linear-gradient(${it.vertical ? 'to bottom' : 'to right'}, ${stops.join(', ')})`
      it.f.style.setProperty('--fx-a', a)
    }
  }
  requestAnimationFrame(tick)
  return { root }
}
