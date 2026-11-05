/** Chargeur dessiné hors du fil principal (OffscreenCanvas) : il tourne sans à-coup pendant que la page compile WebGL et
 *  envoie ses images. Messages : init { canvas, dpr, r1, reduced }, r1 { r1 }, close { grow }. Répond : frame (première
 *  image dessinée), done (fermeture finie). */
import { createLoaderDraw } from './loader-draw.js'

let L = null, raf = null, first = true
const tick = () => {
  const done = L.draw()
  if (first) { first = false; postMessage({ type: 'frame' }) }
  if (done) { postMessage({ type: 'done' }); return }
  raf(tick)
}
onmessage = ({ data }) => {
  if (data.type === 'init') {
    raf = self.requestAnimationFrame ? (f) => self.requestAnimationFrame(f) : (f) => setTimeout(f, 1000 / 60)
    L = createLoaderDraw(data.canvas, data)
    tick()
  } else if (data.type === 'r1') L?.resize(data.r1)
  else if (data.type === 'close') L?.close(data.grow)
}
