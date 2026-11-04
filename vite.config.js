import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'vite'

/** Adresse publique (aperçus de liens, URL canonique, hreflang). À changer avec un nom de domaine. */
const SITE_URL = (process.env.SITE_URL || 'https://holosene.vercel.app/').replace(/\/?$/, '/')

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
      const title = lang === 'fr' ? 'Holosene, portfolio de Johann Arata' : 'Holosene, Johann Arata’s portfolio'
      const desc = site.description[lang]
      const ld = {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', '@id': `${SITE_URL}#studio`, name: 'Holosene', url: SITE_URL, logo: `${SITE_URL}icons/icon-512.png`, founder: { '@id': `${SITE_URL}#johann` }, email: site.email },
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

/** Valeurs du logo-kit en variables CSS (aucune couleur recopiée à la main) : --bg-dark / --bg-light (tokens/iris.json)
 *  et --iris-linear, la roue v2 à plat (src/iris.js), pour les filets irisés. */
function irisCss() {
  const id = 'virtual:iris.css', rid = '\0virtual:iris.css'
  return {
    name: 'iris-css',
    resolveId: (s) => (s === id ? rid : null),
    async load(s) {
      if (s !== rid) return null
      const { IRIS_STOPS } = await import(pathToFileURL(resolve('design/logo-kit/src/iris.js')).href)
      const { colors } = JSON.parse(readFileSync(resolve('design/logo-kit/tokens/iris.json'), 'utf8'))
      return `:root{--bg-dark:${colors.bgDark};--bg-light:${colors.bgLight};--iris-linear:linear-gradient(90deg,${IRIS_STOPS.map(([p, c]) => `${c} ${(p * 100).toFixed(1)}%`).join(',')});}`
    },
  }
}

/** Toutes les pages : couleur de la barre du navigateur (fonds du logo-kit, selon le mode de l'appareil), dans <head>. */
function themeHead() {
  return {
    name: 'theme-head',
    transformIndexHtml(html) {
      const { colors } = JSON.parse(readFileSync(resolve('design/logo-kit/tokens/iris.json'), 'utf8'))
      const meta = `<meta name="theme-color" content="${colors.bgDark}" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="${colors.bgLight}" media="(prefers-color-scheme: light)" />`
      // mode forcé par le bouton, appliqué avant le premier rendu (pas de flash) ; sinon le CSS suit l'appareil
      const boot = `<script>try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}try{history.scrollRestoration='manual';if(location.hash&&!/^#p-/.test(location.hash))history.replaceState(null,'',location.pathname+location.search)}catch(e){}</script>`   // + rechargement : toujours en haut de page (ni position mémorisée ni ancre de section ; les fiches #p-… restent ouvrables par lien)
      return html.replace('</head>', `  ${meta}\n  ${boot}\n</head>`)
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
  plugins: [prerender(), irisCss(), themeHead(), absolute404()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { fr: resolve('index.html'), en: resolve('en/index.html'), legal: resolve('mentions-legales.html'), notfound: resolve('404.html') },
    },
  },
})
