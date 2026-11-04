/**
 * Réglages du logo, du chargeur et de la roue Iris, réunis ici (le panneau ?debug=iris les modifie en direct, en
 * développement seulement). La roue, ses couleurs et les proportions de l'anneau viennent du logo-kit (design/logo-kit) :
 * rien ici ne les redéfinit. Aucun effet de matière sur l'anneau (ni verre, ni relief, ni reflet).
 */
export const IRIS = {
  o: {
    turnSeconds: 32,   // rotation passive de la roue du « o » : un tour en N secondes (24 à 40)
    rampMs: 4000,      // démarrage progressif de la rotation après l'arrivée du logo (2000 à 6000 ms)
  },
  intro: {
    grow: 850,         // croissance du « o » après le relais du chargeur (600 à 1200 ms)
    shift: 850,        // glissement du monogramme pendant l'apparition du S (600 à 1200 ms)
  },
  loader: {
    track: 0.07,       // piste : anneau complet à l'encre, opacité (0,06 à 0,08)
    minMs: 900,        // durée minimale du chargeur (évite le flash) (600 à 1500 ms)
    stall: 0.9,        // si le chargement cale, l'arc avance lentement vers cette valeur sans l'atteindre (0,8 à 0,95)
    stallMs: 6000,     // temps caractéristique de cette avancée lente (3000 à 10000 ms)
    spring: 0.18,      // ressort à amortissement critique de la progression affichée : temps de réponse (0,1 à 0,4 s)
    closeMs: 350,      // fermeture : la queue redevient opaque (250 à 500 ms)
  },
}
