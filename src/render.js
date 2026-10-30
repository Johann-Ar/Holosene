/**
 * Gabarit des pages : rendu à la compilation (vite.config.js) pour chaque langue.
 * Tout le contenu est dans le HTML publié (lisible sans JavaScript). Les fiches projet s'ouvrent par l'ancre
 * #p-<slug> (CSS :target), le JavaScript ajoute focus, Échap et piégeage du focus.
 */
import { readFileSync } from 'node:fs'
import { site, ui, projects, lab, studio } from './content.js'

// logotype en ligne (page Studio) : chaque lettre se trace puis se remplit au défilement
const logotype = readFileSync(new URL('../public/media/logotype-white.svg', import.meta.url), 'utf8')
  .replace(/<title>.*?<\/title>/, '').replace(/ fill="#FFFFFF"/g, ' pathLength="1"').replace(/ width="\d+" height="\d+"/, ' class="studio__word"')

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

  const chips = (rows) => `<ul class="chips">${rows.map(([, v]) => `<li>${esc(t(v))}</li>`).join('')}</ul>`
  const n2 = (i) => String(i + 1).padStart(2, '0')

  // un projet = une vue plein écran : l'image en trame de points, la lentille montre l'original
  const panel = (p, i) => `
    <article class="panel" id="projet-${p.slug}" aria-labelledby="pt-${p.slug}">
      <div class="panel__view" data-gl="panel" data-cell="7" data-lens="66" data-rim="13" role="img" aria-label="${esc(t(ui.panelLabel))}">
        <img src="${m(p.cover)}" alt="" decoding="async">
      </div>
      <div class="panel__txt wrap">
        <p class="lbl" data-reveal>${n2(i)} / ${n2(projects.length - 1)} · ${esc(t(p.milieu))} · ${esc(p.year)}</p>
        <h3 class="disp panel__title" id="pt-${p.slug}"><a href="#p-${p.slug}"><span class="line" data-reveal="line"><span>${esc(p.title)}</span></span></a></h3>
        <p class="panel__lead" data-reveal style="--d:120ms">${esc(t(p.context))}</p>
        <div data-reveal style="--d:200ms">${chips(p.spec)}</div>
        <a class="btn btn--light" href="#p-${p.slug}" data-reveal style="--d:260ms">${esc(t(ui.open))}</a>
        ${p.coverCredit ? `<p class="credit" data-reveal style="--d:300ms">${esc(t(p.coverCredit))}</p>` : ''}
      </div>
    </article>`

  const fiche = (p, i) => {
    const s = ui.sections
    const sect = (label, v) => (v ? `<section class="fiche__part${v.todo ? ' todo' : ''}"><h3 class="lbl">${esc(t(label))}</h3><p>${esc(t(v))}</p></section>` : '')
    const credits = [...(p.credits || []), ...(p.coverCredit ? [p.coverCredit] : [])]
    return `
  <section class="fiche" id="p-${p.slug}" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="p-${p.slug}-t" tabindex="-1">
    <div class="fiche__inner wrap">
      <header class="fiche__head">
        <p class="lbl">${esc(t(p.milieu))} · ${esc(p.year)}</p>
        <h2 class="disp" id="p-${p.slug}-t">${esc(p.title)}</h2>
        <a class="fiche__close" href="#projet-${p.slug}">${esc(t(ui.close))}</a>
      </header>
      <div class="fiche__body">
        <div class="fiche__text">
          ${sect(s.intent, p.intent)}
          ${sect(s.context, p.context)}
          ${sect(s.capture, p.capture)}
          ${sect(s.processing, p.processing)}
          ${sect(s.staging, p.staging)}
          ${sect(s.learned, p.learned)}
          <section class="fiche__part"><h3 class="lbl">${esc(t(s.credits))}</h3>
            <dl class="facts">
              <div${p.role?.todo ? ' class="todo"' : ''}><dt class="lbl">${esc(t(ui.role))}</dt><dd>${esc(t(p.role))}</dd></div>
              <div><dt class="lbl">${esc(t(ui.tools))}</dt><dd>${esc(p.tools)}</dd></div>
              <div><dt class="lbl">${esc(t(ui.year))}</dt><dd>${esc(p.year)}</dd></div>
              ${credits.map((c) => `<div${c.todo ? ' class="todo"' : ''}><dt class="lbl">${esc(t(ui.creditsLabel))}</dt><dd>${esc(t(c))}</dd></div>`).join('')}
            </dl>
          </section>
          ${p.link ? `<a class="btn" href="${esc(p.link.href)}" target="_blank" rel="noopener">${esc(t(p.link.label))} ↗</a>` : ''}
        </div>
        <div class="fiche__media">
          ${p.media.map((x) => `<figure><img src="${m(x.src)}" alt="${esc(t(x.alt))}" loading="lazy" decoding="async"></figure>`).join('')}
        </div>
      </div>
      <a class="fiche__next" href="#p-${projects[(i + 1) % projects.length].slug}"><span class="lbl">${lang === 'fr' ? 'Projet suivant' : 'Next project'}</span><span class="disp">${esc(projects[(i + 1) % projects.length].title)} →</span></a>
    </div>
  </section>`
  }

  const studioWords = t(studio).split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ')
  return `
<a class="skip" href="#projets">${esc(t(ui.skip))}</a>
<canvas class="gl-canvas" aria-hidden="true"></canvas>
<header class="topbar wrap">
  <a href="#top" class="topbar__logo" aria-label="Holosene"><img src="${root}media/logotype-white.svg" alt="Holosene" width="120" height="18"></a>
  <nav class="topbar__nav" aria-label="${esc(t(ui.nav))}">
    <a href="#projets">${esc(t(ui.projects))}</a><a href="#lab">${esc(t(ui.lab))}</a><a href="#studio">${esc(t(ui.studio))}</a><a href="#contact">${esc(t(ui.contact))}</a>
    <a class="lang" href="${other}" hreflang="${lang === 'fr' ? 'en' : 'fr'}" lang="${lang === 'fr' ? 'en' : 'fr'}" aria-label="${esc(t(ui.langLabel))}">${lang === 'fr' ? 'EN' : 'FR'}</a>
  </nav>
</header>

<main id="top">
  <section class="hero" aria-labelledby="hero-t">
    <div class="hero__view" data-gl="mark" data-cell="6" role="img" aria-label="${esc(t(ui.lensLabel))}">
      <img src="${m('riviere-calme.webp')}" alt="" decoding="async" fetchpriority="high">
    </div>
    <img class="hero__mark" src="${root}media/monogram-white.svg" alt="" width="816" height="1000">
    <div class="hero__bottom wrap">
      <h1 id="hero-t" class="sr">Holosene</h1>
      <p class="intent" data-reveal>${esc(t(site.intent))}</p>
      <p class="lbl" data-reveal style="--d:120ms">${esc(t(site.baseline))}</p>
    </div>
    <p class="hero__hint lbl" aria-hidden="true">${lang === 'fr' ? 'Bougez le « o »' : 'Move the “o”'}</p>
  </section>

  <section class="projects" id="projets" aria-labelledby="proj-t">
    <div class="projects__head wrap">
      <h2 class="disp" id="proj-t"><span class="line" data-reveal="line"><span>${esc(t(ui.projects))}</span></span></h2>
      <p class="lbl" data-reveal>${n2(projects.length - 1)} · ${esc(t(ui.specHead))}</p>
    </div>
    ${projects.map(panel).join('')}
  </section>

  <section class="lab wrap" id="lab" aria-labelledby="lab-t">
    <div class="lab__intro">
      <p class="lbl" data-reveal>${esc(t(ui.lab))} · ${lang === 'fr' ? 'relevé n° 01' : 'record no. 01'}</p>
      <h2 class="disp" id="lab-t"><span class="line" data-reveal="line"><span>${esc(t(lab.title))}</span></span></h2>
      <div data-reveal style="--d:120ms">${txt(lab.memoire)}${txt(lab.releve)}</div>
    </div>
    <figure class="lab__win" data-reveal="clip"><img src="${m(lab.image)}" alt="${lang === 'fr' ? 'Essai de 4D Gaussian splatting sur le tournage de 4Dérives' : '4D Gaussian splatting test on the 4Dérives footage'}" loading="lazy"></figure>
    <dl class="lab__data">${lab.data.map(([k, v], i) => `<div data-reveal style="--d:${i * 80}ms"><dt class="lbl">${esc(t(k))}</dt><dd>${esc(t(v))}</dd></div>`).join('')}</dl>
  </section>

  <section class="studio" id="studio" aria-labelledby="studio-t">
    <div class="studio__mark wrap" aria-hidden="true">${logotype}</div>
    <div class="studio__body wrap">
      <h2 class="lbl" id="studio-t">${esc(t(ui.studio))}</h2>
      <p class="studio__txt disp" data-words>${studioWords}</p>
    </div>
  </section>

  <section class="contact wrap" id="contact" aria-labelledby="contact-t">
    <h2 class="lbl" id="contact-t" data-reveal>${esc(t(ui.contact))}</h2>
    <a class="mail disp" href="mailto:${esc(site.email)}" translate="no" data-reveal="line"><span>${esc(site.email)}</span></a>
    <div class="contact__row" data-reveal style="--d:120ms">
      <button class="btn copy" type="button" data-copy="${esc(site.email)}" data-done="${esc(t(ui.copied))}">${esc(t(ui.copy))}</button>
      <ul class="socials">${site.socials.map((s) => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join('')}</ul>
    </div>
  </section>
</main>

<footer class="foot wrap">
  <img src="${root}media/monogram-white.svg" alt="" width="20" height="25">
  <p class="lbl">© ${new Date().getFullYear()} Holosene · Johann Arata</p>
  <a class="lbl" href="${root}mentions-legales.html">${esc(t(ui.legal))}</a>
</footer>

${projects.map(fiche).join('')}
`
}
