(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.motion-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  try { paused = localStorage.getItem('ypc-menu-motion') === 'off'; } catch (_) {}
  function applyMotion() {
    root.dataset.menuMotion = paused || reduced.matches ? 'off' : 'on';
    toggle.textContent = reduced.matches ? 'Reduced motion on' : paused ? 'Play animations' : 'Pause animations';
    toggle.setAttribute('aria-pressed', String(paused || reduced.matches));
    toggle.disabled = reduced.matches;
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('ypc-menu-motion', paused ? 'off' : 'on'); } catch (_) {}
    applyMotion();
  });
  reduced.addEventListener('change', applyMotion);
  applyMotion();
  // Touch: one tap plays a brief moment, then opens. Scrolling is never intercepted.
  document.querySelectorAll('.menu-tile').forEach(tile => {
    let touch = false;
    tile.addEventListener('pointerdown', event => {
      touch = event.pointerType === 'touch';
      if (touch) tile.classList.add('is-playing');
    });
    tile.addEventListener('pointercancel', () => { touch = false; tile.classList.remove('is-playing'); });
    tile.addEventListener('click', event => {
      if (!touch || event.detail === 0 || paused || reduced.matches || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      touch = false;
      event.preventDefault();
      tile.classList.add('is-playing');
      window.setTimeout(() => window.location.assign(tile.href), 450);
    });
  });
  window.addEventListener('pageshow', () => document.querySelectorAll('.is-playing').forEach(tile => tile.classList.remove('is-playing')));
})();
