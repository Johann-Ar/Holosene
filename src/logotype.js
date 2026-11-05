/* Petit utilitaire pour les logotypes HOLOSENE / JOHANN ARATA (sans dépendance).
   - prepareTrace(svg) : calcule la longueur de chaque lettre pour .anim-trace
   - rejouer(svg)      : relance l'animation en cours
   - apparitionAuScroll(selecteur) : lance .anim-apparition quand le logo entre à l'écran */

export function prepareTrace(svg) {
  svg.querySelectorAll('.lettre').forEach((p) => {
    const L = Math.ceil(p.getTotalLength());
    p.style.setProperty('--longueur', L);
  });
}

export function rejouer(svg) {
  const classes = [...svg.classList].filter((c) => c.startsWith('anim-'));
  classes.forEach((c) => svg.classList.remove(c));
  void svg.getBoundingClientRect(); // force le navigateur à repartir de zéro
  classes.forEach((c) => svg.classList.add(c));
}

export function apparitionAuScroll(selecteur = '.logotype') {
  const obs = new IntersectionObserver((entrees) => {
    entrees.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('anim-apparition');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll(selecteur).forEach((el) => obs.observe(el));
}

// Prépare automatiquement tous les logos qui ont la classe anim-trace
if (typeof document !== 'undefined') {
  const go = () => document.querySelectorAll('svg.anim-trace').forEach(prepareTrace);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
}
