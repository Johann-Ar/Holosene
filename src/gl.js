/**
 * Rendu WebGL du site : une seule toile fixe derrière la page, qui dessine chaque vue [data-gl] à sa place.
 * Chaque vue : l'image (ou plus tard la vidéo) en trame de points, et une lentille qui suit le curseur et montre l'original.
 * L'anneau reprend les couleurs du « o » du logo, en aplat, sans autre effet.
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
uniform sampler2D uBg;     // fond de page (pour la réfraction du logo en verre)
uniform sampler2D uMaskB;  // masque du monogramme adouci (relief du verre)
uniform vec2 uCanvas;      // taille de la toile (px écran)
uniform float uFloor;   // taille minimale des points dans le masque
uniform float uRadius;  // coins arrondis (0 : aucun)
uniform vec3 uLens;     // centre (px CSS), rayon intérieur
uniform float uLensO;   // rayon extérieur de l'anneau
uniform float uGlass;   // survol d'une carte : bord de verre (0 à 1)
uniform vec4 uClip;     // piste horizontale : bords gauche et droit (px, dans la vue), largeur du fondu
uniform float uCardBg;  // gris du fond des cartes
uniform sampler2D uText; // texte net de la vignette (alpha), à la résolution de l'écran
uniform float uHasText;
uniform float uColor;   // 1 : points de la couleur de l'image (dégradé « En cours »)
uniform vec4 uScr;      // coin haut gauche de la vue à l'écran (px), taille de l'écran (px)
uniform float uTime;
uniform vec4 uMarkXf;   // accueil : monogramme, centre (px), hauteur (px), rotation (rad)
uniform vec4 uEye;      // inutilisé (xy, zw)

vec2 cover(vec2 p) {
  float s = max(uRes.x / uImg.x, uRes.y / uImg.y);
  vec2 size = uImg * s;
  return clamp((p - (uRes - size) * 0.5) / size, 0.001, 0.999);
}
float hash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float vnoise(vec2 x) {
  vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// roue irisée de la marque, à parts égales ; 0 = en haut, sens horaire
vec3 iris(float t) {
  vec3 c[6];   // cinq teintes à parts égales : rose, rose tendre, mauve, bleu, menthe
  c[0] = vec3(1.000, 0.300, 0.930); c[1] = vec3(1.000, 0.330, 0.640); c[2] = vec3(0.780, 0.330, 1.000);
  c[3] = vec3(0.280, 0.600, 1.000); c[4] = vec3(0.220, 0.930, 0.560); c[5] = c[0];
  float x = fract(t) * 5.0; vec3 r = c[0];
  for (int i = 0; i < 5; i++) { if (x >= float(i)) r = mix(c[i], c[i + 1], smoothstep(0.0, 1.0, x - float(i))); }
  return r;
}

// trame en un point : un point par cellule, sa taille suit la lumière de l'image (couleur prémultipliée, alpha).
// off : décalage de la lecture de l'image seulement (la grille de points reste en place : réfraction sans traînées)
vec4 halftoneS(vec2 p, vec2 off) {
  float aa = 0.9 / uDpr;
  if (uHasMask > 0.5) {
    // accueil : le monogramme en verre (comme le bord des vignettes) : relief tiré du masque adouci, réfraction du fond,
    // lumière sur les arêtes ; arêtes du « o » irisées
    vec2 d = p - uMarkXf.xy;
    vec2 muv = d / uMarkXf.z / vec2(0.816, 1.0) + 0.5;
    if (muv.x < 0.0 || muv.x > 1.0 || muv.y < 0.0 || muv.y > 1.0) return vec4(0.0);
    vec4 mk = texture2D(uMask, muv);
    float cov = smoothstep(0.35, 0.65, max(mk.r, mk.g));
    if (cov < 0.001) return vec4(0.0);
    bool isO = mk.g > mk.r;
    vec2 e = vec2(1.0 / 900.0, 0.0);
    float hgt = max(texture2D(uMaskB, muv).r, texture2D(uMaskB, muv).g);
    float hx = max(texture2D(uMaskB, muv + e.xy).r, texture2D(uMaskB, muv + e.xy).g) - max(texture2D(uMaskB, muv - e.xy).r, texture2D(uMaskB, muv - e.xy).g);
    float hy = max(texture2D(uMaskB, muv + e.yx).r, texture2D(uMaskB, muv + e.yx).g) - max(texture2D(uMaskB, muv - e.yx).r, texture2D(uMaskB, muv - e.yx).g);
    vec2 n = vec2(hx, hy) * 9.0;                                       // pente du relief
    float rim = pow(1.0 - clamp(hgt, 0.0, 1.0), 3.0);                  // 1 sur l'arête, 0 au cœur
    vec2 sp = (gl_FragCoord.xy - n * vec2(1.0, -1.0) * 70.0 * uDpr) / uCanvas;
    vec3 bgc = texture2D(uBg, sp).rgb;
    vec3 col = bgc * 2.6 + vec3(0.13);                                 // verre dépoli : fond réfracté, éclairci
    vec2 L = normalize(vec2(-0.6, -0.8));
    float spec = pow(max(dot(normalize(n + 1e-5), L), 0.0), 3.0) * clamp(length(n) * 2.0, 0.0, 1.0);
    vec2 ep = p - (uMarkXf.xy + vec2(0.23125, 0.0868) * uMarkXf.z);
    vec3 edge = isO ? iris(atan(ep.x, -ep.y) / 6.28318) : vec3(1.0);
    float lip = exp(-pow((1.0 - hgt) - 0.08, 2.0) * 160.0);            // liseré lumineux fin juste à l'intérieur de l'arête
    col += edge * (rim * (isO ? 1.4 : 0.9) + lip * (isO ? 0.9 : 0.6)) + vec3(1.0) * spec * 1.1;
    float al = cov * (isO ? 1.0 : smoothstep(0.0, 1.0, uReveal));
    return vec4(col * al, al);
  }
  vec2 cell = floor(p / uCell);
  vec2 c = (cell + 0.5) * uCell;
  float l = lum(texture2D(uTex, cover(c + off)).rgb);
  if (uHasText > 0.5) l = max(l, texture2D(uText, (c + off) / uRes).a);   // texte de la vignette : fait partie de l'image
  float m = 1.0;
  float inWord = 0.0;
  float inO = 0.0;
  if (uHasMask > 0.5) {
    // accueil : le monogramme entier en points (S en r, « o » en g), placé et tourné par le défilement ;
    vec2 d = c - uMarkXf.xy; float cs = cos(uMarkXf.w), sn = sin(uMarkXf.w);
    vec2 lc = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y) / uMarkXf.z;
    vec2 muv = lc / vec2(0.816, 1.0) + 0.5;
    vec4 mk = (muv.x > 0.0 && muv.x < 1.0 && muv.y > 0.0 && muv.y < 1.0) ? texture2D(uMask, muv) : vec4(0.0);
    inWord = max(mk.r, mk.g); inO = mk.g; m = inWord;
    l = 0.85;   // logo fixe : points de taille régulière
  }
  float edge = 1.0;
  if (uFade > 0.5) edge = smoothstep(0.0, 0.2 * uRes.y, c.y) * smoothstep(0.0, 0.2 * uRes.y, uRes.y - c.y);
  float rnd = hash(cell);
  float rev = smoothstep(rnd * 0.6, rnd * 0.6 + 0.4, uReveal);
  if (uHasMask > 0.5 && inO > 0.5) rev = 1.0;   // accueil : le « o » est là dès le départ (il vient du chargeur)
  float kk = max(sqrt(clamp(l * 1.2, 0.0, 1.0)), uFloor * inWord) * m;
  float r = uCell * 0.49 * kk * rev * edge;
  float dotA = (1.0 - smoothstep(r - aa, r + aa, length(p - c))) * clamp(r / aa, 0.0, 1.0);
  vec3 dc = mix(vec3(mix(0.2, 0.95, clamp(l * 1.1, 0.0, 1.0))), min(texture2D(uTex, cover(c + off)).rgb * 1.25, 1.0), uColor);   // uColor : 0 gris, 1 couleur
  if (uHasMask > 0.5) {
    // le « o » : points irisés (la couleur tourne lentement) ; le S : points blancs
    float cs = cos(uMarkXf.w), sn = sin(uMarkXf.w);
    vec2 ol = vec2(0.23125, 0.0868) * uMarkXf.z;
    vec2 oc = uMarkXf.xy + vec2(cs * ol.x - sn * ol.y, sn * ol.x + cs * ol.y);
    vec2 ep = c - oc;
    vec3 ic = iris(atan(ep.x, -ep.y) / 6.28318);
    dc = mix(vec3(mix(0.7, 1.0, l)), ic * mix(0.8, 1.05, l), step(0.5, inO));
  }
  return vec4(dc * dotA, dotA);
}
vec4 halftone(vec2 p) { return halftoneS(p, vec2(0.0)); }
// distance signée au rectangle aux coins arrondis de la carte (négative à l'intérieur)
float sdCard(vec2 p) {
  vec2 q = abs(p - uRes * 0.5) - (uRes * 0.5 - uRadius);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
}
// bord intérieur du verre : même rectangle, rentré de w, coins toujours arrondis (rayon conservé)
float sdInner(vec2 p, float w) {
  float r = uRadius + w * 0.6;                       // rayon intérieur plus grand : la courbe reste douce
  vec2 q = abs(p - uRes * 0.5) - (uRes * 0.5 - w - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// lentille du curseur en un point q (couleur de fond base) : image d'origine, bord intérieur « verre liquide », anneau irisé
vec3 withLens(vec2 q, vec3 base) {
  float aa = 0.9 / uDpr;
  float R = uLens.z;
  vec3 col = base;
  if (R > 0.5) {
    vec2 lp = q - uLens.xy;
    float d = length(lp);
    if (d < uLensO + 2.0) {
      float k = smoothstep(0.72, 1.0, d / R);
      float bend = 0.2 * k * k * k;
      vec2 c0 = uLens.xy, t1 = vec2(0.6, 0.0) * (1.0 + 3.0 * k), t2 = vec2(0.0, 0.6) * (1.0 + 3.0 * k);
      vec3 orig = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        vec2 o = (i == 0 ? t1 : i == 1 ? -t1 : i == 2 ? t2 : -t2);
        orig += vec3(texture2D(uTex, cover(c0 + lp * (1.0 - bend * 1.012) + o)).r,
                     texture2D(uTex, cover(c0 + lp * (1.0 - bend) + o)).g,
                     texture2D(uTex, cover(c0 + lp * (1.0 - bend * 0.988) + o)).b);
      }
      orig *= 0.25;
      if (uHasText > 0.5) orig = mix(orig, vec3(1.0), texture2D(uText, q / uRes).a);
      vec2 dir = d > 0.001 ? lp / d : vec2(0.0);
      orig += vec3(0.18) * exp(-(R - d) / 1.5) * max(dot(dir, normalize(vec2(-0.6, -0.8))), 0.0);
      float inner = 1.0 - smoothstep(R - aa, R + aa, d);
      col = mix(col, orig, inner);
      float ring = smoothstep(R - 2.0 - aa, R - 2.0 + aa, d) * (1.0 - smoothstep(uLensO - aa, uLensO + aa, d));
      col = mix(col, iris(atan(lp.x, -lp.y) / 6.28318), ring);
    }
  }
  return col;
}

void main() {
  vec2 p = (gl_FragCoord.xy - uOrigin) / uDpr;
  p.y = uRes.y - p.y;
  float aa = 0.9 / uDpr;

  // verre liquide : près des bords de l'écran (haut, bas) et de la piste (gauche, droite), l'image est aspirée vers
  // l'intérieur (on lit l'image plus loin du bord). La forme de la vignette ne bouge pas : rien ne sort du cadre.
  const float EDGE = 120.0;   // même largeur que les fondus CSS (bord haut en référence)
  vec2 sc = uScr.xy + p;
  float wT = 1.0 - smoothstep(0.0, EDGE, sc.y), wB = 1.0 - smoothstep(0.0, EDGE, uScr.w - sc.y);
  float wL = 0.0, wR = 0.0;
  if (uClip.z > 0.0) { wL = 1.0 - smoothstep(uClip.x, uClip.x + EDGE, p.x); wR = smoothstep(uClip.y - EDGE, uClip.y, p.x); }
  vec2 suck = vec2(pow(wL, 2.0) - pow(wR, 2.0), pow(wT, 2.0) - pow(wB, 2.0)) * 60.0;   // aspiration des images vers l'intérieur

  // autour de l'anneau du curseur, la trame est légèrement écartée (perturbation des points)
  vec2 hp = p;
  if (uLens.z > 0.5) {
    vec2 lq = p - uLens.xy; float dl = length(lq);
    float g = exp(-max(dl - uLensO, 0.0) / (uLensO * 0.22)) * step(uLensO, dl);   // très forte sur la lisière, décroissance exponentielle
    hp = p - lq / max(dl, 1.0) * g * uCell * 1.6;
  }
  vec4 h = halftoneS(hp, suck);
  if (uLens.z > 0.5) { float dl = length(p - uLens.xy); float g = exp(-max(dl - uLensO, 0.0) / (uLensO * 0.18)) * step(uLensO, dl); h *= 1.0 + 0.35 * g; }
  vec3 col = h.rgb; float a = h.a;
  col = withLens(p, col); if (uLens.z > 0.5 && length(p - uLens.xy) < uLensO + 1.0) a = 1.0;


  // bords latéraux fondus de la piste (vues sans verre ; sinon la passe « verre » s'en charge)
  if (uClip.z > 0.0 && uRadius < 0.5) { float f = (0.12 + 0.88 * pow(smoothstep(uClip.x, uClip.x + uClip.z, p.x) * (1.0 - smoothstep(uClip.y - uClip.z, uClip.y, p.x)), 0.6)); col *= f; a *= f; }
  gl_FragColor = vec4(col, a);
}`

const IRIS = `// roue irisée de la marque, à parts égales ; 0 = en haut, sens horaire
vec3 iris(float t) {
  vec3 c[6];   // cinq teintes à parts égales : rose, rose tendre, mauve, bleu, menthe
  c[0] = vec3(1.000, 0.300, 0.930); c[1] = vec3(1.000, 0.330, 0.640); c[2] = vec3(0.780, 0.330, 1.000);
  c[3] = vec3(0.280, 0.600, 1.000); c[4] = vec3(0.220, 0.930, 0.560); c[5] = c[0];
  float x = fract(t) * 5.0; vec3 r = c[0];
  for (int i = 0; i < 5; i++) { if (x >= float(i)) r = mix(c[i], c[i + 1], smoothstep(0.0, 1.0, x - float(i))); }
  return r;
}`

// Passe « verre » des vignettes : lit le contenu déjà dessiné (trame, lentille, aspiration) dans une texture
// intermédiaire, et le réfracte dans l'épaisseur du bord. Tout ce qui passe sous le verre est déformé de la même façon.
const GLASS = `precision highp float;
uniform sampler2D uFbo;
uniform vec2 uFboSize;  // taille de la texture intermédiaire (px écran)
uniform vec2 uRes;      // taille de la vignette (px CSS)
uniform vec2 uOrigin;
uniform float uDpr;
uniform float uRadius;
uniform float uGlass;   // survol (0 à 1) : couleurs irisées et séparation des couleurs
uniform float uBg;
uniform vec4 uClip;
${IRIS}
float sdCard(vec2 p) {
  vec2 q = abs(p - uRes * 0.5) - (uRes * 0.5 - uRadius);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
}
float sdInner(vec2 p, float w) {
  float r = uRadius + w * 0.6;
  vec2 q = abs(p - uRes * 0.5) - (uRes * 0.5 - w - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 at(vec2 q) {
  q = clamp(q, vec2(0.5), uRes - 0.5);
  vec4 c = texture2D(uFbo, vec2(q.x, uRes.y - q.y) * uDpr / uFboSize);
  return c.rgb + vec3(uBg) * (1.0 - c.a);
}
void main() {
  vec2 p = (gl_FragCoord.xy - uOrigin) / uDpr;
  p.y = uRes.y - p.y;
  float aa = 0.9 / uDpr;
  float sd = sdCard(p);
  vec3 col = at(p);
  float W = 34.0;
  float di = sdInner(p, W);
  float t = di < 0.0 ? 1.0 : clamp(-sd / max(-sd + di, 1e-3), 0.0, 1.0);   // 0 à l'arête, 1 au bord intérieur
  if (t < 1.0) {
    vec2 e = vec2(1.0, 0.0);
    vec2 n = normalize(vec2(sdCard(p + e.xy) - sdCard(p - e.xy) + sdInner(p + e.xy, W) - sdInner(p - e.xy, W),
                            sdCard(p + e.yx) - sdCard(p - e.yx) + sdInner(p + e.yx, W) - sdInner(p - e.yx, W)) + 1e-5);
    float s1 = 1.0 - t;
    // réfraction à la manière du « Liquid Glass » d'Apple : le bord est une lentille convexe (profil en squircle,
    // h(x) = (1 - (1 - x)^4)^(1/4)). Sa pente donne l'angle de la surface ; la loi de Snell (indice 1,5) donne la
    // déviation. Forte au ras de l'arête, nulle à l'intérieur : l'image est comprimée puis grossie vers le bord.
    float x = clamp(t, 0.001, 1.0);
    float h = pow(1.0 - pow(1.0 - x, 4.0), 0.25);
    float slope = pow(1.0 - x, 3.0) / max(pow(h, 3.0), 0.02);          // dh/dx
    float th = atan(slope * 0.9);                                     // angle de la surface
    float tr = asin(sin(th) / 1.5);                                   // angle réfracté
    float bend = W * 1.15 * tan(th - tr);                             // déviation (px)
    vec3 g = at(p - n * bend);                                        // une seule lecture : aucune image dédoublée
    vec2 cp = p - uRes * 0.5;
    vec3 ic = iris((atan(cp.x, -cp.y) / 6.28318) * 6.0 + t * 0.6);
    vec3 tint = mix(vec3(1.0), ic, uGlass);
    // la couleur n'est plus appliquée à l'image (sinon une image claire se colore sur toute l'épaisseur du verre) :
    // elle n'est portée que par la lumière du verre, d'une largeur fixe, identique sur image claire ou sombre
    // l'image sous le verre est aussi teintée, plus fort vers l'arête (décroissance rapide : reste fin sur image claire)
    g = g * mix(vec3(1.0), tint * 1.15, 0.9 * pow(s1, 1.1)) + tint * 0.14 * s1 * uGlass;
    float rim = exp(-abs(sd + 1.5) / 1.6);
    // entre-deux : une bande irisée de largeur fixe (≈ 9 px depuis l'arête), même sur image claire
    float band9 = 1.0 - smoothstep(4.0, 11.0, -sd);
    g = mix(g, g * tint * 1.15 + tint * 0.12, band9 * 0.45 * uGlass);
    g *= 0.62 + 0.38 * smoothstep(0.0, 0.75, t);       // le verre assombrit un peu (visible sur les images claires)
    vec2 L = normalize(vec2(-0.65, -0.76));
    float facing = dot(n, L);
    float spec = pow(max(facing, 0.0), 2.0) * exp(-abs(sd + 2.0) / 2.2) * 0.95;
    float back = pow(max(-facing, 0.0), 2.0) * exp(-abs(sd + 3.0) / 3.0) * 0.35;
    g += mix(vec3(1.0), tint, 0.5) * (spec + back);
    g = mix(g, tint, rim * 0.5 * uGlass);                          // liseré irisé fin le long de l'arête
    col = mix(col, g, 1.0 - smoothstep(0.6, 1.0, t));
  }
  float a = 1.0 - smoothstep(-aa, aa, sd);
  if (uClip.z > 0.0) a *= (0.12 + 0.88 * pow(smoothstep(uClip.x, uClip.x + uClip.z, p.x) * (1.0 - smoothstep(uClip.y - uClip.z, uClip.y, p.x)), 0.6));
  gl_FragColor = vec4(col * a, a);
}`

// Fond de page (comme la référence) : noir très profond, grandes nappes de couleur qui dérivent lentement près des
// bords (couleurs de la marque, à ~6 % d'intensité) et grain de pellicule animé.
const BG = `precision highp float;
// Fond animé : même algorithme et mêmes réglages que le fond de la référence fournie par Johann (passe « fluidText »
// puis « post ») ; couleurs : versions très sombres de la roue irisée. Bruit noise() d'après Inigo Quilez (CC BY-NC-SA 3.0).
uniform vec2 uView;
uniform float uDpr;
uniform float uTime;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(2127.1, 81.17)), dot(p, vec2(1269.5, 283.37))); return fract(sin(p) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(mix(dot(-1.0 + 2.0 * hash2(i), f), dot(-1.0 + 2.0 * hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                mix(dot(-1.0 + 2.0 * hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(-1.0 + 2.0 * hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
  return 0.5 + 0.5 * n;
}
float random(vec2 st){ return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123); }
void main(){
  vec2 vUv = gl_FragCoord.xy / (uView * uDpr);
  vec3 c1 = vec3(0.000, 0.075, 0.045), c2 = vec3(0.120, 0.020, 0.090), c3 = vec3(0.045, 0.010, 0.120), c4 = vec3(0.035, 0.035, 0.040);
  float ratio = uView.x / uView.y;
  vec2 tuv = vUv - 0.5;
  float degree = noise(vec2(uTime * 0.1, tuv.x * tuv.y));
  tuv.y *= 1.0 / ratio; tuv *= Rot(radians((degree - 0.5) * 720.0 + 180.0)); tuv.y *= ratio;
  float frequency = 5.0, amplitude = 30.0, speed = uTime * 2.0;
  tuv.x += sin(tuv.y * frequency + speed) / amplitude;
  tuv.y += sin(tuv.x * frequency * 1.5 + speed) / (amplitude * 0.5);
  vec3 layer1 = mix(c1, c2, S(-0.3, 0.2, (tuv * Rot(radians(-5.0))).x));
  vec3 layer2 = mix(c3, c4, S(-0.3, 0.2, (tuv * Rot(radians(-5.0))).x));
  vec3 color = mix(layer1, layer2, S(0.5, -0.3, tuv.y)) * 0.6;
  vec2 vgn = vUv * (1.0 - vUv.yx);
  float vig = pow(vgn.x * vgn.y * 15.0, 0.25);
  color *= 1.0 - vec3(random(vUv + mod(uTime, 1.0))) * 0.1;
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 1.05));
  color = mix(color, mix(vec3(0.0), color * vig, vig), 0.5);
  gl_FragColor = vec4(color, 1.0);
}`
const BLIT = `precision highp float;
uniform sampler2D uSrc; uniform vec2 uSize;
void main(){ gl_FragColor = texture2D(uSrc, gl_FragCoord.xy / uSize); }`

/** Monogramme (viewBox 816 × 1000) : le S et le « o ». */
const S_PATH = 'M462.9 0C429.1 1 395.1 1.9 361.6 7.4C242.6 26.9 130.5 89.6 56.1 185.2C10.3 244.1 -23.5 327.9 20.5 397.3C59.1 458.4 133.7 450.1 194.9 467.2C249.8 482.4 286.4 527.3 301.2 581.1C322.1 657 277.4 730.6 236.4 791C213.1 825.2 177.3 871.7 197.4 914.5C205.3 931.2 217.2 944.9 234.6 952.1C261.4 963.1 342.8 960.6 385.4 973.3C410.1 980.7 435.4 999.9 461.5 1000C510 1000.1 533.4 934.5 492.7 905.9C468.4 888.7 413.8 871.4 384.1 869.8C356.7 868.4 326.8 886.2 315.8 851.7C309.4 831.5 354.2 756.1 363 731.5C391.1 653.5 394.1 567.4 353.2 493.7C323.1 439.3 273.3 408.8 220.3 380.3C202 370.4 177.4 359 163.5 343.2C159.4 338.4 156.8 331.8 153.1 326.6C148.8 320.5 144.7 316.9 143.5 309.4C140.3 287.6 139 267.2 145.7 245.9C161.7 195 232.3 143.2 281.2 127.1C307.7 118.4 336.4 116.5 364.1 114.4C390.7 112.4 472.8 111.6 490.9 102C541.3 75.2 518.8 -1.4 462.9 0Z'
const O_PATH = 'M462.5 586.8a176.7 176.7 0 1 0 353.5 0a176.7 176.7 0 1 0 -353.5 0ZM548.4 586.8a90.8 90.8 0 1 0 181.7 0a90.8 90.8 0 1 0 -181.7 0Z'

export function createGL(canvas, { reduced }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  if (!gl) return null
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)
  const U = {}; for (const n of ['uTex', 'uMask', 'uRes', 'uOrigin', 'uImg', 'uDpr', 'uCell', 'uReveal', 'uFade', 'uHasMask', 'uFloor', 'uRadius', 'uLens', 'uLensO', 'uGlass', 'uEye', 'uMarkXf', 'uBg', 'uMaskB', 'uCanvas', 'uClip', 'uCardBg', 'uColor', 'uScr', 'uTime', 'uText', 'uHasText']) U[n] = gl.getUniformLocation(prog, n)
  gl.uniform1i(U.uTex, 0); gl.uniform1i(U.uMask, 1); gl.uniform1i(U.uText, 3); gl.uniform1i(U.uBg, 4); gl.uniform1i(U.uMaskB, 5)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.SCISSOR_TEST)

  // fond de page
  const bgProg = gl.createProgram()
  gl.attachShader(bgProg, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(bgProg, sh(gl.FRAGMENT_SHADER, BG)); gl.bindAttribLocation(bgProg, 0, 'a'); gl.linkProgram(bgProg)
  const BU = {}; for (const n of ['uView', 'uDpr', 'uTime']) BU[n] = gl.getUniformLocation(bgProg, n)
  const blitProg = gl.createProgram()
  gl.attachShader(blitProg, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(blitProg, sh(gl.FRAGMENT_SHADER, BLIT)); gl.bindAttribLocation(blitProg, 0, 'a'); gl.linkProgram(blitProg)
  const LU = { src: gl.getUniformLocation(blitProg, 'uSrc'), size: gl.getUniformLocation(blitProg, 'uSize') }
  const bgFbo = gl.createFramebuffer(), bgTex = gl.createTexture()
  let bgW = 0, bgH = 0
  function ensureBg() {
    if (bgW === canvas.width && bgH === canvas.height) return
    bgW = canvas.width; bgH = canvas.height
    gl.bindTexture(gl.TEXTURE_2D, bgTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, bgW, bgH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    gl.bindFramebuffer(gl.FRAMEBUFFER, bgFbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bgTex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  // passe « verre » et texture intermédiaire (contenu des vignettes)
  const gProg = gl.createProgram()
  gl.attachShader(gProg, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(gProg, sh(gl.FRAGMENT_SHADER, GLASS)); gl.bindAttribLocation(gProg, 0, 'a'); gl.linkProgram(gProg)
  if (!gl.getProgramParameter(gProg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(gProg))
  const GU = {}; for (const n of ['uFbo', 'uFboSize', 'uRes', 'uOrigin', 'uDpr', 'uRadius', 'uGlass', 'uBg', 'uClip']) GU[n] = gl.getUniformLocation(gProg, n)
  const fbo = gl.createFramebuffer(), fboTex = gl.createTexture()
  let fboW = 0, fboH = 0
  function ensureFbo(w, h) {
    if (w <= fboW && h <= fboH) return
    fboW = Math.max(w, fboW); fboH = Math.max(h, fboH)
    gl.bindTexture(gl.TEXTURE_2D, fboTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fboW, fboH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

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
    const v = { el, tex: newTex(), img: null, video: el.querySelector('video'), ready: false, seen: 0, glass: 0, color: el.hasAttribute('data-color'), text: el.dataset.text || '', textTex: null, textKey: '',
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

  // masque du monogramme en espace local (816 × 1000) : le S en rouge, le « o » en vert. Dessiné une fois ;
  // le placement, la taille et la rotation sont appliqués dans le shader (uMarkXf).
  function maskFor(v) {
    if (v.mask) return
    const c = document.createElement('canvas'); c.width = 1632; c.height = 2000
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 1632, 2000); x.scale(2, 2)
    x.fillStyle = '#ff0000'; x.fill(new Path2D(S_PATH))
    x.fillStyle = '#00ff00'; x.fill(new Path2D(O_PATH), 'evenodd')
    v.mask = newTex(); upload(v.mask, c)
    // version adoucie : le relief du verre
    const cb = document.createElement('canvas'); cb.width = 1632; cb.height = 2000
    const xb = cb.getContext('2d'); xb.fillStyle = '#000'; xb.fillRect(0, 0, 1632, 2000); xb.filter = 'blur(18px)'; xb.drawImage(c, 0, 0)
    v.maskB = newTex(); upload(v.maskB, cb)
  }
  /** Placement du monogramme : intro (le « o » du chargeur, au centre, grandit et le S apparaît), puis le défilement p
   *  le fait encore grossir et glisser vers la droite (bas sur mobile) ; il flotte doucement, sans rotation. */
  const O_OFF = [0.23125, 0.0868], O_R = 0.1767
  function markXf(w, h, p, time, intro) {
    const k = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a))), e = (x) => 1 - Math.pow(1 - x, 3)
    const small = w < 760
    const big = Math.min(h * 0.62, w * (small ? 0.62 : 0.8) * 1000 / 816)
    const end = small ? Math.min(h * 0.46, w * 0.78 * 1000 / 816) : Math.min(h * 0.66, w * 0.34 * 1000 / 816)
    const q = e(k(0, 0.55))
    let size = big + (end - big) * q
    const edge = Math.max(16, Math.min(56, w * 0.04))
    const cxEnd = small ? w / 2 + 0.04 * w : w - edge * 1.6 - 0.408 * end   // le « o » garde une marge sur le bord droit
    let cx = w / 2 + (cxEnd - w / 2) * q, cy = h / 2 + (small ? -0.18 : 0.02) * h * q
    // intro : le « o » prend la place du chargeur (rayon extérieur 44 px, au centre), puis le monogramme s'agrandit
    const i = e(Math.min(1, intro))
    const s0 = 44 / O_R, c0 = [w / 2 - O_OFF[0] * s0, h / 2 - O_OFF[1] * s0]
    size = s0 + (size - s0) * i; cx = c0[0] + (cx - c0[0]) * i; cy = c0[1] + (cy - c0[1]) * i
    if (!reduced) { cy += Math.sin(time * 0.9) * h * 0.008 * i; cx += Math.cos(time * 0.6) * w * 0.004 * i }   // flotte
    return [cx, cy, size, 0]
  }

  // texte net d'une vignette, redessiné à la taille exacte de la vignette et à la densité de l'écran
  function textFor(v, w, h) {
    const key = `${Math.round(w)}x${Math.round(h)}@${dpr}:${document.fonts?.status}`
    if (v.textKey === key) return
    const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
    const x = c.getContext('2d'); x.scale(dpr, dpr)
    const fs = Math.round(Math.min(w * 0.13, h * 0.2))
    x.font = `500 ${fs}px Archivo, sans-serif`
    try { x.fontStretch = 'expanded' } catch {}
    x.letterSpacing = `${(-0.04 * fs).toFixed(1)}px`
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'
    x.fillText(v.text, w / 2, h / 2)
    v.textTex ??= newTex()
    gl.bindTexture(gl.TEXTURE_2D, v.textTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
    v.textKey = key
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
    ensureBg()
    gl.bindFramebuffer(gl.FRAMEBUFFER, bgFbo)
    gl.useProgram(bgProg); gl.disable(gl.BLEND)
    gl.uniform2f(BU.uView, W, H); gl.uniform1f(BU.uDpr, dpr); gl.uniform1f(BU.uTime, reduced ? 12 : time)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(blitProg); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, bgTex)
    gl.uniform1i(LU.src, 4); gl.uniform2f(LU.size, canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.enable(gl.BLEND)
    if (document.documentElement.classList.contains('fiche-open')) {
      // fiche projet ouverte : le curseur reste toujours visible
      if (lens.hidden) { document.documentElement.classList.remove('lens-on'); lens.hidden = false }
      lens.s = 0
      return
    }
    // la lentille : visible quand le pointeur est sur une carte (pas sur l'accueil)
    const small = W < 600
    const Ro = small ? 60 : 74, Ri = Ro - (small ? 9 : 12)
    let over = null
    for (const v of views) {
      if (v.mark || !v.ready) continue
      const b = v.el.getBoundingClientRect(), cr = v.clip?.getBoundingClientRect()
      if (ptr.x >= b.left && ptr.x <= b.right && ptr.y >= b.top && ptr.y <= b.bottom && (!cr || (ptr.x > cr.left && ptr.x < cr.right))) { over = v; break }
    }
    if (over) lens.view = over
    const show = !!over && (!ptr.touch || now - ptr.t < 1400) && !document.documentElement.classList.contains('fiche-open')
    if (!lens.init || (lens.s < 0.02 && show)) { lens.x = ptr.x; lens.y = ptr.y; lens.init = true }
    if (reduced) { lens.x = ptr.x; lens.y = ptr.y; lens.s = show ? 1 : 0 }
    else { lens.x = follow(lens.x, ptr.x, 0.035, dt); lens.y = follow(lens.y, ptr.y, 0.035, dt); lens.s = follow(lens.s, show ? 1 : 0, 0.09, dt) }
    const sc = lens.s < 0.005 ? 0 : 1 - Math.pow(1 - lens.s, 2)
    // le « o » remplace le curseur : flèche masquée partout tant que le « o » est affiché (souris uniquement)
    const hide = sc > 0.02 && hoverDevice && !ptr.touch   // tant que le « o » est visible, même en train de disparaître
    if (hide !== lens.hidden) { document.documentElement.classList.toggle('lens-on', hide); lens.hidden = hide }

    for (const v of views) {
      const b = v.el.getBoundingClientRect()
      if (!v.ready || b.bottom < 0 || b.top > H || b.right < 0 || b.left > W || b.width < 2) continue
      const cr = v.clip?.getBoundingClientRect()
      if (cr && (b.right < cr.left || b.left > cr.right)) continue
      if (v.video && !v.video.paused && v.video.readyState >= 2) upload(v.tex, v.video)
      if (!v.seen) { if (!document.documentElement.classList.contains('is-loaded')) continue; v.seen = now }
      const w = b.width, h = b.height
      // apparition : les points poussent, puis rétrécissent quand la vue sort de l'écran
      const intro = reduced ? 1 : Math.min(1, (now - v.seen) / 1600)
      const vis = Math.min(1, Math.max(0, Math.min(H - b.top, b.bottom) / (H * 0.8)))   // apparition plus tardive, disparition plus précoce
      const reveal = (1 - Math.pow(1 - intro, 3)) * vis
      if (v.mark) maskFor(v)
      const hov = !v.mark && hoverDevice && ptr.x >= b.left && ptr.x <= b.right && ptr.y >= b.top && ptr.y <= b.bottom && (!cr || (ptr.x > cr.left && ptr.x < cr.right))
      v.glass = reduced ? (hov ? 1 : 0) : follow(v.glass, hov ? 1 : 0, hov ? 0.16 : 0.12, dt)

      const pw = Math.round(w * dpr), ph = Math.round(h * dpr)
      const glassy = v.radius > 0
      let x0 = Math.round(b.left * dpr), y0 = Math.round((H - b.bottom) * dpr)
      const sx = x0, sy = y0
      gl.useProgram(prog)
      if (glassy) {
        // passe 1 : le contenu de la vignette dans la texture intermédiaire
        ensureFbo(pw, ph)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        x0 = 0; y0 = 0
        gl.viewport(0, 0, pw, ph); gl.scissor(0, 0, pw, ph)
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      } else {
        gl.viewport(x0, y0, pw, ph)
        gl.scissor(Math.max(0, x0), Math.max(0, y0), pw, ph)
      }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, v.tex)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, v.mask || v.tex)
      if (v.maskB) { gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, v.maskB) }
      gl.uniform2f(U.uCanvas, canvas.width, canvas.height)
      gl.uniform2f(U.uRes, w, h); gl.uniform2f(U.uOrigin, x0, y0); gl.uniform2f(U.uImg, v.img[0], v.img[1])
      gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uCell, w < 760 ? Math.max(5, v.cell - 1) : v.cell)
      gl.uniform1f(U.uReveal, reveal); gl.uniform1f(U.uFade, v.fade ? 1 : 0); gl.uniform1f(U.uHasMask, v.mark ? 1 : 0)
      gl.uniform1f(U.uFloor, v.mark ? 0.6 : 0); gl.uniform1f(U.uRadius, glassy ? 1 : 0)
      if (v.text) { textFor(v, w, h); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, v.textTex) }
      gl.uniform1f(U.uHasText, v.text ? 1 : 0)
      gl.uniform1f(U.uColor, v.color ? 1 : 0)
      gl.uniform4f(U.uScr, b.left, b.top, W, H); gl.uniform1f(U.uTime, reduced ? 0 : time)
      gl.uniform1f(U.uCardBg, 0)
      if (cr) gl.uniform4f(U.uClip, cr.left - b.left, cr.right - b.left, 120, 0)
      else gl.uniform4f(U.uClip, 0, 0, 0, 0)
      // intérieur de la lentille : l'image d'origine de cette vue (l'anneau est dessiné après, par-dessus tout)
      gl.uniform3f(U.uLens, lens.x - b.left, lens.y - b.top, v !== lens.view ? 0 : (Ri + 2) * sc); gl.uniform1f(U.uLensO, Ro * sc); gl.uniform1f(U.uGlass, v.glass)
      if (v.mark) { const hr = v.el.closest('.hero').getBoundingClientRect(); const p = Math.min(1, Math.max(0, -hr.top / Math.max(1, hr.height - H))); gl.uniform4f(U.uMarkXf, ...markXf(w, h, p, time, reduced ? 1 : (now - v.seen) / 1500)) }
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (glassy) {
        // passe 2 : le bord de verre, qui réfracte ce contenu, sur la toile
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(sx, sy, pw, ph); gl.scissor(Math.max(0, sx), Math.max(0, sy), pw, ph)
        gl.useProgram(gProg)
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fboTex)
        gl.uniform1i(GU.uFbo, 2); gl.uniform2f(GU.uFboSize, fboW, fboH)
        gl.uniform2f(GU.uRes, w, h); gl.uniform2f(GU.uOrigin, sx, sy); gl.uniform1f(GU.uDpr, dpr)
        gl.uniform1f(GU.uRadius, v.radius); gl.uniform1f(GU.uGlass, 0.6)   // irisé du verre : une seule intensité, entre l'ancien repos et l'ancien survol ; pas de changement au survol
        if (cr) gl.uniform4f(GU.uClip, cr.left - b.left, cr.right - b.left, 120, 0)
        else gl.uniform4f(GU.uClip, 0, 0, 0, 0)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
    }
  }
  document.documentElement.classList.add('has-gl')
  return { frame }
}
