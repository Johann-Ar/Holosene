// champ de distance signée du monogramme, pour le rendu WebGL de l'accueil (contour net à toutes les tailles) :
// node sdf.mjs [chromium] → public/media/monogram-sdf.png (816 × 1000, 1 px par unité ; R : S, V : « o »)
// valeur = (distance signée en unités + 4) / 32 × 255, positive dedans. Calculée sur une trame 4× plus fine (distance
// exacte de Felzenszwalb, dedans et dehors), puis moyennée par blocs de 4 × 4 : les marches de la trame disparaissent.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const gl = readFileSync(new URL('../../src/gl.js', import.meta.url), 'utf8')
const S_PATH = gl.match(/const S_PATH = '([^']+)'/)[1], O_PATH = gl.match(/const O_PATH = '([^']+)'/)[1]
const glass = readFileSync(new URL('../../src/glass.js', import.meta.url), 'utf8')
const edt = glass.slice(glass.indexOf('export function insideDistance')).replace('export ', '')

const b = await chromium.launch(process.argv[2] ? { executablePath: process.argv[2] } : {})
const p = await b.newPage()
const url = await p.evaluate(({ S_PATH, O_PATH, edt }) => {
  const insideDistance = new Function(`${edt}; return insideDistance`)()
  const K = 4, W = 816, H = 1000, w = W * K, h = H * K
  const field = (path, rule) => {
    const c = new OffscreenCanvas(w, h), x = c.getContext('2d')
    x.scale(K, K); x.fill(new Path2D(path), rule)
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
}, { S_PATH, O_PATH, edt })
await b.close()
writeFileSync(new URL('../../public/media/monogram-sdf.png', import.meta.url), Buffer.from(url.split(',')[1], 'base64'))
console.log('public/media/monogram-sdf.png')
