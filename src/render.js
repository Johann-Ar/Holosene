/**
 * Gabarit des pages : rendu à la compilation (vite.config.js) pour chaque langue.
 * Tout le contenu est dans le HTML publié (lisible sans JavaScript). Les fiches projet s'ouvrent par l'ancre
 * #p-<slug> (CSS :target), le JavaScript ajoute focus, Échap et piégeage du focus.
 */
import { site, ui, projects, lab, studio } from './content.js'

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

  const spec = (rows) => `<dl class="spec">${rows.map(([k, v]) => `<div><dt class="lbl">${esc(t(k))}</dt><dd>${esc(t(v))}</dd></div>`).join('')}</dl>`

  const card = (p) => `
      <article class="card">
        <a class="card__link" href="#p-${p.slug}" aria-label="${esc(t(ui.open))} : ${esc(p.title)}">
          <span class="card__pic sq"><img src="${m(p.cover)}" alt="" loading="lazy" decoding="async"></span>
        </a>
        <p class="lbl">${esc(t(p.milieu))} · ${esc(p.year)}</p>
        <h3 class="disp card__title"><a href="#p-${p.slug}">${esc(p.title)}</a></h3>
        ${spec(p.spec)}
        ${p.coverCredit ? `<p class="credit">${esc(t(p.coverCredit))}</p>` : ''}
      </article>`

  const fiche = (p, i) => {
    const s = ui.sections
    const sect = (label, v) => (v ? `<section class="fiche__part${v.todo ? ' todo' : ''}"><h3 class="lbl">${esc(t(label))}</h3><p>${esc(t(v))}</p></section>` : '')
    const credits = [...(p.credits || []), ...(p.coverCredit ? [p.coverCredit] : [])]
    return `
  <section class="fiche" id="p-${p.slug}" role="dialog" aria-modal="true" aria-labelledby="p-${p.slug}-t" tabindex="-1">
    <div class="fiche__inner wrap">
      <header class="fiche__head">
        <p class="lbl">${esc(t(p.milieu))} · ${esc(p.year)}</p>
        <h2 class="disp" id="p-${p.slug}-t">${esc(p.title)}</h2>
        <a class="fiche__close" href="#projets">${esc(t(ui.close))}</a>
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
          ${p.media.map((x) => `<figure class="sq-frame"><img src="${m(x.src)}" alt="${esc(t(x.alt))}" loading="lazy" decoding="async"></figure>`).join('')}
        </div>
      </div>
      <a class="fiche__next lbl" href="#p-${projects[(i + 1) % projects.length].slug}">→ ${esc(projects[(i + 1) % projects.length].title)}</a>
    </div>
  </section>`
  }

  const feat = projects[0]
  return `
<a class="skip" href="#projets">${esc(t(ui.skip))}</a>
<header class="topbar wrap">
  <a href="#top" class="topbar__logo"><img src="${root}media/monogram-white.svg" alt="Holosene" width="27" height="34"></a>
  <nav class="topbar__nav" aria-label="${esc(t(ui.nav))}">
    <a href="#projets">${esc(t(ui.projects))}</a><a href="#lab">${esc(t(ui.lab))}</a><a href="#studio">${esc(t(ui.studio))}</a><a href="#contact">${esc(t(ui.contact))}</a>
    <a class="lang" href="${other}" hreflang="${lang === 'fr' ? 'en' : 'fr'}" lang="${lang === 'fr' ? 'en' : 'fr'}" aria-label="${esc(t(ui.langLabel))}">${lang === 'fr' ? 'EN' : 'FR'}</a>
  </nav>
</header>

<main id="top">
  <section class="hero" aria-labelledby="hero-t">
    <div class="hero__img" style="background-image:url(${m('points-riviere.jpg')})"></div>
    <canvas class="hero__canvas" aria-hidden="true"></canvas>
    <div class="hero__shade"></div>
    <div class="lens" role="img" aria-label="${esc(t(ui.lensLabel))}" data-src="${m('riviere-calme.webp')}" style="background-image:url(${m('riviere-calme.webp')})"></div>
    <div class="hero__bottom wrap">
      <h1 id="hero-t"><img class="hero__word" src="${root}media/logotype-white.svg" alt="Holosene"></h1>
      <div class="hero__meta"><p class="intent">${esc(t(site.intent))}</p><p class="lbl">${esc(t(site.baseline))}</p></div>
    </div>
  </section>

  <section class="feature" aria-labelledby="feat-t">
    <div class="feature__media" style="background-image:url(${m('points-packraft.jpg')})"></div>
    <svg class="feature__flow" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true"><path d="M1500 80 C 1150 40, 900 160, 840 320 C 780 480, 1060 540, 980 720 C 930 840, 680 920, 460 980"/></svg>
    <div class="feature__txt wrap">
      <p class="lbl">${esc(t(ui.featured))} · ${esc(feat.year)}</p>
      <h2 class="disp" id="feat-t">${esc(feat.title)}</h2>
      ${txt(feat.context)}
      <div class="chips"><span>${esc(t(feat.milieu))}</span><span>Film</span><span>4D Gaussian splatting</span></div>
      <a class="btn btn--light" href="#p-${feat.slug}">${esc(t(ui.open))}</a>
    </div>
  </section>

  <section class="projects wrap" id="projets" aria-labelledby="proj-t">
    <div class="sec-head"><h2 class="disp" id="proj-t">${esc(t(ui.projects))}</h2><p class="lbl">${esc(t(ui.specHead))}</p></div>
    <div class="grid">${projects.map(card).join('')}</div>
  </section>

  <section class="lab" id="lab" aria-labelledby="lab-t">
    <div class="lab__inner wrap">
      <div class="lab__intro"><p class="lbl">${esc(t(ui.lab))} · ${lang === 'fr' ? 'relevé n° 01' : 'record no. 01'}</p><h2 class="disp" id="lab-t">${esc(t(lab.title))}</h2>${txt(lab.memoire)}${txt(lab.releve)}</div>
      <div class="lab__win sq"><img src="${m(lab.image)}" alt="${lang === 'fr' ? 'Essai de 4D Gaussian splatting sur le tournage de 4Dérives' : '4D Gaussian splatting test on the 4Dérives footage'}" loading="lazy"></div>
      <dl class="lab__data">${lab.data.map(([k, v]) => `<div><dt class="lbl">${esc(t(k))}</dt><dd>${esc(t(v))}</dd></div>`).join('')}</dl>
    </div>
  </section>

  <section class="studio wrap" id="studio" aria-labelledby="studio-t">
    <h2 class="disp" id="studio-t">${esc(t(ui.studio))}</h2>
    <p class="studio__txt">${esc(t(studio))}</p>
  </section>

  <section class="contact wrap" id="contact" aria-labelledby="contact-t">
    <img src="${root}media/monogram-iris-dark.svg" alt="" width="51" height="64">
    <h2 class="lbl" id="contact-t">${esc(t(ui.contact))}</h2>
    <p class="mail" translate="no">${esc(site.email)}</p>
    <button class="btn copy" type="button" data-copy="${esc(site.email)}" data-done="${esc(t(ui.copied))}">${esc(t(ui.copy))}</button>
    <ul class="socials">${site.socials.map((s) => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join('')}</ul>
  </section>
</main>

<footer class="foot wrap">
  <p class="lbl">© ${new Date().getFullYear()} Holosene · Johann Arata</p>
  <a class="lbl" href="${root}mentions-legales.html">${esc(t(ui.legal))}</a>
</footer>

${projects.map(fiche).join('')}
`
}
