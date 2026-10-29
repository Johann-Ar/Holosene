"""Ajustement de courbes de Bézier cubiques (algorithme de Schneider) sur une suite de points."""
import numpy as np

def bez(ctrl, t):
    t = np.asarray(t)[:, None]
    p0, p1, p2, p3 = ctrl
    return (1-t)**3*p0 + 3*(1-t)**2*t*p1 + 3*(1-t)*t**2*p2 + t**3*p3

def bez_d(ctrl, t):
    t = np.asarray(t)[:, None]; p0, p1, p2, p3 = ctrl
    return 3*(1-t)**2*(p1-p0) + 6*(1-t)*t*(p2-p1) + 3*t**2*(p3-p2)

def bez_dd(ctrl, t):
    t = np.asarray(t)[:, None]; p0, p1, p2, p3 = ctrl
    return 6*(1-t)*(p2-2*p1+p0) + 6*t*(p3-2*p2+p1)

def chord_params(pts):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    return d / d[-1]

def generate(pts, u, t1, t2):
    p0, p3 = pts[0], pts[-1]
    A1 = t1[None, :] * (3*(1-u)**2*u)[:, None]
    A2 = t2[None, :] * (3*(1-u)*u**2)[:, None]
    C = np.array([[np.sum(A1*A1), np.sum(A1*A2)], [np.sum(A1*A2), np.sum(A2*A2)]])
    tmp = pts - bez([p0, p0, p3, p3], u)
    X = np.array([np.sum(A1*tmp), np.sum(A2*tmp)])
    det = np.linalg.det(C)
    seg = np.linalg.norm(p3 - p0)
    if abs(det) > 1e-12:
        a1 = (X[0]*C[1, 1] - X[1]*C[0, 1]) / det
        a2 = (C[0, 0]*X[1] - C[1, 0]*X[0]) / det
    else:
        a1 = a2 = seg / 3
    eps = 1e-6 * seg
    if a1 < eps or a2 < eps:
        a1 = a2 = seg / 3
    return [p0, p0 + t1*a1, p3 + t2*a2, p3]

def reparam(ctrl, pts, u):
    d = bez(ctrl, u) - pts
    d1 = bez_d(ctrl, u); d2 = bez_dd(ctrl, u)
    num = np.sum(d*d1, axis=1); den = np.sum(d1*d1 + d*d2, axis=1)
    den[den == 0] = 1e-12
    return np.clip(u - num/den, 0, 1)

def max_err(ctrl, pts, u):
    e = np.linalg.norm(bez(ctrl, u) - pts, axis=1)
    i = int(np.argmax(e)); return e[i], i

def unit(v):
    n = np.linalg.norm(v); return v / n if n else v

def fit_cubic(pts, t1, t2, err, out):
    if len(pts) == 2:
        dist = np.linalg.norm(pts[1]-pts[0]) / 3
        out.append([pts[0], pts[0]+t1*dist, pts[1]+t2*dist, pts[1]]); return
    u = chord_params(pts)
    ctrl = generate(pts, u, t1, t2)
    e, split = max_err(ctrl, pts, u)
    if e < err:
        out.append(ctrl); return
    if e < err * 4:
        for _ in range(20):
            u = reparam(ctrl, pts, u)
            ctrl = generate(pts, u, t1, t2)
            e, split = max_err(ctrl, pts, u)
            if e < err:
                out.append(ctrl); return
    split = min(max(split, 1), len(pts) - 2)
    tc = unit(pts[split-1] - pts[split+1])
    fit_cubic(pts[:split+1], t1, tc, err, out)
    fit_cubic(pts[split:], -tc, t2, err, out)

def fit_curve(pts, err):
    """Courbe ouverte : renvoie une liste de segments [p0, c1, c2, p3]."""
    out = []
    t1 = unit(pts[1] - pts[0]); t2 = unit(pts[-2] - pts[-1])
    fit_cubic(pts, t1, t2, err, out)
    return out
