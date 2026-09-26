(() => {
  const artwork = document.getElementById('page-artwork');
  const heading = document.querySelector('main h1');
  if (artwork && heading) heading.before(artwork.content.cloneNode(true));
  const shapes = {
    camera:'<path d="M2 6h5l2-3h6l2 3h5v15H2z"/><circle cx="12" cy="13" r="5" fill="white" opacity=".8"/><circle cx="12" cy="13" r="3"/>',
    pet:'<ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="5" cy="10" r="2.4"/><circle cx="10" cy="6" r="2.4"/><circle cx="16" cy="7" r="2.4"/><circle cx="20" cy="12" r="2.4"/>',
    vet:'<g transform="rotate(-40 12 12)"><rect x="2" y="7" width="20" height="10" rx="4"/><rect x="9" y="8" width="6" height="8" fill="#fff" opacity=".7"/></g>',
    park:'<path d="M11 14h2v9h-2z"/><circle cx="12" cy="7" r="6"/><circle cx="7" cy="12" r="5"/><circle cx="17" cy="12" r="5"/>',
    travel:'<path d="m3 11 7 1 4-10 3 1-2 10 6 3-1 2-7-2-6 5-2-1 3-6-6-1z"/>',
    calendar:'<rect x="2" y="4" width="20" height="18" rx="4"/><path d="M5 9h14v10H5z" fill="#fff" opacity=".7"/><path d="M7 1h2v6H7zm8 0h2v6h-2z"/>',
    service:'<path d="M2 9h20l-2-6H4zM4 11h16v11H4z"/><path d="M9 14h6v8H9z" fill="#fff" opacity=".7"/>',
    heart:'<path d="M12 22 3 13C-4 4 8-1 12 6c4-7 16-2 9 7z"/>'
  };
  const icon = kind => `<svg class="action-picture" viewBox="0 0 24 24" aria-hidden="true">${shapes[kind] || shapes.heart}</svg>`;
  document.querySelectorAll('main a.button,main button.button,main a.text-link,main button.plain-button').forEach(el => {
    if (el.querySelector('svg') || el.closest('.cookie-banner')) return;
    const label = el.textContent.trim();
    if (!/add|create|plan|save|upload|record|photo|outing|trip|reminder/i.test(label)) return;
    const target = el.getAttribute('href') || '';
    let kind = /photo|picture|upload/i.test(label) ? 'camera' : /pet|crew|account/i.test(label) ? 'pet' : /park|outdoor/i.test(label + target) ? 'park' : /vet|health|care|appointment|worm|vaccin/i.test(label) ? 'vet' : /trip|flight|travel|outing/i.test(label) ? 'travel' : /service|supply|supplier/i.test(label) ? 'service' : /save/i.test(label) ? 'heart' : 'calendar';
    el.classList.add('visual-action', 'action-'+kind);
    const wrapper = document.createElement('span');
    wrapper.className='action-badge';
    wrapper.setAttribute('aria-hidden','true');
    wrapper.innerHTML=icon(kind)+(/add|create|new|＋/i.test(label)?'<span class="action-plus">+</span>':'');
    el.prepend(wrapper);
  });
})();
