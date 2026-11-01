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
    const on = Math.round(k(0.02, 0.3) * heroWords.length)
    if (on !== heroOn) { heroWords.forEach((w, i) => w.classList.toggle('on', i < on)); heroOn = on }
  }
  wordsSvg.forEach((w, i) => {
    const p = k(0.3 + i * 0.14, 0.58 + i * 0.14)
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
if (reduced) { heroWords.forEach((w) => w.classList.add('on')); wordsSvg.forEach((w) => w.style.setProperty('--draw', 0)); wordBlocks.forEach((b) => b.words.forEach((w) => w.classList.add('on'))) }

/* Chargeur : le « o » du logo en miniature. Un arc lisse à bout arrondi tourne ; il s'éteint vers la queue et n'est
   irisé qu'à son bout ; en fin de chargement, il se referme en « o » irisé. */
const spin = document.querySelector('.loader__spin')
let finishLoader = (done) => done()
if (spin) {
  const dpr = Math.min(devicePixelRatio || 1, 2), S = 96
  spin.width = S * dpr; spin.height = S * dpr
  const x = spin.getContext('2d'); x.scale(dpr, dpr)
  const IR = [[56, 237, 143], [71, 153, 255], [199, 84, 255], [255, 77, 237]]
  // roue irisée du logo (comme le shader : 0 = en haut, sens horaire)
  const WHEEL = [[255, 77, 237], [255, 84, 163], [199, 84, 255], [71, 153, 255], [56, 237, 143], [255, 77, 237]]
  const wheel = (t) => { const f = (((t % 1) + 1) % 1) * 5, i = Math.floor(f), u = f - i, s3 = u * u * (3 - 2 * u); return WHEEL[i].map((c, j) => c + (WHEEL[i + 1][j] - c) * s3) }
  const R = 44, r = 23, mid = (R + r) / 2, half = (R - r) / 2, STEP = 6, TAU = Math.PI * 2
  let finishAt = 0, onDone = null
  // fin du chargement : encore un tour et demi, l'arc se referme et se remplit des couleurs du « o » du logo
  finishLoader = (done) => { finishAt = performance.now(); onDone = done }
  // dessin pixel par pixel : trame de points (comme le logo) et bord de verre des vignettes sur le contour de l'arc
  const P = S * dpr, img = x.createImageData(P, P)
  x.setTransform(1, 0, 0, 1, 0, 0)
  const draw = (t) => {
    if (root.classList.contains('is-loaded') && getComputedStyle(spin.parentElement).visibility === 'hidden') return
    const fin = finishAt ? Math.min(1, (t - finishAt) / 1300) : 0, fe = fin * fin * (3 - 2 * fin)
    const ARC = Math.PI * 1.7 + (TAU - Math.PI * 1.7) * fe
    const head = (t / 1000) * TAU * 0.9
    const hx = Math.sin(head) * mid, hy = -Math.cos(head) * mid, W = 6, L = [-0.65 / 1.0018, -0.76 / 1.0018]
    // forme : distance à l'arête (px, positive dedans), normale sortante, position k sur l'arc (1 au bout, 0 à la queue)
    const shape = (px, py) => {
      const rr = Math.hypot(px, py)
      let a = Math.atan2(px, -py) - head; a = ((a % TAU) + TAU * 2) % TAU
      const back = TAU - a
      if (fe > 0.9 || back <= ARC) {
        const dOut = R - rr, dIn = rr - r, s0 = dOut < dIn ? 1 : -1
        return [Math.min(dOut, dIn), s0 * px / (rr || 1), s0 * py / (rr || 1), fe > 0.9 ? Math.max(1 - back / ARC, fe) : 1 - back / ARC]
      }
      const cx = px - hx, cy = py - hy, dc = Math.hypot(cx, cy)
      return [half - dc, cx / (dc || 1), cy / (dc || 1), 1]
    }
    // couleur d'un point : s'éteint vers la queue, irisé au bout ; en fin de chargement, les couleurs du « o »
    const colorAt = (k, px, py) => {
      const v = Math.pow(Math.min(1, k / 0.72), 1.3)
      const u = Math.min(1, Math.max(0, (k - 0.72) / 0.28))
      const f = u * (IR.length - 1), i = Math.min(IR.length - 2, Math.floor(f)), w = f - i
      const ic = IR[i].map((c, n) => (c + (IR[i + 1][n] - c) * w) / 255)
      const lc = wheel(Math.atan2(px, -py) / TAU).map((c) => c / 255)
      return [0, 1, 2].map((n) => { const c = v + (ic[n] - v) * Math.min(1, u * 2.2); return c + (lc[n] - c) * fe })
    }
    const data = img.data
    for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) {
      const o = (j * P + i) * 4
      const px = (i + 0.5) / dpr - S / 2, py = (j + 0.5) / dpr - S / 2
      const [d, nx, ny, k] = shape(px, py)
      if (d < -0.6) { data[o + 3] = 0; continue }
      const cov = Math.min(1, (d + 0.6) / 1.2)
      const s1 = 1 - Math.min(1, Math.max(0, d / W))
      // trame : la forme est lue plus à l'intérieur près de l'arête (réfraction)
      // réfraction comme les vignettes : la grille de points est lue plus à l'intérieur près de l'arête
      const bend = W * 0.42 * s1 * s1 * (3 - 2 * s1)
      const qx = px - nx * bend, qy = py - ny * bend
      const gx = Math.floor((qx + S / 2) / STEP) * STEP + STEP / 2 - S / 2, gy = Math.floor((qy + S / 2) / STEP) * STEP + STEP / 2 - S / 2
      const [dq, , , kq] = shape(gx, gy)
      const dotR = dq > 0 ? 2.5 : 0
      const dotA = Math.min(1, Math.max(0, (dotR - Math.hypot(qx - gx, qy - gy)) * dpr + 0.5))
      const dcol = colorAt(kq, gx, gy)   // en fin de chargement : entièrement irisé, comme le « o » du logo
      // verre du bord : teinte (gris clair, irisée vers le bout), arête claire, reflets
      const tint = colorAt(Math.max(k, 0.0001), px, py).map((c, n) => 0.82 + (c - 0.82) * Math.min(1, Math.max(0, (k - 0.72) / 0.28) * 2 + fe))
      const facing = nx * L[0] + ny * L[1]
      const sp = Math.pow(Math.max(facing, 0), 2) * Math.exp(-Math.abs(d - 2) / 2.2) * 0.95 + Math.pow(Math.max(-facing, 0), 2) * Math.exp(-Math.abs(d - 3) / 3) * 0.35
      const fade = Math.min(1, Math.pow(k, 0.8) * 1.15 + fe)
      const col = [0, 1, 2].map((n) => {
        let c = dcol[n] * dotA
        c = c * (1 + (tint[n] * 1.15 - 1) * 0.85 * Math.pow(s1, 1.1)) + tint[n] * 0.12 * s1
        c *= 0.62 + 0.38 * Math.min(1, Math.max(0, (1 - s1) / 0.75))
        return c + (1 + (tint[n] - 1) * 0.5) * sp + (1 + (tint[n] - 1) * 0.4) * Math.exp(-d / 1.3) * 0.5
      })
      const al = Math.min(1, Math.max(dotA, s1 * 0.35)) * cov * fade
      data[o] = Math.min(255, col[0] * 255 * cov * fade); data[o + 1] = Math.min(255, col[1] * 255 * cov * fade); data[o + 2] = Math.min(255, col[2] * 255 * cov * fade); data[o + 3] = al * 255
    }
    x.putImageData(img, 0, 0)
    if (fin >= 1 && onDone) { const d = onDone; onDone = null; d() }
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
  ]),
  new Promise((r) => setTimeout(r, 6000)),
]).then(() => finishLoader(() => { root.classList.add('is-loaded'); if (!ficheOf()) lenis?.start() }))

/* WebGL : trame de points et lentille. Sans WebGL, les images restent visibles. */
let gl = null
try { gl = createGL(document.querySelector('.gl-canvas'), { reduced }) } catch (err) { console.warn(err) }

function loop(t) {
  lenis?.raf(t)
  // pistes et fiches d'abord, puis le WebGL : les images sont dessinées à la position finale des titres (même image)
  workFrame(t)
  ficheFrame(t)
  gl?.frame(t)
  if (!reduced) scrollEffects()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

syncFiche()
