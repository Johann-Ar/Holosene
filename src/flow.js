/**
 * Animation « flux » de la roue (moteur du kit : design/logo-kit/src/iris-flow.js, utilisé tel quel). La roue ne tourne
 * pas : la largeur de chaque couleur respire, des vagues la parcourent, le rose reste en haut.
 * Une seule texture 1D par image (512 × 1, RGBA, même convention que IRIS_STOPS : 0 = bas, sens horaire), partagée par
 * le chargeur, le « o » de l'accueil et l'anneau de la lentille ; même horloge pour tous (performance.now()), donc aucun
 * saut de couleur au passage de relais. Tampon réutilisé : aucune allocation par image.
 */
import { irisFlowLUT, irisFlowMix, IRIS_FLOW } from '../design/logo-kit/src/iris-flow.js'

// accueil : les réglages « idle » du kit sont si discrets que le flux passe inaperçu ; on les pousse au maximum des
// plages autorisées par le kit (commentaires de iris-flow.js), sans en sortir
Object.assign(IRIS_FLOW.idle, { breath: 0.45, breathPeriod: 8, waves: 0.8, waveSpeed: 0.07, waveWidth: 1.2 })
// et le logo de l'accueil prend 70 % des réglages « loading » du kit (mélange irisFlowMix du kit) : un flux bien visible
export const FLOW_HOME_MIX = 0.7

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const t0 = performance.now()

export const FLOW = {
  size: 512,
  lut: new Uint8Array(512 * 4),
  version: 0,       // incrémenté à chaque nouvelle texture (gl.js la ré-envoie au GPU)
  mix: FLOW_HOME_MIX, // 0 : réglages idle, 1 : loading ; logo de l'accueil
  glNeeds: true,    // logo de l'accueil ou lentille à l'écran (fixé par gl.js)
  loaderNeeds: false, // (chargeur en CSS : n'utilise plus la texture)
  hoverTarget: 0,   // 1 quand le curseur survole le « o » du logo (gl.js)
  frozen: false,    // panneau ?debug=iris : roue finale (amount = 0)
  cpuMs: 0,         // temps de calcul de la dernière texture (mesure)
  t0,               // début de la montée du flux (fixé au relais du chargeur)
}

// l'intensité monte de 0 à 1 en 1,2 s (ease-out) à partir de FLOW.t0 : le relais du chargeur (main.js), dont la roue
// est la roue fixe du kit (amount 0) : aucun saut de couleur ; animations réduites : 0 (roue finale)
const amountAt = (now) => {
  if (reduced || FLOW.frozen) return 0
  const x = Math.min(1, Math.max(0, (now - FLOW.t0) / 1200))
  return 1 - Math.pow(1 - x, 3)
}

// survol du « o » du logo (FLOW.hoverTarget, fixé par gl.js) : le flux passe en douceur aux réglages « loading » complets
// et s'accélère (horloge propre, intégrée : jamais de saut quand la vitesse change)
const HOVER_SPEED = 1.8
let lastAmount = -1, clock = 0, lastNow = null, hover = 0
export function updateFlow(now) {
  const dt = lastNow === null ? 0 : Math.min(0.1, (now - lastNow) / 1000); lastNow = now
  hover += (FLOW.hoverTarget - hover) * (1 - Math.exp(-dt / 0.35))
  clock += dt * (1 + (HOVER_SPEED - 1) * hover)
  const amount = amountAt(now)
  // pause : rien de visible, ou roue figée déjà calculée
  if (!(FLOW.glNeeds || FLOW.loaderNeeds) || (amount === 0 && lastAmount === 0)) return
  const s = performance.now()
  const cfg = irisFlowMix(FLOW.mix + (1 - FLOW.mix) * hover)
  cfg.amount = amount
  irisFlowLUT(clock, cfg, FLOW.size, FLOW.lut)
  FLOW.cpuMs = performance.now() - s
  FLOW.version++
  lastAmount = amount
}

export { IRIS_FLOW }
