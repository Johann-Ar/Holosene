/**
 * Chargeur : une toile, dessinée par loader-draw.js. De préférence dans un worker (OffscreenCanvas) : la rotation reste
 * fluide même quand le fil principal est occupé (compilation des shaders, envoi des images). Sinon, sur le fil principal.
 *   const L = createLoader(el, { reduced })
 *   L.ready      promesse : première image dessinée (le chargeur peut apparaître)
 *   L.setRadius(r)   rayon du relais avec le logo WebGL (px CSS)
 *   L.finish(grow)   fermeture (LOADER.close ms) ; promesse résolue à la fin, au moment du relais
 */
import { createLoaderDraw, LOADER } from './loader-draw.js'

export function createLoader(canvas, { reduced = false, r1 = 44 } = {}) {
  if (!canvas) return { ready: Promise.resolve(), setRadius() {}, finish: () => Promise.resolve() }
  const dpr = Math.min(3, devicePixelRatio || 1)
  const cssSize = (r) => { const s = Math.ceil(r * 2 * LOADER.margin * dpr / 2) * 2 / dpr; canvas.style.width = canvas.style.height = s + 'px' }
  cssSize(r1)
  let ready, post = null, local = null
  const offscreen = typeof canvas.transferControlToOffscreen === 'function' && typeof Worker === 'function' && typeof OffscreenCanvas === 'function'
  if (offscreen) {
    try {
      const worker = new Worker(new URL('./loader-worker.js', import.meta.url), { type: 'module' })
      const off = canvas.transferControlToOffscreen()
      // erreur du worker : la page n'attend pas le chargeur (il reste simplement invisible)
      ready = new Promise((res) => { worker.addEventListener('message', (e) => { if (e.data.type === 'frame') res() }); worker.addEventListener('error', () => res()) })
      worker.postMessage({ type: 'init', canvas: off, dpr, r1, reduced }, [off])
      post = (m) => worker.postMessage(m)
      setTimeout(() => worker.terminate(), 60000)   // au plus une minute : le chargeur est fini depuis longtemps
    } catch { post = null }
  }
  if (!post) {
    local = createLoaderDraw(canvas, { dpr, r1, reduced })
    const tick = () => { if (!local.draw()) requestAnimationFrame(tick) }
    local.draw(); ready = Promise.resolve(); requestAnimationFrame(tick)
  }
  return {
    ready,
    setRadius(r) { cssSize(r); post ? post({ type: 'r1', r1: r }) : local.resize(r) },
    finish(grow) {
      post ? post({ type: 'close', grow }) : local.close(grow)
      return new Promise((res) => setTimeout(res, reduced ? 0 : LOADER.close))
    },
  }
}
