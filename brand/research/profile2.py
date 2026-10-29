import sys, json, pickle, numpy as np
sys.path.insert(0, '.')
from scipy import ndimage
from scipy.signal import savgol_filter
from scipy.spatial import cKDTree
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from PIL import Image, ImageDraw
from fit import fit_curve, bez, bez_d

S = np.load('S.npy'); H, W = S.shape; g = json.load(open('geo.json'))
left = np.load('left.npy'); right = np.load('right.npy')
kcut = int(len(left) * 0.035)  # retire l'arrondi des bouts : les gouttes viennent du pinceau
segs = fit_curve(savgol_filter(left, 31, 3, axis=0)[kcut:-kcut], 2.5)
t = np.linspace(0, 1, 120, endpoint=False)
P = np.vstack([bez(s, t) for s in segs] + [segs[-1][3][None]])
D = np.vstack([bez_d(s, t) for s in segs] + [bez_d(segs[-1], [1.0])])
T = D / np.linalg.norm(D, axis=1)[:, None]; N = np.c_[-T[:, 1], T[:, 0]]
# orienter la normale vers l'intérieur du tracé (vers le bord droit)
mid = len(P) // 2
if S[int(P[mid, 1] + N[mid, 1] * 15), int(P[mid, 0] + N[mid, 0] * 15)] == 0: N = -N
# épaisseur d'origine : distance perpendiculaire du profil au bord droit
tree = cKDTree(right)
w = np.array([tree.query(p + N[i] * 0)[0] for i, p in enumerate(P)])
# affinage : on marche le long de la normale jusqu'à sortir du tracé
dt_out = ndimage.distance_transform_edt(~S)
def march(p, n):
    for d in np.arange(4, 260, 0.5):
        x, y = p + n * d
        if not (0 <= int(y) < H and 0 <= int(x) < W) or not S[int(y), int(x)]: return d
    return 260
wm = np.array([march(P[i], N[i]) for i in range(len(P))])
wk = np.array([tree.query(p)[0] for p in P])
w = np.minimum(wm, wk * 1.08)  # distance au bord opposé : robuste dans les virages
n = len(P); core = slice(int(.05 * n), int(.95 * n))
print('épaisseur mesurée depuis le profil : médiane %.1f, min %.1f, max %.1f' % (np.median(w[core]), w[core].min(), w[core].max()))

def build(wv):
    """Pinceau rond posé sur le profil : disque de diamètre w(s) dont le bord touche le bord gauche.
    L'enveloppe des disques donne un bord droit lisse, sans recoupement dans les virages serrés."""
    from shapely import union_all
    step = 2
    disks = [Point(P[i] + N[i] * wv[i] / 2).buffer(wv[i] / 2, quad_segs=24) for i in range(0, len(P), step)]
    shape = union_all(disks)
    return shape.buffer(3, quad_segs=24).buffer(-3, quad_segs=24)

cap = np.median(w[core]) * 1.8
w = np.minimum(w, cap)
e = int(.03 * n); w[:e] = w[e]; w[-e:] = w[-e - 1]  # extrémités : épaisseur de la goutte
wl = ndimage.median_filter(w, 15)
print('épaisseur plafonnée à %.1f' % cap)
variants = {
    'P0': build(savgol_filter(wl, 21, 2) * 1.10),            # au plus près de la version fidèle
    'P1': build(savgol_filter(wl, 41, 2) * 1.12),            # modulation d'origine, plus épaisse
    'P2': build(ndimage.gaussian_filter1d(wl, 30) * 1.15),   # modulation adoucie, plus épaisse
    'P3': build(np.full(n, np.median(w[core]) * 1.15)),      # épaisseur constante depuis le profil
}
V = pickle.load(open('variants.pkl', 'rb')); variants['A'] = V['A']
json.dump({'scale': 1.12}, open('profile_meta.json', 'w'))
pickle.dump({'variants': variants, 'P': P, 'segs': segs, 'w': w}, open('profile.pkl', 'wb'))
def raster(Pg):
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    for p in getattr(Pg, 'geoms', [Pg]):
        d.polygon([tuple(c) for c in p.exterior.coords], fill=255)
        for r in p.interiors: d.polygon([tuple(c) for c in r.coords], fill=0)
    return np.array(img) > 0
for k, v in variants.items():
    m = raster(v); print(k, 'IoU %.3f, surface %.2f x original' % ((m & S).sum() / (m | S).sum(), m.sum() / S.sum()))
