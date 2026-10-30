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
    open.style.setProperty('--fh', open.querySelector('.fiche__head').offsetHeight + 'px')
    open.focus({ preventScroll: true })
  } else {
    lenis?.start()
    const back = /^#projet-/.test(location.hash) && document.querySelector(location.hash)
    if (back) {
      const tr = back.parentElement
      tr.scrollLeft = back.offsetLeft - tr.firstElementChild.offsetLeft
      const y = tr.getBoundingClientRect().top + scrollY - innerHeight * 0.12
      lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y)
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

/* Projets : piste horizontale indépendante du défilement de la page (pavé tactile, doigt, souris, flèches, clavier). */
const work = document.querySelector('.work')
const track = work?.querySelector('.work__track')
const count = work?.querySelector('.work__count')
const navs = work ? [...work.querySelectorAll('.work__nav')] : []
const cards = track ? [...track.querySelectorAll('.card')] : []
const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth * 0.8)
navs.forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: step() * +b.dataset.dir, behavior: reduced ? 'auto' : 'smooth' })))
track?.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: step() * (e.key === 'ArrowRight' ? 1 : -1), behavior: reduced ? 'auto' : 'smooth' }) } })
// glisser à la souris ; un glissement n'ouvre pas la fiche
if (track) {
  let x0 = 0, s0 = 0, moved = false, down = false
  track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button) return; down = true; moved = false; x0 = e.clientX; s0 = track.scrollLeft })
  addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 5) { moved = true; track.classList.add('is-drag') } if (moved) track.scrollLeft = s0 - dx })
  addEventListener('pointerup', () => { if (!down) return; down = false; track.classList.remove('is-drag') })
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }, true)
  track.addEventListener('dragstart', (e) => e.preventDefault())
}
function workFrame() {
  if (!track) return
  const max = track.scrollWidth - track.clientWidth
  const p = max > 0 ? track.scrollLeft / max : 0
  work.style.setProperty('--p', p.toFixed(4))
  if (count) count.textContent = `${String(Math.min(cards.length, Math.round(p * (cards.length - 1)) + 1)).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`
  if (navs.length) { navs[0].disabled = track.scrollLeft <= 2; navs[1].disabled = track.scrollLeft >= max - 2 }
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
