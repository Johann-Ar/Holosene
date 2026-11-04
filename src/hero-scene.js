/**
 * Scène de l'accueil : son avancée p (0 à 1) anime le logo (vers sa place au-dessus du nom), le tracé du nom, la
 * présentation, puis le départ du logo vers la barre du haut.
 * À la fin de l'animation d'apparition du logo (intro-done), la première partie (jusqu'à 0,72 : nom tracé, présentation
 * allumée) se joue toute seule en DUR ms ; le défilement ne gère plus que la suite (0,72 → 1). Partagé par main.js et
 * gl.js pour que le texte et le logo WebGL restent exactement synchrones.
 */
export const AUTO = 0.72
const DUR = 1800
let t0 = null
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
export const startHeroScene = (instant = false) => { if (t0 === null) t0 = performance.now() - (instant ? DUR : 0) }
/** raw : avancée due au défilement dans la scène épinglée (0 à 1) */
export function heroP(raw) {
  const a = t0 === null ? 0 : AUTO * ease(Math.min(1, (performance.now() - t0) / DUR))
  return a + (1 - a) * raw
}
