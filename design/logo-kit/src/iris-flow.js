// iris-flow.js — Animation « flux » de la roue du « o » (logo S·o, roue v2).
// Principe : la roue ne TOURNE PAS. Chaque couleur garde sa place et son ordre,
// mais sa largeur (sa part de l'anneau) respire : certaines zones grossissent,
// poussent leurs voisines, puis dégrossissent. Des vagues parcourent l'anneau
// dans les DEUX sens. La surface totale est conservée (somme des largeurs constante)
// et le rose reste ancré en haut (petite dérive de ±6° max) : jamais de rotation globale.
// Au repos (amount = 0) le rendu est EXACTEMENT la roue finale du kit (IRIS_STOPS).

import { IRIS_KEYS, IRIS_FROM_DEG } from './iris.js';

// ---------- OKLab (interpolation perceptuelle, pas de creux gris entre deux teintes)
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
function hexToLab(h) {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function labToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}
const KEYS = IRIS_KEYS.map(([name, hex, pos]) => ({ name, hex, pos, lab: hexToLab(hex) }));
const N = KEYS.length;
const ANCHOR = KEYS.findIndex((k) => k.name === 'rose'); // reste en haut

// ---------- Réglages (plages conseillées en commentaire, ne pas sortir des plages)
export const IRIS_FLOW = {
  idle: {      // logo de l'accueil, animation passive
    amount: 1,
    breath: 0.32,      // respiration propre à chaque couleur          [0.15 – 0.45]
    breathPeriod: 11,  // s, période moyenne                            [8 – 16]
    waves: 0.55,       // amplitude des vagues qui parcourent l'anneau  [0.3 – 0.8]
    waveSpeed: 0.045,  // tours/s (vague horaire ; l'autre va en sens inverse, plus lente) [0.02 – 0.07]
    waveWidth: 1.6,    // largeur d'une vague, en nombre de couleurs   [1.2 – 2.5]
    wMin: 0.45, wMax: 2.4, // largeur mini / maxi d'une couleur (1 = part égale) — chaque couleur reste visible
    wander: 6,         // degrés : dérive max du rose autour du haut   [0 – 8]
  },
  loading: {   // loader : plus vif, vagues qui « chargent »
    amount: 1,
    breath: 0.25, breathPeriod: 5,
    waves: 1.1, waveSpeed: 0.16, waveWidth: 1.3,
    wMin: 0.35, wMax: 3.2, wander: 4,
  },
};

// bruit lisse déterministe (somme de sinus à fréquences incommensurables → jamais de boucle visible)
const PHI = 1.6180339887;
const smoothNoise = (t, seed) =>
  (Math.sin(t * 1.0 + seed * 2.1) * 0.5 + Math.sin(t * PHI + seed * 4.7) * 0.3 + Math.sin(t * 2.618 + seed * 1.3) * 0.2);
const ringDist = (a, b) => { let d = Math.abs(a - b) % N; return Math.min(d, N - d); };

/** Largeurs des 10 couleurs à l'instant t (secondes). Somme = N. */
export function irisWeights(t, cfg = IRIS_FLOW.idle) {
  const k = cfg.amount ?? 1;
  const w = new Array(N);
  // deux vagues en sens opposés + une troisième « respiration » lente qui change de sens
  const c1 = (t * cfg.waveSpeed * N) % N;                         // horaire
  const c2 = (N - ((t * cfg.waveSpeed * 0.62 * N) % N) + 3.3) % N; // anti-horaire, plus lente
  const c3 = (N / 2) * (1 + Math.sin(t * cfg.waveSpeed * 2.3)) ;  // va-et-vient
  for (let i = 0; i < N; i++) {
    const br = smoothNoise((t * 2 * Math.PI) / cfg.breathPeriod, i * 1.37);
    const g = (c) => Math.exp(-((ringDist(i, c) / cfg.waveWidth) ** 2));
    const wave = 1.0 * g(c1) + 0.75 * g(c2) + 0.5 * g(c3);
    let x = 1 + k * (cfg.breath * br + cfg.waves * (wave - 0.55));
    w[i] = Math.min(cfg.wMax, Math.max(cfg.wMin, x));
  }
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => (x * N) / s); // conservation de la surface totale
}

/** Positions (0..1, sens du conic) du centre de chaque couleur. Rose ancré en haut (0.5). */
export function irisPositions(weights, t = 0, cfg = IRIS_FLOW.idle) {
  let acc = 0;
  const c = weights.map((x) => { const q = (acc + x / 2) / N; acc += x; return q; });
  const wanderTurns = ((cfg.wander ?? 0) / 360) * Math.sin(t * 0.21) * (cfg.amount ?? 1);
  const off = 0.5 - c[ANCHOR] + wanderTurns;
  return c.map((q) => (((q + off) % 1) + 1) % 1);
}

/** Stops [[pos, '#hex'], ...] pour CSS (6 sous-stops OKLab par segment, bouclés). */
export function irisFlowStops(t, cfg = IRIS_FLOW.idle) {
  const pos = irisPositions(irisWeights(t, cfg), t, cfg);
  const pts = KEYS.map((k, i) => ({ p: pos[i], lab: k.lab })).sort((a, b) => a.p - b.p);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    let span = b.p - a.p; if (span <= 0) span += 1;
    for (let s = 0; s < 6; s++) { const f = s / 6; out.push([(a.p + span * f) % 1, a.lab.map((v, j) => v + (b.lab[j] - v) * f)]); }
  }
  out.sort((x, y) => x[0] - y[0]);
  const [fp, fl] = out[0], [lp, ll] = out[out.length - 1];
  const tt = (1 - lp) / (1 - lp + fp), edge = ll.map((v, j) => v + (fl[j] - v) * tt);
  const hex = (lab) => '#' + labToRgb(lab).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  return [[0, hex(edge)], ...out.map(([p, l]) => [p, hex(l)]), [1, hex(edge)]];
}

export const irisFlowCss = (t, cfg) =>
  `conic-gradient(from ${IRIS_FROM_DEG}deg, ${irisFlowStops(t, cfg).map(([p, c]) => `${c} ${(p * 360).toFixed(2)}deg`).join(', ')})`;

/** Texture 1D RGBA (u = position sur la roue, même convention que IRIS_STOPS) à ré-uploader chaque frame. */
export function irisFlowLUT(t, cfg = IRIS_FLOW.idle, size = 512, out = new Uint8Array(size * 4)) {
  const st = irisFlowStops(t, cfg).map(([p, h]) => [p, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))]);
  let j = 0;
  for (let i = 0; i < size; i++) {
    const u = i / size;
    while (j < st.length - 2 && st[j + 1][0] < u) j++;
    const [p0, c0] = st[j], [p1, c1] = st[j + 1], f = p1 > p0 ? (u - p0) / (p1 - p0) : 0;
    out.set([c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f, 255], i * 4);
  }
  return out;
}

/** Mélange idle ↔ loading (0 = idle, 1 = loading) pour les transitions. */
export function irisFlowMix(m) {
  const a = IRIS_FLOW.idle, b = IRIS_FLOW.loading, o = {};
  for (const k of Object.keys(a)) o[k] = a[k] + (b[k] - a[k]) * m;
  return o;
}
