/* Utilitaire pour les logotypes HOLOSENE / JOHANN ARATA v2 (sans dépendance).
   - installerFiltreLiquide() : ajoute une seule fois le filtre SVG #logotype-liquide (pour .anim-liquide)
   - prepareTrace(svg)        : calcule la longueur du contour pour .anim-trace
   - rejouer(svg)             : relance l'animation
   - apparitionAuScroll(sel)  : lance .anim-apparition quand le logo arrive à l'écran */

export function installerFiltreLiquide() {
  if (document.getElementById('logotype-liquide')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `
    <filter id="logotype-liquide" x="-5%" y="-20%" width="110%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.003 0.012" numOctaves="1" seed="3" result="bruit">
        <animate attributeName="baseFrequency" dur="6s" repeatCount="indefinite"
                 values="0.003 0.012; 0.005 0.02; 0.003 0.012"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="bruit" scale="12" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  document.body.appendChild(svg);
}

export function prepareTrace(svg) {
  svg.querySelectorAll('.piece').forEach((p) => {
    p.style.setProperty('--longueur', Math.ceil(p.getTotalLength()));
  });
}

export function rejouer(svg) {
  const classes = [...svg.classList].filter((c) => c.startsWith('anim-'));
  classes.forEach((c) => svg.classList.remove(c));
  void svg.getBoundingClientRect();
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

// Préparation automatique au chargement
if (typeof document !== 'undefined') {
  const go = () => {
    if (document.querySelector('svg.anim-liquide')) installerFiltreLiquide();
    document.querySelectorAll('svg.anim-trace').forEach(prepareTrace);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
}
