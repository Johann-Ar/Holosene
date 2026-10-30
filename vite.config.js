import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'vite'

/** Adresse publique (aperçus de liens, URL canonique, hreflang). À changer avec un nom de domaine. */
const SITE_URL = (process.env.SITE_URL || 'https://johann-ar.github.io/Holosene/').replace(/\/?$/, '/')

/** Pré-rendu : le contenu (src/render.js) et les métadonnées sont écrits dans le HTML publié, pour chaque langue. */
function prerender() {
  const load = async (f) => import(`${pathToFileURL(resolve(f)).href}?t=${Date.now()}`)
  return {
    name: 'prerender',
    async transformIndexHtml(html) {
      const m = html.match(/<!--APP:(fr|en)-->/)
      if (!m) return html
      const lang = m[1]
      const { render, esc } = await load('src/render.js')
      const { site } = await load('src/content.js')
      const url = lang === 'fr' ? SITE_URL : `${SITE_URL}en/`
      const title = lang === 'fr' ? 'Holosene — studio de Johann Arata' : 'Holosene — Johann Arata’s studio'
      const desc = site.description[lang]
      const ld = {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', '@id': `${SITE_URL}#studio`, name: 'Holosene', url: SITE_URL, logo: `${SITE_URL}icons/icon-black-iris-512.png`, founder: { '@id': `${SITE_URL}#johann` }, email: site.email },
          { '@type': 'Person', '@id': `${SITE_URL}#johann`, name: site.person, jobTitle: lang === 'fr' ? 'Designer numérique' : 'Digital designer', email: `mailto:${site.email}`, sameAs: site.socials.map((s) => s.href).filter((h) => h.includes('github')) },
        ],
      }
      const head = `<title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${url}" />
  <link rel="alternate" hreflang="fr" href="${SITE_URL}" />
  <link rel="alternate" hreflang="en" href="${SITE_URL}en/" />
  <link rel="alternate" hreflang="x-default" href="${SITE_URL}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Holosene" />
  <meta property="og:locale" content="${lang === 'fr' ? 'fr_FR' : 'en_GB'}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE_URL}share.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${SITE_URL}share.png" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>`
      return html.replace(`<!--HEAD:${lang}-->`, head).replace(`<!--APP:${lang}-->`, render(lang))
    },
  }
}

/** 404 : GitHub Pages la sert à n'importe quelle adresse, ses liens doivent donc être absolus. */
function absolute404() {
  const basePath = new URL(SITE_URL).pathname
  return {
    name: 'absolute-404',
    closeBundle() {
      const f = resolve('dist/404.html')
      if (!existsSync(f)) return
      writeFileSync(f, readFileSync(f, 'utf8').replace(/(href|src)="\.\/(?!\/)/g, `$1="${basePath}`))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [prerender(), absolute404()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { fr: resolve('index.html'), en: resolve('en/index.html'), legal: resolve('mentions-legales.html'), notfound: resolve('404.html') },
    },
  },
})
