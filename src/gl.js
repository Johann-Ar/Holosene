/**
 * Rendu WebGL du site : une seule toile fixe derrière la page, qui dessine chaque vue [data-gl] à sa place.
 * Chaque vue : l'image (ou plus tard la vidéo) en trame de points, et une lentille qui suit le curseur et montre l'original.
 * L'anneau reprend les couleurs du « o » du logo, en aplat, sans autre effet.
 * Accueil : le S du monogramme en trame de points, le « o » en aplat irisé comme sur le logo ; pas de lentille.
 */

import { GLASS_GLSL } from './glass.js'
import KIT_IRIS from '../design/logo-kit/src/iris.glsl?raw'
import KIT from '../design/logo-kit/tokens/iris.json'
import { IRIS } from './iris-config.js'
import { FLOW } from './flow.js'

// roue du logo-kit (source de vérité) : irisColor(p), irisRing(p, Ro) ; irisAt(t) pour une position t sur le cercle
// (0 = en haut, sens horaire, y vers le bas). fwidth vient de OES_standard_derivatives (repli : 1 px).
const IRIS_GLSL = `#ifndef GL_OES_standard_derivatives
#define fwidth(x) (1.0)
#endif
${KIT_IRIS}
vec3 irisAt(float t) { float a = t * 6.2831853; return irisColor(vec2(sin(a), -cos(a))); }`
const DERIV = '#extension GL_OES_standard_derivatives : enable\n'

// monogramme du kit (viewBox 146 154 470 576 ; anneau : tokens/iris.json), en unités de 1000 pour sa hauteur
const MONO_VB = [146, 154, 470, 576], MONO_U = 1000 / MONO_VB[3]
const MONO_W = MONO_VB[2] * MONO_U                                                        // ≈ 816
const MONO_O = [(KIT.ring.center[0] - MONO_VB[0]) * MONO_U, (KIT.ring.center[1] - MONO_VB[1]) * MONO_U]   // centre du « o »

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
uniform sampler2D uMaskB;  // champ de distance signée du monogramme
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
uniform vec3 uInk;      // encre du thème (S du monogramme)
uniform float uEdgeFloor; // opacité au ras des bords latéraux de la piste (0 en clair : effacement complet)
uniform vec4 uMono;     // monogramme : largeur (unités), centre du « o » (unités), inutilisé
uniform sampler2D uFlow; // roue animée « flux » (texture 1D du kit, partagée avec le chargeur)

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
${IRIS_GLSL}
// couleur de la roue « flux » en p (relatif au centre, y vers le bas) : même convention d'angle que irisColor
vec3 flowColor(vec2 p) { float u = fract((degrees(atan(p.y, p.x)) + 90.0 - 180.0) / 360.0); return texture2D(uFlow, vec2(u, 0.5)).rgb; }

${GLASS_GLSL}
// trame en un point : un point par cellule, sa taille suit la lumière de l'image (couleur prémultipliée, alpha).
// off : décalage de la lecture de l'image seulement (la grille de points reste en place : réfraction sans traînées)
vec4 halftoneS(vec2 p, vec2 off) {
  float aa = 0.9 / uDpr;
  if (uHasMask > 0.5) {
    // accueil : le monogramme du kit en aplat (S à l'encre du thème, « o » : roue du kit)
    float upx = uMarkXf.z / 1000.0;                       // px par unité
    vec2 lp = (p - uMarkXf.xy) / upx + vec2(uMono.x * 0.5, 500.0);
    vec2 muv = lp / vec2(816.0, 1000.0);                  // champ de distance : 816 × 1000 px, 1 px par unité
    if (muv.x < 0.0 || muv.x > 1.0 || muv.y < 0.0 || muv.y > 1.0) return vec4(0.0);
    // champ de distance signée (monogram-sdf.png, en unités, positif dedans ; S en r, « o » en g) : le contour est
    // anticrénelé au pixel de l'écran, net à toutes les tailles (pas d'image du logo agrandie)
    vec4 dc = texture2D(uMaskB, muv);
    float sdS = dc.r * 32.0 - 4.0, sdO = dc.g * 32.0 - 4.0;
    bool isO = sdO > sdS;
    float sd = max(sdS, sdO);
    // le champ de distance s'arrête à −4 unités : au-delà (valeur plafonnée), on est franchement dehors, même quand le
    // logo est si petit que 4 unités font moins d'un demi-pixel (sinon tout son rectangle se teinterait)
    float cov = clamp(sd * upx * uDpr + 0.5, 0.0, 1.0) * step(-3.9, sd);
    if (cov < 0.001) return vec4(0.0);
    // aplat exact du kit (comme design/logo-kit/ref) : S à l'encre du thème, « o » : roue du kit ; bords nets, sans halo
    // roue du « o » : animation « flux » du kit (les couleurs respirent, rien ne tourne ; au repos : la roue finale)
    vec3 g = isO ? flowColor(lp - uMono.yz) : uInk;
    float shapeRev = isO ? 1.0 : smoothstep(0.0, 1.0, uReveal);
    float al = cov * shapeRev;
    return vec4(g * cov * shapeRev, al);
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
    vec2 muv = lc / vec2(uMono.x / 1000.0, 1.0) + 0.5;
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
    vec2 ol = (uMono.yz - vec2(uMono.x * 0.5, 500.0)) / 1000.0 * uMarkXf.z;
    vec2 oc = uMarkXf.xy + vec2(cs * ol.x - sn * ol.y, sn * ol.x + cs * ol.y);
    vec2 ep = c - oc;
    vec3 ic = irisColor(ep);
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

// lentille du curseur en un point q (couleur de fond base) : image d'origine, bord intérieur « verre liquide », anneau du kit
vec3 withLens(vec2 q, vec3 base) {
  float aa = 0.9 / uDpr;
  float R = uLens.z;
  vec3 col = base;
  if (R > 0.5) {
    vec2 lp = q - uLens.xy;
    float d = length(lp);
    if (d < uLensO + 2.0) {
      // seul effet de la lentille : au bord intérieur, sur une bande étroite contre l'anneau (derniers 20 % du rayon),
      // l'image est tirée vers le centre ; aucune déformation dans la zone centrale (pas de fisheye)
      float k = smoothstep(0.8, 1.0, d / R);
      float bend = 0.32 * k * k;
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
      // anneau fin (de R − 1 à uLensO), couleurs du kit ; bord anticrénelé sur un pixel d'écran exact (1 / dpr : pas de
      // dérivées dans cette branche, où elles ne sont pas fiables)
      float aw = 1.0 / uDpr;
      float ring = smoothstep(uLensO + aw * 0.5, uLensO - aw * 0.5, d) * smoothstep(R - 1.0 - aw * 0.5, R - 1.0 + aw * 0.5, d);
      col = mix(col, flowColor(lp), ring);
    }
  }
  return col;
}

void main() {
  vec2 p = (gl_FragCoord.xy - uOrigin) / uDpr;
  p.y = uRes.y - p.y;
  float aa = 0.9 / uDpr;

  // verre liquide : près des bords de l'écran (haut, bas) et de la piste (gauche, droite), l'image est aspirée vers
  // l'intérieur (on lit l'image plus loin du bord). Aux bords gauche et droit, la vignette perd aussi de la hauteur (passe verre).
  float EDGE = uScr.z < 769.0 ? 90.0 : 120.0;   // haut et bas de l'écran (mobile : × 0,75, comme les autres largeurs d'effet)
  vec2 sc = uScr.xy + p;
  float wT = 1.0 - smoothstep(0.0, EDGE, sc.y), wB = 1.0 - smoothstep(0.0, EDGE, uScr.w - sc.y);
  float wL = 0.0, wR = 0.0;
  if (uClip.z > 0.0) { wL = 1.0 - smoothstep(uClip.x, uClip.x + uClip.z, p.x); wR = smoothstep(uClip.y - uClip.z, uClip.y, p.x); }   // côtés : largeur uClip.z (120 px, 28 px sur mobile)
  vec2 suck = vec2(pow(wL, 2.0) - pow(wR, 2.0), pow(wT, 2.0) - pow(wB, 2.0)) * 60.0;   // aspiration des images vers l'intérieur

  // autour de l'anneau du curseur, la trame est légèrement écartée (perturbation des points)
  vec2 hp = p;
  if (uLens.z > 0.5) {
    vec2 lq = p - uLens.xy; float dl = length(lq);
    float g = exp(-max(dl - uLensO, 0.0) / (uLensO * 0.22)) * step(uLensO, dl);   // très forte sur la lisière, décroissance exponentielle
    hp = p - lq / max(dl, 1.0) * g * uCell * 1.6;
  }
  vec4 h = halftoneS(hp, suck);
  vec3 col = h.rgb; float a = h.a;
  col = withLens(p, col); if (uLens.z > 0.5 && length(p - uLens.xy) < uLensO + 1.0) a = 1.0;


  // bords latéraux fondus de la piste (vues sans verre ; sinon la passe « verre » s'en charge)
  if (uClip.z > 0.0 && uRadius < 0.5) { float f = (uEdgeFloor + (1.0 - uEdgeFloor) * pow(smoothstep(uClip.x, uClip.x + uClip.z, p.x) * (1.0 - smoothstep(uClip.y - uClip.z, uClip.y, p.x)), 0.6)); col *= f; a *= f; }
  gl_FragColor = vec4(col, a);
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
uniform vec3 uIrisMix;  // disposition propre à chaque vignette : décalage (tours), sens (±1), répétitions sur le tour
uniform float uVivid;   // 0 : couleurs telles quelles (sombre), 1 : plus franches (clair)
uniform float uEdgeFloor;
uniform vec4 uClip;
uniform vec2 uScrY;   // haut de la vignette à l'écran, hauteur de l'écran (px CSS)
${IRIS_GLSL}
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
  // aspiration aux bords, même principe des quatre côtés (décroissance exponentielle, forte au ras du bord seulement) :
  // - bords gauche et droit de la piste : la vignette perd de la hauteur (jusqu'à 8 % sur PC, 12 % sur mobile) ;
  // - haut et bas de l'écran : elle perd de la largeur, dans la même proportion et sur la même zone ;
  // contour de verre compris ; son contenu est comprimé d'autant (on lit plus loin de l'axe médian)
  float sqz = 1.0, sqx = 1.0;
  float scrY = uScrY.x + p.y;   // position du point à l'écran (px CSS, depuis le haut)
  if (uClip.z > 0.0) {
    float trackW = uClip.y - uClip.x;
    float zone = trackW < 769.0 ? 0.075 * trackW : min(110.0, 0.2 * trackW);   // portée : PC 110 px au plus ; mobile, zone étroite
    float k = trackW < 769.0 ? 0.12 : 0.08;
    float d = max(0.0, min(p.x - uClip.x, uClip.y - p.x));             // distance au bord le plus proche de la piste
    sqz = 1.0 - k * exp(-d / (0.28 * zone));
    float dy = max(0.0, min(scrY, uScrY.y - scrY));                     // distance au haut ou au bas de l'écran
    sqx = 1.0 - (k / 1.5) * exp(-dy / (0.28 * zone));   // haut et bas : force ÷ 1,5
    p.y = uRes.y * 0.5 + (p.y - uRes.y * 0.5) / sqz;
    p.x = uRes.x * 0.5 + (p.x - uRes.x * 0.5) / sqx;
  }
  float aa = 0.9 / (uDpr * min(sqz, sqx));
  float sd = sdCard(p);
  vec3 col = at(p);
  float W = (uClip.z > 0.0 && uClip.z < 25.0) ? 26.0 : 34.0;   // épaisseur du verre (mobile : × 0,75)
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
    // couleurs du bord mêlées : moyenne de trois lectures voisines sur la roue (passages plus fondus d'une teinte à l'autre)
    float ia = uIrisMix.y * (atan(cp.x, -cp.y) / 6.28318) * uIrisMix.z + uIrisMix.x + t * 0.6;
    vec3 ic = (irisAt(ia - 0.07) + irisAt(ia) * 2.0 + irisAt(ia + 0.07)) * 0.25;
    // fond clair : couleurs de la roue plus franches (écart à leur gris de même luminance accentué, jamais plus sombres)
    ic = clamp(mix(vec3(dot(ic, vec3(0.2126, 0.7152, 0.0722))), ic, 1.0 + 0.35 * uVivid), 0.0, 1.0);
    vec3 tint = mix(vec3(1.0), ic, uGlass);
    // la couleur n'est plus appliquée à l'image (sinon une image claire se colore sur toute l'épaisseur du verre) :
    // elle n'est portée que par la lumière du verre, d'une largeur fixe, identique sur image claire ou sombre
    // l'image sous le verre est aussi teintée, plus fort vers l'arête (décroissance rapide : reste fin sur image claire)
    // la couleur décroît de façon exponentielle depuis l'arête : très colorée au ras du bord, vite plus légère vers
    // l'intérieur (épaisseur de couleur fondue)
    float dEdge = max(0.0, -sd);
    float cx = exp(-dEdge / 7.0);
    g = g * mix(vec3(1.0), tint * 1.15, 0.95 * cx) + tint * 0.16 * cx * uGlass;
    float rim = exp(-abs(sd + 1.5) / 1.6);
    // entre-deux : une bande irisée de largeur fixe (≈ 9 px depuis l'arête), même sur image claire
    float band9 = exp(-dEdge / 4.0);   // bande irisée au ras de l'arête, décroissance exponentielle
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
  if (uClip.z > 0.0) a *= (uEdgeFloor + (1.0 - uEdgeFloor) * pow(smoothstep(uClip.x, uClip.x + uClip.z, p.x) * (1.0 - smoothstep(uClip.y - uClip.z, uClip.y, p.x)), 0.6));
  gl_FragColor = vec4(col * a, a);
}`

export function createGL(canvas, { reduced }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  if (!gl) return null
  gl.getExtension('OES_standard_derivatives')   // fwidth() pour les anneaux du kit (irisRing)
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, type === gl.FRAGMENT_SHADER ? DERIV + src : src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)
  const U = {}; for (const n of ['uTex', 'uMask', 'uRes', 'uOrigin', 'uImg', 'uDpr', 'uCell', 'uReveal', 'uFade', 'uHasMask', 'uFloor', 'uRadius', 'uLens', 'uLensO', 'uGlass', 'uEye', 'uMarkXf', 'uBg', 'uMaskB', 'uCanvas', 'uClip', 'uCardBg', 'uColor', 'uScr', 'uTime', 'uText', 'uHasText', 'uMono', 'uInk', 'uEdgeFloor', 'uFlow']) U[n] = gl.getUniformLocation(prog, n)
  gl.uniform1i(U.uTex, 0); gl.uniform1i(U.uMask, 1); gl.uniform1i(U.uText, 3); gl.uniform1i(U.uMaskB, 5)
  gl.uniform4f(U.uMono, MONO_W, MONO_O[0], MONO_O[1], 0)
  // texture du flux (unité 6) : 512 × 1, répétée en u, filtrage linéaire, ré-envoyée quand elle change
  const flowTex = gl.createTexture(); let flowVer = -1
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, flowTex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FLOW.size, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, FLOW.lut)
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
  gl.uniform1i(U.uFlow, 6)
  gl.activeTexture(gl.TEXTURE0)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.SCISSOR_TEST)

  // fond de page
  // couleurs du thème (--bg, --ink de src/theme.css), relues quand le mode change
  const themeRGB = () => {
    const cs = getComputedStyle(document.documentElement), x = document.createElement('canvas').getContext('2d')
    const rgb = (v) => { x.fillStyle = '#000'; x.fillStyle = v.trim(); const h = x.fillStyle; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) }
    return { bg: rgb(cs.getPropertyValue('--bg')), ink: rgb(cs.getPropertyValue('--ink')) }
  }
  let theme = themeRGB()
  const onTheme = () => { theme = themeRGB() }
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', onTheme)
  // passe « verre » et texture intermédiaire (contenu des vignettes)
  const gProg = gl.createProgram()
  gl.attachShader(gProg, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(gProg, sh(gl.FRAGMENT_SHADER, GLASS)); gl.bindAttribLocation(gProg, 0, 'a'); gl.linkProgram(gProg)
  if (!gl.getProgramParameter(gProg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(gProg))
  const GU = {}; for (const n of ['uFbo', 'uFboSize', 'uRes', 'uOrigin', 'uDpr', 'uRadius', 'uGlass', 'uBg', 'uClip', 'uIrisMix', 'uVivid', 'uEdgeFloor', 'uScrY']) GU[n] = gl.getUniformLocation(gProg, n)
  const fbo = gl.createFramebuffer(), fboTex = gl.createTexture()
  let fboW = 0, fboH = 0
  function ensureFbo(w, h) {
    if (w <= fboW && h <= fboH) return
    fboW = Math.max(w, fboW); fboH = Math.max(h, fboH)
    gl.activeTexture(gl.TEXTURE2)   // unité réservée à la texture intermédiaire (lue seulement par la passe « verre »)
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
  // au doigt : tant qu'on appuie sur une vignette (toucher, appui long), elle passe en couleur comme au survol ;
  // un défilement ou un glissement (pointercancel) l'arrête
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { move(e.clientX, e.clientY, true); ptr.down = true } }, { passive: true })
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, (e) => { if (e.pointerType === 'touch') ptr.down = false }, { passive: true })
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY, true) }, { passive: true })
  addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY, true) }, { passive: true })
  document.documentElement.addEventListener('pointerleave', () => { ptr.t = -1e9 })

  // écran tactile : défilement natif du téléphone (en avance d'une image sur le dessin). Les vignettes n'y sont pas
  // dessinées sur la toile fixe (elles traîneraient d'une image derrière la page) mais copiées dans leur propre image,
  // dans la page ; le logo de l'accueil, fixe pendant sa scène, reste sur la toile
  const detached = matchMedia('(hover: none) and (pointer: coarse)').matches
  let order = null
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
  // champ de distance signée du monogramme (brand/tools/sdf.mjs), chargé une fois
  function maskFor(v) {
    if (v.maskB !== undefined) return v.maskReady
    v.maskB = null
    const im = new Image()
    v.maskReady = new Promise((done) => { im.onload = im.onerror = done })
    im.addEventListener('load', () => {
      const t = newTex()
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
      upload(t, im)
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL)
      v.maskB = t
    })
    im.src = new URL('monogram-sdf.png', document.querySelector('.brand__mark').src).href
    return v.maskReady
  }
  /** Placement du monogramme. Arrivée (ms depuis la fin du chargeur) : le « o » prend exactement la place de l'anneau
   *  du chargeur (rayon handoffR, centre de la fenêtre), à la vitesse où celui-ci grandissait, et continue de grandir sur
   *  place en ralentissant ; puis, seulement quand le S apparaît, le monogramme glisse jusqu'à sa position.
   *  Ensuite le défilement p le ramène à sa place dans la composition (au-dessus du nom). Renvoie aussi l'apparition du S. */
  const O_OFF = [(MONO_O[0] - MONO_W / 2) / 1000, (MONO_O[1] - 500) / 1000], O_R = KIT.ring.outerRadius * MONO_U / 1000
  const GROW = IRIS.intro.grow, SHIFT = IRIS.intro.shift
  const bigOf = (w, h) => Math.min(h * 0.46, w * (w < 760 ? 0.5 : 0.6) * 1000 / 816)   // taille du logo au début de l'accueil
  const handoffR = (w, h) => Math.min(44, bigOf(w, h) * O_R * 0.62)   // rayon du « o » au relais avec le chargeur (px)
  function markXf(w, h, p, ms, slot, oc, dock) {
    const k = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a))), e = (x) => 1 - Math.pow(1 - x, 3)
    const io = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(2 - 2 * x, 3) / 2)
    const small = w < 760
    const big = bigOf(w, h)
    // fin : à sa place dans la composition de l'accueil (.hero__slot, au-dessus du nom et de la présentation)
    const q = e(k(0, 0.45))
    let size = big + (slot.h - big) * q
    let cx = w / 2 + (slot.x - w / 2) * q, cy = h / 2 + (slot.y - h / 2) * q
    // après la scène de l'accueil : en continuant de défiler, le logo rapetisse et rejoint le petit logo de la barre
    // (dock : sa place, dans le repère de la vue, et l'avancée m de 0 à 1)
    if (dock && dock.m > 0) {
      const d = io(dock.m)
      cx += (dock.x - cx) * d; cy += (dock.y - cy) * d; size += (dock.h - size) * d
    }
    if (ms >= GROW + SHIFT) return [cx, cy, size, 0, 1]
    // croissance : décélération seule (le chargeur arrive en accélérant à la même vitesse : aucun arrêt au relais)
    const gx = Math.min(1, Math.max(0, ms / GROW)), g = 1 - Math.pow(1 - gx, 3), c = io((ms - GROW) / SHIFT)
    const s0 = handoffR(w, h) / O_R, sz = s0 + (size - s0) * g
    const ox = oc[0] - O_OFF[0] * sz, oy = oc[1] - O_OFF[1] * sz   // monogramme placé pour que son « o » soit centré en oc
    return [ox + (cx - ox) * c, oy + (cy - oy) * c, sz, 0, c]
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

  let W = 0, H = 0, dpr = 1, cellScale = 1, lastSY = 0, scrollT = -1e9, docked = false
  const brandMark = document.querySelector('.topbar .brand')
  function resize() {
    W = innerWidth; H = canvas.clientHeight || innerHeight   // toile en 100lvh (CSS) : jamais plus courte que l'écran
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
    // roue « flux » : nouvelle texture calculée pour cette image (flow.js) → envoyée au GPU
    // (rattachée à l'unité 6 à chaque image, puis l'unité 0 redevient active : une texture créée ensuite ne doit pas
    // prendre la place de celle du flux)
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, flowTex)
    if (FLOW.version !== flowVer) { flowVer = FLOW.version; gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, FLOW.size, 1, gl.RGBA, gl.UNSIGNED_BYTE, FLOW.lut) }
    gl.activeTexture(gl.TEXTURE0)
    let flowNeeded = lens.s > 0.01
    if (document.documentElement.classList.contains('fiche-open')) {
      // fiche projet ouverte : le curseur reste toujours visible
      if (lens.hidden) { document.documentElement.classList.remove('lens-on'); lens.hidden = false }
      lens.s = 0
      FLOW.glNeeds = false
      return
    }
    // la lentille : visible quand le pointeur est sur une carte (pas sur l'accueil)
    const small = W < 600
    const Ro = small ? 60 : 74, Ri = Ro - (small ? 9 : 12)   // anneau fin de la lentille (largeur d'origine, couleurs du kit)
    let over = null
    for (const v of views) {
      if (v.mark || !v.ready) continue
      const b = v.el.getBoundingClientRect(), cr = v.clip?.getBoundingClientRect()
      if (ptr.x >= b.left && ptr.x <= b.right && ptr.y >= b.top && ptr.y <= b.bottom && (!cr || (ptr.x > cr.left && ptr.x < cr.right))) { over = v; break }
    }
    // sur un bouton ou un lien d'interface (flèches de la piste, barre du haut…) : pas de lentille, le curseur reste visible
    const onCtl = !!over && !!document.elementFromPoint(ptr.x, ptr.y)?.closest('button, .btn, .work__nav, .topbar, [role="button"]')
    if (over) lens.view = over
    // pendant le défilement (et 200 ms après), pas de survol : les vignettes qui passent sous un curseur immobile ne
    // s'allument pas l'une après l'autre (clignotement)
    // (seul un vrai mouvement compte : la fin du défilement doux, au sous-pixel, ne bloque plus la lentille) ;
    // si la souris bouge, la lentille apparaît tout de suite, même pendant le défilement
    if (Math.abs(scrollY - lastSY) > 1) scrollT = now
    lastSY = scrollY
    const still = now - scrollT > 120 || now - ptr.t < 300
    const show = !!over && !onCtl && (still || lens.s > 0.5) && !ptr.touch   /* au doigt : pas de « o » (pas de curseur à remplacer) */ && !document.documentElement.classList.contains('fiche-open')
    if (!lens.init || (lens.s < 0.02 && show)) { lens.x = ptr.x; lens.y = ptr.y; lens.init = true }
    if (reduced) { lens.x = ptr.x; lens.y = ptr.y; lens.s = show ? 1 : 0 }
    else { lens.x = follow(lens.x, ptr.x, 0.035, dt); lens.y = follow(lens.y, ptr.y, 0.035, dt); lens.s = follow(lens.s, show ? 1 : 0, 0.09, dt) }
    const sc = lens.s < 0.005 ? 0 : 1 - Math.pow(1 - lens.s, 2)
    // le « o » remplace le curseur : flèche masquée partout tant que le « o » est affiché (souris uniquement)
    const hide = sc > 0.02 && hoverDevice && !ptr.touch && !onCtl   // tant que le « o » est visible, sauf sur un bouton
    if (hide !== lens.hidden) { document.documentElement.classList.toggle('lens-on', hide); lens.hidden = hide }

    order ??= detached ? [...views.filter((v) => !v.mark), ...views.filter((v) => v.mark)] : views   // tactile : vignettes d'abord, logo ensuite
    for (const v of order) {
      const b = v.el.getBoundingClientRect()
      if (!v.ready || b.bottom < 0 || b.top > H || b.right < 0 || b.left > W || b.width < 2) continue
      const cr = v.clip?.getBoundingClientRect()
      if (cr && (b.right < cr.left || b.left > cr.right)) continue
      if (v.video && !v.video.paused && v.video.readyState >= 2) upload(v.tex, v.video)
      if (!v.seen) { if (!document.documentElement.classList.contains('is-loaded')) continue; v.seen = now }
      const w = b.width, h = b.height
      // apparition : les points poussent, puis rétrécissent quand la vue sort de l'écran
      const intro = reduced ? 1 : Math.min(1, (now - v.seen) / 1600)
      const vis = Math.min(1, Math.max(0, Math.min(H - b.top, b.bottom) / (H * 0.6)))
      const reveal = 1   // vignettes : trame toujours complète (plus d'apparition ni de disparition en noir)
      if (v.mark) { maskFor(v); if (!v.maskB) continue; flowNeeded = true }
      const hov = !v.mark && ((hoverDevice && still) || (ptr.touch && ptr.down)) && ptr.x >= b.left && ptr.x <= b.right && ptr.y >= b.top && ptr.y <= b.bottom && (!cr || (ptr.x > cr.left && ptr.x < cr.right))
      v.glass = reduced ? (hov ? 1 : 0) : follow(v.glass, hov ? 1 : 0, hov ? 0.16 : 0.12, dt)

      const pw = Math.round(w * dpr), ph = Math.round(h * dpr)
      const glassy = v.radius > 0
      const own = detached && !v.mark   // vignette dessinée dans sa propre image (écran tactile), voir plus bas
      let x0 = own ? 0 : Math.round(b.left * dpr), y0 = own ? 0 : Math.round((H - b.bottom) * dpr)
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
      gl.uniform1f(U.uEdgeFloor, theme.bg[0] + theme.bg[1] + theme.bg[2] > 1.5 ? 1 : 0.12)   // clair : pas d'effacement (flou CSS aux bords)
      gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uCell, v.mark ? 6 : v.cell * (W >= 769 ? 1 / 1.15 : 1) * Math.min(1, Math.max(0.45, W / 1100)) * cellScale   /* PC : un cran plus fin (÷ 1,15) ; trame proportionnelle à la largeur d'écran (mobile : 0,45) */)
      gl.uniform1f(U.uReveal, reveal); gl.uniform1f(U.uFade, v.fade ? 1 : 0); gl.uniform1f(U.uHasMask, v.mark ? 1 : 0)
      gl.uniform1f(U.uFloor, v.mark ? 0.6 : 0); gl.uniform1f(U.uRadius, glassy ? 1 : 0)
      // texte de la vignette (unité 3) ; sans texte, l'unité est vidée : elle ne doit jamais désigner la texture dans
      // laquelle on dessine (sinon la passe est refusée : « feedback loop »)
      if (v.text) textFor(v, w, h)
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, v.text ? v.textTex : null)
      gl.uniform1f(U.uHasText, v.text ? 1 : 0)
      gl.uniform1f(U.uColor, v.color ? 1 : v.glass)   // au survol : la trame passe en couleur (fondu)
      gl.uniform4f(U.uScr, b.left, b.top, W, H); gl.uniform1f(U.uTime, reduced ? 0 : time)
      gl.uniform1f(U.uCardBg, 0)
      if (cr) gl.uniform4f(U.uClip, cr.left - b.left, cr.right - b.left, W < 769 ? 21 : 120, 0)
      else gl.uniform4f(U.uClip, 0, 0, 0, 0)
      // intérieur de la lentille : l'image d'origine de cette vue (l'anneau est dessiné après, par-dessus tout)
      gl.uniform3f(U.uLens, lens.x - b.left, lens.y - b.top, v !== lens.view ? 0 : (Ri + 1) * sc); gl.uniform1f(U.uLensO, Ro * sc); gl.uniform1f(U.uGlass, v.glass)
      if (v.mark) {
        const hero = v.el.closest('.hero'), hr = hero.getBoundingClientRect(), sr = hero.querySelector('.hero__slot').getBoundingClientRect()
        const p = Math.min(1, Math.max(0, -hr.top / Math.max(1, hr.height - H)))
        const slot = { x: sr.left - b.left + sr.width / 2, y: sr.top - b.top + sr.height / 2, h: sr.height }
        // animations réduites : pas de scène de défilement, le logo est d'emblée à sa place (au-dessus du nom)
        // place du petit logo de la barre ; le logo y arrive quand la vue a remonté de (hauteur du logo posé − barre)
        const br = brandMark?.getBoundingClientRect()
        let dock = null
        if (br?.height) {
          const by = br.top + br.height / 2, m = Math.min(1, Math.max(0, -b.top / Math.max(1, slot.y - by)))
          dock = { x: br.left + br.width / 2 - b.left, y: by - b.top, h: br.height, m }
          // arrivé : le petit logo de la barre (identique) prend le relais
          // pas avant la fin de l'animation d'accueil (le petit logo et la barre n'existent pas encore)
          if (document.documentElement.classList.contains('intro-done') && (m >= 1) !== docked) { docked = m >= 1; document.documentElement.classList.toggle('brand-on', docked); if (docked) document.documentElement.classList.add('bar-on') }
        }
        const xf = markXf(w, h, reduced ? 1 : p, reduced ? 1e9 : now - v.seen, slot, [innerWidth / 2 - b.left, innerHeight / 2 - b.top], dock)
        gl.uniform3f(U.uInk, ...theme.ink)
        gl.uniform4f(U.uMarkXf, xf[0], xf[1], xf[2], xf[3]); gl.uniform1f(U.uReveal, xf[4])   // le S apparaît pendant le glissement
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (glassy) {
        // passe 2 : le bord de verre, qui réfracte ce contenu, sur la toile
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(sx, sy, pw, ph); gl.scissor(Math.max(0, sx), Math.max(0, sy), pw, ph)
        gl.useProgram(gProg)
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fboTex)
        gl.uniform1i(GU.uFbo, 2); gl.uniform2f(GU.uFboSize, fboW, fboH)
        gl.uniform2f(GU.uRes, w, h); gl.uniform2f(GU.uOrigin, sx, sy); gl.uniform1f(GU.uDpr, dpr)
        // irisé du verre : une seule intensité (pas de changement au survol) ; plus présent sur fond clair
        const light = theme.bg[0] + theme.bg[1] + theme.bg[2] > 1.5
        gl.uniform1f(GU.uRadius, v.radius); gl.uniform1f(GU.uGlass, v.glass * (light ? 0.95 : 0.6));   // bord neutre au repos, irisé au survol
        gl.uniform1f(GU.uVivid, light ? 1 : 0); gl.uniform1f(GU.uEdgeFloor, light ? 1 : 0.12)
        v.irisMix ??= [Math.random(), Math.random() < 0.5 ? -1 : 1, 4 + Math.floor(Math.random() * 4)]   // tirée une fois par vignette
        gl.uniform3f(GU.uIrisMix, ...v.irisMix)
        gl.uniform2f(GU.uScrY, b.top, H)
        if (cr) gl.uniform4f(GU.uClip, cr.left - b.left, cr.right - b.left, W < 769 ? 21 : 120, 0)
        else gl.uniform4f(GU.uClip, 0, 0, 0, 0)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      if (own) {
        // écran tactile : la vignette, dessinée dans le coin de la toile, est copiée dans sa propre image, placée dans la
        // page : elle défile avec la page (défilement natif du téléphone), sans aucun décalage ; le coin est ensuite effacé
        if (!v.cv) { v.cv = Object.assign(document.createElement('canvas'), { className: 'gl-card' }); v.cv.setAttribute('aria-hidden', 'true'); v.el.append(v.cv); v.cx = v.cv.getContext('2d') }
        if (v.cv.width !== pw || v.cv.height !== ph) { v.cv.width = pw; v.cv.height = ph } else v.cx.clearRect(0, 0, pw, ph)
        v.cx.drawImage(canvas, 0, canvas.height - ph, pw, ph, 0, 0, pw, ph)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.scissor(0, 0, pw, ph); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      }
    }
    FLOW.glNeeds = flowNeeded   // ni logo ni lentille à l'écran : le flux se met en pause
  }
  document.documentElement.classList.add('has-gl')
  // le logo de l'accueil est prêt (champ de distance chargé dès le départ) : le chargeur attend ce moment, sans quoi le
  // logo manquerait quelques images juste après lui
  const ready = Promise.all(views.filter((v) => v.mark).map(maskFor))
  // pour le chargeur : rayon du « o » au relais, rayon visé par la croissance, durée de la croissance
  const intro = () => ({ r0: handoffR(innerWidth, innerHeight), r1: bigOf(innerWidth, innerHeight) * O_R, grow: GROW })
  // taille des points de la trame des vignettes (flèches gauche / droite du clavier)
  const setCellScale = (f) => { cellScale = Math.min(2.5, Math.max(0.5, cellScale * f)) }
  return { frame, ready, intro, setCellScale }
}
