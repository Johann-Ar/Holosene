/**
 * Fond de page : des formes colorées (couleurs de la roue du logo-kit) derrière une plaque de plastique dépoli.
 * - Les formes sont placées dans la page entière (sur toute la hauteur du document) : en faisant défiler, on se déplace
 *   dans le fond. Elles dérivent lentement (animation passive).
 * - Sous le curseur, elles se rapprochent de la plaque : plus nettes et plus intenses.
 * - Pas de texture : seulement un tramage invisible de ±0,5/255 contre les bandes de dégradé.
 * Toile WebGL propre (.bg-canvas), sous tout le contenu ; sans WebGL, le fond uni (--bg) reste.
 */
import KIT_IRIS from '../design/logo-kit/src/iris.glsl?raw'

const N = 14   // nombre de formes réparties dans la page
// couleurs des formes : positions sur la roue v2 du kit (0 cyan, 0,1 bleu, 0,2 indigo, 0,3 violet, 0,4 magenta, 0,5 rose,
// 0,6 corail, 0,7 jaune, 0,8 vert-jaune, 0,9 vert), alternées ; roses, magentas et violets limités à deux formes sur douze
const HUES = [0.0, 0.7, 0.1, 0.9, 0.6, 0.05, 0.2, 0.75, 0.85, 0.5, 0.15, 0.95]   // + 0,5 : irisAt compte depuis le haut

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`
const FRAG = `precision highp float;
uniform vec2 uRes;      // taille de la toile (px CSS)
uniform float uDpr;
uniform float uScroll;  // défilement de la page (px CSS)
uniform vec3 uPage;     // --bg du thème
uniform float uLight;   // 1 : mode clair
uniform vec3 uPtr;      // curseur (px CSS, dans la fenêtre), présence (0 à 1)
uniform vec4 uB[${N}];  // formes : centre (px CSS, dans la page), rayon (px), position sur la roue (0 à 1)
uniform float uA[${N}]; // intensité de chaque forme (cycle de vie : naît, s'intensifie, s'éteint)
${KIT_IRIS}
vec3 irisAt(float t) { float a = t * 6.2831853; return irisColor(vec2(sin(a), -cos(a))); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 s = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;   // px CSS, y vers le bas
  vec2 w = s + vec2(0.0, uScroll);                                        // position dans la page
  // proximité du curseur : les formes se rapprochent de la plaque
  float P = uPtr.z * exp(-dot(s - uPtr.xy, s - uPtr.xy) / (2.0 * 260.0 * 260.0));
  // chaque forme n'agit que sur sa zone (somme de taches, sans moyenne) : entre elles, le fond reste celui du thème
  vec3 base = uPage * mix(0.7, 1.0, uLight);       // sombre : fond assombri
  float amp = mix(0.16, 0.2, uLight) * (1.0 + 2.6 * P);   // nettement renforcée sous le curseur
  vec3 col = base;
  for (int i = 0; i < ${N}; i++) {
    vec4 b = uB[i];
    vec2 d = (w - b.xy) / b.z;
    float k = exp(-dot(d, d) * mix(1.0, 1.9, P));   // plus près de la plaque : bord plus net
    col = mix(col, irisAt(b.w), clamp(k * amp * uA[i], 0.0, 0.7));
  }
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;   // tramage invisible (±0,5/255) : pas de bandes dans les dégradés
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
  const U = {}; for (const n of ['uRes', 'uDpr', 'uScroll', 'uPage', 'uLight', 'uPtr', 'uB', 'uA']) U[n] = gl.getUniformLocation(prog, n)

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

  // formes : placées au hasard (différent à chaque visite) ; chacune vit 24 à 40 s : elle naît, s'intensifie, dérive,
  // s'éteint, puis renaît ailleurs avec une autre couleur ; les cycles sont décalés, il y a toujours des couleurs
  const R = Math.random
  const spawn = (s, now) => Object.assign(s, { fx: R(), fy: R(), r: 0.8 + R() * 0.6, t: (HUES[Math.floor(R() * HUES.length)] + 0.5) % 1, ph: R() * 6.28, sp: 0.6 + R() * 0.8, born: now, life: 24000 + R() * 16000 })
  const shapes = Array.from({ length: N }, () => { const s = spawn({}, 0); s.born = -R() * s.life; return s })
  const A = new Float32Array(N)
  const B = new Float32Array(N * 4)

  // curseur : suivi amorti ; présence qui s'efface quand la souris ne bouge plus (jamais au doigt)
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, a: 0, last: -1e9 }
  addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; ptr.tx = e.clientX; ptr.ty = e.clientY; if (ptr.a < 0.01) { ptr.x = ptr.tx; ptr.y = ptr.ty } ptr.last = performance.now() }, { passive: true })
  document.addEventListener('pointerleave', () => { ptr.last = -1e9 })

  const hero = document.querySelector('.hero')
  // résolution : le fond n'est fait que de dégradés très doux (sans texture) : un demi-pixel CSS suffit, l'agrandissement
  // par le navigateur ne se voit pas (9 fois moins de pixels qu'en 1,5×)
  const DPR = 0.5
  let dpr = DPR, W = 0, H = 0, docH = 0, pin = 0, t0 = performance.now(), prev = t0, gain = 1
  // hauteurs mises en cache (lues au redimensionnement seulement : pas de mise en page forcée à chaque image)
  const measure = () => { docH = Math.max(document.documentElement.scrollHeight, H); pin = hero ? Math.max(0, hero.offsetHeight - H) : 0 }
  const resize = () => {
    W = innerWidth; H = canvas.clientHeight || innerHeight   // toile en 100lvh (CSS) : jamais plus courte que l'écran
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
    measure()
  }
  resize(); addEventListener('resize', resize)
  new ResizeObserver(measure).observe(document.body)

  function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now
    const time = reduced ? 0 : (now - t0) / 1000
    // présence du curseur : 1 en mouvement, retombe doucement après 2,5 s d'immobilité
    const want = !reduced && now - ptr.last < 2500 ? 1 : 0
    ptr.a += (want - ptr.a) * (1 - Math.exp(-dt / (want ? 0.35 : 1.2)))
    const k = 1 - Math.exp(-dt / 0.18); ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k
    // pendant la scène épinglée de l'accueil, le fond ne bouge pas : il ne défile qu'une fois l'accueil terminé ;
    // les formes sont réparties sur la hauteur réellement parcourue
    const span = Math.max(H, docH - pin)
    const base = Math.max(W, 700) * 0.2
    const clock = reduced ? 12000 : now - t0
    shapes.forEach((s, i) => {
      // cycle de vie : intensité 0 → 1 → 0 (sin²) ; à la fin, la forme renaît ailleurs
      let age = clock - s.born
      if (age >= s.life) { spawn(s, clock); age = 0 }
      const env = Math.sin(Math.PI * age / s.life); A[i] = env * env
      // dérive lente (période de l'ordre de la minute), dans un rayon d'un quart de largeur
      const a = time * 0.05 * s.sp + s.ph
      B[i * 4] = s.fx * W + Math.sin(a) * W * 0.18
      B[i * 4 + 1] = s.fy * span + Math.cos(a * 0.8) * H * 0.22
      B[i * 4 + 2] = base * s.r
      B[i * 4 + 3] = s.t
    })
    // minimum de couleur à l'écran : si les formes proches de la vue sont presque toutes éteintes (fond trop blanc),
    // leur intensité est relevée en douceur (gain lissé, au plus ×2,2) ; aucune forme ajoutée, rien d'aléatoire
    const sy = Math.max(0, scrollY - pin) + H / 2
    let seen = 0
    for (let i = 0; i < N; i++) { const dy = (B[i * 4 + 1] - sy) / (H * 0.9 + B[i * 4 + 2]); seen += A[i] * Math.exp(-dy * dy) }
    const wantG = Math.min(2.2, Math.max(1, 1.1 / Math.max(seen, 0.05)))
    gain += (wantG - gain) * (1 - Math.exp(-dt / 1.5))
    for (let i = 0; i < N; i++) A[i] *= gain
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uScroll, Math.max(0, scrollY - pin))
    gl.uniform3f(U.uPage, ...page); gl.uniform1f(U.uLight, light)
    gl.uniform3f(U.uPtr, ptr.x, ptr.y, ptr.a); gl.uniform4fv(U.uB, B); gl.uniform1fv(U.uA, A)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  return { frame }
}
