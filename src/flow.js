/**
 * Animation « flux » de la roue (moteur du kit : design/logo-kit/src/iris-flow.js, utilisé tel quel). La roue ne tourne
 * pas : la largeur de chaque couleur respire, des vagues la parcourent, le rose reste en haut.
 * Une seule texture 1D par image (512 × 1, RGBA, même convention que IRIS_STOPS : 0 = bas, sens horaire), partagée par
 * le chargeur, le « o » de l'accueil et l'anneau de la lentille ; même horloge pour tous (performance.now()), donc aucun
 * saut de couleur au passage de relais. Tampon réutilisé : aucune allocation par image.
 */
import { irisFlowLUT, irisFlowMix, IRIS_FLOW } from '../design/logo-kit/src/iris-flow.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const t0 = performance.now()

export const FLOW = {
  size: 512,
  lut: new Uint8Array(512 * 4),
  version: 0,       // incrémenté à chaque nouvelle texture (gl.js la ré-envoie au GPU)
  mix: 0,           // 0 : réglages idle (logo de l'accueil), 1 : loading (chargeur) ; fixé par le chargeur
  glNeeds: true,    // logo de l'accueil ou lentille à l'écran (fixé par gl.js)
  loaderNeeds: true, // chargeur affiché (fixé par main.js)
  frozen: false,    // panneau ?debug=iris : roue finale (amount = 0)
  cpuMs: 0,         // temps de calcul de la dernière texture (mesure)
}

// au chargement de la page, l'intensité monte de 0 à 1 en 1,2 s (ease-out) ; animations réduites : 0 (roue finale)
const amountAt = (now) => {
  if (reduced || FLOW.frozen) return 0
  const x = Math.min(1, (now - t0) / 1200)
  return 1 - Math.pow(1 - x, 3)
}

let lastAmount = -1
export function updateFlow(now) {
  const amount = amountAt(now)
  // pause : rien de visible, ou roue figée déjà calculée
  if (!(FLOW.glNeeds || FLOW.loaderNeeds) || (amount === 0 && lastAmount === 0)) return
  const s = performance.now()
  const cfg = irisFlowMix(FLOW.mix)
  cfg.amount = amount
  irisFlowLUT(now / 1000, cfg, FLOW.size, FLOW.lut)
  FLOW.cpuMs = performance.now() - s
  FLOW.version++
  lastAmount = amount
}

export { IRIS_FLOW }
