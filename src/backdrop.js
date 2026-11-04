/**
 * Fond de page : des formes colorées (couleurs de la roue du logo-kit) derrière une plaque de plastique dépoli.
 * - Les formes sont placées dans la page entière (sur toute la hauteur du document) : en faisant défiler, on se déplace
 *   dans le fond. Elles dérivent lentement (animation passive).
 * - Sous le curseur, elles se rapprochent de la plaque : plus nettes, plus intenses, moins soumises au grain.
 * - Grain de la plaque : bruit de valeur lissé, fixé à l'écran, à l'échelle du pixel CSS (aspect mat, pas de pixels
 *   qui scintillent), plus un tramage de ±0,5/255 contre les bandes de dégradé.
 * Toile WebGL propre (.bg-canvas), sous tout le contenu ; sans WebGL, le fond uni (--bg) reste.
 */
import KIT_IRIS from '../design/logo-kit/src/iris.glsl?raw'

const N = 12   // nombre de formes réparties dans la page

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`
const FRAG = `precision highp float;
uniform vec2 uRes;      // taille de la toile (px CSS)
uniform float uDpr;
uniform float uScroll;  // défilement de la page (px CSS)
uniform vec3 uPage;     // --bg du thème
uniform float uLight;   // 1 : mode clair
uniform vec3 uPtr;      // curseur (px CSS, dans la fenêtre), présence (0 à 1)
uniform vec4 uB[${N}];  // formes : centre (px CSS, dans la page), rayon (px), position sur la roue (0 à 1)
${KIT_IRIS}
vec3 irisAt(float t) { float a = t * 6.2831853; return irisColor(vec2(sin(a), -cos(a))); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 x) {
  vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 s = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;   // px CSS, y vers le bas
  vec2 w = s + vec2(0.0, uScroll);                                        // position dans la page
  // proximité du curseur : les formes se rapprochent de la plaque
  float P = uPtr.z * exp(-dot(s - uPtr.xy, s - uPtr.xy) / (2.0 * 220.0 * 220.0));
  // chaque forme n'agit que sur sa zone (somme de taches, sans moyenne) : entre elles, le fond reste celui du thème
  vec3 base = uPage * mix(0.9, 1.0, uLight);       // sombre : gris un peu moins clair
  float amp = mix(0.16, 0.2, uLight) * (1.0 + 1.5 * P);   // renforcée sous le curseur
  vec3 col = base;
  for (int i = 0; i < ${N}; i++) {
    vec4 b = uB[i];
    vec2 d = (w - b.xy) / b.z;
    float k = exp(-dot(d, d) * mix(1.0, 1.9, P));   // plus près de la plaque : bord plus net
    col = mix(col, irisAt(b.w), clamp(k * amp, 0.0, 0.55));
  }
  // plaque dépolie : grain lissé (deux échelles proches du pixel CSS), atténué sous le curseur
  float g = vnoise(s / 1.15) * 0.6 + vnoise(s / 2.7 + 17.0) * 0.4 - 0.5;
  col += g * mix(0.022, 0.03, uLight) * (1.0 - 0.6 * P);
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;   // tramage : pas de bandes dans les dégradés
  gl_FragColor = vec4(col, 1.0);
}`

export function createBackdrop(canvas, { reduced }) {
  const gl = canvas?.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' })
  if (!gl) return null
  gl.getExtension('OES_standard_derivatives')
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x }
  const prog = gl.createProgram()
  const head = '#extension GL_OES_standard_derivatives : enable\n#ifndef GL_OES_standard_derivatives\n#define fwidth(x) (1.0)\n#endif\n'
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, head + FRAG))
  gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const U = {}; for (const n of ['uRes', 'uDpr', 'uScroll', 'uPage', 'uLight', 'uPtr', 'uB']) U[n] = gl.getUniformLocation(prog, n)

  // thème : --bg du site, relu quand le mode change
  const root = document.documentElement
  let page = [0, 0, 0], light = 0
  const readTheme = () => {
    const x = document.createElement('canvas').getContext('2d'); x.fillStyle = getComputedStyle(root).getPropertyValue('--bg').trim()
    page = [1, 3, 5].map((i) => parseInt(x.fillStyle.slice(i, i + 2), 16) / 255); light = page[0] + page[1] + page[2] > 1.5 ? 1 : 0
  }
  readTheme()
  new MutationObserver(readTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', readTheme)

  // formes : réparties sur la hauteur du document, positions et couleurs tirées une fois (graine fixe : même fond à
  // chaque visite), couleurs espacées sur la roue
  let rnd = 7; const R = () => ((rnd = (rnd * 16807) % 2147483647) - 1) / 2147483646
  const shapes = Array.from({ length: N }, (_, i) => ({ fx: (i % 2 ? 0.62 : 0.08) + R() * 0.3, fy: (i + 0.25 + R() * 0.5) / N, r: 0.8 + R() * 0.5, t: (i * 0.382 + R() * 0.1) % 1, ph: R() * 6.28, sp: 0.6 + R() * 0.8 }))
  const B = new Float32Array(N * 4)

  // curseur : suivi amorti ; présence qui s'efface quand la souris ne bouge plus (jamais au doigt)
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, a: 0, last: -1e9 }
  addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; ptr.tx = e.clientX; ptr.ty = e.clientY; if (ptr.a < 0.01) { ptr.x = ptr.tx; ptr.y = ptr.ty } ptr.last = performance.now() }, { passive: true })
  document.addEventListener('pointerleave', () => { ptr.last = -1e9 })

  const hero = document.querySelector('.hero')
  let dpr = 1, W = 0, H = 0, docH = 0, t0 = performance.now(), prev = t0
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5)   // fond très doux : 1,5 suffit, grain compris
    W = innerWidth; H = innerHeight; docH = Math.max(document.documentElement.scrollHeight, H)
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
  }
  resize(); addEventListener('resize', resize)
  new ResizeObserver(() => { docH = Math.max(document.documentElement.scrollHeight, H) }).observe(document.body)

  function frame(now) {
    if (canvas.width !== Math.round(innerWidth * Math.min(devicePixelRatio || 1, 1.5))) resize()
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now
    const time = reduced ? 0 : (now - t0) / 1000
    // présence du curseur : 1 en mouvement, retombe doucement après 2,5 s d'immobilité
    const want = !reduced && now - ptr.last < 2500 ? 1 : 0
    ptr.a += (want - ptr.a) * (1 - Math.exp(-dt / (want ? 0.35 : 1.2)))
    const k = 1 - Math.exp(-dt / 0.18); ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k
    // pendant la scène épinglée de l'accueil, le fond ne bouge pas : il ne défile qu'une fois l'accueil terminé ;
    // les formes sont réparties sur la hauteur réellement parcourue
    const pin = hero ? Math.max(0, hero.offsetHeight - H) : 0, span = Math.max(H, docH - pin)
    const base = Math.max(W, 700) * 0.2
    shapes.forEach((s, i) => {
      // dérive lente (période de l'ordre de la minute), dans un rayon d'un quart de largeur
      const a = time * 0.05 * s.sp + s.ph
      B[i * 4] = s.fx * W + Math.sin(a) * W * 0.18
      B[i * 4 + 1] = s.fy * span + Math.cos(a * 0.8) * H * 0.22
      B[i * 4 + 2] = base * s.r
      B[i * 4 + 3] = s.t
    })
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uScroll, Math.max(0, scrollY - pin))
    gl.uniform3f(U.uPage, ...page); gl.uniform1f(U.uLight, light)
    gl.uniform3f(U.uPtr, ptr.x, ptr.y, ptr.a); gl.uniform4fv(U.uB, B)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  return { frame }
}
