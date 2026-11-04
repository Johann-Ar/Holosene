/**
 * Panneau de réglages ?debug=iris : curseurs sur les valeurs de src/iris-config.js et sur IRIS_FLOW.idle (modifiées en
 * direct), « figer la roue » (roue finale du kit, sans flux) et comparaison avec la référence du kit. Chargé uniquement en
 * développement (main.js : import.meta.env.DEV) : il n'existe pas dans le site publié.
 */
import { IRIS } from './iris-config.js'
import { FLOW, IRIS_FLOW } from './flow.js'
import { FX } from './fx-config.js'
import refDark from '../design/logo-kit/ref/monogram-iris-dark@2x.png'
import refLight from '../design/logo-kit/ref/monogram-iris-light@2x.png'

const SLIDERS = [
  ['intro', 'grow', 'Croissance du « o » (ms)', 600, 1200, 10],
  ['intro', 'shift', 'Glissement du monogramme (ms)', 600, 1200, 10],
]

// réglages du flux (IRIS_FLOW du kit), dans les plages indiquées en commentaire dans iris-flow.js
const FLOW_SLIDERS = [
  ['breath', 'respiration', 0.15, 0.45, 0.01], ['breathPeriod', 'période de respiration (s)', 8, 16, 0.5],
  ['waves', 'amplitude des vagues', 0.3, 0.8, 0.01], ['waveSpeed', 'vitesse des vagues (tours/s)', 0.02, 0.07, 0.001],
  ['waveWidth', 'largeur des vagues (couleurs)', 1.2, 2.5, 0.05], ['wander', 'dérive du rose (°)', 0, 8, 0.5],
]

export function mountIrisDebug() {
  const box = document.createElement('aside')
  box.setAttribute('aria-label', 'Réglages Iris')
  box.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:1000;width:300px;max-height:80vh;overflow:auto;padding:12px 14px;border-radius:12px;background:rgb(20 20 20 / .92);color:#fff;font:12px/1.4 ui-monospace,monospace'
  box.innerHTML = '<strong>?debug=iris</strong>'
  for (const [group, key, label, min, max, step] of SLIDERS) {
    const row = document.createElement('label')
    row.style.cssText = 'display:grid;gap:2px;margin-top:8px'
    const out = document.createElement('span')
    const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value: IRIS[group][key] })
    const show = () => { out.textContent = `${label} : ${IRIS[group][key]}` }
    input.addEventListener('input', () => { IRIS[group][key] = Number(input.value); show() })
    show(); row.append(out, input); box.append(row)
  }
  // flux : réglages « idle » (logo de l'accueil) ; même plages que le kit
  for (const [key, label, min, max, step] of FLOW_SLIDERS) {
    const row = document.createElement('label')
    row.style.cssText = 'display:grid;gap:2px;margin-top:8px'
    const out = document.createElement('span')
    const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value: IRIS_FLOW.idle[key] })
    const show = () => { out.textContent = `Flux (idle) — ${label} : ${IRIS_FLOW.idle[key]}` }
    input.addEventListener('input', () => { IRIS_FLOW.idle[key] = Number(input.value); show() })
    show(); row.append(out, input); box.append(row)
  }
  // zones floues colorées (fx-config.js)
  for (const [key, label, min, max, step] of [['colorStrength', 'couleur dans le flou', 0, 1, 0.01], ['aberration', 'aberration', 0, 0.01, 0.0005], ['grain', 'grain', 0, 0.15, 0.005], ['grainChroma', 'grain coloré', 0, 1, 0.05], ['halation', 'halation', 0, 0.3, 0.01]]) {
    const row = document.createElement('label')
    row.style.cssText = 'display:grid;gap:2px;margin-top:8px'
    const out = document.createElement('span')
    const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value: FX[key] })
    const show = () => { out.textContent = `Zones floues — ${label} : ${FX[key]}` }
    input.addEventListener('input', () => { FX[key] = Number(input.value); FX.version++; show() })
    show(); row.append(out, input); box.append(row)
  }
  // figer la roue à t = 0 (amount = 0 : la roue finale du kit)
  const freeze = document.createElement('label')
  freeze.style.cssText = 'display:flex;gap:6px;margin-top:10px'
  const cb = Object.assign(document.createElement('input'), { type: 'checkbox' })
  cb.addEventListener('change', () => { FLOW.frozen = cb.checked })
  freeze.append(cb, 'Figer la roue (roue finale, sans flux)')
  // référence du kit, à comparer avec le logo
  const ref = document.createElement('label')
  ref.style.cssText = 'display:flex;gap:6px;margin-top:6px'
  const cr = Object.assign(document.createElement('input'), { type: 'checkbox' })
  const img = Object.assign(document.createElement('img'), { alt: 'Référence du kit' })
  img.style.cssText = 'display:none;width:100%;margin-top:8px;border-radius:8px'
  cr.addEventListener('change', () => {
    img.src = matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.dataset.theme === 'dark' ? refDark : refLight
    img.style.display = cr.checked ? 'block' : 'none'
  })
  ref.append(cr, 'Afficher la référence du kit')
  box.append(freeze, ref, img)
  document.body.append(box)
}
