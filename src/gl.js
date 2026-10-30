/**
 * Rendu WebGL du site : une seule toile fixe derrière la page, qui dessine chaque vue [data-gl] à sa place.
 * Chaque vue : l'image (ou plus tard la vidéo) en trame de points, et une lentille qui suit le curseur et montre l'original.
 * L'anneau reprend les couleurs du « o » du logo, en aplat, sans autre effet.
 * Accueil : le S du monogramme en trame de points, le « o » en aplat irisé comme sur le logo ; pas de lentille.
 */

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`

// anneau de la lentille, dessiné par-dessus toutes les vues (il n'est jamais coupé par le bord d'une carte)
const RING = `precision highp float;
uniform vec3 uL;      // centre (px écran, origine en haut à gauche), rayon extérieur
uniform float uW;     // épaisseur
uniform float uH;     // hauteur de la toile (px CSS)
uniform float uDpr;
vec3 iris(float t) {
  vec3 c[6];   // cinq teintes à parts égales : rose, rose tendre, mauve, bleu, menthe
  c[0] = vec3(1.000, 0.592, 0.941); c[1] = vec3(0.996, 0.604, 0.835); c[2] = vec3(0.855, 0.608, 0.761);
  c[3] = vec3(0.600, 0.757, 0.867); c[4] = vec3(0.596, 0.886, 0.706); c[5] = c[0];
  float x = fract(t) * 5.0; vec3 r = c[0];
  for (int i = 0; i < 5; i++) { if (x >= float(i)) r = mix(c[i], c[i + 1], smoothstep(0.0, 1.0, x - float(i))); }
  return r;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uH * uDpr - gl_FragCoord.y) / uDpr;
  vec2 d = p - uL.xy; float r = length(d), aa = 0.9 / uDpr;
  float a = smoothstep(uL.z - uW - aa, uL.z - uW + aa, r) * (1.0 - smoothstep(uL.z - aa, uL.z + aa, r));
  if (a <= 0.0) discard;
  gl_FragColor = vec4(iris(atan(d.x, -d.y) / 6.28318) * a, a);
}`

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
uniform float uLensO;   // rayon extérieur de l'anneau
uniform float uGlass;   // survol d'une carte : bord de verre (0 à 1)
uniform vec4 uClip;     // piste horizontale : bords gauche et droit (px, dans la vue), largeur du fondu
uniform float uCardBg;  // gris du fond des cartes
uniform float uColor;   // 1 : points de la couleur de l'image (dégradé « En cours »)
uniform vec4 uEye;      // accueil : le « o » du logo (centre, rayon extérieur, rayon intérieur), aplat irisé

vec2 cover(vec2 p) {
  float s = max(uRes.x / uImg.x, uRes.y / uImg.y);
  vec2 size = uImg * s;
  return clamp((p - (uRes - size) * 0.5) / size, 0.001, 0.999);
}
float hash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// roue irisée de la marque, à parts égales ; 0 = en haut, sens horaire
vec3 iris(float t) {
  vec3 c[6];   // cinq teintes à parts égales : rose, rose tendre, mauve, bleu, menthe
  c[0] = vec3(1.000, 0.592, 0.941); c[1] = vec3(0.996, 0.604, 0.835); c[2] = vec3(0.855, 0.608, 0.761);
  c[3] = vec3(0.600, 0.757, 0.867); c[4] = vec3(0.596, 0.886, 0.706); c[5] = c[0];
  float x = fract(t) * 5.0; vec3 r = c[0];
  for (int i = 0; i < 5; i++) { if (x >= float(i)) r = mix(c[i], c[i + 1], smoothstep(0.0, 1.0, x - float(i))); }
  return r;
}

// trame en un point : un point par cellule, sa taille suit la lumière de l'image (couleur prémultipliée, alpha)
vec4 halftone(vec2 p) {
  float aa = 0.9 / uDpr;
  vec2 cell = floor(p / uCell);
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
  float dotA = (1.0 - smoothstep(r - aa, r + aa, length(p - c))) * clamp(r / aa, 0.0, 1.0);
  vec3 dc = uColor > 0.5 ? min(texture2D(uTex, cover(c)).rgb * 1.25, 1.0) : vec3(mix(0.2, 0.95, clamp(l * 1.1, 0.0, 1.0)));
  return vec4(dc * dotA, dotA);
}
// distance signée au rectangle aux coins arrondis de la carte (négative à l'intérieur)
float sdCard(vec2 p) {
  vec2 q = abs(p - uRes * 0.5) - (uRes * 0.5 - uRadius);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
}

void main() {
  vec2 p = (gl_FragCoord.xy - uOrigin) / uDpr;
  p.y = uRes.y - p.y;
  float aa = 0.9 / uDpr;

  // autour de l'anneau du curseur, la trame est légèrement écartée (perturbation des points)
  vec2 hp = p;
  if (uLens.z > 0.5) {
    vec2 lq = p - uLens.xy; float dl = length(lq);
    float g = exp(-max(dl - uLensO, 0.0) / (uLensO * 0.22)) * step(uLensO, dl);   // très forte sur la lisière, décroissance exponentielle
    hp = p - lq / max(dl, 1.0) * g * uCell * 1.6;
  }
  vec4 h = halftone(hp);
  if (uLens.z > 0.5) { float dl = length(p - uLens.xy); float g = exp(-max(dl - uLensO, 0.0) / (uLensO * 0.18)) * step(uLensO, dl); h *= 1.0 + 0.35 * g; }
  vec3 col = h.rgb; float a = h.a;
  float sd = 0.0;
  if (uRadius > 0.0) {
    sd = sdCard(p);
    col += vec3(uCardBg) * (1.0 - a); a = 1.0;
    // survol : bord de verre fin et sobre. Les points se courbent le long du bord (réfraction), un voile clair
    // s'éclaircit vers l'arête, une arête lumineuse fine (avec un léger décalage rose / vert) et un liseré irisé intérieur.
    if (uGlass > 0.001) {
      float W = 12.0;
      float t = -sd / W;                                   // 0 à l'arête, 1 à la fin du verre
      if (t < 1.0) {
        vec2 e = vec2(1.0, 0.0);
        vec2 n = normalize(vec2(sdCard(p + e.xy) - sdCard(p - e.xy), sdCard(p + e.yx) - sdCard(p - e.yx)) + 1e-5);
        float u = clamp(t, 0.0, 1.0);
        vec4 hb = halftone(p - n * 7.0 * pow(1.0 - u, 2.0));   // réfraction : la trame se courbe vers l'intérieur
        vec3 g = hb.rgb + vec3(uCardBg) * (1.0 - hb.a);
        g += vec3(0.07) * pow(1.0 - u, 1.5);                   // voile du verre
        vec2 cp = p - uRes * 0.5;
        vec3 ic = iris(atan(cp.x, -cp.y) / 6.28318);
        g += ic * 0.16 * pow(1.0 - u, 2.0);
        float edgeR = exp(-abs(sd + 1.0) / 0.7), edgeG = exp(-abs(sd + 1.7) / 0.7);
        g += vec3(0.75, 0.55, 0.75) * edgeR * 0.55 + vec3(0.5, 0.75, 0.6) * edgeG * 0.35;   // arête
        g += ic * 0.3 * exp(-abs(sd + W) / 0.9);                                             // liseré intérieur
        col = mix(col, g, uGlass);
      }
    }
  }

  // lentille : l'image d'origine, nette au centre ; près du bord intérieur, déformation « verre liquide » :
  // l'image se courbe vers le bord, les couleurs se séparent légèrement, un reflet fin longe l'anneau
  float R = uLens.z;
  if (R > 0.5) {
    vec2 lp = p - uLens.xy;
    float d = length(lp);
    if (d < R + 2.0) {
      float k = smoothstep(0.5, 1.0, d / R);
      float bend = 0.2 * k * k * k;
      // échantillons moyennés là où l'image est comprimée (évite le moiré) ; séparation des couleurs très légère
      vec2 c0 = uLens.xy, t1 = vec2(0.6, 0.0) * (1.0 + 3.0 * k), t2 = vec2(0.0, 0.6) * (1.0 + 3.0 * k);
      vec3 orig = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        vec2 o = (i == 0 ? t1 : i == 1 ? -t1 : i == 2 ? t2 : -t2);
        orig += vec3(texture2D(uTex, cover(c0 + lp * (1.0 - bend * 1.012) + o)).r,
                     texture2D(uTex, cover(c0 + lp * (1.0 - bend) + o)).g,
                     texture2D(uTex, cover(c0 + lp * (1.0 - bend * 0.988) + o)).b);
      }
      orig *= 0.25;
      vec2 dir = d > 0.001 ? lp / d : vec2(0.0);
      orig += vec3(0.32) * exp(-(R - d) / 2.2) * max(dot(dir, normalize(vec2(-0.6, -0.8))), 0.0);   // reflet
      orig *= 1.0 - 0.12 * k * k;                                                                  // épaisseur du verre
      float inner = 1.0 - smoothstep(R - aa, R + aa, d);
      col = mix(col, orig, inner); a = mix(a, 1.0, inner);
    }
  }

  // accueil : le « o » du logo, en aplat irisé comme sur le monogramme
  if (uEye.z > 0.5) {
    float de = length(p - uEye.xy);
    float eye = smoothstep(uEye.w - aa, uEye.w + aa, de) * (1.0 - smoothstep(uEye.z - aa, uEye.z + aa, de));
    vec2 ep = p - uEye.xy;
    col = mix(col, iris(atan(ep.x, -ep.y) / 6.28318), eye); a = mix(a, 1.0, eye);
  }

  // carte : coins arrondis
  if (uRadius > 0.0) { float cov = 1.0 - smoothstep(-aa, aa, sd); col *= cov; a *= cov; }
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
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  const ringProg = gl.createProgram()
  gl.attachShader(ringProg, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(ringProg, sh(gl.FRAGMENT_SHADER, RING)); gl.bindAttribLocation(ringProg, 0, 'a'); gl.linkProgram(ringProg)
  const RU = {}; for (const n of ['uL', 'uW', 'uH', 'uDpr']) RU[n] = gl.getUniformLocation(ringProg, n)
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)
  const U = {}; for (const n of ['uTex', 'uMask', 'uRes', 'uOrigin', 'uImg', 'uDpr', 'uCell', 'uReveal', 'uFade', 'uHasMask', 'uFloor', 'uRadius', 'uLens', 'uLensO', 'uGlass', 'uEye', 'uClip', 'uCardBg', 'uColor']) U[n] = gl.getUniformLocation(prog, n)
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

  const views = [...document.querySelectorAll('[data-gl]')].map((el) => {
    const v = { el, tex: newTex(), img: null, video: el.querySelector('video'), ready: false, seen: 0, glass: 0, color: el.hasAttribute('data-color'),
      mark: el.dataset.gl === 'mark', cell: +el.dataset.cell || 7,
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

  // une seule lentille pour toute la page : elle suit le pointeur de près (sans dépassement), apparaît sur les cartes
  const lens = { x: 0, y: 0, s: 0, init: false }
  const hoverDevice = matchMedia('(hover: hover)').matches
  const follow = (a, b, tau, dt) => a + (b - a) * (1 - Math.exp(-dt / tau))

  let last = performance.now(), time = 0
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now
    time += dt
    if (canvas.width !== Math.round(innerWidth * dpr)) resize()
    gl.viewport(0, 0, canvas.width, canvas.height); gl.scissor(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    if (document.documentElement.classList.contains('fiche-open')) return
    // la lentille : visible quand le pointeur est sur une carte (pas sur l'accueil)
    const small = W < 600
    const Ro = small ? 60 : 74, Ri = Ro - (small ? 9 : 12)
    let over = false
    for (const v of views) {
      if (v.mark || !v.ready) continue
      const b = v.el.getBoundingClientRect(), cr = v.clip?.getBoundingClientRect()
      if (ptr.x >= b.left && ptr.x <= b.right && ptr.y >= b.top && ptr.y <= b.bottom && (!cr || (ptr.x > cr.left && ptr.x < cr.right))) { over = true; break }
    }
    const show = over && (!ptr.touch || now - ptr.t < 1400) && !document.documentElement.classList.contains('fiche-open')
    if (!lens.init || (lens.s < 0.02 && show)) { lens.x = ptr.x; lens.y = ptr.y; lens.init = true }
    if (reduced) { lens.x = ptr.x; lens.y = ptr.y; lens.s = show ? 1 : 0 }
    else { lens.x = follow(lens.x, ptr.x, 0.035, dt); lens.y = follow(lens.y, ptr.y, 0.035, dt); lens.s = follow(lens.s, show ? 1 : 0, 0.09, dt) }
    const sc = lens.s < 0.005 ? 0 : 1 - Math.pow(1 - lens.s, 2)

    gl.useProgram(prog)
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
      const hov = !v.mark && hoverDevice && ptr.x >= b.left && ptr.x <= b.right && ptr.y >= b.top && ptr.y <= b.bottom && (!cr || (ptr.x > cr.left && ptr.x < cr.right))
      v.glass = reduced ? (hov ? 1 : 0) : follow(v.glass, hov ? 1 : 0, hov ? 0.16 : 0.1, dt)

      const x0 = Math.round(b.left * dpr), y0 = Math.round((H - b.bottom) * dpr)
      gl.viewport(x0, y0, Math.round(w * dpr), Math.round(h * dpr))
      gl.scissor(Math.max(0, x0), Math.max(0, y0), Math.round(w * dpr), Math.round(h * dpr))
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, v.tex)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, v.mask || v.tex)
      gl.uniform2f(U.uRes, w, h); gl.uniform2f(U.uOrigin, x0, y0); gl.uniform2f(U.uImg, v.img[0], v.img[1])
      gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uCell, w < 760 ? Math.max(5, v.cell - 1) : v.cell)
      gl.uniform1f(U.uReveal, reveal); gl.uniform1f(U.uFade, v.fade ? 1 : 0); gl.uniform1f(U.uHasMask, v.mark ? 1 : 0)
      gl.uniform1f(U.uFloor, v.mark ? 0.42 : 0); gl.uniform1f(U.uRadius, v.radius)
      gl.uniform1f(U.uColor, v.color ? 1 : 0)
      gl.uniform1f(U.uCardBg, 0)
      if (cr) gl.uniform4f(U.uClip, cr.left - b.left, cr.right - b.left, Math.max(24, parseFloat(getComputedStyle(v.clip).paddingLeft) || 0), 0)
      else gl.uniform4f(U.uClip, 0, 0, 0, 0)
      // intérieur de la lentille : l'image d'origine de cette vue (l'anneau est dessiné après, par-dessus tout)
      gl.uniform3f(U.uLens, lens.x - b.left, lens.y - b.top, v.mark ? 0 : Ri * sc); gl.uniform1f(U.uLensO, Ro * sc); gl.uniform1f(U.uGlass, v.glass)
      if (v.mark) { const m = markBox(w, h), e = Math.min(1, reveal * 1.4); gl.uniform4f(U.uEye, m.x + O.x * m.s, m.y + O.y * m.s, O.ro * m.s * e, O.ri * m.s * e) }
      else gl.uniform4f(U.uEye, 0, 0, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    if (sc > 0) {
      gl.viewport(0, 0, canvas.width, canvas.height); gl.scissor(0, 0, canvas.width, canvas.height)
      gl.useProgram(ringProg)
      gl.uniform3f(RU.uL, lens.x, lens.y, Ro * sc); gl.uniform1f(RU.uW, (Ro - Ri) * sc); gl.uniform1f(RU.uH, H); gl.uniform1f(RU.uDpr, dpr)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
  }
  document.documentElement.classList.add('has-gl')
  return { frame }
}
