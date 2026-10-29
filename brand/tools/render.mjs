// rend des SVG en PNG (fond transparent) : node render.mjs fichier.svg sortie.png largeur [hauteur]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { readFileSync } from 'node:fs'
const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const b = await chromium.launch()
const p = await b.newPage()
for (const [src, out, w, h] of jobs) {
  const svg = readFileSync(src, 'utf8').replace(/width="[^"]*" height="[^"]*"/, `width="${w}" height="${h}"`)
  await p.setViewportSize({ width: w, height: h })
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
  await p.locator('svg').screenshot({ path: out, omitBackground: true })
}
await b.close()
