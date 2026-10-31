/**
 * Gabarit des pages : rendu à la compilation (vite.config.js) pour chaque langue.
 * Tout le contenu est dans le HTML publié (lisible sans JavaScript). Les fiches projet s'ouvrent par l'ancre
 * #p-<slug> (CSS :target), le JavaScript ajoute focus, Échap et piégeage du focus.
 */
import { readFileSync } from 'node:fs'
import { site, ui, projects, research, studio, about, workIntro } from './content.js'
import sizes from './media-sizes.json' with { type: 'json' }

// logotype en ligne (À propos) : le tracé se dessine, le blanc se remplit, puis ses bords se fondent dans une suite
// répétée des couleurs irisées, comme le blanc de l'œil du monogramme noir (étapes successives, pas en même temps).
const logoSrc = readFileSync(new URL('../public/media/logotype-white.svg', import.meta.url), 'utf8')
const logoPaths = logoSrc.match(/<path [^>]*\/>/g).map((x) => x.replace(/ fill="#FFFFFF"/, '')).join('')
const logoBox = logoSrc.match(/viewBox="([^"]+)"/)[1]
// couleurs irisées éclaircies vers le blanc : l'irisé reste un reflet, pas une couleur franche
const IRIS = ['#e1adcd', '#abcce3', '#abe7c2', '#adcce4', '#e0aece', '#faafd8', '#ffaaf3', '#feacdd', '#e1adcd']
const IRIS_LINE = ['#f0d7e7', '#d6e6f1', '#d6f3e1', '#d7e6f2', '#f0d7e7', '#fdd8ec', '#ffd5f9', '#ffd7ee', '#f0d7e7']
const logotype = `<svg class="studio__word" viewBox="${logoBox}" aria-hidden="true">
  <defs>
    <linearGradient id="iris-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="460" y2="230" spreadMethod="repeat">${IRIS.map((c, i) => `<stop offset="${i / 8}" stop-color="${c}"/>`).join('')}</linearGradient>
    <linearGradient id="iris-l" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="460" y2="230" spreadMethod="repeat">${IRIS_LINE.map((c, i) => `<stop offset="${i / 8}" stop-color="${c}"/>`).join('')}</linearGradient>
    <filter id="core" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceGraphic" operator="erode" radius="6" result="e"/><feGaussianBlur in="e" stdDeviation="12" result="b"/><feComposite in="b" in2="SourceGraphic" operator="in"/></filter>
  </defs>
  <g class="w-edge" fill="url(#iris-g)">${logoPaths}</g>
  <g class="w-core" fill="#fff" filter="url(#core)">${logoPaths}</g>
  <g class="w-white" fill="#fff">${logoPaths}</g>
  <g class="w-line" fill="none" stroke="url(#iris-l)">${logoPaths.replace(/<path /g, '<path pathLength="1" ')}</g>
</svg>`

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
        <h3 class="card__line" id="${c.id}-t">${c.href ? `<a href="${c.href}">` : '<span>'}<span class="disp card__name">${esc(c.title)}</span> <span class="lbl card__genre">// ${esc(c.genre)}</span>${c.href ? '</a>' : '</span>'}${c.todo ? '' : ''}</h3>
      </article>`
  }
  // une piste : cartes, compteur, ligne de progression, flèches
  const rail = (cards, label) => `
    <div class="work__pin">
      <div class="work__track wrap" data-clip tabindex="0" aria-label="${esc(label)}"><div class="work__strip">${cards.join('')}</div></div>
    </div>`

  // fiche projet : en-tête fixe, puis une rangée qui défile à l'horizontale (texte en colonnes, images, projet suivant)
  const fiche = (p, i) => {
    const s = ui.sections
    const sect = (label, v) => (v ? `<section class="fiche__part${v.todo ? ' todo' : ''}"><h3 class="lbl">${esc(t(label))}</h3><p>${esc(t(v))}</p></section>` : '')
    const credits = [...(p.credits || []), ...(p.coverCredit ? [p.coverCredit] : [])]
    const next = projects[(i + 1) % projects.length]
    // petites images (moins de 700 px de large) regroupées par deux, l'une sur l'autre
    const fig = (x) => { const [w, h] = sizes[x.src] || [1200, 800]; return `<figure style="--r:${(w / h).toFixed(3)}"><img src="${m(x.src)}" alt="${esc(t(x.alt))}" width="${w}" height="${h}" loading="lazy" decoding="async"></figure>` }
    const small = (x) => (sizes[x.src]?.[0] || 1200) < 700
    const media = []
    for (let k = 0; k < p.media.length; k++) {
      const a = p.media[k], b = p.media[k + 1]
      if (small(a) && b && small(b)) { media.push(`<div class="duo">${fig(a)}${fig(b)}</div>`); k++ } else media.push(fig(a))
    }
    return `
  <section class="fiche" id="p-${p.slug}" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="p-${p.slug}-t" tabindex="-1">
    <header class="fiche__head wrap">
      <div><p class="lbl">${esc(t(p.milieu))} · ${esc(p.year)}</p><h2 class="disp" id="p-${p.slug}-t">${esc(p.title)}</h2></div>
      <a class="fiche__close" href="#${p.research ? 'recherche' : 'projet'}-${p.slug}">${esc(t(ui.close))}</a>
    </header>
    <div class="fiche__row">
      <div class="fiche__col">${sect(s.intent, p.intent)}${sect(s.context, p.context)}${sect(s.capture, p.capture)}${sect(s.processing, p.processing)}</div>
      <div class="fiche__col">
        ${sect(s.staging, p.staging)}${sect(s.learned, p.learned)}
        <section class="fiche__part"><h3 class="lbl">${esc(t(s.credits))}</h3>
          <dl class="facts">
            <div${p.role?.todo ? ' class="todo"' : ''}><dt class="lbl">${esc(t(ui.role))}</dt><dd>${esc(t(p.role))}</dd></div>
            <div><dt class="lbl">${esc(t(ui.tools))}</dt><dd>${esc(p.tools)}</dd></div>
            <div><dt class="lbl">${esc(t(ui.year))}</dt><dd>${esc(p.year)}</dd></div>
            ${credits.map((c) => `<div${c.todo ? ' class="todo"' : ''}><dt class="lbl">${esc(t(ui.creditsLabel))}</dt><dd>${esc(t(c))}</dd></div>`).join('')}
          </dl>
        </section>
        ${p.link ? `<a class="btn btn--light" href="${esc(p.link.href)}" target="_blank" rel="noopener">${esc(t(p.link.label))} ↗</a>` : ''}
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
<canvas class="gl-canvas" aria-hidden="true"></canvas>
<div class="edge edge--top" aria-hidden="true"></div><div class="edge edge--bottom" aria-hidden="true"></div>
<header class="topbar wrap">
  <a href="#top" class="brand" aria-label="Holosene">
    <img class="brand__mark" src="${root}media/monogram-white.svg" alt="Holosene" width="816" height="1000">
  </a>
  <nav class="topbar__nav" aria-label="${esc(t(ui.nav))}">
    <a href="#projets">${esc(t(ui.projects))}</a><a href="#recherche">${esc(t(ui.research))}</a><a href="#a-propos">${esc(t(ui.studio))}</a><a href="#contact">${esc(t(ui.contact))}</a>
    <a class="lang" href="${other}" hreflang="${lang === 'fr' ? 'en' : 'fr'}" lang="${lang === 'fr' ? 'en' : 'fr'}" aria-label="${esc(t(ui.langLabel))}">${lang === 'fr' ? 'EN' : 'FR'}</a>
  </nav>
</header>

<main id="top">
  <section class="hero" aria-labelledby="hero-t">
    <div class="hero__view" data-gl="mark" data-cell="6" role="img" aria-label="${esc(t(ui.lensLabel))}">
      <img src="${m('riviere-calme.webp')}" alt="" decoding="async" fetchpriority="high">
    </div>
    <img class="hero__mark" src="${root}media/monogram-white.svg" alt="" width="816" height="1000">
    <h1 id="hero-t" class="sr">Holosene · ${esc(t(site.signature))}</h1>
    <p class="hero__line wrap" data-reveal>${esc(t(studio))}</p>
  </section>

  <section class="work" id="projets" aria-labelledby="proj-t">
    <header class="sec-head wrap">
      <h2 class="disp" id="proj-t">${lang === 'fr' ? 'Projets choisis' : 'Selected work'}</h2>
      <p data-reveal>${esc(t(workIntro))}</p>
    </header>
    ${rail(selected.map((p, i) => card({ id: `projet-${p.slug}`, href: `#p-${p.slug}`, image: p.cover, title: p.title, genre: t(p.genre), credit: p.coverCredit && t(p.coverCredit) })), lang === 'fr' ? 'Projets, défilement horizontal' : 'Projects, horizontal scroll')}
  </section>

  <section class="studio" aria-hidden="true">
    <div class="studio__mark wrap">${logotype}</div>
  </section>

  <section class="work work--research" id="recherche" aria-labelledby="research-t">
    <header class="sec-head wrap">
      <h2 class="disp" id="research-t">${esc(t(ui.research))}</h2>
      <p data-reveal>${esc(t(research.intro))}</p>
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
`
}
