/**
 * Skaliert große Fenster (.panel.center) so, dass sie ohne Scrollen auf den Bildschirm passen.
 * Gemessen wird in Layout-Pixeln, gezeichnet wird per transform; Klicks bleiben korrekt.
 */
const MIN_SCALE = 0.42;

function fitPanel(p: HTMLElement): void {
  p.style.transform = '';
  p.style.width = '';
  p.style.maxHeight = '';
  p.style.overflow = '';
  delete p.dataset.fit;
  const availH = innerHeight * 0.96;
  const availW = innerWidth * 0.96;
  p.style.maxHeight = 'none';
  p.style.overflow = 'visible';
  let z = Math.min(1, availH / p.offsetHeight, availW / p.offsetWidth);
  if (z >= 0.999) {
    p.style.maxHeight = '';
    p.style.overflow = '';
    return;
  }
  // Schmaler skaliert heißt: breiter umbrechen, dadurch wird der Inhalt niedriger
  for (let i = 0; i < 3; i++) {
    p.style.width = `${Math.min(availW / z, 1100)}px`;
    z = Math.min(1, availH / p.offsetHeight, availW / p.offsetWidth);
  }
  if (z < MIN_SCALE) {
    z = MIN_SCALE;
    p.style.maxHeight = `${availH / z}px`;
    p.style.overflow = 'auto';
  }
  else p.dataset.fit = '1';
  p.style.transform = `translate(-50%, -50%) scale(${z})`;
}

export function installFit(): void {
  let raf = 0;
  const run = (): void => {
    raf = 0;
    document.querySelectorAll<HTMLElement>('#overlay .panel.center, #screen .panel.center').forEach(fitPanel);
  };
  const schedule = (): void => {
    if (!raf) raf = requestAnimationFrame(run);
  };
  const mo = new MutationObserver(schedule);
  for (const id of ['overlay', 'screen']) {
    const el = document.getElementById(id);
    if (el) mo.observe(el, { childList: true, subtree: true, characterData: true });
  }
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  schedule();
}
