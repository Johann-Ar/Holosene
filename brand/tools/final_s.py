"""Version finale du « S » (P1 + anneau R4), validée par Johann.
Profil (bord gauche) = ligne maîtresse redessinée ; épaisseur d'origine +12 %, construite au pinceau rond
depuis le profil ; gouttes renflées aux extrémités ; contour final réduit en courbes de Bézier.
Sortie : data/s_final.json (contour en coordonnées source, épaisseur médiane, anneau R4)."""
import os, sys, json, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from scipy import ndimage
from scipy.signal import savgol_filter
from scipy.spatial import cKDTree
from shapely import union_all
from shapely.geometry import Point, Polygon
from fit import fit_curve, bez, bez_d

DATA = os.path.join(HERE, 'data')
S = np.load(os.path.join(DATA, 'S.npy')); H, W = S.shape
left = np.load(os.path.join(DATA, 'left.npy')); right = np.load(os.path.join(DATA, 'right.npy'))
g = json.load(open(os.path.join(DATA, 'geo.json')))

# 1. profil : extrémités arrondies retirées, lissage un peu plus fort (creux du « nez » adouci), 8 courbes environ
kcut = int(len(left) * 0.035)
segs = fit_curve(savgol_filter(left, 45, 3, axis=0)[kcut:-kcut], 2.5)
t = np.linspace(0, 1, 120, endpoint=False)
P = np.vstack([bez(s, t) for s in segs] + [segs[-1][3][None]])
Dv = np.vstack([bez_d(s, t) for s in segs] + [bez_d(segs[-1], [1.0])])
T = Dv / np.linalg.norm(Dv, axis=1)[:, None]; N = np.c_[-T[:, 1], T[:, 0]]
mid = len(P) // 2
if S[int(P[mid, 1] + N[mid, 1] * 15), int(P[mid, 0] + N[mid, 0] * 15)] == 0: N = -N

# 2. épaisseur d'origine mesurée depuis le profil (distance au bord opposé, robuste dans les virages)
def march(p, nv):
    for d in np.arange(4, 260, 0.5):
        x, y = p + nv * d
        if not (0 <= int(y) < H and 0 <= int(x) < W) or not S[int(y), int(x)]: return d
    return 260
tree = cKDTree(right)
w = np.minimum([march(P[i], N[i]) for i in range(len(P))], [tree.query(p)[0] * 1.08 for p in P])
n = len(P); core = slice(int(.05 * n), int(.95 * n))
w = np.minimum(w, np.median(w[core]) * 1.8)
e = int(.03 * n); w[:e] = w[e]; w[-e:] = w[-e - 1]
w = savgol_filter(ndimage.median_filter(w, 15), 41, 2) * 1.12          # P1 : modulation d'origine, +12 %

# 3. gouttes : léger renflement vers les extrémités (bas plus marqué, comme le dessin d'origine)
s = np.linspace(0, 1, n)
sm = lambda x: np.clip(x, 0, 1) ** 2 * (3 - 2 * np.clip(x, 0, 1))
w = w * (1 + 0.10 * sm((0.08 - s) / 0.08) + 0.22 * sm((s - 0.90) / 0.10))

# 3 bis. extrémités prolongées dans l'axe du tracé (longueur des bouts d'origine)
def extend(Pa, Ta, Na, wa, L, start):
    ds = np.linspace(L, 0, 12, endpoint=False) if start else np.linspace(0, L, 13)[1:]
    sgn = -1 if start else 1
    return np.array([Pa + sgn * Ta * d for d in ds]), np.repeat(Na[None], len(ds), 0), np.full(len(ds), wa)
p0, n0, w0 = extend(P[0], T[0], N[0], w[0], 0.42 * w[0], True)
p1, n1, w1 = extend(P[-1], T[-1], N[-1], w[-1], 0.42 * w[-1], False)
P = np.vstack([p0, P, p1]); N = np.vstack([n0, N, n1]); w = np.r_[w0, w, w1]; n = len(P)

# 4. pinceau rond posé sur le profil
disks = [Point(P[i] + N[i] * w[i] / 2).buffer(w[i] / 2, quad_segs=32) for i in range(0, n, 2)]
shape = union_all(disks)
# angles rentrants (virage intérieur du bas) : fermeture morphologique, arrondit les crans sans toucher au profil
shape = shape.buffer(16, quad_segs=48).buffer(-16, quad_segs=48)
shape = shape.buffer(-3, quad_segs=32).buffer(3, quad_segs=32)

# 5. contour réduit en Bézier (départ à l'extrémité haute)
ring = np.array(shape.exterior.coords)[:-1]
i0 = int(np.argmin(np.linalg.norm(ring - P[0], axis=1))); ring = np.vstack([ring[i0:], ring[:i0], ring[i0:i0 + 1]])
outline = fit_curve(ring, 1.6)
# épaisseur médiane mesurée comme pour la planche R4 : squelette de la forme
from PIL import Image, ImageDraw
from skimage.morphology import skeletonize
im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([tuple(c) for c in shape.exterior.coords], fill=255)
m = np.array(im) > 0; med = float(np.median(2 * ndimage.distance_transform_edt(m)[skeletonize(m)]))
ys, xs = np.where(S); HM = ys.max() - ys.min()
ro0, ri0 = 0.166 * HM, 0.166 * HM - 58.0; axis = (ro0 + ri0) / 2      # anneau R4 : 92 % du « S », axe conservé
ro, ri = axis + 0.46 * med, axis - 0.46 * med
json.dump({'outline': [[list(map(float, p)) for p in sg] for sg in outline], 'stroke_median': med,
           'o': {'cx': g['o'][0], 'cy': g['o'][1], 'r_out': ro, 'r_in': ri}},
          open(os.path.join(DATA, 's_final.json'), 'w'))
print('S final : %d courbes de contour, épaisseur médiane %.1f ; anneau %.1f / %.1f (épaisseur %.1f)' % (len(outline), med, ro, ri, ro - ri))
