# Holosene

Site du studio Holosene (Johann Arata) : captation, reconstruction, 3D temps réel.

- `brand/` — identité : monogramme, logotype, squircle, iridescence, tokens, guide de marque (`brand/guide/index.html`).
- `design/` — recherche : trois directions et la synthèse retenue (D), comparateur (`design/directions/index.html`, touches 1 à 4).
- `src/`, `public/`, `index.html`, `en/` — le site (v0.1, direction D).

## Site

```sh
npm install
npm run dev       # http://localhost:5173 — les mentions « à compléter » sont visibles
npm run build     # dist/
npm run preview
```

- Tout le contenu est dans `src/content.js` (FR/EN). Ce qui manque est marqué `TODO(...)` : invisible en ligne,
  visible avec `?dev` dans l’adresse (`?dev=0` pour revenir).
- Les pages sont générées à la compilation (`vite.config.js`) : le contenu est lisible sans JavaScript.
- Ouverture : nuage de points Three.js chargé à la demande ; image fixe si « réduire les animations » est activé.
- Fiches projet : `#p-<slug>` (fonctionne sans JavaScript).
- Aucun cookie, aucun traceur. Seul `localStorage` retient la langue choisie.

## Publication

`.github/workflows/deploy.yml` publie sur GitHub Pages **uniquement depuis `main`**.
Rien n’est publié tant que la branche de travail n’est pas fusionnée, avec l’accord de Johann.
Adresse prévue : https://johann-ar.github.io/Holosene/ (`SITE_URL` à changer si un nom de domaine est choisi).
