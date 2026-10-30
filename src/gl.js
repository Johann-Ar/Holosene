/**
 * Rendu WebGL du site : une seule toile fixe derrière la page, qui dessine chaque vue [data-gl] à sa place.
 * Chaque vue : l'image (ou plus tard la vidéo) en trame de points, et une lentille qui suit le curseur et montre l'original.
 * L'anneau reprend les couleurs du « o » du logo, en film plastique translucide (lunettes 3D en carton), sans autre effet.
 * Accueil : le S du monogramme en trame de points, le « o » en aplat irisé comme sur le logo ; pas de lentille.
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
uniform float uReveal;  // 0 : points absents, 1 : trame complète
uniform float uFade;    // fondu des bords haut et bas
uniform float uHasMask;
uniform float uFloor;   // taille minimale des points dans le masque
uniform float uRadius;  // coins arrondis (0 : aucun)
uniform vec3 uLens;     // centre (px CSS), rayon intérieur
uniform float uRim;     // épaisseur de l'anneau
uniform vec4 uClip;     // piste horizontale : bords gauche et droit (px, dans la vue), largeur du fondu
uniform vec4 uEye;      // accueil : le « o » du logo (centre, rayon extérieur, rayon intérieur), aplat irisé

vec2 cover(vec2 p) {
  float s = max(uRes.x / uImg.x, uRes.y / uImg.y);
  vec2 size = uImg * s;
  return clamp((p - (uRes - size) * 0.5) / size, 0.001, 0.999);
}
float hash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 x) {
  vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 x) { float v = 0.0, w = 0.5; for (int i = 0; i < 4; i++) { v += w * vnoise(x); x *= 2.03; w *= 0.5; } return v; }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// dégradé irisé de la marque (brand/tokens.css, --iris-conic), 0 = en haut, sens horaire
vec3 iris(float t) {
  vec3 c[9];
  c[0] = vec3(0.855, 0.608, 0.761); c[1] = vec3(0.600, 0.757, 0.867); c[2] = vec3(0.596, 0.886, 0.706);
  c[3] = vec3(0.608, 0.757, 0.871); c[4] = vec3(0.851, 0.612, 0.765); c[5] = vec3(0.976, 0.616, 0.816);
  c[6] = vec3(1.000, 0.592, 0.941); c[7] = vec3(0.996, 0.604, 0.835); c[8] = c[0];
  float x = fract(t) * 8.0; vec3 r = c[0];
  for (int i = 0; i < 8; i++) { if (x >= float(i)) r = mix(c[i], c[i + 1], smoothstep(0.0, 1.0, x - float(i))); }
  return r;
}

void main() {
  vec2 p = (gl_FragCoord.xy - uOrigin) / uDpr;
  p.y = uRes.y - p.y;
  float aa = 0.9 / uDpr;

  // lentille : un anneau aux proportions du « o » du logo
  float R = uLens.z, Ro = R + uRim;
  vec2 lp = p - uLens.xy;
  float d = length(lp);
  vec2 dir = length(lp) > 0.001 ? normalize(lp) : vec2(0.0);
  float ang = atan(lp.x, -lp.y) / 6.28318;
  vec3 ic = iris(ang);

  // trame : un point par cellule, sa taille suit la lumière de l'image
  vec2 pw = p;
  vec2 cell = floor(pw / uCell);
  vec2 c = (cell + 0.5) * uCell;
  float l = lum(texture2D(uTex, cover(c)).rgb);
  float m = 1.0;
  if (uHasMask > 0.5) m = texture2D(uMask, c / uRes).r;
  float edge = 1.0;
  if (uFade > 0.5) edge = smoothstep(0.0, 0.2 * uRes.y, c.y) * smoothstep(0.0, 0.2 * uRes.y, uRes.y - c.y);
  float rnd = hash(cell);
  float rev = smoothstep(rnd * 0.6, rnd * 0.6 + 0.4, uReveal);
  float kk = max(sqrt(clamp(l * 1.2, 0.0, 1.0)), uFloor) * m;
  float r = uCell * 0.49 * kk * rev * edge;
  float dotA = (1.0 - smoothstep(r - aa, r + aa, length(pw - c))) * clamp(r / aa, 0.0, 1.0);
  vec3 col = vec3(mix(0.2, 0.95, clamp(l * 1.1, 0.0, 1.0)));
  col *= dotA;
  float a = dotA;

  if (R > 0.5) {
    if (d < Ro + 2.0) {
      // intérieur : l'image d'origine, à plat
      vec3 orig = texture2D(uTex, cover(p)).rgb;
      float inner = 1.0 - smoothstep(R - aa, R + aa, d);
      float rim = smoothstep(R - aa, R + aa, d) * (1.0 - smoothstep(Ro - aa, Ro + aa, d));
      // anneau : film plastique coloré translucide (lunettes 3D en carton) ; on voit la trame à travers, avec les plis de la pellicule
      vec2 fq = mat2(0.86, -0.5, 0.5, 0.86) * lp / Ro;
      float n = fbm(fq * vec2(2.4, 7.5));
      vec3 ring = col * mix(vec3(1.0), ic, 0.75) + ic * 0.3;
      ring += vec3(smoothstep(0.58, 0.85, n) * 0.12);
      ring *= 1.0 - smoothstep(0.4, 0.18, n) * 0.08;
      col = mix(col, orig, inner); a = mix(a, 1.0, inner);
      col = mix(col, ring, rim); a = mix(a, 1.0, rim);
    }
  }

  // accueil : le « o » du logo, en aplat irisé comme sur le monogramme
  if (uEye.z > 0.5) {
    float de = length(p - uEye.xy);
    float eye = smoothstep(uEye.w - aa, uEye.w + aa, de) * (1.0 - smoothstep(uEye.z - aa, uEye.z + aa, de));
    vec2 ep = p - uEye.xy;
    col = mix(col, iris(atan(ep.x, -ep.y) / 6.28318), eye); a = mix(a, 1.0, eye);
  }

  // carte aux coins arrondis, fond légèrement plus clair que la page
  if (uRadius > 0.0) {
    vec2 q = abs(p - uRes * 0.5) - (uRes * 0.5 - uRadius);
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    float cov = 1.0 - smoothstep(-aa, aa, sd);
    col += vec3(0.075) * (1.0 - a); a = 1.0;
    col *= cov; a *= cov;
  }
  // bords latéraux fondus de la piste des projets
  if (uClip.z > 0.0) { float f = smoothstep(uClip.x, uClip.x + uClip.z, p.x) * (1.0 - smoothstep(uClip.y - uClip.z, uClip.y, p.x)); col *= f; a *= f; }
  gl_FragColor = vec4(col, a);
}`

/** Géométrie du monogramme (viewBox 816 × 1000) : le S et le « o ». */
const S_PATH = 'M462.9 0C429.1 1 395.1 1.9 361.6 7.4C242.6 26.9 130.5 89.6 56.1 185.2C10.3 244.1 -23.5 327.9 20.5 397.3C59.1 458.4 133.7 450.1 194.9 467.2C249.8 482.4 286.4 527.3 301.2 581.1C322.1 657 277.4 730.6 236.4 791C213.1 825.2 177.3 871.7 197.4 914.5C205.3 931.2 217.2 944.9 234.6 952.1C261.4 963.1 342.8 960.6 385.4 973.3C410.1 980.7 435.4 999.9 461.5 1000C510 1000.1 533.4 934.5 492.7 905.9C468.4 888.7 413.8 871.4 384.1 869.8C356.7 868.4 326.8 886.2 315.8 851.7C309.4 831.5 354.2 756.1 363 731.5C391.1 653.5 394.1 567.4 353.2 493.7C323.1 439.3 273.3 408.8 220.3 380.3C202 370.4 177.4 359 163.5 343.2C159.4 338.4 156.8 331.8 153.1 326.6C148.8 320.5 144.7 316.9 143.5 309.4C140.3 287.6 139 267.2 145.7 245.9C161.7 195 232.3 143.2 281.2 127.1C307.7 118.4 336.4 116.5 364.1 114.4C390.7 112.4 472.8 111.6 490.9 102C541.3 75.2 518.8 -1.4 462.9 0Z'
const O = { x: 639.25, y: 586.8, ro: 176.7, ri: 90.8 }

/** Place le monogramme dans la vue d'accueil (mêmes calculs que le CSS de .hero__mark). */
export function markBox(w, h) {
  const small = w < 760
  const mh = Math.min(h * (small ? 0.5 : 0.64), w * (small ? 0.62 : 0.5) * (1000 / 816))
  const s = mh / 1000
  const x = (w - 816 * s) / 2, y = h * (small ? 0.4 : 0.45) - mh / 2
  return { x, y, s }
}

export function createGL(canvas, { reduced }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  if (!gl) return null
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)
  const U = {}; for (const n of ['uTex', 'uMask', 'uRes', 'uOrigin', 'uImg', 'uDpr', 'uCell', 'uReveal', 'uFade', 'uHasMask', 'uFloor', 'uRadius', 'uLens', 'uRim', 'uEye', 'uClip']) U[n] = gl.getUniformLocation(prog, n)
  gl.uniform1i(U.uTex, 0); gl.uniform1i(U.uMask, 1)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.SCISSOR_TEST)

  const newTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t }
  const upload = (t, src) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src) }

  // pointeur (souris, stylet ou doigt), en coordonnées de la fenêtre
  const ptr = { x: -1e4, y: -1e4, t: -1e9, touch: false }
  const move = (x, y, touch) => { ptr.x = x; ptr.y = y; ptr.t = performance.now(); ptr.touch = touch }
  addEventListener('pointermove', (e) => move(e.clientX, e.clientY, e.pointerType === 'touch'), { passive: true })
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY, true) }, { passive: true })
  addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY, true) }, { passive: true })
  document.documentElement.addEventListener('pointerleave', () => { ptr.t = -1e9 })
  const hoverDevice = matchMedia('(hover: hover)').matches

  const views = [...document.querySelectorAll('[data-gl]')].map((el) => {
    const v = { el, tex: newTex(), img: null, video: el.querySelector('video'), ready: false, seen: 0, phase: Math.random() * 10,
      L: { x: 0, y: 0, vx: 0, vy: 0, s: 0, sv: 0 },
      mark: el.dataset.gl === 'mark', cell: +el.dataset.cell || 7, r: +el.dataset.lens || 56,
      radius: +el.dataset.radius || 0, clip: el.closest('[data-clip]'), fade: el.dataset.gl === 'panel', mask: null, maskKey: '' }
    const src = v.video || el.querySelector('img')
    const done = () => { upload(v.tex, src); v.img = [src.videoWidth || src.naturalWidth, src.videoHeight || src.naturalHeight]; v.ready = v.img[0] > 0 }
    if (v.video) v.video.addEventListener('loadeddata', done, { once: true })
    else if (src.complete && src.naturalWidth) done()
    else { src.loading = 'eager'; src.addEventListener('load', done, { once: true }) }
    return v
  })
  if (!views.length) return null

  // masque du monogramme (le S et le « o »), dessiné à la taille de la vue d'accueil
  function maskFor(v, w, h) {
    const key = `${w}x${h}`
    if (v.maskKey === key) return
    const dpr = Math.min(devicePixelRatio || 1, 2), b = markBox(w, h)
    const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height)
    x.setTransform(b.s * dpr, 0, 0, b.s * dpr, b.x * dpr, b.y * dpr); x.fillStyle = '#fff'
    x.fill(new Path2D(S_PATH))
    v.mask ??= newTex(); upload(v.mask, c); v.maskKey = key
  }

  let W = 0, H = 0, dpr = 1
  function resize() {
    W = innerWidth; H = innerHeight
    dpr = Math.min(devicePixelRatio || 1, W < 760 ? 1.75 : 2)
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
  }
  resize(); addEventListener('resize', resize)

  // ressorts : la lentille suit le pointeur avec un peu d'inertie, et apparaît avec un léger rebond
  function spring(L, tx, ty, ts, dt) {
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n
    for (let i = 0; i < n; i++) {
      L.vx += ((tx - L.x) * 420 - L.vx * 41) * h; L.vy += ((ty - L.y) * 420 - L.vy * 41) * h
      L.x += L.vx * h; L.y += L.vy * h
      L.sv += ((ts - L.s) * 260 - L.sv * 33) * h; L.s += L.sv * h
    }
  }

  let last = performance.now(), time = 0
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now
    time += dt
    if (canvas.width !== Math.round(innerWidth * dpr)) resize()
    gl.viewport(0, 0, canvas.width, canvas.height); gl.scissor(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    if (document.documentElement.classList.contains('fiche-open')) return
    for (const v of views) {
      const b = v.el.getBoundingClientRect()
      if (!v.ready || b.bottom < 0 || b.top > H || b.right < 0 || b.left > W || b.width < 2) continue
      const cr = v.clip?.getBoundingClientRect()
      if (cr && (b.right < cr.left || b.left > cr.right)) continue
      if (v.video && !v.video.paused && v.video.readyState >= 2) upload(v.tex, v.video)
      if (!v.seen) v.seen = now
      const w = b.width, h = b.height
      // apparition : les points poussent, puis rétrécissent quand la vue sort de l'écran
      const intro = reduced ? 1 : Math.min(1, (now - v.seen) / 1600)
      const vis = Math.min(1, Math.max(0, Math.min(H - b.top, b.bottom) / (H * 0.55)))
      const reveal = (1 - Math.pow(1 - intro, 3)) * vis
      if (v.mark) maskFor(v, w, h)

      // lentille : au pointeur s'il est dans la vue ; sur écran tactile, elle dérive doucement dans les cartes
      const small = w < 600
      const Ro = small ? v.r * 0.8 : v.r, R = Ro - (small ? 4 : 5)   // v.r : rayon extérieur ; anneau fin
      const lx = ptr.x - b.left, ly = ptr.y - b.top
      const inside = lx >= 0 && ly >= 0 && lx <= w && ly <= h && (!cr || (ptr.x > cr.left && ptr.x < cr.right))
      const active = inside && (!ptr.touch || now - ptr.t < 1400)
      const drift = !hoverDevice && !v.mark && !active
      const t = time * 0.3 + v.phase
      const L = v.L
      let tx = L.x, ty = L.y, ts = 0
      if (active && !v.mark) { tx = lx; ty = ly; ts = 1 }
      else if (drift) { tx = w * (0.5 + Math.sin(t) * 0.22); ty = h * (0.5 + Math.sin(t * 1.3) * 0.2); ts = 0.9 }
      if (L.s < 0.02 && ts > 0) { L.x = tx; L.y = ty; L.vx = L.vy = 0 }
      if (reduced) { L.x = tx; L.y = ty; L.s = ts; L.vx = L.vy = 0 } else spring(L, tx, ty, ts, dt)
      const sc = Math.max(0, L.s) * Math.min(1, reveal * 1.6)

      const x0 = Math.round(b.left * dpr), y0 = Math.round((H - b.bottom) * dpr)
      gl.viewport(x0, y0, Math.round(w * dpr), Math.round(h * dpr))
      gl.scissor(Math.max(0, x0), Math.max(0, y0), Math.round(w * dpr), Math.round(h * dpr))
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, v.tex)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, v.mask || v.tex)
      gl.uniform2f(U.uRes, w, h); gl.uniform2f(U.uOrigin, x0, y0); gl.uniform2f(U.uImg, v.img[0], v.img[1])
      gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uCell, w < 760 ? Math.max(5, v.cell - 1) : v.cell)
      gl.uniform1f(U.uReveal, reveal); gl.uniform1f(U.uFade, v.fade ? 1 : 0); gl.uniform1f(U.uHasMask, v.mark ? 1 : 0)
      gl.uniform1f(U.uFloor, v.mark ? 0.42 : 0); gl.uniform1f(U.uRadius, v.radius)
      if (cr) gl.uniform4f(U.uClip, cr.left - b.left, cr.right - b.left, Math.max(24, parseFloat(getComputedStyle(v.clip).paddingLeft) || 0), 0)
      else gl.uniform4f(U.uClip, 0, 0, 0, 0)
      gl.uniform3f(U.uLens, L.x, L.y, R * sc); gl.uniform1f(U.uRim, (Ro - R) * sc)
      if (v.mark) { const m = markBox(w, h), e = Math.min(1, reveal * 1.4); gl.uniform4f(U.uEye, m.x + O.x * m.s, m.y + O.y * m.s, O.ro * m.s * e, O.ri * m.s * e) }
      else gl.uniform4f(U.uEye, 0, 0, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
  }
  document.documentElement.classList.add('has-gl')
  return { frame }
}
