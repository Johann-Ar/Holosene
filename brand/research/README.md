# Recherche — professionnalisation du monogramme

Planche : `monogramme-recherche-profil.png` (grand format clair / sombre, puis tailles réelles 96, 48, 32, 16 px).

Principe : le **bord gauche du « S » (le profil) est la ligne maîtresse**. Il est redessiné en 8 courbes de Bézier
(le dessin d'origine a 10 changements de courbure, dont 6 tremblements ; la forme réelle en a 4, conservés).
L'épaisseur est construite **depuis le profil vers l'intérieur** avec un pinceau rond (enveloppe de disques),
sans recoupement dans les virages serrés.

| Variante | Épaisseur |
|---|---|
| A — fidèle | contour d'origine nettoyé |
| P0 | profil redessiné + épaisseur d'origine à peine lissée, +10 % |
| P1 | profil redessiné + modulation d'origine, +12 % |
| P2 | profil redessiné + modulation adoucie, +15 % |
| P3 | profil redessiné + épaisseur constante, +15 % |

Le « o » s'épaissit vers l'intérieur dans la même proportion que le « S ».
Scripts : `profile.py` (extraction et analyse du profil), `profile2.py` (variantes), `sheet.py` (planche).
