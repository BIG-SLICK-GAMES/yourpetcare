(() => {
  const field = document.getElementById('id_field');
  const value = document.getElementById('id_value');
  const source = document.getElementById('preference-choices');
  if (!field || !value || !source) return;
  const choices = JSON.parse(source.textContent);
  field.addEventListener('change', () => {
    value.replaceChildren(...(choices[field.value] || []).map(([key, label]) => new Option(label, key)));
  });
})();
