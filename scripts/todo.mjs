/** Liste ce qui reste à fournir avant la mise en ligne : textes TODO(...) de src/content.js (invisibles en ligne, visibles
 *  avec ?dev), fichier du CV, informations entre crochets des mentions légales. */
import { readFileSync, existsSync } from 'node:fs'
const src = readFileSync(new URL('../src/content.js', import.meta.url), 'utf8').split('\n')
const items = src.flatMap((l, i) => /^\s*(\*|\/\/)/.test(l) ? [] : [...l.matchAll(/TODO\(\s*'([^']*)'/g)].map((m) => `  src/content.js:${i + 1}  ${m[1]}`))
const cv = src.join('\n').match(/cv:\s*'([^']+)'/)?.[1]
if (cv && !existsSync(new URL(`../public/${cv}`, import.meta.url))) items.push(`  public/${cv}  PDF du CV (le bouton « Curriculum vitae » est masqué en ligne tant qu’il manque)`)
const legal = readFileSync(new URL('../mentions-legales.html', import.meta.url), 'utf8')
for (const m of legal.matchAll(/class="missing">\[([^\]]+)\]/g)) items.push(`  mentions-legales.html  ${m[1]}`)
console.log(items.length ? `${items.length} élément(s) à fournir :\n${items.join('\n')}` : 'Rien à fournir.')
