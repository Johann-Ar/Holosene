# Audit avant mise en ligne — 6 novembre 2026

Site vérifié en local (compilation de production) et en ligne (holosene.vercel.app), sur Chrome (ordinateur) et Safari
(iPhone 13), en clair et en sombre, en français et en anglais.

## Corrigé

| Domaine | Problème | Correction |
|---|---|---|
| Légal | Hébergeur indiqué : GitHub Pages (faux) | Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis |
| RGPD | « Pas de cookie » alors que le cookie `lang` existe | Texte exact : cookie technique de langue, exempté de consentement (art. 82 loi Informatique et Libertés, CNIL) ; journaux techniques de l'hébergeur mentionnés |
| Sécurité | Aucune politique de contenu (CSP) | CSP dans chaque page, générée à la compilation (scripts en ligne par empreinte SHA-256) ; vérifié : aucune violation, site intact |
| Sécurité | Page affichable dans un cadre (clickjacking) | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| Sécurité | En-têtes manquants | `Permissions-Policy` (caméra, micro, géolocalisation… coupés), `Cross-Origin-Opener-Policy` |
| Sécurité | Cookie `lang` sans `Secure` | `Secure` en HTTPS |
| Liens | Page 404 : liens et icône vers `/Holosene/` (ancien hébergement) | Liens vers `/` et `/en/` |
| Liens | Bouton CV vers un PDF absent (404) | Bouton publié seulement quand le PDF existe ; listé par `npm run todo` |
| Accessibilité | Bouton FR/EN : nom vocal sans le texte visible | « FR/EN, Read in English » |
| Accessibilité | Vignette « En cours » : `aria-label` interdit sur ce type d'élément | Image décorative (le titre suit) |
| Accessibilité | Mentions : texte orange illisible (contraste 1,6) | Orange foncé (contraste AA) |
| Performance | Médias sans cache | Cache 7 jours sur `media/`, `logotypes/`, `icons/` |

## Vérifié, conforme

- Dépendances : `npm audit` → 0 vulnérabilité. Aucun secret ni clé dans le dépôt.
- HTTPS imposé par Vercel (HSTS 2 ans, préchargement), `nosniff`, `Referrer-Policy`.
- Accessibilité (axe-core, WCAG 2.1 A/AA + bonnes pratiques) : 0 problème sur l'accueil FR et EN (clair et sombre), les
  mentions légales et la 404. Lien d'évitement, langue de page, titres, focus, animations réduites respectées.
- Sans JavaScript : tout le contenu est lisible, les fiches projet s'ouvrent par leur lien (`#p-…`).
- SEO : titre, description, canonique, `hreflang` FR/EN/x-default, `sitemap.xml`, `robots.txt`, données structurées
  (Organisation, Personne), image de partage 1200 × 630, mentions et 404 en `noindex`.
- Liens externes : tous répondent (GitHub, projets, YouTube, Adobe).
- Poids : accueil ≈ 1 Mo au premier chargement (HTML 41 Ko compressé), polices locales, aucun service tiers.
- Aucun traceur, aucune mesure d'audience, aucun contenu tiers chargé (YouTube est un simple lien).

## À faire par toi avant la mise en ligne publique (bloquant)

1. **Mentions légales** : statut, SIRET, adresse (ou domiciliation) — `npm run todo` les liste. Faire relire la page.
2. **CV** : déposer `public/cv/johann-arata-cv.pdf` (le bouton apparaît alors tout seul).
3. **Textes à fournir** : 16 textes `TODO(...)` dans `src/content.js` (invisibles en ligne, visibles avec `?dev`).
4. **Crédits** : la mention exacte exigée par la licence du Schmidt Ocean Institute (Dumbo) ; l'accord écrit de
   Nicolas Floc'h pour ses photographies (Photographique Volume) si ce n'est pas déjà fait.
5. **Adresse de l'hébergeur** : confirmer l'adresse de Vercel sur vercel.com (relevée dans des sources concordantes).

## Recommandé (non bloquant)

- **Nom de domaine** à toi (ex. holosene.fr) : plus professionnel, et l'adresse e-mail pourrait suivre. Une fois relié
  dans Vercel, compiler avec `SITE_URL=https://ton-domaine/` (canonique, sitemap, partage).
- **Mentions légales en anglais** : la page n'existe qu'en français (le bouton EN mène à l'accueil anglais).
- **Fichiers inutilisés publiés** : `public/media/points-riviere.jpg`, `points-packraft.jpg`, `squircle-black.svg`
  (≈ 1,9 Mo) et les PNG 4000 px des logotypes. Sans effet sur la vitesse ; à retirer si tu n'en as pas l'usage.
- **Adresse e-mail en clair** dans la page : acceptable pour un portfolio, elle peut recevoir du spam.
- **Vercel** : activer la protection des aperçus de branche (Deployment Protection) si les branches de travail ne
  doivent pas être publiques.
