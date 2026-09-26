document.querySelectorAll('form').forEach(form => {
  form.addEventListener('submit', event => {
    // Keep the submitted button's name/value intact; only prevent repeated clicks.
    if (form.dataset.submitting) { event.preventDefault(); return; }
    form.dataset.submitting = 'true';
    form.setAttribute('aria-busy', 'true');
    setTimeout(() => { delete form.dataset.submitting; form.removeAttribute('aria-busy'); }, 15000);
  });
});
