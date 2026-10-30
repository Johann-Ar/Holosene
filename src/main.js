import './styles.css'
import Lenis from 'lenis'
import { createGL } from './gl.js'

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

/* Essai : la touche Espace bascule entre le noir actuel et le noir pur (choix mémorisé). */
root.classList.toggle('pure-black', store.get('black') === 'pure')
addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat || root.classList.contains('fiche-open') || e.target.closest?.('input, textarea, button, a, [contenteditable]')) return
  e.preventDefault()
  const on = root.classList.toggle('pure-black')
  store.set('black', on ? 'pure' : null)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', on ? '#000000' : '#0e0e0e')
})

/* Verre liquide sur les bords : seulement sur Chromium (filtre SVG en arrière-plan) et sans réduction des animations. */
if (navigator.userAgentData?.brands?.some((b) => /Chromium/.test(b.brand)) && !reduced) root.classList.add('liquid')

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
const lenis = reduced ? null : new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 })
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
let lastFocus = null
function syncFiche() {
  const open = document.querySelector('.fiche:target')
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

/* Fiches, grand écran : la rangée est déplacée par le script.
   - pavé tactile (petits pas continus) : suit le geste directement, sans lissage ajouté ;
   - molette de souris (grands pas) : glisse en douceur ;
   - glisser à la souris ou au doigt, flèches du clavier.
   Au bout, continuer à défiler remplit une jauge puis ouvre le projet suivant. */
const wide = matchMedia('(min-width: 769px)')
const PULL = 480
const fiches = [...document.querySelectorAll('.fiche')].map((f) => {
  const row = f.querySelector('.fiche__row'), next = f.querySelector('.fiche__next')
  const F = { f, row, x: 0, target: 0, max: 0, pull: 0, lastPull: 0, smooth: false }
  const setPull = (v) => { F.pull = Math.max(0, v); f.style.setProperty('--pull', Math.min(F.pull / PULL, 1).toFixed(3)) }
  const pullBy = (d) => {
    setPull(F.pull + d); F.lastPull = performance.now()
    if (F.pull >= PULL) { setPull(0); location.hash = next.getAttribute('href') }
  }
  F.measure = () => { F.max = Math.max(0, row.scrollWidth - innerWidth); F.target = Math.min(F.target, F.max) }
  const by = (d, smooth) => {
    const before = F.target
    F.target = Math.max(0, Math.min(F.max, F.target + d))
    F.smooth = smooth; if (!smooth) F.x = F.target
    const rest = d - (F.target - before)
    if (rest > 0 && F.target >= F.max - 1) pullBy(rest * 0.55)
    else if (d < 0 && F.pull > 0) pullBy(d)
  }
  f.addEventListener('wheel', (e) => {
    if (!wide.matches || e.ctrlKey || e.target.closest('.fiche__col') && e.target.closest('.fiche__col').scrollHeight > e.target.closest('.fiche__col').clientHeight + 2 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) return
    e.preventDefault()
    const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerWidth : 1)
    by(d, e.deltaMode !== 0 || Math.abs(d) >= 50)   // grands pas : molette ; petits pas : pavé tactile
  }, { passive: false })
  f.addEventListener('keydown', (e) => {
    if (!wide.matches) return
    const k = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }[e.key]
    if (k && !e.target.closest('a, button')) { e.preventDefault(); by(k * innerWidth * 0.6, true) }
  })
  let down = null
  row.addEventListener('pointerdown', (e) => { if (!wide.matches || e.button || e.target.closest('a, button')) return; down = { x: e.clientX, t: F.target, id: e.pointerId, moved: false } })
  addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return
    const dx = e.clientX - down.x
    if (!down.moved && Math.abs(dx) > 6) { down.moved = true; row.classList.add('is-drag') }
    if (down.moved) { F.target = F.x = Math.max(0, Math.min(F.max, down.t - dx)); F.smooth = false }
  })
  addEventListener('pointerup', () => { if (down) { row.classList.remove('is-drag'); down = null } })
  F.reset = () => {
    F.x = F.target = 0; setPull(0)
    f.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'))   // images chargées dès l'ouverture
    F.measure()
  }
  F.frame = (dt) => {
    if (F.pull > 0 && performance.now() - F.lastPull > 160) setPull(F.pull * 0.9 - 2)
    if (F.smooth) F.x += (F.target - F.x) * (reduced ? 1 : 1 - Math.exp(-dt / 0.12))
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
  const open = document.querySelector('.fiche:target')
  const F = open && fiches.find((x) => x.f === open)
  F?.frame(dt)
}
addEventListener('keydown', (e) => {
  const open = document.querySelector('.fiche:target')
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
  return r
})
addEventListener('resize', () => rails.forEach((r) => r.measure()))
addEventListener('load', () => rails.forEach((r) => r.measure()))
let railT = performance.now()
function workFrame(now = performance.now()) {
  const dt = Math.min(0.05, (now - railT) / 1000); railT = now
  for (const r of rails) {
    if (!r.setW) continue
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
const word = document.querySelector('.studio__word')
const wordBlocks = [...document.querySelectorAll('[data-words]')].map((el) => ({ el, words: [...el.querySelectorAll('.w')], on: -1 }))
function scrollEffects() {
  const vh = innerHeight
  // la bande du bas s'efface en haut de page (mots-clés de l'accueil) et en fin de page (pied de page)
  root.classList.toggle('edge-bottom-off', scrollY < 40 || scrollY + vh > document.documentElement.scrollHeight - 120)
  if (word) {
    const r = word.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)))
    word.style.setProperty('--draw', (1 - Math.min(1, p * 1.5)).toFixed(3))
    word.style.setProperty('--fill', Math.min(1, Math.max(0, (p - 0.5) / 0.5)).toFixed(3))
  }
  for (const b of wordBlocks) {
    const r = b.el.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.25)))
    const on = Math.round(p * b.words.length)
    if (on !== b.on) { b.words.forEach((w, i) => w.classList.toggle('on', i < on)); b.on = on }
  }
}
if (reduced) { word?.style.setProperty('--draw', 0); wordBlocks.forEach((b) => b.words.forEach((w) => w.classList.add('on'))) }

/* WebGL : trame de points et lentille. Sans WebGL, les images restent visibles. */
let gl = null
try { gl = createGL(document.querySelector('.gl-canvas'), { reduced }) } catch (err) { console.warn(err) }

function loop(t) {
  lenis?.raf(t)
  gl?.frame(t)
  workFrame(t)
  ficheFrame(t)
  if (!reduced) scrollEffects()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

syncFiche()
