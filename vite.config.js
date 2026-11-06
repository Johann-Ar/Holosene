import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
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
      // langue : un navigateur non francophone, à sa première visite de l'accueil français, part vers /en/ avant que quoi
      // que ce soit d'autre se charge (le serveur le fait déjà quand il le peut : vercel.json) ; un choix fait au
      // bouton FR / EN est respecté
      const langBoot = lang === 'fr' ? `<script>try{var l=localStorage.getItem('lang');if(!l&&!/(^|; )lang=/.test(document.cookie)&&!/^fr\\b/i.test(navigator.language||'fr'))location.replace('en/'+location.hash)}catch(e){}</script>\n  ` : ''
      return html.replace(`<!--HEAD:${lang}-->`, langBoot + head).replace(`<!--APP:${lang}-->`, render(lang))
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
      // site en clair (les fiches projet, en sombre, sont des calques dans la page)
      const meta = `<meta name="theme-color" content="${colors.bgLight}" />`
      // toujours en clair au chargement (data-theme="light" dans le HTML), sur tous les appareils, quel que soit le mode du
      // système ; le bouton Clair / Sombre ne vaut que pour la visite (main.js). Les anciens choix mémorisés par une
      // version précédente du site (theme, site-theme) sont effacés : ils faisaient démarrer certains téléphones en sombre
      const boot = `<script>try{localStorage.removeItem('theme');localStorage.removeItem('site-theme')}catch(e){}try{history.scrollRestoration='manual';var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];if(location.hash&&(!/^#p-/.test(location.hash)||(n&&n.type==='reload')))history.replaceState(null,'',location.pathname+location.search)}catch(e){}</script>`   // + rechargement : toujours l'accueil, en haut (ni position mémorisée, ni ancre, ni fiche ouverte) ; un lien direct vers une fiche #p-… l'ouvre toujours
      return html.replace('</head>', `  ${meta}\n  ${boot}\n</head>`)
    },
  }
}

/** robots.txt et sitemap.xml (adresse publique SITE_URL, deux langues). */
function seoFiles() {
  return {
    name: 'seo-files',
    closeBundle() {
      const day = new Date().toISOString().slice(0, 10)
      const alt = `<xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL}"/><xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}en/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}"/>`
      const url = (loc) => `  <url><loc>${loc}</loc><lastmod>${day}</lastmod>${alt}</url>`
      writeFileSync(resolve('dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${url(SITE_URL)}\n${url(SITE_URL + 'en/')}\n</urlset>\n`)
      writeFileSync(resolve('dist/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`)
    },
  }
}

/** 404 : l'hébergeur la sert à n'importe quelle adresse, ses liens doivent donc être absolus. */
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

/** Politique de sécurité du contenu (CSP), dans chaque page publiée : seuls les fichiers du site sont chargés ; les petits
 *  scripts en ligne du site (langue, mode clair / sombre) sont autorisés par leur empreinte SHA-256, calculée ici à chaque
 *  compilation (un script modifié reste donc toujours autorisé, tout autre script est bloqué). Le cadre (frame-ancestors)
 *  et les autres protections sont envoyés en en-têtes par l'hébergeur (vercel.json). */
function csp() {
  return {
    name: 'csp',
    apply: 'build',
    closeBundle() {
      for (const page of ['index.html', 'en/index.html', 'mentions-legales.html', '404.html']) {
        const f = resolve(join('dist', page))
        if (!existsSync(f)) continue
        let html = readFileSync(f, 'utf8')
        const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)]
          .map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`)
        const policy = [
          "default-src 'self'", `script-src 'self' ${hashes.join(' ')}`.trim(), "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:", "font-src 'self'", "connect-src 'self'", "media-src 'self'", "worker-src 'self'",
          "object-src 'none'", "base-uri 'self'", "form-action 'none'",   // HTTPS : imposé par l'hébergeur (HSTS)
        ].join('; ')
        html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/, '')
          .replace(/(<meta charset="utf-8" \/>)/, `$1\n  <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
        writeFileSync(f, html)
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [prerender(), irisCss(), themeHead(), absolute404(), seoFiles(), csp()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { fr: resolve('index.html'), en: resolve('en/index.html'), legal: resolve('mentions-legales.html'), notfound: resolve('404.html') },
    },
  },
})
