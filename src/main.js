import 'virtual:iris.css'
import './styles.css'
import { IRIS_INNER_RATIO } from '../design/logo-kit/src/iris.js'
import { FLOW, updateFlow } from './flow.js'
import Lenis from 'lenis'
import { createGL } from './gl.js'
import { createBackdrop } from './backdrop.js'

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

/* Langue : à la première visite de la page française, un navigateur non francophone va vers /en/. */
const langLink = document.querySelector('.topbar .lang')
langLink?.addEventListener('click', () => store.set('lang', langLink.getAttribute('hreflang')))

if (root.lang === 'fr' && !store.get('lang') && document.querySelector('.hero') && !(navigator.language || 'fr').toLowerCase().startsWith('fr')) {
  location.replace('en/' + location.hash)
}

/* Réglages Iris en direct (?debug=iris) : en développement seulement, absent du site publié */
if (import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === 'iris') import('./iris-debug.js').then((m) => m.mountIrisDebug())

/* Petit logo de la barre du haut : visible seulement quand le gros logo de l'accueil n'est plus à l'écran */
const heroSlot = document.querySelector('.hero__slot')
if (!heroSlot) root.classList.add('brand-on')
// avec WebGL, c'est gl.js qui l'affiche, quand le gros logo l'a rejoint ; sans WebGL : dès que le gros logo est sorti
else new IntersectionObserver(([e]) => { if (!root.classList.contains('has-gl')) root.classList.toggle('brand-on', !e.isIntersecting) }).observe(heroSlot)

/* Thème : celui de l'appareil (prefers-color-scheme, clair par défaut). Le bouton force l'autre mode (data-theme sur
   <html>, mémorisé ; le script inline de <head> l'applique avant le premier rendu). La barre du navigateur suit. */
const themeBtn = document.querySelector('.theme-toggle'), darkMq = matchMedia('(prefers-color-scheme: dark)')
const themeNow = () => root.dataset.theme || (darkMq.matches ? 'dark' : 'light')
function syncTheme() {
  const t = themeNow()
  themeBtn?.setAttribute('aria-label', themeBtn.dataset[t === 'light' ? 'dark' : 'light'])
  if (root.dataset.theme) { const bg = getComputedStyle(root).getPropertyValue('--bg').trim(); document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg)) }
}
themeBtn?.addEventListener('click', () => {
  const next = themeNow() === 'light' ? 'dark' : 'light'
  // revenir au mode de l'appareil efface le choix : le site suit de nouveau l'appareil
  if (next === (darkMq.matches ? 'dark' : 'light')) { delete root.dataset.theme; store.set('theme', null) } else { root.dataset.theme = next; store.set('theme', next) }
  syncTheme()
})
darkMq.addEventListener?.('change', syncTheme)
syncTheme()

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
const lenis = reduced ? null : new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, gestureOrientation: 'both' })   // glisser à l'horizontale (pavé tactile) fait défiler la page comme à la verticale
// clavier : Espace (Maj+Espace pour remonter), Page suivante / précédente font défiler en douceur de 80 % d'écran, au
// lieu du saut instantané du navigateur (Lenis ne lisse que la molette et le pavé tactile) ; flèches gauche / droite :
// taille des points de la trame
addEventListener('keydown', (e) => {
  if (!lenis || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || root.classList.contains('fiche-open')) return
  if (e.target.closest?.('input, textarea, select, button, a, [contenteditable], .work__track')) return   // Espace y garde son rôle
  // flèches gauche / droite : points de la trame des vignettes plus petits / plus gros
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); gl?.setCellScale(e.key === 'ArrowRight' ? 1.15 : 1 / 1.15); return }
  const dir = e.key === ' ' ? (e.shiftKey ? -1 : 1) : e.key === 'PageDown' ? 1 : e.key === 'PageUp' ? -1 : 0
  if (!dir) return
  e.preventDefault()
  lenis.scrollTo(lenis.targetScroll + dir * innerHeight * 0.8, { duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) })
})
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]')
  const id = a?.getAttribute('href').slice(1)
  if (!id || id.startsWith('p-') || a.closest('.fiche')) return   // fiches : navigation par l'ancre (ouvrir, fermer, suivant)
  const el = id === 'top' ? document.body : document.getElementById(id)
  if (!el) return
  e.preventDefault()
  history.pushState(null, '', '#' + id)
  lenis ? lenis.scrollTo(el, { duration: 1.4 }) : el.scrollIntoView()
})

/* Fiches projet : ouvertes par l'ancre #p-<slug> ; focus, Échap, focus piégé, défilement de la page bloqué. */
let lastFocus = null, prevFiche = null
const ficheOf = () => (/^#p-/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null)
function leave(el, kind, ms) {
  el.classList.add('is-leaving', kind)
  setTimeout(() => el.classList.remove('is-leaving', kind), ms)
}
function syncFiche() {
  const open = ficheOf()
  // transitions : d'un projet à l'autre, l'ancien glisse sous le nouveau rideau ; à la fermeture, le rideau se retire
  if (prevFiche && prevFiche !== open && !reduced) leave(prevFiche, open ? 'is-under' : 'is-closing', open ? 1000 : 640)
  prevFiche = open
  root.classList.toggle('fiche-open', !!open)
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    lenis?.stop()
    lastFocus ??= document.activeElement
    open.scrollTop = 0
    open.style.setProperty('--fh', open.querySelector('.fiche__head').offsetHeight + 'px')
    fiches.find((x) => x.f === open)?.reset()
    open.focus({ preventScroll: true })
  } else {
    lenis?.start()
    const back = /^#(projet|recherche)-/.test(location.hash) && document.querySelector(location.hash)
    if (back) {
      showCard(back)
      const y = back.parentElement.getBoundingClientRect().top + scrollY - innerHeight * 0.12
      lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y)
    }
    if (lastFocus) { lastFocus.focus?.({ preventScroll: true }); lastFocus = null }
  }
}
addEventListener('hashchange', syncFiche)

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
  if (e.key === 'Escape') { e.preventDefault(); location.hash = open.querySelector('.fiche__close').getAttribute('href') }
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
root.classList.add('is-rail')
const mod = (a, n) => ((a % n) + n) % n
const rails = [...document.querySelectorAll('.work__pin')].map((pin) => {
  const track = pin.querySelector('.work__track'), strip = pin.querySelector('.work__strip')
  const originals = [...strip.querySelectorAll('.card')]
  // copies avant et après : cliquables, mais ignorées par le clavier et les lecteurs d'écran
  const copy = () => originals.map((c) => { const k = c.cloneNode(true); k.removeAttribute('id'); k.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id')); k.setAttribute('aria-hidden', 'true'); k.querySelectorAll('a').forEach((x) => (x.tabIndex = -1)); return k })
  for (let i = 0; i < COPIES; i++) { strip.prepend(...copy()); strip.append(...copy()) }
  const r = { pin, track, strip, originals, x: 0, target: 0, vel: 0, setW: 0, start: 0, n: 0, last: 0 }
  r.measure = () => {
    const shown = originals.filter((c) => c.offsetParent)
    r.n = shown.length
    r.start = shown[0] ? shown[0].offsetLeft - strip.firstElementChild.offsetLeft : 0
    const all = [...strip.children].filter((c) => c.offsetParent)
    r.setW = all[r.n] ? all[r.n].offsetLeft - all[0].offsetLeft : 0
    r.step = r.n ? r.setW / r.n : track.clientWidth
  }
  r.measure()
  const nudge = (d) => { r.target = Math.round((r.target + d) / r.step) * r.step; r.last = performance.now() }
  pin.querySelectorAll('.work__nav').forEach((b) => b.addEventListener('click', () => nudge(r.step * +b.dataset.dir)))
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); nudge(r.step * (e.key === 'ArrowRight' ? 1 : -1)) } })
  // pavé tactile / molette latérale (ou Maj + molette)
  track.addEventListener('wheel', (e) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
    if (!dx) return
    e.preventDefault(); e.stopPropagation()
    r.target += dx * (e.deltaMode === 1 ? 32 : 1); r.last = performance.now(); r.wheel = true
  }, { passive: false })
  // glisser (souris, doigt, stylet) ; le défilement vertical au doigt reste au navigateur (touch-action: pan-y)
  let down = null, moved = false
  track.addEventListener('pointerdown', (e) => {
    if (e.button) return
    down = { x: e.clientX, t0: r.target, px: e.clientX, pt: performance.now(), id: e.pointerId }; moved = false; r.vel = 0
  })
  addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return
    const dx = e.clientX - down.x
    if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-drag'); track.setPointerCapture?.(e.pointerId) }
    if (!moved) return
    const now = performance.now(), dt = Math.max(1, now - down.pt)
    r.vel = 0.8 * r.vel + 0.2 * (-(e.clientX - down.px) / dt)   // px / ms
    down.px = e.clientX; down.pt = now
    r.target = r.x = down.t0 - dx; r.last = now
  })
  const up = (e) => {
    if (!down || (e.pointerId !== undefined && e.pointerId !== down.id)) return
    down = null; track.classList.remove('is-drag')
    if (moved) { r.target += r.vel * 320; r.wheel = false; r.last = performance.now() - 120 }   // inertie
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
    // à l'arrêt, la piste se cale doucement sur la carte la plus proche
    if (!r.isDown() && now - r.last > (r.wheel ? 260 : 140)) { r.target = Math.round(r.target / r.step) * r.step; r.wheel = false }
    if (!r.isDown()) r.x += (r.target - r.x) * (reduced ? 1 : 1 - Math.exp(-dt / 0.11))
    const k = mod(r.x, r.setW)
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
const heroWords = [...document.querySelectorAll('.hero__line .w')]
if (!heroWords.length) root.classList.add('hero-done')   // pages sans accueil : tout est visible d'emblée
let heroOn = -1
const wordsSvg = [...document.querySelectorAll('.hero .studio__word')]
// chaque moitié du logotype (HOLO / SENE) cadrée sur ses lettres
// même hauteur de cadre pour les deux (celle de HOLO, avec ses capitales) : les lettres gardent la même échelle

const word = null
const wordBlocks = [...document.querySelectorAll('[data-words]:not(.hero__line)')].map((el) => ({ el, words: [...el.querySelectorAll('.w')], on: -1 }))
function scrollEffects() {
  const vh = innerHeight
  // la bande du bas s'efface en haut de page (mots-clés de l'accueil) et en fin de page (pied de page)
  root.classList.toggle('edge-bottom-off', scrollY < 40 || scrollY + vh > document.documentElement.scrollHeight - 120)
  // accueil épinglé : avancée hp (0 à 1) ; le mot se trace puis se remplit, puis la présentation s'allume
  const hr = hero?.getBoundingClientRect()
  const hp = hr ? Math.min(1, Math.max(0, -hr.top / Math.max(1, hr.height - vh))) : 1
  const k = (a, b) => Math.min(1, Math.max(0, (hp - a) / (b - a)))
  if (heroWords.length) {
    const on = Math.round(k(0.5, 0.72) * heroWords.length)   // après le logo (0 à 0,45) et le nom (0,3 à 0,58)
    if (on !== heroOn) { heroWords.forEach((w, i) => w.classList.toggle('on', i < on)); heroOn = on }
    // la barre du haut et le reste du site n'apparaissent qu'une fois la scène de l'accueil finie, quand l'écran
    // commence à descendre (jusque-là : le fond, le gros logo et la présentation seulement)
    if (on === heroWords.length && hp >= 0.999) root.classList.add('hero-done')
  }
  // le nom existe en deux versions (une ligne / deux lignes sur mobile) : même avancée pour les deux
  wordsSvg.forEach((w) => {
    const p = k(0.3, 0.58)
    w.style.setProperty('--draw', (1 - Math.min(1, p * 1.5)).toFixed(3))
    w.style.setProperty('--fill', Math.min(1, Math.max(0, (p - 0.5) / 0.5)).toFixed(3))
  })
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
if (reduced) { root.classList.add('hero-done'); heroWords.forEach((w) => w.classList.add('on')); wordsSvg.forEach((w) => w.style.setProperty('--draw', 0)); wordBlocks.forEach((b) => b.words.forEach((w) => w.classList.add('on'))) }

/* Chargeur : le « o » du logo-kit. Un arc tourne ; ses couleurs sont celles de la roue du kit à leur angle exact (il
   dévoile le vrai « o »), son opacité va de 0 à la queue à 1 à la tête (arrondie) : ni noir ni gris. En fin de
   chargement, il se referme en anneau plein et grandit en accélérant (60 % → 100 % du rayon du relais) ; le « o » du logo prend le relais
   au même pixel et à la même vitesse, puis ralentit. Le fond du chargeur s'efface pendant la fermeture.
   Dégradés coniques Canvas 2D : dessinés par le navigateur, aucun calcul par pixel en JavaScript. */
const spin = document.querySelector('.loader__spin'), loaderEl = document.querySelector('.loader')
FLOW.loaderNeeds = !!spin
let finishLoader = (done) => done()
if (spin?.getContext('2d').createConicGradient) {
  const dpr = Math.min(devicePixelRatio || 1, 2), S = 96
  spin.width = S * dpr; spin.height = S * dpr
  const x = spin.getContext('2d')
  const TAU = Math.PI * 2, C = S / 2
  // couleurs : la roue « flux » de l'image en cours (flow.js, même texture et même horloge que le logo : aucun saut de
  // couleur au relais), lue à son angle exact ; t = 0 en bas, sens horaire (angle canvas du bas : π/2)
  FLOW.mix = 1   // réglages « loading » du kit pendant le chargement
  const flowGradient = () => {
    const g = x.createConicGradient(Math.PI / 2, C, C), L8 = FLOW.lut, n = 64
    for (let i = 0; i <= n; i++) { const j = ((i % n) * (FLOW.size / n)) * 4; g.addColorStop(i / n, `rgb(${L8[j]} ${L8[j + 1]} ${L8[j + 2]})`) }
    return g
  }
  // rayon : R1 au relais (fixé par le logo selon l'écran, 44 px au plus), R0 = 60 % de R1 pendant le chargement
  let finishAt = 0, onDone = null, growD = 400, R1 = 44, R0 = 26, sized = false
  // fin du chargement : l'arc s'allonge jusqu'au tour complet et sa queue devient opaque (1,3 s) ; pendant les derniers
  // growD ms, l'anneau grandit en accélérant (t²) jusqu'à 44 px, à la vitesse initiale de la croissance du logo
  finishLoader = (done) => {
    finishAt = performance.now(); onDone = done
    loaderEl?.classList.add('loader--closing')
    const it = gl?.intro?.()
    if (it) { R0 *= it.r0 / R1; R1 = it.r0; const v = 3 * (it.r1 - it.r0) / it.grow; growD = Math.min(900, Math.max(200, 2 * (R1 - R0) / Math.max(v, 1e-3))) }
  }
  const draw = (t) => {
    // première image : rayon du relais selon l'écran (gl est créé plus bas dans ce fichier, il existe à ce moment-là)
    if (!sized) { sized = true; const it = gl?.intro?.(); if (it) { R1 = it.r0; R0 = R1 * 0.6 } }
    if (root.classList.contains('is-loaded') && getComputedStyle(spin.parentElement).visibility === 'hidden') return
    const fin = finishAt ? Math.min(1, (t - finishAt) / 1300) : 0, fe = fin * fin * (3 - 2 * fin)
    // flux : de « loading » vers « idle » pendant les 600 premières ms de la fermeture
    const toIdle = finishAt ? Math.min(1, (t - finishAt) / 600) : 0
    FLOW.mix = 1 - toIdle * toIdle * (3 - 2 * toIdle)
    const arc = Math.PI * 1.7 + (TAU - Math.PI * 1.7) * fe          // longueur de l'arc
    const head = (t / 1000) * TAU * 0.9 - Math.PI / 2               // angle canvas de la tête
    const tail = head - arc
    const gz = finishAt ? Math.min(1, Math.max(0, (t - finishAt - (1300 - growD)) / growD)) : 0
    const R = R0 + (R1 - R0) * gz * gz, r = R * IRIS_INNER_RATIO, mid = (R + r) / 2
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, S, S)
    x.globalCompositeOperation = 'source-over'
    x.lineWidth = R - r; x.lineCap = fe >= 1 ? 'butt' : 'round'; x.strokeStyle = flowGradient()
    x.beginPath(); fe >= 1 ? x.arc(C, C, mid, 0, TAU) : x.arc(C, C, mid, tail, head); x.stroke()
    if (fe < 1) {
      // opacité : 0 à la queue (fe à la fermeture) → 1 à la tête, courbe douce ; au-delà de la tête (bout arrondi) : 1,
      // puis retour à la valeur de la queue au milieu de l'écart, pour que le bout arrondi de la queue reste effacé
      const h = arc / TAU, g = (1 - h) / 2, a0 = fe
      const fade = x.createConicGradient(tail, C, C)
      for (let i = 0; i <= 8; i++) { const u = i / 8; fade.addColorStop(h * u, `rgb(0 0 0 / ${a0 + (1 - a0) * Math.pow(u, 1.6)})`) }
      fade.addColorStop(Math.min(1, h + g * 0.9), 'rgb(0 0 0 / 1)')
      fade.addColorStop(Math.min(1, h + g * 0.95), `rgb(0 0 0 / ${a0})`)
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = fade; x.fillRect(0, 0, S, S)
    }
    if (fin >= 1 && onDone) { const d = onDone; onDone = null; FLOW.mix = 0; FLOW.loaderNeeds = false; d() }
    requestAnimationFrame(draw)
  }
  requestAnimationFrame(draw)
}

/* Écran de chargement : polices, image de l'accueil, au moins 1 s ; au plus 6 s. Le défilement est bloqué pendant ce temps. */
lenis?.stop(); scrollTo(0, 0)
const heroImg = document.querySelector('.hero__view img')
Promise.race([
  Promise.all([
    document.fonts?.ready,
    heroImg && !heroImg.complete ? new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }) }) : null,
    new Promise((r) => setTimeout(r, reduced ? 0 : 1000)),
    new Promise((r) => setTimeout(() => (gl?.ready || Promise.resolve()).then(r))),   // logo WebGL prêt (gl créé plus bas)
  ]),
  new Promise((r) => setTimeout(r, 6000)),
]).then(() => finishLoader(() => { root.classList.add('is-loaded'); if (!ficheOf()) lenis?.start() }))

/* WebGL : trame de points et lentille. Sans WebGL, les images restent visibles. */
let gl = null
try { gl = createGL(document.querySelector('.gl-canvas'), { reduced }) } catch (err) { console.warn(err) }
// fond : formes colorées derrière une plaque dépolie, qui défilent avec la page et réagissent au curseur
let backdrop = null
try { backdrop = createBackdrop(document.querySelector('.bg-canvas'), { reduced }) } catch (err) { console.warn(err) }

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
