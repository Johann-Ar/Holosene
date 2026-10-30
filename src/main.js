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
  if (!id || id.startsWith('p-')) return
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
    open.focus({ preventScroll: true })
  } else {
    lenis?.start()
    const back = /^#projet-/.test(location.hash) && document.querySelector(location.hash)
    if (back) {
      const y = pinned ? cardScrollY(back) : null
      if (y !== null) lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y)
      else { back.scrollIntoView({ block: 'center' }); back.parentElement.scrollLeft = back.offsetLeft - back.parentElement.offsetLeft }
    }
    if (lastFocus) { lastFocus.focus?.({ preventScroll: true }); lastFocus = null }
  }
}
addEventListener('hashchange', syncFiche)
syncFiche()
addEventListener('keydown', (e) => {
  const open = document.querySelector('.fiche:target')
  if (!open) return
  if (e.key === 'Escape') { e.preventDefault(); location.hash = 'projet-' + open.id.slice(2) }
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

/* Projets : sur grand écran, la piste horizontale avance pendant que l'on fait défiler la page. */
const work = document.querySelector('.work')
const scroller = work?.querySelector('.work__scroller')
const track = work?.querySelector('.work__track')
const count = work?.querySelector('.work__count')
const cards = track ? [...track.querySelectorAll('.card')] : []
const pinMedia = matchMedia('(min-width: 761px)')
let pinned = false, span = 0
function layoutWork() {
  if (!work) return
  pinned = pinMedia.matches && !reduced
  root.classList.toggle('is-pinned', pinned)
  span = pinned ? Math.max(0, track.scrollWidth - innerWidth) : 0
  scroller.style.height = pinned ? `${span + innerHeight}px` : ''
}
layoutWork(); addEventListener('resize', layoutWork); addEventListener('load', layoutWork)
/** Défilement vertical qui amène la carte à l'écran. */
function cardScrollY(card) {
  const top = scroller.getBoundingClientRect().top + scrollY
  return top + Math.min(span, Math.max(0, card.offsetLeft - cards[0].offsetLeft))
}
function workFrame() {
  if (!work) return
  let p
  if (pinned) {
    const start = scroller.getBoundingClientRect().top
    const x = Math.min(span, Math.max(0, -start))
    track.style.setProperty('--x', x.toFixed(1))
    p = span ? x / span : 0
  } else p = track.scrollWidth > track.clientWidth ? track.scrollLeft / (track.scrollWidth - track.clientWidth) : 0
  work.style.setProperty('--p', p.toFixed(4))
  if (count) count.textContent = `${String(Math.min(cards.length, Math.round(p * (cards.length - 1)) + 1)).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`
}

/* À propos : le logotype se trace puis se remplit ; les grands textes s'allument mot à mot au défilement. */
const word = document.querySelector('.studio__word')
const wordBlocks = [...document.querySelectorAll('[data-words]')].map((el) => ({ el, words: [...el.querySelectorAll('.w')], on: -1 }))
function scrollEffects() {
  const vh = innerHeight
  if (word) {
    const r = word.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)))
    word.style.setProperty('--draw', (1 - Math.min(1, p * 1.5)).toFixed(3))
    word.style.setProperty('--fill', Math.min(1, Math.max(0, (p - 0.55) / 0.4)).toFixed(3))
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
  workFrame()
  if (!reduced) scrollEffects()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
