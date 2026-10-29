"""Logotype « Holosene » : Archivo (graisse 500, largeur 120 %, approche -0,04 em) converti en tracés.
Police : Archivo, SIL Open Font License 1.1 (usage web et commercial libre). Les tracés ne nécessitent pas la police."""
import os, math
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'logotype')
FONT = os.path.join(HERE, 'data', 'archivo-500-120.ttf')
TEXT, TRACK = 'Holosene', -0.04
BLACK, WHITE = '#1A1A1A', '#FFFFFF'
IRIS = [(0, '#98E2B4'), (45, '#99C1DD'), (90, '#DA9BC2'), (135, '#FE9AD5'), (180, '#FF97F0'),
        (225, '#F99DD0'), (270, '#D99CC3'), (315, '#9BC1DE'), (360, '#98E2B4')]

tt = TTFont(FONT); gs = tt.getGlyphSet(); upem = tt['head'].unitsPerEm
blob = hb.Blob.from_file_path(FONT); face = hb.Face(blob); font = hb.Font(face)
buf = hb.Buffer(); buf.add_str(TEXT); buf.guess_segment_properties(); hb.shape(font, buf, {'kern': True, 'liga': False})
order = tt.getGlyphOrder()
f = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')

# placement des glyphes (y vers le bas en SVG : on retourne l'axe), approche ajoutée entre les lettres
x = 0; glyphs = []
for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
    name = order[info.codepoint]
    glyphs.append((name, x + pos.x_offset, TEXT[i]))
    x += pos.x_advance + (TRACK * upem if i < len(TEXT) - 1 else 0)

def glyph_path(name, dx):
    pen = SVGPathPen(gs)
    gs[name].draw(TransformPen(pen, (1, 0, 0, -1, dx, 0)))
    return pen.getCommands()

def contours(name, dx):
    """Contours séparés (pour isoler l'intérieur du « o »)."""
    rec = RecordingPen(); gs[name].draw(TransformPen(rec, (1, 0, 0, -1, dx, 0)))
    out, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ('closePath', 'endPath'): out.append(cur); cur = []
    def area_box(c):
        pts = [p for _, a in c for p in a]
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        return (max(xs) - min(xs)) * (max(ys) - min(ys)), (min(xs), min(ys), max(xs), max(ys))
    def to_d(c):
        pen = SVGPathPen(gs)
        for op, a in c: getattr(pen, op)(*a)
        return pen.getCommands()
    cs = sorted(contours_ := [(area_box(c), to_d(c)) for c in out], key=lambda t: -t[0][0])
    return cs  # [(aire, boîte), d] du plus grand au plus petit

# boîte englobante du mot
from fontTools.pens.boundsPen import BoundsPen
xmin = ymin = 1e9; xmax = ymax = -1e9
for name, dx, ch in glyphs:
    bp = BoundsPen(gs); gs[name].draw(TransformPen(bp, (1, 0, 0, -1, dx, 0)))
    if bp.bounds:
        a, b, c, d = bp.bounds; xmin, ymin, xmax, ymax = min(xmin, a), min(ymin, b), max(xmax, c), max(ymax, d)
W, H = xmax - xmin, ymax - ymin

def lerp_hex(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]; b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02X%02X%02X' % tuple(round(a[j] + (b[j] - a[j]) * t) for j in range(3))
def iris_at(deg):
    deg %= 360
    for (a0, c0), (a1, c1) in zip(IRIS, IRIS[1:]):
        if a0 <= deg <= a1: return lerp_hex(c0, c1, (deg - a0) / (a1 - a0))
def wedges(cx, cy, r, n=120):
    o = []
    for i in range(n):
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1.6) / n
        x0, y0 = cx + r * math.cos(a0), cy - r * math.sin(a0); x1, y1 = cx + r * math.cos(a1), cy - r * math.sin(a1)
        o.append(f'<path d="M{f(cx)} {f(cy)}L{f(x0)} {f(y0)}L{f(x1)} {f(y1)}Z" fill="{iris_at(math.degrees(a0) + 180 / n)}"/>')
    return ''.join(o)

def build(variant):
    color = WHITE if variant in ('white', 'iris-dark') else BLACK
    body, defs = [], []
    for k, (name, dx, ch) in enumerate(glyphs):
        if ch != 'o' or variant in ('black', 'white'):
            body.append(f'<path d="{glyph_path(name, dx)}" fill="{color}"/>'); continue
        cs = contours(name, dx)
        (_, (bx0, by0, bx1, by1)), outer = cs[0]
        (_, (ix0, iy0, ix1, iy1)), inner = cs[1]
        cx, cy, r = (bx0 + bx1) / 2, (by0 + by1) / 2, (bx1 - bx0) / 2
        uid = f'o{k}'
        defs.append(f'<filter id="{uid}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="{f(r * 0.06)}"/></filter>')
        if variant == 'iris-light':
            # anneau dans la couleur du mot, intérieur irisé avec cœur blanc
            ri = (ix1 - ix0) / 2
            defs.append(f'<clipPath id="{uid}c"><path d="{inner}"/></clipPath>')
            defs.append(f'<radialGradient id="{uid}r" cx="{f(cx)}" cy="{f(cy)}" r="{f(ri)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".38" stop-color="#fff" stop-opacity=".96"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/></radialGradient>')
            body.append(f'<path d="{glyph_path(name, dx)}" fill="{color}"/>')
            body.append(f'<g clip-path="url(#{uid}c)"><g filter="url(#{uid}b)">{wedges(cx, cy, r * 1.25)}</g><circle cx="{f(cx)}" cy="{f(cy)}" r="{f(ri)}" fill="url(#{uid}r)"/></g>')
        else:
            # anneau irisé (intérieur transparent)
            defs.append(f'<clipPath id="{uid}c"><path d="{glyph_path(name, dx)}" clip-rule="evenodd"/></clipPath>')
            body.append(f'<g clip-path="url(#{uid}c)"><g filter="url(#{uid}b)">{wedges(cx, cy, r * 1.25)}</g></g>')
    vb = f'{f(xmin)} {f(ymin)} {f(W)} {f(H)}'
    d = f'<defs>{"".join(defs)}</defs>' if defs else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{f(W)}" height="{f(H)}"><title>Holosene</title>{d}{"".join(body)}</svg>\n'

os.makedirs(OUT, exist_ok=True)
for v in ['black', 'white', 'iris-light', 'iris-dark']:
    open(os.path.join(OUT, f'logotype-{v}.svg'), 'w').write(build(v))
print('logotype', round(W), 'x', round(H), 'unités ; rapport', round(W / H, 3))
