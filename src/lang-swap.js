/**
 * Changement de langue sans rechargement : la page de l'autre langue (FR ⇄ EN, mêmes gabarits) est récupérée en
 * arrière-plan, et ses textes remplacent ceux de la page en place. Position, état, WebGL et animations sont conservés ;
 * l'adresse change (historique). Si la structure ne correspond pas exactement, chargement normal (jamais de page cassée).
 *
 * Correspondance : les éléments des deux pages sont parcourus en parallèle, dans l'ordre. Les éléments ajoutés par le
 * script (copies des cartes, bandes de flou, calques) sont ignorés ; les blocs découpés en mots (présentation, textes
 * des sections), dont le nombre de mots change d'une langue à l'autre, sont remplacés en entier.
 */
const SKIP = '.card--copy, .side, .fx, .gl-card, canvas, script, style, .loader'
const WHOLE = '[data-seq], [data-hwords], [data-sw]'
const ATTRS = ['aria-label', 'alt', 'title', 'href', 'hreflang', 'lang', 'data-copy', 'data-done', 'data-light', 'data-dark', 'content']

const cls = (e) => (e.getAttribute('class') || '').split(' ')[0]   // premier nom de classe (aussi pour les SVG)
// éléments « serveur » d'un sous-arbre, dans l'ordre, sans ceux ajoutés par le script ni l'intérieur des blocs entiers
function serverEls(root) {
  const out = []
  const walk = (el) => {
    for (const c of el.children) {
      if (c.matches(SKIP)) continue
      out.push(c)
      if (!c.matches(WHOLE)) walk(c)
    }
  }
  walk(root)
  return out
}
// textes directs (nœuds texte enfants) et attributs traduisibles d'un élément vers son équivalent
function copyOwn(from, to) {
  const ft = [...from.childNodes].filter((n) => n.nodeType === 3), tt = [...to.childNodes].filter((n) => n.nodeType === 3)
  if (ft.length !== tt.length) return false
  ft.forEach((n, i) => { if (tt[i].nodeValue !== n.nodeValue) tt[i].nodeValue = n.nodeValue })
  for (const a of ATTRS) { const v = from.getAttribute(a); if (v !== null && to.getAttribute(a) !== v) to.setAttribute(a, v) }
  return true
}

export async function swapLanguage(url, { onWhole, onDone }) {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error('page introuvable')
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
  const a = serverEls(doc.body), b = serverEls(document.body)
  if (a.length !== b.length || a.some((el, i) => el.tagName !== b[i].tagName || cls(el) !== cls(b[i]))) throw new Error('structure différente')
  // tout vérifier avant de toucher à la page
  for (let i = 0; i < a.length; i++) {
    const ft = [...a[i].childNodes].filter((n) => n.nodeType === 3).length, tt = [...b[i].childNodes].filter((n) => n.nodeType === 3).length
    if (!a[i].matches(WHOLE) && ft !== tt) throw new Error('textes différents')
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].matches(WHOLE)) { b[i].innerHTML = a[i].innerHTML; for (const at of ATTRS) { const v = a[i].getAttribute(at); if (v !== null) b[i].setAttribute(at, v) } onWhole?.(b[i]) }
    else copyOwn(a[i], b[i])
  }
  // copies des cartes (pistes en boucle) : mêmes textes que leur carte d'origine
  for (const strip of document.querySelectorAll('.work__strip')) {
    const originals = [...strip.querySelectorAll('.card:not(.card--copy)')]
    const copies = [...strip.querySelectorAll('.card--copy')]
    copies.forEach((c, i) => {
      const o = originals[i % originals.length]
      const ea = [o, ...o.querySelectorAll('*')], eb = [c, ...c.querySelectorAll('*')].filter((e) => e === c || (!e.matches(SKIP) && !e.closest('.gl-card')))
      if (ea.length === eb.length) ea.forEach((e, k) => copyOwn(e, eb[k]))
    })
  }
  document.documentElement.lang = doc.documentElement.lang
  document.title = doc.title
  for (const m of doc.querySelectorAll('meta[name="description"], meta[property^="og:"]')) {
    const sel = m.name ? `meta[name="${m.name}"]` : `meta[property="${m.getAttribute('property')}"]`
    document.querySelector(sel)?.setAttribute('content', m.getAttribute('content'))
  }
  onDone?.()
}
