import pickle, json, numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import Point
D = pickle.load(open('profile.pkl', 'rb')); V = D['variants']; g = json.load(open('geo.json'))
S = np.load('S.npy'); H, W = S.shape; cx, cy = g['o'][0], g['o'][1]
ys, xs = np.where(S); HM = ys.max() - ys.min()
def ring(k):  # anneau épaissi vers l'intérieur dans la même proportion que le S
    ro = 0.166 * HM; ri = ro - (0.166 - 0.111) * HM * k
    return Point(cx, cy).buffer(ro, quad_segs=96).difference(Point(cx, cy).buffer(ri, quad_segs=96))
def draw(P, k, size, dark=False, Sc=3):
    bg, fg = (26, 255) if dark else (255, 26)
    x0, y0, x1, y1 = P.union(ring(k)).bounds; pad = 0.18 * (y1 - y0)
    ox, oy = x0 - pad, y0 - pad; Wc, Hc = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    img = Image.new('L', (round(Wc * Sc), round(Hc * Sc)), bg); d = ImageDraw.Draw(img)
    for geom in [P, ring(k)]:
        for p in getattr(geom, 'geoms', [geom]):
            d.polygon([((x - ox) * Sc, (y - oy) * Sc) for x, y in p.exterior.coords], fill=fg)
            for r in p.interiors: d.polygon([((x - ox) * Sc, (y - oy) * Sc) for x, y in r.coords], fill=bg)
    return img.resize((round(size * img.width / img.height), size), Image.LANCZOS)
src = Image.open('/home/user/portfolio/public/media/site/logo-source.webp').convert('L').point(lambda v: 26 if v < 200 else 255)
rows = [('ORIGINAL', None, 1.0), ('A — FIDÈLE', 'A', 1.0), ('P0 — PROFIL REDESSINÉ + ÉPAISSEUR D\'ORIGINE, +10 %', 'P0', 1.10), ('P1 — PROFIL + MODULATION D\'ORIGINE, +12 %', 'P1', 1.12),
        ('P2 — PROFIL + MODULATION ADOUCIE, +15 %', 'P2', 1.15), ('P3 — PROFIL + ÉPAISSEUR CONSTANTE, +15 %', 'P3', 1.15)]
RH = 300; sheet = Image.new('RGB', (1500, len(rows) * (RH + 40) + 20), (240, 240, 240)); d = ImageDraw.Draw(sheet)
for i, (title, key, k) in enumerate(rows):
    y = 20 + i * (RH + 40); d.text((20, y), title, fill=(0, 0, 0))
    if key is None:
        im = src.crop(src.getbbox() if False else (180, 100, 1080, 1150)).resize((round(RH * 900 / 1050), RH), Image.LANCZOS)
        sheet.paste(im.convert('RGB'), (20, y + 22)); continue
    big = draw(V[key], k, RH); sheet.paste(big.convert('RGB'), (20, y + 22))
    dk = draw(V[key], k, RH, dark=True); sheet.paste(dk.convert('RGB'), (20 + big.width + 20, y + 22))
    x = 20 + 2 * big.width + 60
    for s in (96, 48, 32, 16):
        im = draw(V[key], k, s, dark=True, Sc=1); sheet.paste(im.convert('RGB'), (x, y + 22 + (RH - s) // 2)); x += im.width + 30
d.text((20 + 2 * 260 + 60, 6), 'tailles réelles : 96, 48, 32, 16 px', fill=(80, 80, 80))
sheet.save('profile-sheet.png'); print(sheet.size)
