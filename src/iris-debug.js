/**
 * Panneau de réglages ?debug=iris : curseurs sur les valeurs de src/iris-config.js (modifiées en direct), « figer à
 * t = 0 » (roue du « o » à l'orientation du kit) et comparaison avec la référence du kit. Chargé uniquement en
 * développement (main.js : import.meta.env.DEV) : il n'existe pas dans le site publié.
 */
import { IRIS } from './iris-config.js'
import refDark from '../design/logo-kit/ref/monogram-iris-dark@2x.png'
import refLight from '../design/logo-kit/ref/monogram-iris-light@2x.png'

const SLIDERS = [
  ['o', 'turnSeconds', 'Rotation du « o » : un tour en (s)', 24, 40, 1],
  ['o', 'rampMs', 'Démarrage de la rotation (ms)', 2000, 6000, 100],
  ['intro', 'grow', 'Croissance du « o » (ms)', 600, 1200, 10],
  ['intro', 'shift', 'Glissement du monogramme (ms)', 600, 1200, 10],
  ['loader', 'track', 'Piste du chargeur (opacité)', 0.06, 0.08, 0.005],
  ['loader', 'minMs', 'Durée minimale du chargeur (ms)', 600, 1500, 50],
  ['loader', 'stall', 'Plafond si le chargement cale', 0.8, 0.95, 0.01],
  ['loader', 'stallMs', 'Avancée lente si ça cale (ms)', 3000, 10000, 250],
  ['loader', 'spring', 'Ressort de la progression (s)', 0.1, 0.4, 0.01],
  ['loader', 'closeMs', 'Fermeture du chargeur (ms)', 250, 500, 10],
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
  // figer la roue du « o » à t = 0 (orientation du kit)
  const freeze = document.createElement('label')
  freeze.style.cssText = 'display:flex;gap:6px;margin-top:10px'
  const cb = Object.assign(document.createElement('input'), { type: 'checkbox' })
  cb.addEventListener('change', () => { IRIS.o.freeze = cb.checked })
  freeze.append(cb, 'Figer le « o » à t = 0')
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
