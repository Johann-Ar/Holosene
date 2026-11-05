# Holosene

Site du studio Holosene (Johann Arata) : captation, reconstruction, 3D temps réel.

- `brand/` — identité : monogramme, logotype, squircle, iridescence, tokens, guide de marque (`brand/guide/index.html`).
- `design/` — recherche : trois directions et la synthèse retenue (D), comparateur (`design/directions/index.html`, touches 1 à 4).
- `src/`, `public/`, `index.html`, `en/` — le site (v0.1, direction D).

## Site

```sh
npm install
npm run dev       # http://localhost:5173 — les mentions « à compléter » sont visibles
npm run build     # dist/ (pages pré-rendues, robots.txt, sitemap.xml)
npm run preview
npm run todo      # liste des textes encore à fournir dans src/content.js
```

- Tout le contenu est dans `src/content.js` (FR/EN). Ce qui manque est marqué `TODO(...)` : invisible en ligne,
  visible avec `?dev` dans l’adresse (`?dev=0` pour revenir) ; `npm run todo` en donne la liste.
- Les pages sont générées à la compilation (`vite.config.js`, gabarit `src/render.js`) : le contenu est lisible sans JavaScript.
- Rendu : WebGL maison, sans bibliothèque 3D (`src/gl.js` : trame de points, vignettes en verre, lentille « o » ;
  `src/backdrop.js` : fond). Une image identique à la précédente n’est pas redessinée.
- Logotypes HOLOSENE et JOHANN ARATA (pack vectoriel exporté de Figma) : `public/logotypes/` (svg, lettres seules,
  png), composant `src/logotype-svg.js` (SVG dans la page, une forme par lettre ou par morceau soudé, couleur = `color`), animations
  `src/logotype-animations.css` et `src/logotype.js`. Accueil : JOHANN ARATA (une ligne, ou deux sur mobile) ;
  pied de page : JOHANN ARATA au centre (sans animation).
- CV : le bouton « Curriculum vitae » du contact télécharge `public/cv/johann-arata-cv.pdf` (chemin dans `src/content.js`,
  `site.cv`) : y déposer le PDF.
- Chargeur : `src/loader.js` + `src/loader-draw.js`, dessiné dans un worker (`src/loader-worker.js`) pour rester
  fluide pendant la préparation de WebGL. Couleurs et proportions : `design/logo-kit` (voir `CLAUDE.md`).
- Fiches projet : `#p-<slug>`, état piloté par `main.js` (classes `is-open`, `is-closing`…) ; sans JavaScript, `:target`.
  Même mode (clair ou sombre) que l’accueil.
- Langue : redirection vers `/en/` des navigateurs non francophones à la première visite, par le serveur
  (`vercel.json`, en-tête `Accept-Language`) ou à défaut par un script en tête de page ; le choix FR / EN est mémorisé
  (cookie `lang` et `localStorage`).
- Aucun traceur. Stockage local et cookie technique `lang` : la langue choisie (exempté de consentement, voir mentions).
- Sécurité : politique de contenu (CSP) écrite dans chaque page à la compilation (`vite.config.js`, `csp()` : seuls les
  fichiers du site, scripts en ligne autorisés par empreinte SHA-256) ; en-têtes de l'hébergeur dans `vercel.json`
  (cadre interdit, Permissions-Policy, nosniff, COOP ; HTTPS imposé par Vercel). Un script ajouté à la main dans une
  page est bloqué : passer par `src/` ou relancer la compilation.
- Avant la mise en ligne : `npm run todo` liste tout ce qui reste à fournir (textes, PDF du CV, mentions légales).
  Le bouton « Curriculum vitae » n'apparaît en ligne qu'une fois `public/cv/johann-arata-cv.pdf` déposé.

## Publication

Hébergement : **Vercel** (`vercel.json`), projet relié au dépôt : un aperçu par branche, la production depuis la
branche par défaut. `SITE_URL` (variable d’environnement, par défaut https://holosene.vercel.app/) fixe l’adresse
canonique, les liens `hreflang`, `robots.txt` et `sitemap.xml`.
`.github/workflows/ci.yml` vérifie seulement que le site se compile (aucune publication depuis GitHub).
