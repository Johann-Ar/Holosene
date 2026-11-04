/**
 * Grain des flous CSS : la même texture que le grain du bord des vignettes (WebGL), posée sur les bandes de flou
 * (bas de l'écran, côtés des pistes) ; la barre du haut et son fondu restent sans grain. Aucune colorisation.
 * Côtés des pistes : deux bandes réelles par piste, dont le fondu vertical est le complément exact de celui des bandes
 * haut et bas (dans les coins, un seul flou continu).
 */
export function startFxCss() {
  const pins = [...document.querySelectorAll('.work__pin')]
  for (const pin of pins) for (const side of ['l', 'r']) { const s = document.createElement('div'); s.className = `side side--${side}`; s.setAttribute('aria-hidden', 'true'); pin.append(s) }
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
