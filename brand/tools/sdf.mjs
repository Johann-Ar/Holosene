// champ de distance signée du monogramme du logo-kit (design/logo-kit/svg/monogram-iris-dark.svg, tracés exacts du
// Figma, mis à l'échelle de 1000 unités pour sa hauteur), pour le rendu WebGL de l'accueil (contour net à toutes tailles) :
// node sdf.mjs [chromium] → public/media/monogram-sdf.png (816 × 1000, 1 px par unité ; R : S, V : « o »)
// valeur = (distance signée en unités + 4) / 32 × 255, positive dedans. Calculée sur une trame 4× plus fine (distance
// exacte de Felzenszwalb, dedans et dehors), puis moyennée par blocs de 4 × 4 : les marches de la trame disparaissent.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync(new URL('../../design/logo-kit/svg/monogram-iris-dark.svg', import.meta.url), 'utf8')
const S_PATH = svg.match(/<path id="S" d="([^"]+)"/)[1], O_PATH = svg.match(/<clipPath id="o-clip"><path d="([^"]+)"/)[1]
const VB = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)   // 146 154 470 576
const glass = readFileSync(new URL('../../src/glass.js', import.meta.url), 'utf8')
const edt = glass.slice(glass.indexOf('export function insideDistance')).replace('export ', '')

const b = await chromium.launch(process.argv[2] ? { executablePath: process.argv[2] } : {})
const p = await b.newPage()
const url = await p.evaluate(({ S_PATH, O_PATH, edt, VB }) => {
  const insideDistance = new Function(`${edt}; return insideDistance`)()
  const K = 4, W = 816, H = 1000, w = W * K, h = H * K
  const field = (path, rule) => {
    const c = new OffscreenCanvas(w, h), x = c.getContext('2d')
    const u = 1000 / VB[3]   // 1000 unités pour la hauteur du monogramme
    x.setTransform(K * u, 0, 0, K * u, -VB[0] * K * u, -VB[1] * K * u); x.fill(new Path2D(path), rule)
    const a = x.getImageData(0, 0, w, h).data
    const inn = new Uint8Array(w * h), out = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) { inn[i] = a[i * 4 + 3] > 127; out[i] = !inn[i] }
    const di = insideDistance(inn, w, h), dout = insideDistance(out, w, h)
    const sd = new Float32Array(W * H)
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) {
      let s = 0
      for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
        const k = (y * K + j) * w + X * K + i
        s += inn[k] ? di[k] - 0.5 : -(dout[k] - 0.5)
      }
      sd[y * W + X] = s / (K * K) / K
    }
    return sd
  }
  const S = field(S_PATH, 'nonzero'), O = field(O_PATH, 'evenodd')
  const c = new OffscreenCanvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H)
  const enc = (v) => Math.round(Math.min(255, Math.max(0, (v + 4) / 32 * 255)))
  for (let i = 0; i < W * H; i++) { img.data[i * 4] = enc(S[i]); img.data[i * 4 + 1] = enc(O[i]); img.data[i * 4 + 3] = 255 }
  x.putImageData(img, 0, 0)
  return c.convertToBlob({ type: 'image/png' }).then((bl) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(bl) }))
}, { S_PATH, O_PATH, edt, VB })
await b.close()
writeFileSync(new URL('../../public/media/monogram-sdf.png', import.meta.url), Buffer.from(url.split(',')[1], 'base64'))
console.log('public/media/monogram-sdf.png')
