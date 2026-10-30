/**
 * Ouverture : la photo de la rivière (4Dérives, GoPro) rendue en nuage de points, plein écran.
 * La lentille (le « o » du logo) montre la vraie photo, exactement alignée sur les points.
 * Rendu en pause hors écran et onglet caché ; image fixe si l'utilisateur réduit les animations.
 */
import { BufferAttribute, BufferGeometry, OrthographicCamera, Points, Scene, ShaderMaterial, TextureLoader, Vector2, WebGLRenderer, SRGBColorSpace, LinearFilter } from 'three'

const vert = /* glsl */ `
uniform sampler2D uImage;
uniform vec4 uCover;     // x, y, largeur, hauteur de l'image « cover » à l'écran (px)
uniform vec2 uView;      // taille de l'écran (px)
uniform vec2 uMouse;     // px
uniform vec3 uLens;      // centre x, y, rayon (px)
uniform float uTime;
uniform float uStep;
uniform float uDpr;
uniform float uMotion;
attribute vec2 aGrid;    // position du point (px, origine en haut à gauche)
attribute float aRand;
varying float vLum;
varying float vAlpha;
void main() {
  vec2 uv = (aGrid - uCover.xy) / uCover.zw;
  vec3 c = texture2D(uImage, vec2(uv.x, 1.0 - uv.y)).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec2 p = aGrid;
  // ondulation lente, comme un courant
  p.y += uMotion * sin(uTime * 0.6 + aGrid.x * 0.012 + aRand * 6.2831) * 1.6;
  p.x += uMotion * cos(uTime * 0.45 + aGrid.y * 0.015) * 1.0;
  // la souris écarte doucement les points
  vec2 d = p - uMouse;
  float f = uMotion * smoothstep(140.0, 0.0, length(d));
  p += normalize(d + 0.001) * f * 14.0;
  // dans la lentille, la photo remplace les points
  float inLens = smoothstep(uLens.z - 2.0, uLens.z + 6.0, length(aGrid - uLens.xy));
  vLum = l;
  vAlpha = inLens;
  vec2 ndc = vec2(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = max(1.0, (0.18 + 0.82 * pow(l, 0.9)) * uStep * 0.96) * uDpr;
}`
const frag = /* glsl */ `
varying float vLum;
varying float vAlpha;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = dot(q, q);
  if (r > 1.0 || vAlpha < 0.01) discard;
  float a = (1.0 - smoothstep(0.7, 1.0, r)) * vAlpha;
  gl_FragColor = vec4(vec3(min(1.0, vLum * 1.15)), a * 0.62);
}`

export async function startHero(hero, { reduced }) {
  const canvas = hero.querySelector('.hero__canvas')
  const lens = hero.querySelector('.lens')
  let renderer
  try { renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' }) } catch { return }
  const src = lens.dataset.src
  const tex = await new TextureLoader().loadAsync(src).catch(() => null)
  if (!tex) return
  tex.colorSpace = SRGBColorSpace; tex.minFilter = LinearFilter
  const img = tex.image
  const scene = new Scene(); const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const uniforms = {
    uImage: { value: tex }, uCover: { value: [0, 0, 1, 1] }, uView: { value: new Vector2() }, uMouse: { value: new Vector2(-9999, -9999) },
    uLens: { value: [0, 0, 0] }, uTime: { value: 0 }, uStep: { value: 7 }, uDpr: { value: 1 }, uMotion: { value: reduced ? 0 : 1 },
  }
  const mat = new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, depthTest: false })
  const points = new Points(new BufferGeometry(), mat); points.frustumCulled = false; scene.add(points)

  let W = 0, H = 0, cover = [0, 0, 1, 1]
  const lensPos = { x: 0, y: 0, tx: 0, ty: 0, r: 0 }
  const touch = !matchMedia('(hover: hover)').matches
  function layout() {
    W = hero.clientWidth; H = hero.clientHeight
    const small = W < 760
    const dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2)
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false)
    uniforms.uView.value.set(W, H); uniforms.uDpr.value = dpr
    // image en « cover », comme l'arrière-plan CSS
    const s = Math.max(W / img.width, H / img.height); const cw = img.width * s, ch = img.height * s
    cover = [(W - cw) / 2, (H - ch) / 2, cw, ch]; uniforms.uCover.value = cover
    // grille de points : plus espacée sur petit écran (moins de points)
    const step = small ? 9 : 7; uniforms.uStep.value = step
    const cols = Math.ceil(W / step), rows = Math.ceil(H / step), n = cols * rows
    const grid = new Float32Array(n * 2), rand = new Float32Array(n)
    for (let j = 0, k = 0; j < rows; j++) for (let i = 0; i < cols; i++, k++) { grid[k * 2] = (i + 0.5) * step; grid[k * 2 + 1] = (j + 0.5) * step; rand[k] = Math.random() }
    points.geometry.dispose(); points.geometry = new BufferGeometry()
    points.geometry.setAttribute('aGrid', new BufferAttribute(grid, 2)); points.geometry.setAttribute('aRand', new BufferAttribute(rand, 1))
    points.geometry.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3))
    // lentille : même taille que le CSS
    const d = small ? W * 0.66 : Math.min(W * 0.26, H * 0.36)
    lensPos.r = d / 2; lensPos.tx = W / 2; lensPos.ty = H * (small ? 0.38 : 0.35)
    if (!lensPos.x) { lensPos.x = lensPos.tx; lensPos.y = lensPos.ty }
  }
  function placeLens() {
    const d = lensPos.r * 2, lx = lensPos.x - lensPos.r, ly = lensPos.y - lensPos.r
    lens.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`
    lens.style.backgroundSize = `${cover[2]}px ${cover[3]}px`
    lens.style.backgroundPosition = `${(cover[0] - lx).toFixed(1)}px ${(cover[1] - ly).toFixed(1)}px`
    uniforms.uLens.value = [lensPos.x, lensPos.y, lensPos.r]
  }
  layout(); placeLens()

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top
    uniforms.uMouse.value.set(x, y)
    if (!touch && !reduced) { lensPos.tx = W / 2 + (x - W / 2) * 0.35; lensPos.ty = H * 0.35 + (y - H * 0.35) * 0.25 }
  }, { passive: true })
  hero.addEventListener('pointerleave', () => { uniforms.uMouse.value.set(-9999, -9999); lensPos.tx = W / 2; lensPos.ty = H * (W < 760 ? 0.38 : 0.35) })

  let visible = true, running = false, last = 0
  const frame = (t) => {
    if (!visible || document.hidden) { running = false; return }
    const dt = Math.min((t - last) / 1000, 0.05); last = t
    uniforms.uTime.value += dt
    lensPos.x += (lensPos.tx - lensPos.x) * (1 - Math.pow(0.02, dt))
    lensPos.y += (lensPos.ty - lensPos.y) * (1 - Math.pow(0.02, dt))
    placeLens(); renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }
  const start = () => { if (reduced) { placeLens(); renderer.render(scene, camera); return } if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame) } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start() }).observe(hero)
  document.addEventListener('visibilitychange', start)
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); placeLens(); if (reduced) renderer.render(scene, camera) }, 150) })
  document.documentElement.classList.add('has-webgl')
  start()
}
