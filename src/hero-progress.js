/* Avancée de la scène d'accueil (0 à 1), partagée par main.js (nom, présentation) et gl.js (logo).
   Ordinateur : elle suit exactement le défilement. Écran tactile : un lancer de doigt traverse la scène en une fraction de
   seconde ; l'avancée montrée rattrape donc le défilement à vitesse limitée (scène entière en 1,8 s au plus vite), pour
   que le nom, la présentation et le logo aient toujours le temps de s'animer, dans les deux sens. */
const touch = !matchMedia('(hover: hover)').matches
const MAX_SPEED = 1 / 1.8   // avancée par seconde
const K = 7                 // rattrapage (1/s) : départ et arrivée en douceur

export const HERO = { p: 0, raw: 0 }
let last = 0
export function updateHero(t, hero) {
  const dt = last ? Math.min(0.1, (t - last) / 1000) : 0
  last = t
  if (!hero) { HERO.p = HERO.raw = 1; return }
  const r = hero.getBoundingClientRect(), H = innerHeight
  const raw = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - H)))
  HERO.raw = raw
  // scène hors de l'écran (retour sur Contact, saut d'ancre) ou ordinateur : pas de rattrapage
  if (!touch || r.bottom <= 0 || !document.documentElement.classList.contains('intro-done')) { HERO.p = raw; return }
  const d = raw - HERO.p
  if (Math.abs(d) < 1e-4) { HERO.p = raw; return }
  const step = Math.sign(d) * Math.min(Math.abs(d) * K * dt, MAX_SPEED * dt, Math.abs(d))
  HERO.p += step
}
