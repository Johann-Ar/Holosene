// Met à jour le logo-kit (design/logo-kit) à partir d'un export Figma « logos-holosene-final » (cadres « 01 — Logo final »).
// Rien n'est redessiné : le tracé du S et celui de l'anneau sont recopiés tels quels depuis les SVG des cadres (repère du
// cadre Figma, 775 × 965) ; la roue est relue sur les 360 parts de couleur de l'anneau exporté (couleur au milieu de chaque
// part), puis remise au format du kit (61 arrêts, tous les 6°).
//   node brand/tools/kit-depuis-pack.mjs <dossier logos-holosene-final>
// Ensuite : node brand/tools/sdf.mjs (carte de distance du logo WebGL).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const pack = process.argv[2]
if (!pack) { console.error('usage : node brand/tools/kit-depuis-pack.mjs <dossier du pack>'); process.exit(1) }
const kit = new URL('../../design/logo-kit/', import.meta.url)
const rd = (p) => readFileSync(join(pack, p), 'utf8')
const KIT = (p) => new URL(p, kit)

// --- tracés exacts (repère du cadre) ---
const cadre = rd('svg/cadres/logo-couleur-light-cadre.svg')
const S = cadre.match(/class="logo-s"[^>]* d="([^"]+)"/)[1]
const mono = rd('svg/cadres/logo-mono-light-cadre.svg')
const O = mono.match(/<g class="logo-o"><path[^>]* d="([^"]+)"/)[1]
const [FW, FH] = cadre.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number)

// --- anneau : centre (moyenne des départs des parts, répartis sur tout le cercle), rayons ---
const wedges = [...cadre.matchAll(/<path fill="(#[0-9a-fA-F]{6})" d="M([\d.]+) ([\d.]+)A([\d.]+) [\d.]+ 0 0 1 ([\d.]+) ([\d.]+)L[\d.]+ [\d.]+A([\d.]+)/g)]
  .map((m) => ({ hex: m[1].toUpperCase(), x0: +m[2], y0: +m[3], R: +m[4], x1: +m[5], y1: +m[6], Ri: +m[7] }))
if (wedges.length < 300) throw new Error('parts de la roue introuvables : ' + wedges.length)
const R = wedges[0].R, Ri = wedges[0].Ri
const cx = wedges.reduce((s, w) => s + w.x0, 0) / wedges.length, cy = wedges.reduce((s, w) => s + w.y0, 0) / wedges.length
// position sur la roue (convention du kit : 0 = bas, sens horaire à l'écran, y vers le bas)
const tOf = (x, y) => { const d = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90 - 180; return (((d % 360) + 360) % 360) / 360 }
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const HEX = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
const samples = wedges.map((w) => {
  let a = tOf(w.x0, w.y0), b = tOf(w.x1, w.y1); if (b < a) b += 1
  return { t: ((a + b) / 2) % 1, c: rgb(w.hex) }
}).sort((p, q) => p.t - q.t)
const at = (t) => {   // interpolation circulaire entre les milieux des parts
  const n = samples.length
  for (let i = 0; i < n; i++) {
    const p = samples[i], q = samples[(i + 1) % n], tq = q.t + (i + 1 === n ? 1 : 0)
    const tt = t < p.t ? t + 1 : t
    if (tt >= p.t && tt <= tq) { const k = (tt - p.t) / (tq - p.t || 1); return p.c.map((v, j) => v + (q.c[j] - v) * k) }
  }
  return samples[0].c
}
const r4 = (v) => +v.toFixed(4)
const grid = Array.from({ length: 61 }, (_, k) => r4(k / 60))
const STOPS = [[0, HEX(at(0))], ...grid.map((p) => [p, HEX(at(p % 1))])]
STOPS[STOPS.length - 1][1] = STOPS[0][1]   // la roue se referme sur le cyan
const NAMES = ['cyan', 'bleu', 'indigo', 'violet', 'magenta', 'rose', 'corail', 'jaune', 'vert-jaune', 'vert']
const KEYS = NAMES.map((n, i) => [n, HEX(at(i / 10)), r4(i / 10)])
const conic = `conic-gradient(from 180deg, ${STOPS.map(([p, c]) => `${c} ${(p * 360).toFixed(1)}deg`).join(', ')})`

// --- SVG du kit (même structure qu'avant : path#S, clipPath#o-clip, g#o avec le dégradé conique) ---
const f3 = (v) => +v.toFixed(3)
const oBox = `x="${f3(cx - R)}" y="${f3(cy - R)}" width="${f3(2 * R)}" height="${f3(2 * R)}"`
const oIris = `<clipPath id="o-clip"><path d="${O}" fill-rule="evenodd"/></clipPath><g id="o" clip-path="url(#o-clip)"><foreignObject ${oBox}><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${conic}"></div></foreignObject></g>`
// cadre du monogramme : même taille qu'avant (470 × 576), recentré sur le dessin de l'export du 6 novembre 2026
// (S de x 162,1 à 452,5 et de y 154,5 à 722,9 ; « o » jusqu'à x 612,7), pour garder une marge autour du S.
// À reporter dans src/gl.js (MONO_VB) s'il change.
const VB = '152.4 150.7 470 576'
const head = (w, h, vb) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" fill="none">`
const BG = { dark: '#1E1E1E', light: '#F6F5F2' }, INK = { dark: '#FFFFFF', light: '#1E1E1E' }
const files = {
  'svg/monogram-iris-dark.svg': `${head(470, 576, VB)}<path id="S" d="${S}" fill="#FFFFFF"/>${oIris}</svg>`,
  'svg/monogram-iris-light.svg': `${head(470, 576, VB)}<path id="S" d="${S}" fill="#1E1E1E"/>${oIris}</svg>`,
  'svg/monogram-mono-black.svg': `${head(470, 576, VB)}<path id="S" d="${S}" fill="#1E1E1E"/><path id="o" d="${O}" fill="#1E1E1E" fill-rule="evenodd"/></svg>`,
  'svg/monogram-mono-white.svg': `${head(470, 576, VB)}<path id="S" d="${S}" fill="#FFFFFF"/><path id="o" d="${O}" fill="#FFFFFF" fill-rule="evenodd"/></svg>`,
}
for (const m of ['dark', 'light']) {
  files[`svg/logo-${m}-couleur.svg`] = `${head(FW, FH, `0 0 ${FW} ${FH}`)}<rect width="${FW}" height="${FH}" fill="${BG[m]}"/><path id="S" d="${S}" fill="${INK[m]}"/>${oIris}</svg>`
  files[`svg/logo-${m}-mono.svg`] = `${head(FW, FH, `0 0 ${FW} ${FH}`)}<rect width="${FW}" height="${FH}" fill="${BG[m]}"/><path id="S" d="${S}" fill="${INK[m]}"/><path id="o" d="${O}" fill="${INK[m]}" fill-rule="evenodd"/></svg>`
}
for (const [p, s] of Object.entries(files)) writeFileSync(KIT(p), s)

// --- src/iris.js : arrêts, couleurs clés, variante « final » ---
let js = readFileSync(KIT('src/iris.js'), 'utf8')
js = js.replace(/^export const IRIS_STOPS = .*$/m, `export const IRIS_STOPS = ${JSON.stringify(STOPS)};`)
js = js.replace(/^export const IRIS_KEYS = .*$/m, `export const IRIS_KEYS = ${JSON.stringify(KEYS)};`)
js = js.replace(/("final": )\[[\s\S]*?\n \](,\n)/, (_, a, b) => a + JSON.stringify(STOPS, null, 1).replace(/\n/g, '\n ') + b)
writeFileSync(KIT('src/iris.js'), js)

// --- src/iris.glsl : morceaux linéaires entre les arrêts ---
const v3 = (h) => `vec3(${rgb(h).map((v) => (v / 255).toFixed(4)).join(',')})`
const seg = []
for (let i = 1; i < STOPS.length - 1; i++) {
  const [p0, c0] = STOPS[i], [p1, c1] = STOPS[i + 1]
  seg.push(`  if (t >= ${p0.toFixed(4)} && t <= ${p1.toFixed(4)}) c = mix(${v3(c0)}, ${v3(c1)}, (t - ${p0.toFixed(4)}) / ${(p1 - p0).toFixed(4)});`)
}
let gl = readFileSync(KIT('src/iris.glsl'), 'utf8')
gl = gl.replace(/(  vec3 c = vec3\(0\.0\);\n)(?:  if \(t[^\n]*\n)+/, (_, a) => a + seg.join('\n') + '\n')
writeFileSync(KIT('src/iris.glsl'), gl)

// --- tokens ---
const j = JSON.parse(readFileSync(KIT('tokens/iris.json'), 'utf8'))
j.source = 'Figma — 01 Logo final (fichier « logo holosene (Copy) », export du 6 novembre 2026) · roue relue sur l\'export'
j.ring.center = [f3(cx), f3(cy)]; j.ring.outerRadius = f3(R); j.ring.innerRadius = f3(Ri); j.ring.innerRatio = +(Ri / R).toFixed(3)
j.ring.coordinateSpace = `viewBox 0 0 ${FW} ${FH} (frame Figma)`
j.conic.note = `0deg = haut (CSS). Position 0 = cyan (en bas), 0,5 = rose ${KEYS[5][1]} (en haut).`
j.conic.keys = KEYS.map(([name, hex, pos]) => ({ name, hex, pos, deg: +(pos * 360).toFixed(1) }))
j.conic.stops = STOPS.map(([pos, hex]) => ({ pos, deg: +(pos * 360).toFixed(1), hex }))
j.css = conic
j.variants.stops.final = STOPS
writeFileSync(KIT('tokens/iris.json'), JSON.stringify(j, null, 2) + '\n')

let th = readFileSync(KIT('tokens/theme.css'), 'utf8')
for (const [n, h, p] of KEYS) th = th.replace(new RegExp(`(--iris-${n}: )#[0-9A-Fa-f]{6}`), `$1${h}`)
th = th.replace(/--iris-conic: [^;]+;/, `--iris-conic: ${conic};`).replace('Roue irisée v2', 'Roue irisée (export du 6 novembre 2026)')
writeFileSync(KIT('tokens/theme.css'), th)
let ic = readFileSync(KIT('tokens/iris.css'), 'utf8')
writeFileSync(KIT('tokens/iris.css'), ic.replace(/--iris-conic: [^;]+;/, `--iris-conic: ${conic};`))

console.log(JSON.stringify({ parts: wedges.length, centre: [f3(cx), f3(cy)], R: f3(R), Ri: f3(Ri), ratio: +(Ri / R).toFixed(4), cles: KEYS }, null, 0))
