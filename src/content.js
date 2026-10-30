/**
 * Contenu du site Holosene (FR / EN).
 * Règle : uniquement des informations fournies par Johann (portfolio, CV, brief). Rien d'inventé.
 * T('fr', 'en') : texte traduit. TODO('…') : à fournir par Johann — affiché seulement en mode développement (?dev).
 * Médias : chemins relatifs à public/media/.
 */
export const T = (fr, en = fr) => ({ fr, en })
export const TODO = (fr, en) => ({ todo: true, fr: `[À compléter par Johann : ${fr}]`, en: `[To be completed by Johann: ${en || fr}]` })

export const site = {
  name: 'Holosene',
  person: 'Johann Arata',
  email: 'arata.johann@gmail.com',
  url: 'https://johann-ar.github.io/Holosene/',
  intent: T(
    'Je capte le réel et le transforme en volumes et en espaces 3D à parcourir.',
    'I capture the real world and turn it into volumes and 3D spaces to explore.',
  ),
  baseline: T('Studio de Johann Arata · captation, reconstruction, 3D temps réel', 'Studio of Johann Arata · capture, reconstruction, real-time 3D'),
  description: T(
    'Holosene, studio de Johann Arata : captation du réel, nuages de points, Gaussian splatting et 3D temps réel.',
    'Holosene, Johann Arata’s studio: real-world capture, point clouds, Gaussian splatting and real-time 3D.',
  ),
  socials: [
    { label: 'GitHub', href: 'https://github.com/holosene' },
    { label: 'YouTube', href: 'https://www.youtube.com/watch?v=1lXEIx5jFCQ' },
  ],
}

export const ui = {
  projects: T('Projets', 'Work'),
  lab: T('Lab', 'Lab'),
  studio: T('Studio', 'Studio'),
  contact: T('Contact', 'Contact'),
  skip: T('Aller au contenu', 'Skip to content'),
  nav: T('Navigation principale', 'Main navigation'),
  langLabel: T('Read in English', 'Lire en français'),
  featured: T('Projet phare', 'Featured project'),
  open: T('Voir la fiche', 'View project'),
  close: T('Fermer', 'Close'),
  specHead: T('Captation · traitement · rendu', 'Capture · processing · output'),
  copy: T('Copier l’adresse', 'Copy address'),
  copied: T('Adresse copiée', 'Address copied'),
  legal: T('Mentions légales et confidentialité', 'Legal notice and privacy'),
  lensLabel: T('La rivière de 4Dérives, vue à travers la lentille', 'The river of 4Dérives, seen through the lens'),
  sections: {
    intent: T('Intention', 'Intent'),
    context: T('Contexte et milieu', 'Context and environment'),
    capture: T('Captation', 'Capture'),
    processing: T('Reconstruction et traitement', 'Reconstruction and processing'),
    staging: T('Mise en scène', 'Staging'),
    learned: T('Ce que j’ai appris, limites', 'What I learned, limits'),
    credits: T('Rôle, outils, crédits', 'Role, tools, credits'),
  },
  role: T('Rôle', 'Role'),
  tools: T('Outils', 'Tools'),
  year: T('Année', 'Year'),
  creditsLabel: T('Crédits', 'Credits'),
}

export const projects = [
  {
    slug: '4derives',
    title: '4Dérives',
    year: '2025 — 26',
    milieu: T('Rivière', 'River'),
    cover: '4derives/080.webp',
    spec: [
      [T('Capteur', 'Sensor'), T('GoPro, à hauteur d’yeux', 'GoPro, at eye level')],
      [T('Reconstruction', 'Reconstruction'), T('4D Gaussian splatting', '4D Gaussian splatting')],
      [T('Rendu', 'Output'), T('Film, essais 4D', 'Film, 4D tests')],
    ],
    intent: TODO('l’intention du projet en une phrase', 'the project’s intent in one sentence'),
    context: T(
      'Une descente de rivière filmée en GoPro à hauteur d’yeux, en trois saisons : automne, hiver, printemps.',
      'A river descent filmed on a GoPro at eye level, across three seasons: autumn, winter, spring.',
    ),
    capture: T('Tournage par Johann, en GoPro à hauteur d’yeux, sur trois saisons.', 'Shot by Johann on a GoPro at eye level, across three seasons.'),
    processing: T(
      'Essais en 4D Gaussian splatting (Luma AI) à partir du tournage, pour prolonger l’espace hors du cadre.',
      'Tests in 4D Gaussian splatting (Luma AI) from the footage, to extend the space beyond the frame.',
    ),
    staging: T('Un film : l’étalonnage, la musique et le rythme font les variations entre les saisons.', 'A film: grading, music and pace carry the changes between seasons.'),
    learned: T('Les essais en 4D Gaussian splatting montrent les limites des outils accessibles aujourd’hui.', 'The 4D Gaussian splatting tests show the limits of today’s accessible tools.'),
    role: TODO('ton rôle (seul ? avec qui ?)', 'your role'),
    tools: 'GoPro, DaVinci Resolve, Luma AI',
    credits: [TODO('auteur de la musique', 'music credit')],
    link: { label: T('Voir le film', 'Watch the film'), href: 'https://www.youtube.com/watch?v=1lXEIx5jFCQ' },
    media: [
      { src: '4derives/084.webp', alt: T('Image d’ouverture du film 4Dérives', 'Opening still of 4Dérives') },
      { src: '4derives/080.webp', alt: T('Image du film, automne', 'Still from the film, autumn') },
      { src: '4derives/078.webp', alt: T('Image du film, hiver', 'Still from the film, winter') },
      { src: '4derives/082.webp', alt: T('Image du film, printemps', 'Still from the film, spring') },
      { src: '4derives/086.webp', alt: T('Image après traitement', 'Processed image') },
      { src: '4derives/073.webp', alt: T('Mouvement de caméra dans un volume 4D', 'Camera move inside a 4D volume') },
      { src: '4derives/075.webp', alt: T('Essai 4D Shape of Motion', '4D Shape of Motion test') },
      { src: '4derives/077.webp', alt: T('Rendu 3D Luma AI', 'Luma AI 3D render') },
    ],
  },
  {
    slug: 'dumbo',
    title: 'Dumbo',
    year: '2026',
    milieu: T('Grands fonds', 'Deep sea'),
    cover: 'dumbo/058.webp',
    coverCredit: T('Rendu : Johann Arata, d’après des vidéos du Schmidt Ocean Institute', 'Render: Johann Arata, from Schmidt Ocean Institute footage'),
    spec: [
      [T('Source', 'Source'), T('Vidéos de submersibles (Schmidt Ocean Institute)', 'Submersible footage (Schmidt Ocean Institute)')],
      [T('Traitement', 'Processing'), T('Segmentation IA (SAM2), profondeur par luminosité', 'AI segmentation (SAM2), depth from brightness')],
      [T('Rendu', 'Output'), T('Galerie 3D temps réel', 'Real-time 3D gallery')],
    ],
    intent: TODO('l’intention du projet en une phrase', 'the project’s intent in one sentence'),
    context: T(
      'Des vidéos de grands fonds deviennent des volumes à parcourir, pour approcher une créature abyssale comme une sculpture.',
      'Deep-sea footage turned into volumes you can walk around, to approach a deep-sea creature like a sculpture.',
    ),
    capture: T('Pas de captation propre : vidéos de submersibles du Schmidt Ocean Institute.', 'No own capture: submersible footage from the Schmidt Ocean Institute.'),
    processing: T(
      'Une IA de segmentation (SAM2) isole les créatures ; la luminosité de chaque pixel lui donne sa profondeur, comme une carte de profondeur. Ce n’est pas une reconstruction 3D mesurée.',
      'A segmentation AI (SAM2) isolates the creatures; the brightness of each pixel sets its depth, like a depth map. This is not a measured 3D reconstruction.',
    ),
    staging: T('Une galerie parcourue à la première personne, en Three.js et WebGL.', 'A first-person gallery, built in Three.js and WebGL.'),
    learned: TODO('ce que tu as appris, les limites', 'what you learned, the limits'),
    role: TODO('ton rôle', 'your role'),
    tools: 'Three.js, WebGL, SAM2',
    credits: [T('Vidéos : Schmidt Ocean Institute', 'Footage: Schmidt Ocean Institute'), TODO('mention exacte exigée par la licence du Schmidt Ocean Institute', 'exact licence wording')],
    link: { label: T('Ouvrir le projet', 'Open the project'), href: 'https://holosene.github.io/dumbo-biovolume/' },
    media: [
      { src: 'dumbo/058.webp', alt: T('Volume créé à partir d’une vidéo de submersible', 'Volume built from submersible footage') },
      { src: 'dumbo/053.webp', alt: T('La vidéo source mise en volume', 'The source footage turned into a volume') },
      { src: 'dumbo/054.webp', alt: T('Le volume vu de côté', 'The volume seen from the side') },
      { src: 'dumbo/057.webp', alt: T('L’espace Dumbo, près d’un mur', 'The Dumbo space, close to a wall') },
      { src: 'dumbo/056.webp', alt: T('L’espace Dumbo, l’entrée', 'The Dumbo space, the entrance') },
      { src: 'dumbo/041.webp', alt: T('L’IA isole le sujet de l’image', 'AI isolating the subject') },
      { src: 'dumbo/052.webp', alt: T('Galerie de volumes', 'Gallery of volumes') },
      { src: 'dumbo/061.webp', alt: T('Volume d’une créature', 'Volume of a creature') },
    ],
  },
  {
    slug: 'photographique-volume',
    title: 'Photographique Volume',
    year: '2025 — 26',
    milieu: T('Littoral', 'Coastline'),
    cover: 'photographique-volume/029.webp',
    coverCredit: T('Rendu : Johann Arata, d’après les photographies de Nicolas Floc’h', 'Render: Johann Arata, from Nicolas Floc’h’s photographs'),
    spec: [
      [T('Source', 'Source'), T('Photographies de Nicolas Floc’h', 'Photographs by Nicolas Floc’h')],
      [T('Traitement', 'Processing'), T('Profondeur estimée par IA (Depth Anything V2)', 'AI-estimated depth (Depth Anything V2)')],
      [T('Rendu', 'Output'), T('Paysages 3D, son (Web Audio)', '3D landscapes, sound (Web Audio)')],
    ],
    intent: TODO('l’intention du projet en une phrase', 'the project’s intent in one sentence'),
    context: T(
      'Les photographies sous-marines de Nicolas Floc’h, prises dans les Calanques, deviennent des paysages 3D. Sept images, du rivage vers le large.',
      'Nicolas Floc’h’s underwater photographs of the Calanques turned into 3D landscapes. Seven images, from the shore out to the open sea.',
    ),
    capture: T('Pas de captation propre : photographies de Nicolas Floc’h (Calanques, 2018 — 2020), séries « Invisible » et « La Couleur de l’eau ».', 'No own capture: photographs by Nicolas Floc’h (Calanques, 2018 — 2020), series “Invisible” and “La Couleur de l’eau”.'),
    processing: T(
      'La profondeur est estimée par IA (Depth Anything V2), puis affinée par la lumière de l’image. « Invisible » donne la forme, « La Couleur de l’eau » la couleur.',
      'Depth is estimated by AI (Depth Anything V2), then refined by the light in the image. “Invisible” gives the shape, “La Couleur de l’eau” the colour.',
    ),
    staging: T('Sept paysages 3D parcourus du rivage vers le large, accompagnés de son (Web Audio).', 'Seven 3D landscapes, from the shore to the open sea, with sound (Web Audio).'),
    learned: TODO('ce que tu as appris, les limites', 'what you learned, the limits'),
    role: TODO('ton rôle', 'your role'),
    tools: 'Three.js, WebGL, Web Audio, Depth Anything V2',
    credits: [T('Photographies © Nicolas Floc’h', 'Photographs © Nicolas Floc’h')],
    link: { label: T('Ouvrir le projet', 'Open the project'), href: 'https://holosene.github.io/photographique-volume' },
    media: [
      { src: 'photographique-volume/034.webp', alt: T('Le site web', 'The website') },
      { src: 'photographique-volume/029.webp', alt: T('Volume photographique, état 01', 'Photographic volume, state 01') },
      { src: 'photographique-volume/030.webp', alt: T('Volume photographique, état 03', 'Photographic volume, state 03') },
      { src: 'photographique-volume/031.webp', alt: T('Volume photographique, état 07', 'Photographic volume, state 07') },
      { src: 'photographique-volume/036.webp', alt: T('Test de projection dans une salle d’exposition 3D', 'Projection test in a 3D exhibition room') },
      { src: 'photographique-volume/028.webp', alt: T('Profondeur estimée par IA et par la lumière', 'Depth estimated by AI and from light') },
      { src: 'photographique-volume/017.webp', alt: T('Prototype : bloc photographique', 'Prototype: photographic block') },
      { src: 'photographique-volume/033.webp', alt: T('Nicolas Floc’h, série Invisible', 'Nicolas Floc’h, Invisible series') },
    ],
  },
  {
    slug: 'mondes-immerges',
    title: 'Mondes Immergés',
    year: '2024 — 25',
    milieu: T('Recherche', 'Research'),
    cover: 'mondes-immerges/011.webp',
    spec: [
      [T('Forme', 'Format'), T('Article de recherche édité', 'Published research paper')],
      [T('Sujet', 'Subject'), T('Design immersif et milieux aquatiques', 'Immersive design and aquatic environments')],
      [T('Cadre', 'Context'), T('DNMADe Design numérique', 'DNMADe in Digital Design')],
    ],
    intent: T(
      'Comment le design immersif peut-il rendre sensibles des milieux aquatiques qui se dégradent ?',
      'How can immersive design make damaged aquatic environments felt?',
    ),
    context: T(
      'Article de recherche de DNMADe (Lycée René Goscinny). Il croise écologie et représentation visuelle et pose les bases des projets qui ont suivi.',
      'Research paper written during my design degree (Lycée René Goscinny). It brings ecology and visual representation together and laid the groundwork for the projects that followed.',
    ),
    capture: T('Sources documentaires et scientifiques.', 'Documentary and scientific sources.'),
    processing: T('Analyse de dispositifs existants et expérimentations graphiques.', 'Review of existing works and graphic experiments.'),
    staging: T('Un article édité, mis en page et imprimé.', 'An edited, designed and printed paper.'),
    learned: TODO('ce que tu en retiens', 'what you take from it'),
    role: TODO('ton rôle', 'your role'),
    tools: 'InDesign, Photoshop, Illustrator',
    credits: [],
    link: { label: T('Lire l’article', 'Read the paper'), href: 'https://indd.adobe.com/view/dc3c7dff-f28e-4969-9c00-527dc66c4321' },
    media: [
      { src: 'mondes-immerges/011.webp', alt: T('Couverture du livre Mondes Immergés', 'Cover of Mondes Immergés') },
      { src: 'mondes-immerges/013.webp', alt: T('Page d’ouverture', 'Opening spread') },
      { src: 'mondes-immerges/012.webp', alt: T('Expérimentation en volume', 'Volume experiment') },
      { src: 'mondes-immerges/010.webp', alt: T('Expérimentation graphique', 'Graphic experiment') },
      { src: 'mondes-immerges/009.webp', alt: T('Aurores boréales transformées en particules', 'Northern lights turned into particles') },
      { src: 'mondes-immerges/005.webp', alt: T('Données scientifiques mises en image', 'Scientific data made visual') },
    ],
  },
]

export const lab = {
  title: T('Essais 4DGS', '4DGS tests'),
  memoire: T(
    'Mémoire en cours : la reconstruction volumétrique du réel capturé (Gaussian splatting 3D et 4D) et la frontière entre captation, reconstruction et génération par IA.',
    'Thesis in progress: the volumetric reconstruction of captured reality (3D and 4D Gaussian splatting) and the line between capture, reconstruction and AI generation.',
  ),
  releve: T(
    'Premier relevé : les essais en 4D Gaussian splatting de 4Dérives, qui prolongent l’espace hors du cadre.',
    'First record: the 4D Gaussian splatting tests from 4Dérives, which extend the space beyond the frame.',
  ),
  image: '4derives/073.webp',
  data: [
    [T('Source', 'Source'), T('Tournage 4Dérives', '4Dérives footage')],
    [T('Outil', 'Tool'), T('Luma AI', 'Luma AI')],
    [T('Technique', 'Technique'), T('4D Gaussian splatting', '4D Gaussian splatting')],
    [T('Constat', 'Finding'), T('Montre les limites des outils accessibles aujourd’hui', 'Shows the limits of today’s accessible tools')],
  ],
}

export const studio = T(
  'Holosene est le studio de Johann Arata, designer numérique, en master Design – Environnements numériques à la Faculté des arts de Strasbourg. Un studio solo, sans équipe.',
  'Holosene is the studio of Johann Arata, a digital designer studying for a master’s in Design – Digital Environments at the Faculty of Arts in Strasbourg. A one-person studio, with no team.',
)
