/**
 * Réglages du logo, du chargeur et de la roue Iris, réunis ici (le panneau ?debug=iris les modifie en direct, en
 * développement seulement). La roue, ses couleurs et les proportions de l'anneau viennent du logo-kit (design/logo-kit) :
 * rien ici ne les redéfinit. Aucun effet de matière sur l'anneau (ni verre, ni relief, ni reflet). L'animation de la roue
 * (« flux ») a ses propres réglages dans le kit : IRIS_FLOW (design/logo-kit/src/iris-flow.js).
 */
export const IRIS = {
  intro: {
    grow: 850,         // croissance du « o » après le relais du chargeur (600 à 1200 ms)
    shift: 850,        // glissement du monogramme pendant l'apparition du S (600 à 1200 ms)
  },
}
