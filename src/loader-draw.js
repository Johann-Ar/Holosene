/**
 * Dessin du chargeur : le « o » du logo-kit (anneau, rayon intérieur = IRIS_INNER_RATIO × rayon extérieur, roue
 * IRIS_STOPS en conique depuis le bas, sens horaire). Partagé par le worker (loader-worker.js, hors du fil principal :
 * fluide pendant que la page prépare WebGL) et par le repli sur le fil principal (loader.js).
 *
 * Rotation : un arc de 306° tourne sur la roue fixe (il en dévoile les couleurs à leur angle exact). Opaque sur
 * l'essentiel de sa longueur, il s'efface sur ses 84 derniers degrés (la queue) ; ses bords sont de plus en plus flous
 * de la tête (nette) à la queue ; la tête est un bout arrondi net (demi-disque). Profil relevé sur l'ancien masque.
 * Fermeture (1300 ms) : la queue s'arrête, la tête continue sur son élan et ralentit jusqu'à la queue (bout toujours
 * arrondi) ; l'anneau plein vient couvrir la queue estompée, le flou de la queue s'éteint ; puis l'anneau grandit en
 * accélérant (60 % → 100 % du rayon du relais) : le « o » du logo WebGL prend le relais au même pixel, à la même vitesse.
 */
import { IRIS_STOPS, IRIS_INNER_RATIO, sampleIris } from '../design/logo-kit/src/iris.js'

export const LOADER = {
  turn: 1350,        // ms par tour
  arc: 306,          // longueur de l'arc (degrés), de la queue à la tête
  tail: 84,          // la queue s'efface sur ses 84 premiers degrés (0 au bout, 1 ensuite)
  tailBlur: 0.5,     // flou : demi-largeur du bord, en fraction de l'épaisseur, de la queue (× 1) à la tête (× 0, net)
  start: 0.6,        // taille pendant la rotation (fraction du rayon du relais)
  close: 1300,       // durée de la fermeture (ms)
  sweep: 640,        // la tête rejoint la queue (ms)
  full: [660, 900],  // l'anneau plein couvre la queue estompée (ms)
  fade: [880, 1120], // puis le flou de la queue s'éteint (ms) : l'anneau ne faiblit jamais entre les deux
  margin: 1.5,       // cadre de la toile : 1,5 × le diamètre (le flou n'est jamais coupé)
}

const TAU = Math.PI * 2, DEG = Math.PI / 180
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3)   // pente initiale 3 × 54° / 0,64 s ≈ vitesse de rotation : sans à-coup

export function createLoaderDraw(canvas, { dpr = 1, r1 = 44, reduced = false, now = () => performance.now() } = {}) {
  const ctx = canvas.getContext('2d')
  const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }))
  let R1 = r1, size = 0, sprite = null, mask = null, mctx = null
  let t0 = now(), closeAt = null, growMs = 400, frozen = 0

  // forme de l'arc (alpha seulement), calculée pixel par pixel une fois par taille, à l'échelle 1 (rayon R1) : bord
  // anticrénelé au pixel, flou croissant vers la queue, tête en demi-disque net. Tête à l'angle 0 (droite), queue derrière.
  function buildSprite() {
    const S = size, c = S / 2, Ro = R1 * dpr, Ri = Ro * IRIS_INNER_RATIO, th = Ro - Ri, mid = (Ro + Ri) / 2
    const img = new ImageData(S, S), d = img.data, ARC = LOADER.arc * DEG, aa = 0.75
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const px = x + 0.5 - c, py = y + 0.5 - c, r = Math.hypot(px, py)
      // angle depuis la queue, dans le sens de rotation (horaire à l'écran) : 0 à la queue, ARC à la tête
      let phi = Math.atan2(py, px) + ARC; phi = ((phi % TAU) + TAU) % TAU
      let a = 0
      if (phi <= ARC) {
        const u = phi / ARC, blur = aa + LOADER.tailBlur * th * (1 - u)
        const dist = Math.max(Ri - r, r - Ro)   // distance signée à la bande de l'anneau (négative dedans)
        a = (1 - smooth(-blur, blur, dist)) * smooth(0, LOADER.tail * DEG, phi)
      }
      // tête : disque au bout (rayon = demi-épaisseur, centré sur l'anneau), net
      a = Math.max(a, 1 - smooth(-aa, aa, Math.hypot(px - mid, py) - th / 2))
      d[(y * S + x) * 4 + 3] = Math.round(clamp01(a) * 255)
    }
    sprite = mk(S, S); sprite.getContext('2d').putImageData(img, 0, 0)
  }
  function resize(r) {
    R1 = r
    size = Math.ceil(R1 * 2 * LOADER.margin * dpr / 2) * 2
    canvas.width = canvas.height = size
    mask = mk(size, size); mctx = mask.getContext('2d')
    buildSprite()
  }
  resize(R1)

  // roue du kit, fixe : position 0 en bas (π/2 depuis la droite), sens horaire. Dégradé conique natif ; sans lui, la
  // même roue calculée pixel par pixel (sampleIris du kit)
  let wheelImg = null
  const paintWheel = (g, c) => {
    if (g.createConicGradient) {
      const grad = g.createConicGradient(Math.PI / 2, c, c)
      for (const [p, col] of IRIS_STOPS) grad.addColorStop(p, col)
      g.fillStyle = grad; g.fillRect(0, 0, size, size); return
    }
    if (!wheelImg || wheelImg.width !== size) {
      const img = new ImageData(size, size)
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const [r, gg, b] = sampleIris(Math.atan2(y + 0.5 - c, x + 0.5 - c)), i = (y * size + x) * 4
        img.data[i] = r * 255; img.data[i + 1] = gg * 255; img.data[i + 2] = b * 255; img.data[i + 3] = 255
      }
      wheelImg = mk(size, size); wheelImg.getContext('2d').putImageData(img, 0, 0)
    }
    g.drawImage(wheelImg, 0, 0)
  }
  const ringPath = (g, c, ro) => { g.beginPath(); g.arc(c, c, ro, 0, TAU); g.arc(c, c, ro * IRIS_INNER_RATIO, 0, TAU, true) }

  function draw() {
    const t = now(), c = size / 2
    const k = closeAt === null ? -1 : t - closeAt   // temps depuis le début de la fermeture
    // angle de la tête : rotation continue, figée au début de la fermeture
    const rot = reduced ? -90 * DEG : closeAt === null ? ((t - t0) / LOADER.turn) * TAU : frozen
    // taille : 60 % pendant la rotation ; à la fermeture, croissance accélérée (t²) sur les growMs dernières ms
    const g0 = LOADER.close - growMs, gx = k < 0 ? 0 : clamp01((k - g0) / growMs)
    const s = LOADER.start + (1 - LOADER.start) * gx * gx
    const ro = R1 * dpr * s, th = ro * (1 - IRIS_INNER_RATIO), mid = ro - th / 2

    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, size, size)
    mctx.globalAlpha = k < 0 ? 1 : 1 - smooth(LOADER.fade[0], LOADER.fade[1], k)
    if (mctx.globalAlpha > 0.001) {
      mctx.translate(c, c); mctx.rotate(rot); mctx.scale(s, s)
      mctx.drawImage(sprite, -c, -c)
      mctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    if (k >= 0) {
      // la tête avance seule jusqu'à la queue, bout arrondi
      const gap = (360 - LOADER.arc) * DEG, a0 = rot - 0.5 * DEG, a1 = rot + gap * easeOut(k / LOADER.sweep)
      mctx.globalAlpha = 1; mctx.lineWidth = th; mctx.lineCap = 'round'; mctx.strokeStyle = '#000'
      mctx.beginPath(); mctx.arc(c, c, mid, a0, Math.max(a0 + 1e-3, a1 - th / 2 / mid)); mctx.stroke()
      // anneau plein : couvre la queue estompée (net)
      const f = smooth(LOADER.full[0], LOADER.full[1], k)
      if (f > 0) { mctx.globalAlpha = f; mctx.fillStyle = '#000'; ringPath(mctx, c, ro); mctx.fill('evenodd') }
      mctx.globalAlpha = 1
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, size, size)
    paintWheel(ctx, c)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(mask, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    return k >= LOADER.close
  }

  return {
    draw,
    resize,
    size: () => size / dpr,
    close(ms) {
      if (closeAt !== null) return
      growMs = ms; frozen = reduced ? -90 * DEG : ((now() - t0) / LOADER.turn) * TAU
      closeAt = reduced ? now() - LOADER.close : now()
    },
  }
}
