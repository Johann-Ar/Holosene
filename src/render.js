/**
 * Gabarit des pages : rendu à la compilation (vite.config.js) pour chaque langue.
 * Tout le contenu est dans le HTML publié (lisible sans JavaScript). Les fiches projet s'ouvrent par l'ancre
 * #p-<slug> (CSS :target), le JavaScript ajoute focus, Échap et piégeage du focus.
 */
import { readFileSync } from 'node:fs'
import { site, ui, projects, research, studio, about, workIntro } from './content.js'
import sizes from './media-sizes.json' with { type: 'json' }
import { IRIS_STOPS } from '../design/logo-kit/src/iris.js'

// logotype en ligne (À propos) : le tracé se dessine, le blanc se remplit, puis ses bords se fondent dans une suite
// répétée des couleurs irisées, comme le blanc de l'œil du monogramme noir (étapes successives, pas en même temps).
const logoSrc = readFileSync(new URL('../public/media/logotype-white.svg', import.meta.url), 'utf8')
const logoPaths = logoSrc.match(/<path [^>]*\/>/g).map((x) => x.replace(/ fill="#FFFFFF"/, '')).join('')
const logoBox = logoSrc.match(/viewBox="([^"]+)"/)[1]
// couleurs irisées : la roue du logo-kit (design/logo-kit/src/iris.js), répétée le long du mot
const irisStops = IRIS_STOPS.map(([p, c]) => `<stop offset="${p}" stop-color="${c}"/>`).join('')
const logoParts = logoSrc.match(/<path [^>]*\/>/g).map((x) => x.replace(/ fill="#FFFFFF"/, ''))
// le logotype en deux moitiés : HOLO (H, o, l, o) et SENE (s, e, n, e)
const wordPart = (paths) => `<svg class="studio__word" viewBox="${logoBox}" aria-hidden="true">
  <defs>
    <linearGradient id="iris-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="460" y2="230" spreadMethod="repeat">${irisStops}</linearGradient>
    <linearGradient id="iris-l" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="460" y2="230" spreadMethod="repeat">${irisStops}</linearGradient>
    <filter id="core" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceGraphic" operator="erode" radius="6" result="e"/><feGaussianBlur in="e" stdDeviation="12" result="b"/><feComposite in="b" in2="SourceGraphic" operator="in"/></filter>
  </defs>
  <g class="w-edge" fill="url(#iris-g)">${paths}</g>
  <g class="w-core" fill="currentColor" filter="url(#core)">${paths}</g>
  <g class="w-white" fill="currentColor">${paths}</g>
  <g class="w-line" fill="none" stroke="url(#iris-l)">${paths.replace(/<path /g, '<path pathLength="1" ')}</g>
</svg>`
const logotype = wordPart(logoPaths)
// nom de l'accueil : « Johann Arata », même dessin que le logotype (Archivo 500, largeur 120 %, approche -0,04 em)
const nameSrc = readFileSync(new URL('../public/media/name-white.svg', import.meta.url), 'utf8')
const nameParts = nameSrc.match(/<path [^>]*\/>/g).map((x) => x.replace(/ fill="#FFFFFF"/, ''))
// nom de l'accueil : aplat à l'encre du thème, sans contour ni lueur (il apparaît en fondu, voir .w-solid)
const nameSvg = (paths, box, cls) => `<svg class="studio__word ${cls}" viewBox="${box}" aria-hidden="true"><g class="w-solid" fill="currentColor">${paths}</g></svg>`
const nameWord = nameSvg(nameParts.join(''), nameSrc.match(/viewBox="([^"]+)"/)[1], 'studio__word--line')
// sur mobile : « Arata » sous « Johann », centré (Johann : x 39 à 3803 ; Arata : x 4117 à 6958)
const nameStacked = nameSvg(nameParts.slice(0, 6).join('') + `<g transform="translate(-3616.5 880)">${nameParts.slice(6).join('')}</g>`, '39 -724 3764 1616', 'studio__word--stack')

export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function render(lang) {
  const t = (v) => (v && typeof v === 'object' && 'fr' in v ? v[lang] : v)
  const txt = (v, tag = 'p', cls = '') => {
    if (!v) return ''
    const todo = v.todo ? ' todo' : ''
    return `<${tag} class="${(cls + todo).trim()}">${esc(t(v))}</${tag}>`
  }
  const other = lang === 'fr' ? 'en/' : '../'
  const root = lang === 'fr' ? '' : '../'
  const m = (src) => `${root}media/${src}`

  const n2 = (i) => String(i + 1).padStart(2, '0')

  // un projet = une carte de la piste horizontale : l'image en trame de points, la lentille montre l'original
  // une carte de piste horizontale (projets, recherche) : l'image en trame de points, la lentille montre l'original
  const card = (c) => {
    const tag = c.href ? 'a' : 'div', href = c.href ? ` href="${c.href}"` : ''
    const media = c.image
      ? `<${tag} class="card__media${c.overlay ? ' card__media--badge' : ''}"${href} data-gl="card" data-cell="6"${c.color ? ' data-color' : ''}${c.text ? ` data-text="${esc(c.text)}"` : ''} data-radius="26" aria-label="${esc(t(ui.open))} : ${esc(c.title)}"><img src="${m(c.image)}" alt="" decoding="async" loading="lazy">${c.overlay ? `<span class="disp">${esc(c.badge || '')}</span>` : ''}${c.label ? `<span class="sr">${esc(c.label)}</span>` : ''}</${tag}>`
      : `<div class="card__media card__media--text"><span class="disp">${esc(c.badge || '')}</span></div>`
    return `
      <article class="card${c.todo ? ' todo' : ''}" id="${c.id}" aria-labelledby="${c.id}-t">
        ${media}
        <h3 class="card__line" id="${c.id}-t">${c.href ? `<a href="${c.href}">` : '<span>'}<span class="disp card__name">${esc(c.title)}</span> <span class="lbl card__genre">${esc(c.genre)}</span>${c.href ? '</a>' : '</span>'}${c.todo ? '' : ''}</h3>
      </article>`
  }
  // une piste : cartes, compteur, ligne de progression, flèches
  const rail = (cards, label) => `
    <div class="work__pin">
      <div class="work__track wrap" data-clip tabindex="0" aria-label="${esc(label)}"><div class="work__strip">${cards.join('')}</div></div>
    </div>`

  // fiche projet : en-tête fixe, puis une rangée qui défile à l'horizontale (texte en colonnes, images, projet suivant)
  const fiche = (p, i) => {
    const credits = [...(p.credits || []), ...(p.coverCredit ? [p.coverCredit] : [])]
    const next = projects[(i + 1) % projects.length]
    // petites images (moins de 700 px de large) regroupées par deux, l'une sur l'autre
    // images des fiches : chaque image prend le format le plus proche d'un jeu fixe, du 16:9 (1920 × 1080, le plus
    // large) au 9:16 (smartphone, le plus haut) ; elle est recadrée dedans (object-fit: cover), jamais déformée
    const FORMATS = [16 / 9, 3 / 2, 4 / 3, 1, 4 / 5, 2 / 3, 9 / 16]
    const format = (w, h) => FORMATS.reduce((best, f) => (Math.abs(Math.log(f * h / w)) < Math.abs(Math.log(best * h / w)) ? f : best))
    const fig = (x) => { const [w, h] = sizes[x.src] || [1200, 800]; return `<figure style="--r:${format(w, h).toFixed(4)}"><img src="${m(x.src)}" alt="${esc(t(x.alt))}" width="${w}" height="${h}" loading="lazy" decoding="async"></figure>` }
    const small = (x) => (sizes[x.src]?.[0] || 1200) < 700
    const media = []
    for (let k = 0; k < p.media.length; k++) {
      const a = p.media[k], b = p.media[k + 1]
      if (small(a) && b && small(b)) { media.push(`<div class="duo">${fig(a)}${fig(b)}</div>`); k++ } else media.push(fig(a))
    }
    // un seul texte explicatif (sans rubriques) : intention et contexte, captation et traitement, mise en scène et limites
    const body = [[p.intent, p.context], [p.capture, p.processing], [p.staging, p.learned]]
      .map((g) => g.filter((v) => v && !v.todo).map((v) => esc(t(v))).join(' ')).filter(Boolean)
    // fiche technique : étiquettes alignées, séparateur « // »
    const info = (label, values, todo = false) => (values.length ? `<div class="fiche__info${todo ? ' todo' : ''}"><dt>${esc(t(label))}</dt>${values.map((v) => `<dd>${v}</dd>`).join('')}</div>` : '')
    const infos = [
      info({ fr: 'Milieu', en: 'Setting' }, [esc(t(p.milieu))]),
      info(ui.role, [esc(t(p.role))], !!p.role?.todo),
      info(ui.tools, [esc(p.tools)]),
      info(ui.year, [esc(p.year)]),
      info(ui.creditsLabel, credits.filter((c) => !c.todo).map((c) => esc(t(c)))),
    ].join('')
    return `
  <section class="fiche" id="p-${p.slug}" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="p-${p.slug}-t" tabindex="-1">
    <div class="edge edge--top" aria-hidden="true"></div>
    <header class="fiche__head wrap"><div class="topbar__glass" aria-hidden="true">${'<i></i>'.repeat(5)}</div>
      <span class="disp fiche__mini" aria-hidden="true">${esc(p.title)}</span>
      <div class="fiche__tools"><a class="fiche__close" href="#${p.research ? 'recherche' : 'projet'}-${p.slug}">${esc(t(ui.close))}</a></div>
    </header>
    <div class="fiche__row">
      <div class="fiche__text">
        <h2 class="disp fiche__title" id="p-${p.slug}-t">${esc(p.title)}</h2>
        <div class="fiche__body">${body.map((x) => `<p>${x}</p>`).join('')}</div>
        <dl class="fiche__infos">${infos}</dl>
        ${p.link ? `<a class="fiche__open" href="${esc(p.link.href)}" target="_blank" rel="noopener">${esc(t(p.link.label))} ↗</a>` : ''}
      </div>
      <div class="fiche__media">${media.join('')}</div>
      <a class="fiche__next" href="#p-${next.slug}">
        <span class="lbl">${lang === 'fr' ? 'Projet suivant' : 'Next project'}</span>
        <span class="disp">${esc(next.title)} →</span>
      </a>
    </div>
  </section>`
  }

  const selected = projects.filter((p) => !p.research)
  const words = (str) => str.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ')
  return `
<a class="skip" href="#projets">${esc(t(ui.skip))}</a>
<div class="loader" aria-hidden="true"><div class="loader__o"><div class="loader__arc"><i class="loader__ring"></i></div><i class="loader__ring loader__full"></i></div></div>
<canvas class="bg-canvas" aria-hidden="true"></canvas>
<canvas class="gl-canvas" aria-hidden="true"></canvas>
<div class="edge edge--top" aria-hidden="true"></div><div class="edge edge--bottom" aria-hidden="true"></div>
<header class="topbar wrap">
  <div class="topbar__glass" aria-hidden="true">${'<i></i>'.repeat(5)}</div>
  <nav class="topbar__nav" aria-label="${esc(t(ui.nav))}">
    <a href="#projets">${esc(t(ui.projects))}</a><a href="#a-propos">${esc(t(ui.studio))}</a><a href="#contact">${esc(t(ui.contact))}</a>
  </nav>
  <a href="#top" class="brand" aria-label="Holosene">
    <img class="brand__mark only-dark" draggable="false" src="${root}media/monogram-iris-dark.svg" alt="Holosene" width="470" height="576">
    <img class="brand__mark only-light" draggable="false" src="${root}media/monogram-iris-light.svg" alt="Holosene" width="470" height="576">
  </a>
  <div class="topbar__tools">
    <button class="theme-toggle" type="button" data-light="${esc(t(ui.themeLight))}" data-dark="${esc(t(ui.themeDark))}" aria-label="${esc(t(ui.themeLight))}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 2.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor"/></svg></button>
    <a class="lang" href="${other}" hreflang="${lang === 'fr' ? 'en' : 'fr'}" lang="${lang === 'fr' ? 'en' : 'fr'}" aria-label="${esc(t(ui.langLabel))}">${lang === 'fr' ? 'EN' : 'FR'}</a>
  </div>
</header>

<main id="top">
  <section class="hero" id="accueil" aria-labelledby="hero-t">
    <div class="hero__pin">
      <div class="hero__view" data-gl="mark" data-cell="6" role="img" aria-label="${esc(t(ui.lensLabel))}">
        <img src="${m('riviere-calme.webp')}" alt="" decoding="async" fetchpriority="high">
      </div>
      <div class="hero__copy">
        <div class="hero__slot" aria-hidden="true"><img class="hero__mark only-dark" src="${root}media/monogram-iris-dark.svg" alt="" width="470" height="576"><img class="hero__mark only-light" src="${root}media/monogram-iris-light.svg" alt="" width="470" height="576"></div>
        <h1 id="hero-t" class="hero__word"><span class="sr">Johann Arata · Holosene</span>${nameWord}${nameStacked}</h1>
        <p class="hero__line" data-hwords>${words(t(studio))}</p>
        <a class="hero__cta" href="#projets" aria-label="${lang === 'fr' ? 'Voir les projets' : 'See the work'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </div>
    </div>
  </section>

  <section class="work" id="projets" aria-labelledby="proj-t">
    <header class="sec-head wrap">
      <h2 class="disp" id="proj-t">${lang === 'fr' ? 'Projets choisis' : 'Selected work'}</h2>
      <p class="lbl sec-head__sub" data-reveal>${esc(t(workIntro))}</p>
    </header>
    ${rail(selected.map((p, i) => card({ id: `projet-${p.slug}`, href: `#p-${p.slug}`, image: p.cover, title: p.title, genre: t(p.genre), credit: p.coverCredit && t(p.coverCredit) })), lang === 'fr' ? 'Projets, défilement horizontal' : 'Projects, horizontal scroll')}
  </section>

  <section class="work work--research" id="recherche" aria-labelledby="research-t">
    <header class="sec-head wrap">
      <h2 class="disp" id="research-t">${esc(t(ui.research))}</h2>
      <p class="lbl sec-head__sub" data-reveal>${esc(t(research.intro))}</p>
    </header>
    ${rail(research.items.map((r, i) => card({ id: `recherche-${r.slug || i + 1}`, href: r.href, image: t(r.image), text: r.label && t(r.label), badge: r.when && t(r.when), title: t(r.title), genre: t(r.kind), todo: r.todo })), lang === 'fr' ? 'Recherche, défilement horizontal' : 'Research, horizontal scroll')}
  </section>

  <section class="about wrap" id="a-propos" aria-labelledby="about-t">
    <h2 class="lbl" id="about-t" data-reveal>${esc(t(ui.studio))}</h2>
    ${about.map((a, k) => `<p data-reveal style="--d:${k * 80}ms">${esc(t(a)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`).join('')}
    <div class="contact" id="contact" data-reveal>
      <h2 class="lbl" id="contact-t">${esc(t(ui.contact))}</h2>
      <a class="mail" href="mailto:${esc(site.email)}" translate="no"><span>${esc(site.email)}</span></a>
      <div class="contact__row">
        <button class="btn btn--light copy" type="button" data-copy="${esc(site.email)}" data-done="${esc(t(ui.copied))}">${esc(t(ui.copy))}</button>
        <ul class="socials">${site.socials.map((s) => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join('')}</ul>
      </div>
    </div>
  </section>

</main>

<footer class="foot wrap">
  <p class="lbl">© ${new Date().getFullYear()} Holosene · Johann Arata</p>
  <a class="lbl" href="${root}mentions-legales.html">${esc(t(ui.legal))}</a>
</footer>

${projects.map(fiche).join('')}
<div class="fiche-veil" aria-hidden="true"></div>
`
}
