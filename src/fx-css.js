/**
 * Grain des flous CSS : la même texture que le grain du bord des vignettes (WebGL), posée sur toutes les bandes de flou
 * (haut et bas de l'écran, barre du menu, côtés des pistes, barre des fiches). Aucune colorisation.
 * Côtés des pistes : deux bandes réelles par piste, dont le fondu vertical est le complément exact de celui des bandes
 * haut et bas (dans les coins, un seul flou continu).
 */
export function startFxCss() {
  const pins = [...document.querySelectorAll('.work__pin')]
  for (const pin of pins) for (const side of ['l', 'r']) { const s = document.createElement('div'); s.className = `side side--${side}`; s.setAttribute('aria-hidden', 'true'); pin.append(s) }
  for (const h of document.querySelectorAll('.edge, .topbar__glass, .side')) { const f = document.createElement('span'); f.className = 'fx'; f.setAttribute('aria-hidden', 'true'); h.append(f) }
  function tick() {
    requestAnimationFrame(tick)
    for (const pin of pins) {
      const top = Math.round(pin.getBoundingClientRect().top)
      if (pin._pt !== top) { pin._pt = top; pin.style.setProperty('--pt', `${top}px`) }
      if (pin._vh !== innerHeight) { pin._vh = innerHeight; pin.style.setProperty('--vh', `${innerHeight}px`) }
    }
  }
  requestAnimationFrame(tick)
}
