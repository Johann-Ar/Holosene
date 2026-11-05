/** Liste les textes encore à fournir (TODO(...) dans src/content.js) : invisibles en ligne, visibles avec ?dev. */
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../src/content.js', import.meta.url), 'utf8').split('\n')
const items = src.flatMap((l, i) => /^\s*(\*|\/\/)/.test(l) ? [] : [...l.matchAll(/TODO\(\s*'([^']*)'/g)].map((m) => `  src/content.js:${i + 1}  ${m[1]}`))
console.log(items.length ? `${items.length} texte(s) à fournir :\n${items.join('\n')}` : 'Aucun texte à fournir.')
