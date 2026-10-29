"""Construit les fichiers de marque HOLOSENE (monogramme, irisé, squircle, icônes) dans holosene/brand/."""
import sys, json, math, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from shapely.geometry import LineString
from fit import fit_curve, bez

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)  # brand/
DATA = os.path.join(HERE, 'data')
# données : ligne centrale du « S » (extraite de source/monogramme-source.webp), mesures, forme du squircle
BLACK, WHITE = '#1A1A1A', '#FFFFFF'
# irisé : dégradé conique (angles mathématiques, 0° = droite, sens antihoraire), mesuré sur la planche
IRIS = [(0, '#98E2B4'), (45, '#99C1DD'), (90, '#DA9BC2'), (135, '#FE9AD5'), (180, '#FF97F0'),
        (225, '#F99DD0'), (270, '#D99CC3'), (315, '#9BC1DE'), (360, '#98E2B4')]

res = np.load(os.path.join(DATA, 'res.npy')); g = json.load(open(os.path.join(DATA, 'geo.json')))

# ---------- géométrie du monogramme (version finale validée : tools/final_s.py), ramenée à l'origine ----------
FINAL = json.load(open(os.path.join(DATA, 's_final.json')))
OUT_SEGS = [[np.array(p) for p in sg] for sg in FINAL['outline']]
ocx, ocy, RO, RI = FINAL['o']['cx'], FINAL['o']['cy'], FINAL['o']['r_out'], FINAL['o']['r_in']
STROKE = FINAL['stroke_median']
_pts = np.vstack([bez(sg, np.linspace(0, 1, 40)) for sg in OUT_SEGS])
minx = min(_pts[:, 0].min(), ocx - RO); miny = min(_pts[:, 1].min(), ocy - RO)
maxx = max(_pts[:, 0].max(), ocx + RO); maxy = max(_pts[:, 1].max(), ocy + RO)
# échelle : hauteur du monogramme = 1000 unités
k = 1000 / (maxy - miny)
T = lambda p: ((p[0] - minx) * k, (p[1] - miny) * k)
VW, VH = round((maxx - minx) * k, 1), 1000.0
f = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
OX, OY = T((ocx, ocy)); ORO, ORI = RO * k, RI * k; SW = STROKE * k

def path_from_segs(sg, close=False):
    d = f'M{f(sg[0][0][0])} {f(sg[0][0][1])}'
    for s in sg:
        d += f'C{f(s[1][0])} {f(s[1][1])} {f(s[2][0])} {f(s[2][1])} {f(s[3][0])} {f(s[3][1])}'
    return d + ('Z' if close else '')

# S en contour (forme pleine) : contour final validé
S_OUTLINE = path_from_segs([[np.array(T(p)) for p in sg] for sg in OUT_SEGS], close=True)
circle = lambda cx, cy, r: f'M{f(cx - r)} {f(cy)}a{f(r)} {f(r)} 0 1 0 {f(2 * r)} 0a{f(r)} {f(r)} 0 1 0 {f(-2 * r)} 0Z'
O_RING = circle(OX, OY, ORO) + circle(OX, OY, ORI)

def lerp_hex(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]; b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02X%02X%02X' % tuple(round(a[j] + (b[j] - a[j]) * t) for j in range(3))

def iris_at(deg):
    deg %= 360
    for (a0, c0), (a1, c1) in zip(IRIS, IRIS[1:]):
        if a0 <= deg <= a1: return lerp_hex(c0, c1, (deg - a0) / (a1 - a0))

def conic_wedges(cx, cy, r, n=180):
    """Dégradé conique (absent du SVG natif) : fins secteurs colorés, adoucis par un léger flou."""
    out = []
    for i in range(n):
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1.6) / n
        p = lambda a: (cx + r * math.cos(a), cy - r * math.sin(a))
        (x0, y0), (x1, y1) = p(a0), p(a1)
        out.append(f'<path d="M{f(cx)} {f(cy)}L{f(x0)} {f(y0)}L{f(x1)} {f(y1)}Z" fill="{iris_at(math.degrees(a0) + 180 / n)}"/>')
    return ''.join(out)

def iris_defs(uid, clip_path, core):
    blur = ORO * 0.06
    d = f'<clipPath id="{uid}c"><path d="{clip_path}" clip-rule="evenodd"/></clipPath>'
    d += f'<filter id="{uid}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="{f(blur)}"/></filter>'
    if core:
        d += (f'<radialGradient id="{uid}r" cx="{f(OX)}" cy="{f(OY)}" r="{f(ORI)}" gradientUnits="userSpaceOnUse">'
              '<stop offset="0" stop-color="#fff"/><stop offset=".38" stop-color="#fff" stop-opacity=".96"/>'
              '<stop offset=".8" stop-color="#fff" stop-opacity="0"/></radialGradient>')
    return d

def iris_layer(uid, core):
    body = f'<g filter="url(#{uid}b)">{conic_wedges(OX, OY, ORO * 1.25)}</g>'
    if core: body += f'<circle cx="{f(OX)}" cy="{f(OY)}" r="{f(ORI)}" fill="url(#{uid}r)"/>'
    return f'<g clip-path="url(#{uid}c)">{body}</g>'

def monogram_svg(variant, vb=None, tx='', uid='m'):
    """variant : black | white | iris-light (anneau noir, intérieur irisé lumineux) | iris-dark (anneau irisé)."""
    if variant in ('black', 'white'):
        c = BLACK if variant == 'black' else WHITE
        return f'<path d="{S_OUTLINE}" fill="{c}"/><path d="{O_RING}" fill="{c}" fill-rule="evenodd"/>', ''
    if variant == 'iris-light':
        defs = iris_defs(uid, circle(OX, OY, ORI), core=True)
        g_ = f'<path d="{S_OUTLINE}" fill="{BLACK}"/><path d="{O_RING}" fill="{BLACK}" fill-rule="evenodd"/>' + iris_layer(uid, True)
        return g_, defs
    defs = iris_defs(uid, O_RING, core=False)
    g_ = f'<path d="{S_OUTLINE}" fill="{WHITE}"/>' + iris_layer(uid, False)
    return g_, defs

def svg(w, h, body, defs='', title=''):
    t = f'<title>{title}</title>' if title else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}">{t}'
            + (f'<defs>{defs}</defs>' if defs else '') + body + '</svg>\n')

# ---------- squircle : côtés en arc bombé + coins arrondis (ajusté sur la planche, IoU 0,99) ----------
BULGE, CORNER = map(float, open(os.path.join(DATA, 'squircle_arc.txt')).read().split())  # en fraction du côté
N = f'arc {BULGE:.4f} / coin {CORNER:.4f}'
def squircle_path(w, h, x0=0, y0=0):
    from shapely.geometry import Polygon
    from shapely import affinity
    S_ = 1000.0
    def side(p0, p1, nrm):
        return [(p0[0] + (p1[0] - p0[0]) * t + nrm[0] * 4 * BULGE * S_ * t * (1 - t),
                 p0[1] + (p1[1] - p0[1]) * t + nrm[1] * 4 * BULGE * S_ * t * (1 - t)) for t in np.linspace(0, 1, 120)]
    c = [(0, 0), (S_, 0), (S_, S_), (0, S_)]
    pts = side(c[0], c[1], (0, -1)) + side(c[1], c[2], (1, 0)) + side(c[2], c[3], (0, 1)) + side(c[3], c[0], (-1, 0))
    r = CORNER * S_
    P = Polygon(pts).buffer(-r, join_style=1).buffer(r, join_style=1, quad_segs=64)
    bx0, by0, bx1, by1 = P.bounds
    P = affinity.scale(affinity.translate(P, -bx0, -by0), w / (bx1 - bx0), h / (by1 - by0), origin=(0, 0))
    P = affinity.translate(P, x0, y0)
    ring = np.array(P.exterior.coords)[:-1]
    # départ au milieu du bord haut, contour fermé lissé en Bézier
    i0 = int(np.argmin(np.abs(ring[:, 0] - (x0 + w / 2)) + (ring[:, 1] > y0 + h / 2) * 1e9))
    ring = np.vstack([ring[i0:], ring[:i0], ring[i0:i0 + 1]])
    return path_from_segs(fit_curve(ring, 0.4 * w / 1000), close=True)

os.makedirs(f'{OUT}/monogram', exist_ok=True); os.makedirs(f'{OUT}/squircle', exist_ok=True); os.makedirs(f'{OUT}/icons', exist_ok=True)
for v in ['black', 'white', 'iris-light', 'iris-dark']:
    body, defs = monogram_svg(v)
    open(f'{OUT}/monogram/monogram-{v}.svg', 'w').write(svg(VW, VH, body, defs, 'Holosene'))
SQ = squircle_path(1000, 1000)
for name, c in [('black', BLACK), ('white', WHITE)]:
    open(f'{OUT}/squircle/squircle-{name}.svg', 'w').write(svg(1000, 1000, f'<path d="{SQ}" fill="{c}"/>'))

# ---------- icônes : monogramme dans le squircle (hauteur du monogramme ≈ 74 % de la tuile, comme la planche) ----------
def icon(tile, mono, full_bleed=False, uid='i'):
    s = 740 / VH; mw = VW * s
    tx, ty = (1000 - mw) / 2, (1000 - 740) / 2
    body, defs = monogram_svg(mono, uid=uid)
    bg = f'<rect width="1000" height="1000" fill="{tile}"/>' if full_bleed else f'<path d="{SQ}" fill="{tile}"/>'
    return svg(1000, 1000, bg + f'<g transform="translate({f(tx)} {f(ty)}) scale({s:.5f})">{body}</g>', defs, 'Holosene')
variants = {'icon-black': (BLACK, 'white'), 'icon-white': (WHITE, 'black'),
            'icon-black-iris': (BLACK, 'iris-dark'), 'icon-white-iris': (WHITE, 'iris-light')}
for name, (tile, mono) in variants.items():
    open(f'{OUT}/icons/{name}.svg', 'w').write(icon(tile, mono))
open(f'{OUT}/icons/icon-maskable.svg', 'w').write(icon(BLACK, 'iris-dark', full_bleed=True))
json.dump({'viewBox': [VW, VH], 'stroke': SW, 'o': {'cx': OX, 'cy': OY, 'r_out': ORO, 'r_in': ORI},
           'squircle_exponent': N, 'S_contour_curves': len(OUT_SEGS)}, open(f'{OUT}/geometry.json', 'w'), indent=2)
print('monogramme', VW, 'x', VH, '| S :', len(OUT_SEGS), 'courbes de contour, épaisseur médiane', round(SW, 1), '| o : rayon', round(ORO, 1), '/', round(ORI, 1), '| squircle n =', N)
