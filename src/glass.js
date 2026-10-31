/**
 * Verre des formes de la marque (monogramme de l'accueil, chargeur) : même modèle que le bord des vignettes.
 * Une bande de verre de largeur W part de l'arête vers l'intérieur : elle se teinte (irisé pour le « o », gris clair
 * pour le S), reçoit une arête lumineuse fine, un liseré intérieur et un reflet orienté (lumière en haut à gauche).
 * Le même calcul existe en GLSL (gl.js, GLASS_SHADE) et en JavaScript (chargeur, dessiné pixel par pixel).
 */
export const GLASS_SHADE = `
// d : distance à l'arête vers l'intérieur (px), n : normale sortante, tint : teinte du bord, base : ce qui est derrière
vec3 glassShade(float d, vec2 n, vec3 tint, vec3 base, float W) {
  float t = clamp(d / W, 0.0, 1.0), s1 = 1.0 - t;
  vec3 col = base + vec3(0.06);                                        // verre : léger voile clair
  col = mix(col, col * tint * 1.25 + tint * 0.2, pow(s1, 1.25) * 0.9); // bande teintée, fondue vers l'intérieur
  vec2 L = normalize(vec2(-0.65, -0.76));
  float facing = dot(n, L);
  col += mix(vec3(1.0), tint, 0.4) * (pow(max(facing, 0.0), 2.0) * exp(-d / 2.4) * 1.1 + pow(max(-facing, 0.0), 2.0) * exp(-d / 3.2) * 0.4);
  col += vec3(1.0) * exp(-d / 1.1) * 0.55;                             // arête lumineuse
  col += tint * exp(-pow((d - W * 0.62) / 1.6, 2.0)) * 0.35;           // liseré intérieur
  return col;
}`

/** Même calcul, en JavaScript (couleurs 0 à 1). */
export function glassShadeJS(d, nx, ny, tint, base, W) {
  const t = Math.min(1, Math.max(0, d / W)), s1 = 1 - t, k = Math.pow(s1, 1.25) * 0.9
  const L = [-0.65 / 1.0018, -0.76 / 1.0018], facing = nx * L[0] + ny * L[1]
  const sp = Math.pow(Math.max(facing, 0), 2) * Math.exp(-d / 2.4) * 1.1 + Math.pow(Math.max(-facing, 0), 2) * Math.exp(-d / 3.2) * 0.4
  const edge = Math.exp(-d / 1.1) * 0.55, lip = Math.exp(-Math.pow((d - W * 0.62) / 1.6, 2)) * 0.35
  return [0, 1, 2].map((i) => {
    let c = base[i] + 0.06
    c = c + (c * tint[i] * 1.25 + tint[i] * 0.2 - c) * k
    return c + (1 + (tint[i] - 1) * 0.4) * sp + edge + tint[i] * lip
  })
}

/** Distance euclidienne à l'extérieur de la forme (Felzenszwalb), pour un masque binaire. */
export function insideDistance(inside, w, h) {
  const INF = 1e12, f = new Float64Array(Math.max(w, h)), d = new Float64Array(Math.max(w, h)), v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1)
  const g = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) g[i] = inside[i] ? INF : 0
  const pass = (n) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]) }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF
    }
    k = 0
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]] }
  }
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; pass(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y] }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; pass(w); for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]) }
  return g
}
