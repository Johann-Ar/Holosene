import 'virtual:iris.css'
import './styles.css'
import './logotype-animations.css'
import { FLOW, updateFlow } from './flow.js'
import Lenis from 'lenis'
import { createGL, loaderRadius } from './gl.js'
import { createBackdrop } from './backdrop.js'
import { IRIS } from './iris-config.js'
import { startFxCss } from './fx-css.js'
import { swapLanguage } from './lang-swap.js'
import { createLoader } from './loader.js'

const root = document.documentElement
root.classList.add('js')
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch {} },
}

/* Mode développement (?dev, ?dev=0) : affiche les textes « à compléter ». */
const q = new URLSearchParams(location.search).get('dev')
if (q !== null) store.set('dev', q === '0' ? null : '1')
root.classList.toggle('is-dev', import.meta.env.DEV || store.get('dev') === '1')

/* Langue : le choix du visiteur est mémorisé (localStorage pour le script de <head>, cookie pour le serveur, voir
   vercel.json) ; la redirection d'un navigateur non francophone vers /en/ se fait avant tout chargement (vite.config.js). */
const langLink = document.querySelector('.topbar .lang')
langLink?.addEventListener('click', () => {
  const l = langLink.getAttribute('hreflang')
  store.set('lang', l)
  document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`
})

/* Réglages Iris en direct (?debug=iris) : en développement seulement, absent du site publié */
if (import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === 'iris') import('./iris-debug.js').then((m) => m.mountIrisDebug())

/* Petit logo de la barre du haut : visible seulement quand le gros logo de l'accueil n'est plus à l'écran */
const heroSlot = document.querySelector('.hero__slot')
if (!heroSlot) root.classList.add('brand-on', 'bar-on')
// avec WebGL, c'est gl.js qui l'affiche, quand le gros logo l'a rejoint ; sans WebGL : dès que le gros logo est sorti
else new IntersectionObserver(([e]) => { if (!root.classList.contains('has-gl') && root.classList.contains('intro-done')) { root.classList.toggle('brand-on', !e.isIntersecting); if (!e.isIntersecting) root.classList.add('bar-on') } }).observe(heroSlot)

/* Thème. Accueil en clair par défaut ; le bouton de la barre du haut l'inverse. Les fiches projet suivent toujours le
   mode de l'accueil. */
const applyThemeColor = () => { const f = document.querySelector('.fiche.is-open'); const bg = getComputedStyle(f || root).getPropertyValue('--bg').trim(); document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg)) }
const themeOf = () => root.dataset.theme || 'light'   // accueil et fiches : un seul mode
const themeWord = () => (root.lang === 'en' ? { dark: 'Dark', light: 'Light' } : { dark: 'Sombre', light: 'Clair' })
const labelThemes = () => document.querySelectorAll('.theme-toggle').forEach((b) => {
  const next = themeOf(b) === 'light' ? 'dark' : 'light'
  b.setAttribute('aria-label', b.dataset[next]); const t = b.querySelector('.theme-toggle__t'); if (t) t.textContent = themeWord()[next]
})
document.addEventListener('click', (e) => {
  const b = e.target.closest('.theme-toggle')
  if (!b) return
  const next = themeOf(b) === 'light' ? 'dark' : 'light'
  root.dataset.theme = next; root.classList.add('theme-chosen')   // pour cette visite seulement : au chargement suivant, accueil clair et fiches sombres
  labelThemes(); applyThemeColor()
})
labelThemes(); applyThemeColor()

/* Aspiration des images aux bords de l'écran (WebGL), sauf si l'utilisateur réduit les animations. */
if (!reduced) root.classList.add('liquid')

/* Contact : copier l'adresse. */
document.querySelectorAll('.copy').forEach((b) => {
  const label = b.textContent
  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy)
      b.textContent = b.dataset.done
    } catch {
      const r = document.createRange(); r.selectNodeContents(document.querySelector('.mail'))
      getSelection().removeAllRanges(); getSelection().addRange(r)
    }
    setTimeout(() => (b.textContent = label), 2000)
  })
})

/* Défilement doux (désactivé si l'utilisateur réduit les animations) ; une seule boucle d'affichage pour le
   défilement et le WebGL, pour que la trame reste collée au texte. */
// au doigt : défilement natif (les vignettes ont alors leur propre image dans la page, gl.js : elles ne traînent pas) ;
// un geste qui commence à l'horizontale appartient aux pistes : il ne fait pas défiler la page.
let touchAxis = null
addEventListener('touchstart', () => { touchAxis = null }, { passive: true, capture: true })
const lenis = reduced ? null : new Lenis({ lerp: 0.1, overscroll: false,   // aux extrémités de la page : aucun défilement natif ni rebond
  wheelMultiplier: 0.9, gestureOrientation: 'both',   // glisser à l'horizontale (pavé tactile) fait défiler la page comme à la verticale
  syncTouch: false,   // au doigt : défilement natif du téléphone (inertie, rebonds, vitesse : ceux du système)
  virtualScroll: (data) => {
    const { deltaX, deltaY, event } = data
    if (event.type.includes('touch')) {
      if (!touchAxis && (deltaX || deltaY)) touchAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
      return touchAxis !== 'x'
    }
    // molette et pavé tactile : vitesse bridée (scrollLimit)
    if (lenis) { data.deltaY = scrollLimit(deltaY); data.deltaX = scrollLimit(deltaX) }
    return true
  } })
// Défilement bridé, à la molette et au pavé tactile. Chaque coup est plafonné, et la cible ne peut pas prendre trop
// d'avance sur la position affichée : on peut aller vite, sans à-coups ni images « abstraites ».
// Découverte : en descendant dans une partie de la page encore jamais vue pendant cette visite, plafonds plus serrés
// (les éléments y apparaissent pour la première fois : on laisse le temps aux animations) ; une partie déjà vue, ou une
// remontée, retrouve le régime normal.
const SCROLL_CAP = { step: 150, lead: 0.7 }, SCROLL_FIRST = { step: 55, lead: 0.24 }
let scrollReached = 0
function scrollLimit(d) {
  if (!d) return d
  const cur = lenis.animatedScroll, tgt = lenis.targetScroll
  scrollReached = Math.max(scrollReached, cur)
  const first = d > 0 && tgt >= scrollReached - 4
  const cap = first ? SCROLL_FIRST : SCROLL_CAP
  d = Math.max(-cap.step, Math.min(cap.step, d))
  const lead = cap.lead * innerHeight
  const out = d > 0 ? Math.min(d, Math.max(0, cur + lead - tgt)) : Math.max(d, Math.min(0, cur - lead - tgt))
  // jamais exactement 0 : sinon Lenis croit qu'il ne se passe rien et laisse le navigateur défiler lui-même (le défilement
  // natif et le défilement doux se battent : saccades)
  return out || Math.sign(d) * 1e-3
}
// clavier : Espace (Maj+Espace pour remonter), Page suivante / précédente font défiler en douceur de 80 % d'écran, au
// lieu du saut instantané du navigateur (Lenis ne lisse que la molette et le pavé tactile) ; flèches gauche / droite :
// taille des points de la trame
addEventListener('keydown', (e) => {
  if (root.classList.contains('intro-lock') && [' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) { e.preventDefault(); return }
  if (!lenis || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || root.classList.contains('fiche-open')) return
  if (e.target.closest?.('input, textarea, select, button, a, [contenteditable], .work__track')) return   // Espace y garde son rôle
  const dir = e.key === ' ' ? (e.shiftKey ? -1 : 1) : e.key === 'PageDown' ? 1 : e.key === 'PageUp' ? -1 : 0
  if (!dir) return
  e.preventDefault()
  lenis.scrollTo(lenis.targetScroll + dir * innerHeight * 0.8, { duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) })
})
// carte entière cliquable : un toucher (ou clic) sur la carte, hors de ses liens, ouvre sa fiche
document.addEventListener('click', (e) => {
  const card = e.target.closest('.card')
  if (!card || e.target.closest('a')) return
  card.querySelector('a[href]')?.click()
})
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]')
  const id = a?.getAttribute('href').slice(1)
  if (!id || id.startsWith('p-') || a.closest('.fiche')) return   // fiches : navigation par l'ancre (ouvrir, fermer, suivant)
  const el = id === 'top' ? document.body : document.getElementById(id)
  if (!el) return
  e.preventDefault()
  history.pushState(null, '', '#' + id)
  // durée selon la distance (une longue remontée n'est pas plus brusque qu'une courte), courbe douce au départ et à
  // l'arrivée (ease in-out quintique) ; retour en haut (logo) : jusqu'à la toute première image de l'accueil
  const dist = Math.abs((id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY) - scrollY)
  const duration = Math.min(2.4, Math.max(0.9, 0.8 + dist / 4200))
  const ease = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2)
  lenis ? lenis.scrollTo(id === 'top' ? 0 : el, { duration, easing: ease, force: true, lock: true }) : el.scrollIntoView({ behavior: 'smooth' })
})

/* Fiches projet. L'adresse (#p-<slug>) dit quelle fiche est ouverte ; l'état affiché est porté par des classes posées
   ici (is-open, is-entering, is-under, is-closing), jamais par :target : history.pushState ne met pas :target à jour,
   une fiche fermée par le bouton restait donc ciblée (elle se rouvrait, puis plus rien ne répondait). Sans JavaScript,
   :target ouvre la fiche (styles.css). Focus, Échap, focus piégé, défilement de la page bloqué. */
let lastFocus = null, current = null
const veil = document.querySelector('.fiche-veil')
const ficheBrand = document.querySelector('.fiche-brand')
const ficheOf = () => (/^#p-/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null)
// classes d'animation temporaires : retirées après la durée de leur animation (styles.css), une minuterie par classe
const FICHE_MS = { 'is-entering': 1000, 'is-under': 1000, 'is-closing': 900, 'is-on': 850 }
const phaseTimers = new WeakMap()
function phase(el, cls) {
  const t = phaseTimers.get(el) || {}; phaseTimers.set(el, t)
  clearTimeout(t[cls])
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls)   // l'animation repart toujours du début
  t[cls] = setTimeout(() => el.classList.remove(cls), reduced ? 0 : FICHE_MS[cls])
}
function unphase(el, ...list) { const t = phaseTimers.get(el) || {}; for (const c of list) { clearTimeout(t[c]); el.classList.remove(c) } }
// logo du haut, au-dessus des fiches : exactement à la place du petit logo de la barre (mesuré, même s'il est caché)
function placeFicheBrand() {
  if (!ficheBrand) return
  // deux images (clair / sombre), une seule affichée : celle qui a une taille
  const r = [...document.querySelectorAll('.topbar .brand__mark')].map((m) => m.getBoundingClientRect()).find((b) => b.height)
  if (!r?.height) return
  Object.assign(ficheBrand.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
}
addEventListener('resize', () => { if (current) placeFicheBrand() })
function syncFiche() {
  const open = ficheOf()
  if (open === current) return
  const prev = current
  current = open
  if (prev) {
    // d'un projet à l'autre, l'ancien glisse sous le nouveau rideau ; à la fermeture, il se retire vers la droite
    prev.classList.remove('is-open'); unphase(prev, 'is-entering')
    phase(prev, open ? 'is-under' : 'is-closing')
    if (!open && veil && !reduced) phase(veil, 'is-on')   // le voile en dégradé glisse avec le bord gauche de la fiche
  }
  root.classList.toggle('fiche-open', !!open)
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    unphase(open, 'is-closing', 'is-under')
    open.classList.add('is-open'); phase(open, 'is-entering')
    placeFicheBrand()
    lenis?.stop()
    lastFocus ??= document.activeElement
    open.scrollTop = 0
    open.style.setProperty('--fh', open.querySelector('.fiche__head').offsetHeight + 'px')
    fiches.find((x) => x.f === open)?.reset()
    open.focus({ preventScroll: true })
  } else {
    // le défilement doux repart de la position réelle (sinon il rejoindrait une ancienne cible : la page glisse sous la fiche)
    if (!root.classList.contains('intro-lock')) { lenis?.scrollTo(scrollY, { immediate: true, force: true }); lenis?.start() }
    const back = /^#(projet|recherche)-/.test(location.hash) && document.querySelector(location.hash)
    if (back) {
      // la page (immobile sous la fiche) n'est recalée que si la vignette d'origine n'est plus à l'écran : sinon rien ne
      // bouge pendant que la fiche glisse et dévoile l'accueil (plus de saut)
      const cr = back.getBoundingClientRect()
      if (cr.right < 0 || cr.left > innerWidth) showCard(back)
      const pr = back.parentElement.getBoundingClientRect()
      if (pr.bottom < innerHeight * 0.15 || pr.top > innerHeight * 0.85) {
        const y = pr.top + scrollY - innerHeight * 0.12
        lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y)
      }
    }
    if (lastFocus) { lastFocus.focus?.({ preventScroll: true }); lastFocus = null }
  }
  applyThemeColor()
}
addEventListener('hashchange', syncFiche)
// Fermer : l'adresse prend l'ancre de la vignette sans que le navigateur fasse défiler la page jusqu'à elle (la page,
// immobile sous la fiche, ne saute pas pendant que la fiche glisse) ; la fiche se ferme comme sur un changement d'ancre
document.addEventListener('click', (e) => {
  const a = e.target.closest('.fiche__close')
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return
  e.preventDefault()
  if (!current) return
  history.pushState(null, '', a.getAttribute('href'))
  syncFiche()
})

/* Fiches, grand écran : la rangée est déplacée par le script, avec une seule douceur pour toutes les entrées
   (pavé tactile, molette, glisser à la souris ou au doigt, clavier). */
const wide = matchMedia('(min-width: 769px)')
const fiches = [...document.querySelectorAll('.fiche')].map((f) => {
  const row = f.querySelector('.fiche__row')
  const F = { f, row, x: 0, target: 0, max: 0 }
  F.measure = () => { F.max = Math.max(0, row.scrollWidth - innerWidth); F.target = Math.min(F.target, F.max) }
  const by = (d) => {
    F.target = Math.max(0, Math.min(F.max, F.target + d))
  }
  f.addEventListener('wheel', (e) => {
    if (!wide.matches || e.ctrlKey) return
    e.preventDefault()
    const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerWidth : 1)
    by(d)
  }, { passive: false })
  f.addEventListener('keydown', (e) => {
    if (!wide.matches) return
    const k = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }[e.key]
    if (k && !e.target.closest('a, button')) { e.preventDefault(); by(k * innerWidth * 0.6) }
  })
  let down = null
  row.addEventListener('pointerdown', (e) => { if (!wide.matches || e.button || e.target.closest('a, button')) return; down = { x: e.clientX, t: F.target, id: e.pointerId, moved: false } })
  addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return
    const dx = e.clientX - down.x
    if (!down.moved && Math.abs(dx) > 6) { down.moved = true; row.classList.add('is-drag') }
    if (down.moved) F.target = F.x = Math.max(0, Math.min(F.max, down.t - dx))
  })
  addEventListener('pointerup', () => { if (down) { row.classList.remove('is-drag'); down = null } })
  F.reset = () => {
    F.x = F.target = 0
    f.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'))   // images chargées dès l'ouverture
    F.measure()
  }
  F.frame = (dt) => {
    F.x += (F.target - F.x) * (reduced ? 1 : 1 - Math.exp(-dt / 0.085))   // même douceur pour toutes les entrées
    if (Math.abs(F.target - F.x) < 0.3) F.x = F.target
    row.style.transform = wide.matches ? `translate3d(${(-F.x).toFixed(1)}px, 0, 0)` : ''
  }
  f.querySelectorAll('img').forEach((i) => i.addEventListener('load', () => F.measure()))
  // mobile : une fois le titre passé sous la barre, son rappel compact apparaît dans la barre (à côté de Fermer)
  const title = f.querySelector('.fiche__title')
  if (title) new IntersectionObserver(([e]) => f.classList.toggle('is-titled', !e.isIntersecting && e.boundingClientRect.top < 80), { root: f, rootMargin: '-64px 0px 0px 0px' }).observe(title)
  return F
})
addEventListener('resize', () => fiches.forEach((F) => F.measure()))
let ficheT = performance.now()
function ficheFrame(now) {
  const dt = Math.min(0.05, (now - ficheT) / 1000); ficheT = now
  const open = ficheOf()
  const F = open && fiches.find((x) => x.f === open)
  F?.frame(dt)
}
addEventListener('keydown', (e) => {
  const open = ficheOf()
  if (!open) return
  if (e.key === 'Escape') { e.preventDefault(); open.querySelector('.fiche__close').click() }   // même fermeture que le bouton (sans saut)
  if (e.key === 'Tab') {
    const f = [...open.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')]
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === open)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
})

/* Apparitions au défilement. */
const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } }), { threshold: 0.01 })
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))

/* Pistes horizontales (Projets choisis, Recherche) : déplacées par le script, indépendamment du défilement de la page.
   Pavé tactile (glissement latéral), doigt, souris (glisser), flèches et clavier ; douceur, inertie, et boucle sans fin :
   la position est ramenée dans un jeu de cartes (modulo), des copies couvrent les bords, sans saut visible. */
const COPIES = 2
// molette de souris ou pavé tactile ? Souris : crans (lignes, ou pas de mouvement latéral et un wheelDelta qui n'est pas
// le triple exact de deltaY, signature des pavés tactiles de Mac). Un geste latéral récent signale un pavé tactile.
let padT = -1e9, pageWheelT = -1e9
const isMouseWheel = (e) => {
  if (e.deltaX) padT = performance.now()
  if (e.deltaMode === 1) return true
  if (e.deltaX || performance.now() - padT < 600) return false
  if (e.wheelDeltaY) return e.wheelDeltaY !== -3 * e.deltaY
  return Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40
}
// défilement de la page à la molette (les gestes pris par une piste n'arrivent pas jusqu'ici)
addEventListener('wheel', (e) => { if (e.deltaY) pageWheelT = performance.now(); if (e.deltaX) padT = performance.now() }, { passive: true })
root.classList.add('is-rail')
const mod = (a, n) => ((a % n) + n) % n
const rails = [...document.querySelectorAll('.work__pin')].map((pin) => {
  const track = pin.querySelector('.work__track'), strip = pin.querySelector('.work__strip')
  const originals = [...strip.querySelectorAll('.card')]
  // copies avant et après : cliquables, mais ignorées par le clavier et les lecteurs d'écran
  const copy = () => originals.map((c) => { const k = c.cloneNode(true); k.removeAttribute('id'); k.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id')); k.setAttribute('aria-hidden', 'true'); k.classList.add('card--copy'); k.querySelectorAll('a').forEach((x) => (x.tabIndex = -1)); return k })
  for (let i = 0; i < COPIES; i++) { strip.prepend(...copy()); strip.append(...copy()) }
  const r = { pin, track, strip, originals, x: 0, target: 0, vel: 0, setW: 0, start: 0, n: 0, last: 0 }
  // mobile : piste finie (copies masquées en CSS) ; elle s'arrête à la première et à la dernière carte
  r.measure = () => {
    const shown = originals.filter((c) => c.offsetParent)
    const all = [...strip.children].filter((c) => c.offsetParent)
    r.n = shown.length
    r.finite = all.length === r.n
    r.start = shown[0] && all[0] ? shown[0].offsetLeft - all[0].offsetLeft : 0
    r.step = all.length > 1 ? all[1].offsetLeft - all[0].offsetLeft : track.clientWidth
    r.setW = r.finite ? r.n * r.step : all[r.n] ? all[r.n].offsetLeft - all[0].offsetLeft : 0
    if (r.finite) { const max = (r.n - 1) * r.step; r.target = Math.min(max, Math.max(0, mod(r.target, r.setW))); r.x = r.target }
  }
  r.measure()
  const nudge = (d) => { r.target = Math.round((r.target + d) / r.step) * r.step; r.last = performance.now() }
  pin.querySelectorAll('.work__nav').forEach((b) => b.addEventListener('click', () => nudge(r.step * +b.dataset.dir)))
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); nudge(r.step * (e.key === 'ArrowRight' ? 1 : -1)) } })
  // pavé tactile / molette latérale (ou Maj + molette) ; molette de souris (verticale) : fait défiler la piste quand on
  // survole sa bande, sauf pendant un défilement de la page déjà en cours (la page continue, rien ne bloque en chemin)
  track.addEventListener('wheel', (e) => {
    const now = performance.now()
    let dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
    if (!dx && isMouseWheel(e) && now - pageWheelT > 350) dx = e.deltaY
    if (!dx) return
    e.preventDefault(); e.stopPropagation()
    r.target += dx * (e.deltaMode === 1 ? 32 : 1); r.last = now; r.wheel = true; r.dir = Math.sign(dx)   // sens de l'élan (magnétisme)
  }, { passive: false })
  // glisser (souris, doigt, stylet) ; le défilement vertical au doigt reste au navigateur (touch-action: pan-y)
  let down = null, moved = false
  track.addEventListener('pointerdown', (e) => {
    if (e.button) return
    down = { x: e.clientX, y: e.clientY, t0: r.target, px: e.clientX, pt: performance.now(), id: e.pointerId, touch: e.pointerType === 'touch' }; moved = false; r.vel = 0
  })
  addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return
    const dx = e.clientX - down.x
    // au doigt : un geste d'abord vertical fait défiler la page, la piste ne bouge pas
    if (!moved && down.touch && Math.abs(e.clientY - down.y) > 6 && Math.abs(e.clientY - down.y) >= Math.abs(dx)) { down = null; return }
    if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-drag'); track.setPointerCapture?.(e.pointerId) }
    if (!moved) return
    const now = performance.now(), dt = Math.max(1, now - down.pt)
    r.vel = 0.8 * r.vel + 0.2 * (-(e.clientX - down.px) / dt)   // px / ms
    down.px = e.clientX; down.pt = now
    let x = down.t0 - dx
    if (r.finite) { const max = (r.n - 1) * r.step; x = x < 0 ? x * 0.35 : x > max ? max + (x - max) * 0.35 : x }   // butée élastique
    if (x !== r.target) r.dir = Math.sign(x - r.target)
    r.target = r.x = x; r.last = now
  })
  const up = (e) => {
    if (!down || (e.pointerId !== undefined && e.pointerId !== down.id)) return
    down = null; track.classList.remove('is-drag')
    if (moved) { r.target += r.vel * 320; r.wheel = false; r.last = performance.now() - 120; if (Math.abs(r.vel) > 0.02) r.dir = Math.sign(r.vel) }   // inertie
  }
  addEventListener('pointerup', up); addEventListener('pointercancel', up)
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }, true)
  track.addEventListener('dragstart', (e) => e.preventDefault())
  r.isDown = () => !!down
  // la piste n'a pas de défilement natif : le navigateur ne doit pas la décaler (ancre, focus)
  track.addEventListener('scroll', () => { if (track.scrollLeft) track.scrollLeft = 0 }, { passive: true })
  return r
})
addEventListener('resize', () => rails.forEach((r) => r.measure()))
addEventListener('load', () => rails.forEach((r) => r.measure()))
let railT = performance.now()
function workFrame(now = performance.now()) {
  const dt = Math.min(0.05, (now - railT) / 1000); railT = now
  for (const r of rails) {
    if (!r.setW) continue
    if (r.track.scrollLeft) r.track.scrollLeft = 0
    // mobile (piste finie) : à l'arrêt, la piste se cale sur la carte la plus proche (toujours centrée) ; PC : défilement
    // libre, les vignettes restent là où le geste les a laissées
    if (r.finite && !r.isDown() && now - r.last > (r.wheel ? 260 : 140)) { r.target = Math.round(r.target / r.step) * r.step; r.wheel = false }
    // PC : léger magnétisme, dans la continuité de l'élan. Une fois le geste fini, la cible (où la piste allait s'arrêter,
    // inertie comprise) glisse doucement vers la carte la plus proche ; la piste la suit avec sa douceur habituelle
    if (!r.finite && !r.isDown() && now - r.last > (r.wheel ? 180 : 90)) {
      // la carte d'arrivée est prise dans le sens de l'élan (jamais de retour en arrière), sauf si la carte d'où l'on vient
      // est toute proche : alors léger recul, plus doux
      const pos = r.target / r.step, lo = Math.floor(pos), frac = pos - lo, NEAR = 0.14
      const cell = r.dir > 0 ? (frac < NEAR ? lo : lo + 1) : r.dir < 0 ? (frac > 1 - NEAR ? lo + 1 : lo) : Math.round(pos)
      const goal = cell * r.step, back = r.dir && Math.sign(goal - r.target) === -r.dir
      r.target += (goal - r.target) * (reduced ? 1 : 1 - Math.exp(-dt / (back ? 0.4 : 0.22)))
      if (Math.abs(goal - r.target) < 0.5) r.dir = 0
      r.wheel = false
    }
    // PC (défilement libre) : quand la piste est entièrement hors de l'écran, elle se recale d'un coup sur la carte la plus
    // proche (personne ne le voit) ; en y revenant, les vignettes sont en place dans la grille
    if (!r.finite && !r.isDown()) {
      const pr = r.pin.getBoundingClientRect()
      if (pr.bottom < 0 || pr.top > innerHeight) { const snap = Math.round(r.target / r.step) * r.step; if (snap !== r.x || snap !== r.target) { r.target = r.x = snap; r.vel = 0 } }
    }
    if (r.finite) {
      // piste finie : la cible reste entre la première et la dernière carte (dépassement au doigt : voir pointermove)
      const max = (r.n - 1) * r.step
      r.target = Math.min(max, Math.max(0, r.target))
    }
    if (!r.isDown()) r.x += (r.target - r.x) * (reduced ? 1 : 1 - Math.exp(-dt / 0.11))
    const k = r.finite ? r.x : mod(r.x, r.setW)
    r.strip.style.transform = `translate3d(${(-(r.start + k)).toFixed(2)}px, 0, 0)`
  }
}
/** Amène une carte d'origine au début de sa piste (retour depuis une fiche). */
function showCard(card) {
  const r = rails.find((x) => x.originals.includes(card))
  if (!r) return
  r.target = r.x = r.originals.filter((c) => c.offsetParent).indexOf(card) * r.step
  workFrame()
}

/* À propos : le logotype se trace puis se remplit ; les grands textes s'allument mot à mot au défilement. */
const hero = document.querySelector('.hero')
let heroWords = [...document.querySelectorAll('.hero__line .w')]
if (!heroWords.length) root.classList.add('hero-done')   // pages sans accueil : tout est visible d'emblée
let heroOn = -1
const wordsSvg = [...document.querySelectorAll('.hero .studio__word')]
// nom de l'accueil en « balayage » (src/logotype-svg.js) : trois copies (très floue, un peu floue, nette) découvertes
// par des dégradés ; pour chaque arrêt (position xn de 0 à 1 sur le mot), l'avancée locale s (0 : rien, 1 : net et
// plein) suit une bande qui va de gauche à droite, plafonnée par la retenue (rien n'est entièrement net avant la fin)
const sweeps = wordsSvg.filter((w) => w.dataset.bande).map((el) => ({ el, stops: [...el.querySelectorAll('.bal-g')].map((g) => [...g.querySelectorAll('stop')]),
  b: +el.dataset.bande, r: +el.dataset.retenue, last: -1 }))
// poids des trois copies pour une avancée s : de la très floue à la nette ; leur somme vaut s (l'opacité)
const sweepW = (s) => s <= 0.5 ? [s * (1 - 2 * s), 2 * s * s, 0] : [0, s * (2 - 2 * s), s * (2 * s - 1)]
function sweep(draw) {
  const a = Math.round((1 - draw) * 1000) / 1000
  for (const sw of sweeps) {
    if (a === sw.last) continue
    sw.last = a
    const n = sw.stops[0].length, cap = 1 - sw.r + sw.r * a
    for (let i = 0; i < n; i++) {
      const xn = i / (n - 1), s = Math.min(1, Math.max(0, (a * (1 + sw.b) - xn) / sw.b)) * cap, ws = sweepW(s)
      for (let k = 0; k < 3; k++) sw.stops[k][i].setAttribute('stop-opacity', ws[k].toFixed(3))
    }
    sw.el.classList.toggle('bal-net', a >= 1)   // entièrement net : les copies floues ne sont plus calculées
  }
}
// chaque moitié du logotype (HOLO / SENE) cadrée sur ses lettres
// même hauteur de cadre pour les deux (celle de HOLO, avec ses capitales) : les lettres gardent la même échelle

const word = null
// textes des sections : apparition mot à mot quand ils arrivent à l'écran, une seule fois par chargement de page
// une section = une seule séquence, dans l'ordre de lecture : le rang des mots se poursuit d'un paragraphe à l'autre
// (chaque mot attend le précédent), et toute la séquence démarre quand son premier paragraphe arrive à l'écran
{ const groups = new Map()
  for (const el of document.querySelectorAll('[data-seq]')) { const g = el.closest('[data-seq-group]') || el.closest('section') || el.parentElement; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(el) }
  // comme la présentation de l'accueil : apparaît en arrivant à l'écran, disparaît quand on remonte au-dessus (le texte
  // repasse sous le bas de l'écran) ; reste allumé quand on l'a dépassé vers le bas
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const list = groups.get(e.target._seqGroup)
    if (e.isIntersecting) list.forEach((el) => el.classList.add('in'))
    else if (e.boundingClientRect.top > 0) list.forEach((el) => el.classList.remove('in'))
  }), { threshold: 0.35 })
  for (const [g, list] of groups) {
    let i = 0   // rang des mots (ou des lettres) dans le groupe
    for (const el of list) for (const w of el.querySelectorAll('.w')) w.style.setProperty('--i', i++)
    list[0]._seqGroup = g; io.observe(list[0])
  } }
const wordBlocks = [...document.querySelectorAll('[data-words]:not(.hero__line)')].map((el) => ({ el, words: [...el.querySelectorAll('.w')], on: -1 }))
// À propos : mots allumés au fil du défilement (comme la présentation de l'accueil), dans l'ordre de lecture ; tout est
// allumé quand le dernier paragraphe atteint le milieu de l'écran ; en remontant, ils s'éteignent dans l'ordre inverse
// textes des sections (Projets choisis, Travaux de recherche, À propos, adresse) : chaque mot apparaît exactement quand
// il franchit une ligne fixe de l'écran, aux 8/10 de sa hauteur, et disparaît en repassant sous une ligne plus basse (96 %) (même fondu et même
// flou que la présentation de l'accueil). Sur une même ligne de texte, les mots se suivent de gauche à droite à mesure
// que la ligne monte de sa hauteur : l'effet reste mot par mot. Les derniers mots de la page, qui n'atteindraient jamais
// la ligne, ont leur seuil ramené juste avant le bas de page. Seuils en cache, recalculés au redimensionnement et au
// changement de langue.
// deux lignes : un mot apparaît quand il monte jusqu'à SW_LINE de la hauteur de l'écran (un peu au-dessus du bas : il
// n'apparaît pas encore tout en bas), et ne disparaît, en redescendant, qu'à SW_OFF (presque sorti par le bas)
const SW_LINE = 0.8, SW_OFF = 0.96, SW_MIN_STEP = 10
let swWords = null, swT = null, swOn = null, swOffT = null
const resetScrollWords = () => { swWords = null }
addEventListener('resize', resetScrollWords)
addEventListener('load', resetScrollWords)
function scrollWords(vh) {
  if (!swWords) {
    swWords = [...document.querySelectorAll('[data-sw] .w')]
    const line = vh * SW_LINE, max = document.documentElement.scrollHeight - innerHeight
    const r = swWords.map((w) => { const q = w.getBoundingClientRect(); return { top: q.top + scrollY, mid: q.top + scrollY + q.height / 2, h: q.height } })
    // rang de chaque mot dans sa ligne de texte (même hauteur à 3 px près)
    swT = new Array(swWords.length)
    for (let i = 0; i < swWords.length;) {
      let j = i; while (j < swWords.length && Math.abs(r[j].top - r[i].top) < 3) j++
      for (let k = i; k < j; k++) swT[k] = r[k].mid - line + ((k - i) / Math.max(1, j - i)) * r[i].h * 1.1
      i = j
    }
    // seuls les derniers mots qui n'atteindraient jamais la ligne (seuil au-delà du bas de page) sont recalés : répartis
    // dans l'ordre sur la fin du défilement ; tous les autres restent exactement calés sur la ligne
    const end = max - 20, tail = swT.findIndex((t) => t > end)
    if (tail >= 0) {
      const n = swWords.length - tail, start = Math.max(tail > 0 ? swT[tail - 1] + SW_MIN_STEP : 0, end - n * SW_MIN_STEP * 2.5)
      for (let i = tail; i < swWords.length; i++) swT[i] = Math.min(swT[i], start + ((i - tail) / Math.max(1, n - 1)) * (end - start))
    }
    swOffT = swT.map((t) => t - (SW_OFF - SW_LINE) * vh)
    // À propos et Contact : affichés d'emblée dès qu'ils sont à l'écran (pas d'apparition sur la ligne des 8/10) ; ils
    // gardent seulement la disparition actuelle, en repassant sous la ligne des 96 %
    swWords.forEach((w, i) => { if (w.closest('#a-propos')) swT[i] = swOffT[i] })
    swOn = swWords.map((w) => w.classList.contains('on'))
  }
  for (let i = 0; i < swWords.length; i++) {
    const on = swOn[i] ? scrollY >= swOffT[i] : scrollY >= swT[i]
    if (on !== swOn[i]) { swOn[i] = on; swWords[i].classList.toggle('on', on) }
  }
}
const foot = document.querySelector('.foot')
let footPush = -1
function scrollEffects() {
  scrollWords(innerHeight)
  const vh = innerHeight
  // la bande du bas s'efface en haut de page (mots-clés de l'accueil) ; en fin de page, elle est coupée au bord haut du
  // pied de page, au fur et à mesure qu'il apparaît : il n'est jamais flouté, rien ne disparaît d'un coup
  root.classList.toggle('edge-bottom-off', scrollY < 40)
  if (foot) { const push = Math.max(0, vh - foot.getBoundingClientRect().top); if (push !== footPush) { footPush = push; root.style.setProperty('--band-push', push.toFixed(1) + 'px') } }
  // accueil épinglé : avancée hp (0 à 1) ; le mot se trace puis se remplit, puis la présentation s'allume
  const hr = hero?.getBoundingClientRect()
  const hp = hr ? Math.min(1, Math.max(0, -hr.top / Math.max(1, hr.height - vh))) : 1
  const k = (a, b) => Math.min(1, Math.max(0, (hp - a) / (b - a)))
  if (heroWords.length) {
    // le logo se place (0 à 0,54), le nom se trace (0,14 à 0,70), la présentation s'allume (0,60 à 0,86) ; puis un court
    // temps calme (0,86 à 1) avant que le logo parte vers la barre
    const on = Math.round(k(0.6, 0.86) * heroWords.length)
    if (on !== heroOn) { heroWords.forEach((w, i) => w.classList.toggle('on', i < on)); heroOn = on }
    // la barre du haut et le reste du site n'apparaissent qu'une fois la scène de l'accueil finie, quand l'écran
    // commence à descendre (jusque-là : le fond, le gros logo et la présentation seulement)
    if (on === heroWords.length && hp >= 0.999) root.classList.add('hero-done')
  }
  // le nom existe en deux versions (une ligne / deux lignes sur mobile) : même avancée pour les deux
  wordsSvg.forEach((w) => {
    // le nom apparaît tôt et sur une longue course : tracé de 16 % à 79 % de la scène, remplissage dans la seconde moitié
    const p = k(0.12, 0.5)   // le nom est entièrement net avant que la présentation commence (0,6)
    w.style.setProperty('--draw', (1 - Math.min(1, p * 1.2)).toFixed(3))
    w.style.setProperty('--fill', Math.min(1, Math.max(0, (p - 0.4) / 0.6)).toFixed(3))
  })
  sweep(1 - Math.min(1, k(0.12, 0.5) * 1.2))
  for (const b of wordBlocks) {
    const r = b.el.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.25)))
    // mots allumés ; le mot en cours d'apparition se remplit de gauche à droite, son front est irisé.
    // Mis à jour à chaque image pour que l'état suive exactement le défilement, dans les deux sens.
    const x = p * b.words.length, on = Math.min(b.words.length, Math.floor(x)), f = x - on
    if (on !== b.on) {
      b.words.forEach((w, i) => { w.classList.toggle('on', i < on); w.classList.toggle('lead', i === on) })
      b.on = on
    }
    const lead = b.words[on]
    if (lead) { const v = f.toFixed(3); if (lead.dataset.f !== v) { lead.dataset.f = v; lead.style.setProperty('--f', v) } }
  }
}
if (reduced) { root.classList.add('hero-done', 'bar-on'); heroWords.forEach((w) => w.classList.add('on')); wordsSvg.forEach((w) => w.style.setProperty('--draw', 0)); sweep(0); wordBlocks.forEach((b) => b.words.forEach((w) => w.classList.add('on'))) }

/* Chargeur : le « o » du logo-kit (loader.js, loader-draw.js), dessiné hors du fil principal quand le navigateur le
   permet. En fin de chargement, la tête rejoint la queue, l'anneau se complète et grandit en accélérant (60 % → 100 % du
   rayon du relais) ; le « o » du logo WebGL prend le relais au même pixel et à la même vitesse, avec la même roue (le flux
   démarre de 0 à ce moment-là, flow.js), puis ralentit. */
const loaderEl = document.querySelector('.loader')
// rayon du relais selon l'écran (celui du « o » du logo WebGL, 44 px au plus), connu dès maintenant : le chargeur démarre
// à sa taille définitive, avant la préparation de WebGL
let R1 = loaderRadius()
const loader = createLoader(loaderEl?.querySelector('.loader__c'), { reduced, r1: R1 })
if (loaderEl) FLOW.t0 = Infinity   // flux à l'arrêt (roue du kit) jusqu'au relais
addEventListener('resize', () => { if (!root.classList.contains('is-loaded')) loader.setRadius(R1 = loaderRadius()) })
const finishLoader = (done) => {
  if (!loaderEl) return done()
  // durée de la croissance : l'anneau finit à la vitesse initiale de la croissance du logo (v = 3 (r1 − r0) / grow)
  const it = gl?.intro?.(), R0 = R1 * 0.6
  const growD = it ? Math.min(900, Math.max(200, 2 * (R1 - R0) / Math.max(3 * (it.r1 - it.r0) / it.grow, 1e-3))) : 400
  loaderEl.classList.add('loader--closing')   // le fond du chargeur s'efface (styles.css)
  loader.finish(growD).then(() => { FLOW.t0 = performance.now(); done() })
}
/* WebGL : trame de points et lentille. Sans WebGL, les images restent visibles. */
// créés juste après la première image affichée : la compilation des shaders bloque le fil principal, le chargeur doit
// déjà être à l'écran (il tourne ensuite dans son worker, sans dépendre du fil principal)
let gl = null, backdrop = null
const glMade = new Promise((done) => requestAnimationFrame(() => setTimeout(() => {
  try { gl = createGL(document.querySelector('.gl-canvas'), { reduced }) } catch (err) { console.warn(err) }
  // fond : formes colorées derrière une plaque dépolie, qui défilent avec la page et réagissent au curseur
  try { backdrop = createBackdrop(document.querySelector('.bg-canvas'), { reduced }) } catch (err) { console.warn(err) }
  done(gl)
})))
/* Écran de chargement : n'attend que l'essentiel (polices, image de l'accueil, logo WebGL prêt), et au moins une seconde
   d'animation du chargeur une fois apparu (jamais un simple flash), au plus 5 s. Les images des vignettes
   continuent de se charger ensuite (plus bas dans la page, envoyées au GPU après l'intro, gl.js). */
lenis?.stop(); scrollTo(0, 0); lenis?.scrollTo(0, { immediate: true, force: true })   // Lenis aussi : pas de retour à l'ancienne position au déblocage
// accueil : la page reste bloquée (molette, doigt, clavier, barre de défilement) pendant le chargeur et l'arrivée du
// logo ; elle ne se libère qu'à la fin de l'animation (intro-done), et la flèche apparaît juste après (CSS)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
// Trois phases, strictement :
//   1. chargement : seul le chargeur est visible ; il attend l'essentiel (polices, image de l'accueil, logo WebGL) ;
//   2. animation du logo (le chargeur passe le relais au « o ») : seuls le fond et le gros logo sont visibles ;
//   3. fin de l'animation (intro-done) : la flèche apparaît, la page se libère.
// Pendant 1 et 2 : rien n'est possible. Défilement bloqué (molette, doigt, clavier, barre, focus), et tout le contenu
// de la page est inerte (ni clic, ni focus, ni défilement par le focus) ; la page reste en haut.
// retour depuis une page annexe (bouton Fermer des mentions légales) : pas de chargeur ni d'intro, on revient sur Contact
const backTo = (() => { try { const v = sessionStorage.getItem('backTo'); sessionStorage.removeItem('backTo'); return document.querySelector('.hero') ? v : null } catch { return null } })()
const introLocked = !!document.querySelector('.hero') && !reduced && !ficheOf() && !backTo
const inertEls = [...document.body.children].filter((e) => !e.matches('.loader, canvas, script, .bg-canvas, .gl-canvas'))
let unblock = () => {}
if (introLocked) {
  root.classList.add('intro-lock'); inertEls.forEach((e) => { e.inert = true })
  // écouteurs bloquants : retirés dès la fin de l'intro (un écouteur non passif ralentit tout défilement)
  const block = (e) => { if (e.cancelable) e.preventDefault() }
  const pin = () => { if (scrollX || scrollY) scrollTo(0, 0) }
  addEventListener('wheel', block, { passive: false, capture: true })
  addEventListener('touchmove', block, { passive: false, capture: true })
  addEventListener('scroll', pin, { passive: true })
  unblock = () => { removeEventListener('wheel', block, { capture: true }); removeEventListener('touchmove', block, { capture: true }); removeEventListener('scroll', pin) }
} else root.classList.add('intro-done')
const endIntro = () => {
  // fin de l'intro verrouillée : page libérée, remise en haut
  if (root.classList.contains('intro-lock')) {
    inertEls.forEach((e) => { e.inert = false }); unblock()
    scrollTo(0, 0); lenis?.scrollTo(0, { immediate: true, force: true })
    root.classList.remove('intro-lock')
  }
  root.classList.add('intro-done')
  // toujours : le défilement doux démarre (y compris sur les pages sans intro, où il restait arrêté)
  if (!ficheOf()) lenis?.start()
}
const heroImg = document.querySelector('.hero__view img')
Promise.race([
  Promise.all([
    document.fonts?.ready,
    heroImg && !heroImg.complete ? new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }) }) : null,
    // au moins une seconde d'animation du chargeur, entièrement visible, même si tout est déjà chargé
    new Promise((r) => setTimeout(r, reduced || backTo ? 0 : Math.max(0, loader.shownAt + 1000 - performance.now()))),
    glMade.then((g) => g?.ready),   // logo WebGL prêt
  ]),
  new Promise((r) => setTimeout(r, 5000)),   // au plus 5 s (connexion lente)
]).then(() => finishLoader(() => {
  root.classList.add('is-loaded')
  // fiche ouverte par le lien : rien à attendre ; sinon, fin de l'arrivée du logo (croissance puis glissement)
  // l'animation du logo dure croissance + glissement ; la page ne se libère qu'à la fin
  if (!introLocked || ficheOf()) endIntro(); else setTimeout(endIntro, IRIS.intro.grow + IRIS.intro.shift)
  // retour sur Contact : tout de suite, puis une fois la mise en page stabilisée
  if (backTo) { const go = () => { const el = document.getElementById(backTo); if (!el) return; const y = el.getBoundingClientRect().top + scrollY - innerHeight * 0.15; if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y) }; go(); setTimeout(go, 300) }
}))

startFxCss()   // grain des bandes de flou CSS


function loop(t) {
  lenis?.raf(t)
  // pistes et fiches d'abord, puis le WebGL : les images sont dessinées à la position finale des titres (même image)
  workFrame(t)
  ficheFrame(t)
  updateFlow(t)   // roue « flux » : une texture par image, partagée par le chargeur, le logo et la lentille
  backdrop?.frame(t)
  gl?.frame(t)
  if (!reduced) scrollEffects()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

syncFiche()

/* Fermer (pages annexes) : retour à l'accueil, sur Contact, sans tout relancer. Si l'on vient de l'accueil, retour arrière
   (le navigateur réaffiche la page telle qu'on l'a laissée) ; sinon, chargement de l'accueil sans chargeur ni intro. */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-close]')
  if (!a) return
  try { sessionStorage.setItem('backTo', 'contact') } catch {}
  let fromHome = false
  try { const r = new URL(document.referrer); fromHome = r.origin === location.origin && !/mentions-legales/.test(r.pathname) } catch {}
  if (fromHome && history.length > 1) { e.preventDefault(); history.back() }
})
// page réaffichée par le retour arrière (mémoire du navigateur) : rien à relancer, et le drapeau ne doit pas servir plus tard
addEventListener('pageshow', (e) => { if (e.persisted) { try { sessionStorage.removeItem('backTo') } catch {} } })

/* Changement de langue sans rechargement (lang-swap.js) : textes remplacés sur place, adresse mise à jour ; en cas de
   doute (structure différente, page introuvable), chargement normal. */
document.addEventListener('click', async (e) => {
  const a = e.target.closest('.topbar .lang')
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || ficheOf() || !root.classList.contains('intro-done')) return
  e.preventDefault()
  const url = new URL(a.getAttribute('href'), location.href).href
  try {
    await swapLanguage(url, {
      onWhole: (el) => {
        if (el.matches('[data-hwords]')) {
          // présentation de l'accueil : nouveaux mots, même état (allumés selon l'avancée de la scène)
          const lit = root.classList.contains('hero-done') || heroOn > 0
          heroWords = [...el.querySelectorAll('.w')]; heroOn = -1
          if (lit && root.classList.contains('hero-done')) heroWords.forEach((w) => w.classList.add('on'))
        } else if (el.matches('[data-sw]')) {
          resetScrollWords()   // À propos : nouveaux mots, rallumés selon le défilement
        } else {
          // textes des sections : rangs des mots dans la section, déjà apparus si la section l'était
          const grp = el.closest('[data-seq-group]') || el.closest('section') || el.parentElement
          const same = (p) => (p.closest('[data-seq-group]') || p.closest('section') || p.parentElement) === grp
          let i = 0
          for (const p of grp.querySelectorAll('[data-seq]')) if (same(p)) for (const w of p.querySelectorAll('.w')) w.style.setProperty('--i', i++)
        }
      },
      onDone: () => {
        try { store.set('lang', root.lang); document.cookie = `lang=${root.lang}; path=/; max-age=31536000; samesite=lax` } catch {}
        history.pushState(null, '', url); shownPath = location.pathname
        labelThemes()
        dispatchEvent(new Event('resize'))   // largeurs des textes changées : pistes, WebGL et fond se remesurent
      },
    })
  } catch (err) { console.warn('changement de langue : chargement normal', err); location.href = url }
})
// retour arrière vers l'autre langue (adresse de page différente de la langue affichée) : rechargement
let shownPath = location.pathname
addEventListener('popstate', () => { if (location.pathname !== shownPath) location.reload() })

/* Flèche de l'accueil : après sa première apparition, elle se cache dès qu'on défile, et ne revient qu'après un moment
   sans défilement */
{ let t = null
  addEventListener('scroll', () => {
    if (!root.classList.contains('intro-done')) return
    root.classList.add('cta-idle-off'); clearTimeout(t)
    t = setTimeout(() => root.classList.remove('cta-idle-off'), 2600)
  }, { passive: true }) }





