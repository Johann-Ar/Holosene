"""Recherche : le bord gauche du « S » (profil) comme ligne maîtresse."""
import sys, json, pickle, numpy as np
sys.path.insert(0, '.')
from scipy import ndimage
from scipy.signal import savgol_filter
from skimage import measure
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from fit import fit_curve, bez, bez_d, bez_dd

S = np.load('S.npy'); res = np.load('res.npy'); H, W = S.shape
sm = ndimage.gaussian_filter(S.astype(float), 2.5)
cont = max(measure.find_contours(sm, 0.5), key=len); cont = np.c_[cont[:, 1], cont[:, 0]]
# couper le contour aux deux extrémités du tracé (points les plus proches des bouts de la ligne centrale)
i0 = int(np.argmin(np.linalg.norm(cont - res[0], axis=1))); i1 = int(np.argmin(np.linalg.norm(cont - res[-1], axis=1)))
a, b = sorted([i0, i1])
c1 = cont[a:b + 1]; c2 = np.vstack([cont[b:], cont[:a + 1]])
left, right = (c1, c2) if c1[:, 0].mean() < c2[:, 0].mean() else (c2, c1)
if np.linalg.norm(left[0] - res[0]) > np.linalg.norm(left[-1] - res[0]): left = left[::-1]
if np.linalg.norm(right[0] - res[0]) > np.linalg.norm(right[-1] - res[0]): right = right[::-1]
# rééchantillonnage régulier
def resample(p, step=3):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
    s = np.arange(0, d[-1], step); return np.c_[np.interp(s, d, p[:, 0]), np.interp(s, d, p[:, 1])]
left = resample(left); right = resample(right)
# on retire les bouts arrondis (les gouttes seront reconstruites) : 6 % à chaque extrémité
k = int(len(left) * 0.04); leftc = left[k:-k]
np.save('left.npy', left); np.save('right.npy', right)
print('bord gauche :', len(left), 'points ; bord droit :', len(right))

def curvature(pts):
    d1 = np.gradient(pts, axis=0); d2 = np.gradient(d1, axis=0)
    return (d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / (np.linalg.norm(d1, axis=1) ** 3 + 1e-9)
def sign_changes(k, thr):
    s = np.sign(np.where(np.abs(k) < thr, 0, k)); s = s[s != 0]; return int(np.sum(s[1:] != s[:-1]))
print('inflexions du bord gauche (original) :', sign_changes(curvature(savgol_filter(left, 9, 2, axis=0)), 0.002))
for tol in [1.5, 2.5, 4, 6]:
    segs = fit_curve(savgol_filter(left, 31, 3, axis=0), tol)
    pts = np.vstack([bez(sg, np.linspace(0, 1, 80)) for sg in segs])
    print('tolérance %.1f : %d courbes, %d inflexions' % (tol, len(segs), sign_changes(curvature(pts), 0.002)))
