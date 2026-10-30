/**
 * Rendu WebGL du site : une seule toile fixe derrière la page, qui dessine chaque vue [data-gl] à sa place.
 * Chaque vue : l'image (ou plus tard la vidéo) en trame de points, et une lentille qui montre l'original.
 * La lentille est plate : un anneau de film plastique translucide aux couleurs irisées de la marque, texturé comme la pellicule
 * des lunettes 3D en carton.
 * Accueil : la trame ne remplit que le S du monogramme, la lentille se pose sur le « o » et suit le curseur.
 */

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`

const FRAG = `precision highp float;
uniform sampler2D uTex;
uniform sampler2D uMask;
uniform vec2 uRes;      // taille de la vue (px CSS)
uniform vec2 uOrigin;   // coin bas gauche de la vue sur la toile (px écran)
uniform vec2 uImg;      // taille de l'image source
uniform float uDpr;
uniform float uCell;    // pas de la trame (px CSS)
uniform float uTime;
uniform float uReveal;  // 0 : points absents, 1 : trame complète
uniform float uFade;    // fondu des bords haut et bas
uniform float uHasMask;
uniform float uFloor;   // taille minimale des points dans le masque
uniform float uPar;     // parallaxe (-1 à 1)
uniform float uMotion;
uniform vec3 uLens;     // centre (px CSS), rayon intérieur
uniform float uRim;     // épaisseur de l'anneau de verre

vec2 cover(vec2 p) {
  float s = max(uRes.x / uImg.x, uRes.y / uImg.y) * 1.08;
  vec2 size = uImg * s;
  vec2 o = (uRes - size) * 0.5 + vec2(0.0, uPar * uRes.y * 0.035);
  return clamp((p - o) / size, 0.001, 0.999);
}
float hash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// dégradé irisé de la marque (brand/tokens.css, --iris-conic), 0 = en haut, sens horaire
vec3 iris(float t) {
  vec3 c[9];
  c[0] = vec3(0.855, 0.608, 0.761); c[1] = vec3(0.600, 0.757, 0.867); c[2] = vec3(0.596, 0.886, 0.706);
  c[3] = vec3(0.608, 0.757, 0.871); c[4] = vec3(0.851, 0.612, 0.765); c[5] = vec3(0.976, 0.616, 0.816);
  c[6] = vec3(1.000, 0.592, 0.941); c[7] = vec3(0.996, 0.604, 0.835); c[8] = c[0];
  float x = t * 8.0; vec3 r = c[0];
  for (int i = 0; i < 8; i++) { if (x >= float(i)) r = mix(c[i], c[i + 1], smoothstep(0.0, 1.0, x - float(i))); }
  return r;
}
float vnoise(vec2 x) {
  vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 x) { float v = 0.0, w = 0.5; for (int i = 0; i < 4; i++) { v += w * vnoise(x); x *= 2.03; w *= 0.5; } return v; }

void main() {
  vec2 p = (gl_FragCoord.xy - uOrigin) / uDpr;
  p.y = uRes.y - p.y;
  float aa = 0.9 / uDpr;

  // trame : un point par cellule, sa taille suit la lumière de l'image
  vec2 cell = floor(p / uCell);
  vec2 c = (cell + 0.5) * uCell;
  vec2 sp = c + uMotion * vec2(sin(uTime * 0.45 + c.y * 0.018) * 2.5, cos(uTime * 0.35 + c.x * 0.014) * 2.0);
  float l = lum(texture2D(uTex, cover(sp)).rgb);
  float m = 1.0;
  if (uHasMask > 0.5) m = texture2D(uMask, c / uRes).r;
  float edge = 1.0;
  if (uFade > 0.5) edge = smoothstep(0.0, 0.2 * uRes.y, c.y) * smoothstep(0.0, 0.2 * uRes.y, uRes.y - c.y);
  float rnd = hash(cell);
  float rev = smoothstep(rnd * 0.6, rnd * 0.6 + 0.4, uReveal);
  float k = sqrt(clamp(l * 1.2, 0.0, 1.0));
  k = max(k, uFloor) * m;
  float r = uCell * 0.49 * k * rev * edge;
  float dotA = (1.0 - smoothstep(r - aa, r + aa, length(p - c))) * clamp(r / aa, 0.0, 1.0);
  vec3 col = vec3(mix(0.2, 0.95, clamp(l * 1.1, 0.0, 1.0))) * dotA;
  float a = dotA;

  // lentille
  float R = uLens.z;
  if (R > 0.5) {
    vec2 lp = p - uLens.xy;
    float d = length(lp);
    float Ro = R + uRim;
    vec2 dir = d > 0.001 ? lp / d : vec2(0.0);
    if (d < Ro + 2.0) {
      // intérieur : l'image d'origine, à plat
      vec3 orig = texture2D(uTex, cover(p)).rgb;
      float inner = 1.0 - smoothstep(R - aa, R + aa, d);

      // anneau : un film coloré translucide, à plat, aux couleurs irisées de la marque
      float ang = fract(atan(lp.x, -lp.y) / 6.28318);
      vec3 film = iris(ang);
      vec3 ring = mix(film, orig * film, 0.22);
      // texture de pellicule plastique : plis longs, reflets doux, grain
      vec2 fp = mat2(0.86, -0.5, 0.5, 0.86) * (p - uLens.xy) / max(Ro, 1.0);
      float n = fbm(fp * vec2(2.2, 7.0) + vec2(uTime * 0.03, 0.0));
      ring += vec3(smoothstep(0.58, 0.85, n) * 0.1);
      ring *= 1.0 - smoothstep(0.4, 0.2, n) * 0.06;
      ring += (hash(floor(p * uDpr)) - 0.5) * 0.03;
      float rim = smoothstep(R - aa, R + aa, d) * (1.0 - smoothstep(Ro - aa, Ro + aa, d));

      col = mix(col, orig, inner); a = mix(a, 1.0, inner);
      col = mix(col, ring, rim); a = mix(a, 1.0, rim);
    }
  }
  gl_FragColor = vec4(col, a);
}`

/** Géométrie du monogramme (viewBox 816 × 1000) : le S, et le « o » (centre, rayons). */
const S_PATH = 'M462.9 0C429.1 1 395.1 1.9 361.6 7.4C242.6 26.9 130.5 89.6 56.1 185.2C10.3 244.1 -23.5 327.9 20.5 397.3C59.1 458.4 133.7 450.1 194.9 467.2C249.8 482.4 286.4 527.3 301.2 581.1C322.1 657 277.4 730.6 236.4 791C213.1 825.2 177.3 871.7 197.4 914.5C205.3 931.2 217.2 944.9 234.6 952.1C261.4 963.1 342.8 960.6 385.4 973.3C410.1 980.7 435.4 999.9 461.5 1000C510 1000.1 533.4 934.5 492.7 905.9C468.4 888.7 413.8 871.4 384.1 869.8C356.7 868.4 326.8 886.2 315.8 851.7C309.4 831.5 354.2 756.1 363 731.5C391.1 653.5 394.1 567.4 353.2 493.7C323.1 439.3 273.3 408.8 220.3 380.3C202 370.4 177.4 359 163.5 343.2C159.4 338.4 156.8 331.8 153.1 326.6C148.8 320.5 144.7 316.9 143.5 309.4C140.3 287.6 139 267.2 145.7 245.9C161.7 195 232.3 143.2 281.2 127.1C307.7 118.4 336.4 116.5 364.1 114.4C390.7 112.4 472.8 111.6 490.9 102C541.3 75.2 518.8 -1.4 462.9 0Z'
const O = { x: 639.25, y: 586.8, ro: 176.7, ri: 90.8 }

/** Place le monogramme dans la vue d'accueil (mêmes calculs que le CSS de .hero__mark). */
export function markBox(w, h) {
  const small = w < 760
  const mh = Math.min(h * (small ? 0.5 : 0.64), w * (small ? 0.62 : 0.5) * (1000 / 816))
  const s = mh / 1000
  const x = (w - 816 * s) / 2, y = h * (small ? 0.4 : 0.45) - mh / 2
  return { x, y, s, o: { x: x + O.x * s, y: y + O.y * s, ri: O.ri * s, ro: O.ro * s } }
}

export function createGL(canvas, { reduced }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  if (!gl) return null
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)
  const U = {}; for (const n of ['uTex', 'uMask', 'uRes', 'uOrigin', 'uImg', 'uDpr', 'uCell', 'uTime', 'uReveal', 'uFade', 'uHasMask', 'uFloor', 'uPar', 'uMotion', 'uLens', 'uRim']) U[n] = gl.getUniformLocation(prog, n)
  gl.uniform1i(U.uTex, 0); gl.uniform1i(U.uMask, 1)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.SCISSOR_TEST)

  const newTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t }
  const upload = (t, src) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src) }

  // pointeur (souris, stylet ou doigt), en coordonnées de la fenêtre
  const ptr = { x: -1e4, y: -1e4, t: -1e9, down: false }
  const move = (x, y) => { ptr.x = x; ptr.y = y; ptr.t = performance.now() }
  addEventListener('pointermove', (e) => move(e.clientX, e.clientY), { passive: true })
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY) }, { passive: true })
  addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY) }, { passive: true })
  document.documentElement.addEventListener('pointerleave', () => { ptr.t = -1e9 })

  const views = [...document.querySelectorAll('[data-gl]')].map((el) => {
    const v = { el, tex: newTex(), w: 0, h: 0, img: null, video: el.querySelector('video'), ready: false, seen: 0, lens: { x: 0, y: 0, init: false }, phase: Math.random() * 10,
      mark: el.dataset.gl === 'mark', cell: +el.dataset.cell || 7, r: +el.dataset.lens || 64, rim: +el.dataset.rim || 13, fade: el.dataset.fade !== '0', mask: null, maskKey: '' }
    const src = v.video || el.querySelector('img')
    const done = () => { upload(v.tex, src); v.img = [src.videoWidth || src.naturalWidth, src.videoHeight || src.naturalHeight]; v.ready = v.img[0] > 0 }
    if (v.video) v.video.addEventListener('loadeddata', done, { once: true })
    else if (src.complete && src.naturalWidth) done()
    else src.addEventListener('load', done, { once: true })
    return v
  })
  if (!views.length) return null

  // masque du S, dessiné à la taille de la vue d'accueil
  function maskFor(v, w, h) {
    const key = `${w}x${h}`
    if (v.maskKey === key) return
    const dpr = Math.min(devicePixelRatio || 1, 2), b = markBox(w, h)
    const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height)
    x.setTransform(b.s * dpr, 0, 0, b.s * dpr, b.x * dpr, b.y * dpr); x.fillStyle = '#fff'; x.fill(new Path2D(S_PATH))
    v.mask ??= newTex(); upload(v.mask, c); v.maskKey = key
  }

  let W = 0, H = 0, dpr = 1
  function resize() {
    W = innerWidth; H = innerHeight
    dpr = Math.min(devicePixelRatio || 1, W < 760 ? 1.75 : 2)
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
  }
  resize(); addEventListener('resize', resize)

  let last = performance.now(), time = 0
  const damp = (a, b, tau, dt) => a + (b - a) * (1 - Math.exp(-dt / tau))

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now
    if (!reduced) time += dt
    if (canvas.width !== Math.round(innerWidth * dpr)) resize()
    gl.viewport(0, 0, canvas.width, canvas.height); gl.scissor(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    if (document.documentElement.classList.contains('fiche-open')) return
    for (const v of views) {
      const b = v.el.getBoundingClientRect()
      if (!v.ready || b.bottom < 0 || b.top > H || b.width < 2) continue
      if (v.video && !v.video.paused && v.video.readyState >= 2) upload(v.tex, v.video)
      if (!v.seen) v.seen = now
      const w = b.width, h = b.height
      // apparition : les points poussent, puis rétrécissent quand la vue sort de l'écran
      const intro = reduced ? 1 : Math.min(1, (now - v.seen) / 1600)
      const vis = Math.min(1, Math.max(0, Math.min(H - b.top, b.bottom) / (H * 0.55)))
      const reveal = (1 - Math.pow(1 - intro, 3)) * (v.mark ? Math.max(vis, 0.0) : vis)

      // lentille : position de repos, ou le pointeur s'il est dans la vue
      let rest, R = v.r, rim = v.rim
      if (v.mark) { const m = markBox(w, h); rest = { x: m.o.x, y: m.o.y }; rim = Math.max(6, m.o.ro * 0.11); R = m.o.ro - rim; maskFor(v, w, h) }
      else {
        const small = w < 760
        R = small ? v.r * 0.78 : v.r; rim = small ? v.rim * 0.85 : v.rim
        const t = time * 0.35 + v.phase
        rest = { x: w * (small ? 0.5 : 0.7) + Math.sin(t) * w * 0.06, y: h * (small ? 0.34 : 0.42) + Math.sin(t * 1.3) * h * 0.05 }
      }
      const lx = ptr.x - b.left, ly = ptr.y - b.top
      const active = lx >= 0 && ly >= 0 && lx <= w && ly <= h && now - ptr.t < (v.mark ? 1800 : 2600)
      const L = v.lens
      if (!L.init) { L.x = rest.x; L.y = rest.y; L.init = true }
      const tx = active ? lx : rest.x, ty = active ? ly : rest.y, tau = active ? 0.06 : 0.45
      L.x = damp(L.x, tx, tau, dt); L.y = damp(L.y, ty, tau, dt)
      const lensScale = Math.min(1, reveal * 1.6)

      const x0 = Math.round(b.left * dpr), y0 = Math.round((H - b.bottom) * dpr)
      gl.viewport(x0, y0, Math.round(w * dpr), Math.round(h * dpr))
      gl.scissor(Math.max(0, x0), Math.max(0, y0), Math.round(w * dpr), Math.round(h * dpr))
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, v.tex)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, v.mask || v.tex)
      gl.uniform2f(U.uRes, w, h); gl.uniform2f(U.uOrigin, x0, y0); gl.uniform2f(U.uImg, v.img[0], v.img[1])
      gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uCell, w < 760 ? Math.max(5, v.cell - 1) : v.cell); gl.uniform1f(U.uTime, time)
      gl.uniform1f(U.uReveal, reveal); gl.uniform1f(U.uFade, v.fade ? 1 : 0); gl.uniform1f(U.uHasMask, v.mark ? 1 : 0)
      gl.uniform1f(U.uFloor, v.mark ? 0.42 : 0); gl.uniform1f(U.uPar, v.mark ? 0 : Math.max(-1, Math.min(1, (b.top + h / 2 - H / 2) / H)))
      gl.uniform1f(U.uMotion, reduced ? 0 : 1)
      gl.uniform3f(U.uLens, L.x, L.y, R * lensScale); gl.uniform1f(U.uRim, rim * lensScale)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
  }
  document.documentElement.classList.add('has-gl')
  return { frame }
}
