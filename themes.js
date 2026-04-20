(function () {
  const STORAGE_KEY = 'colorListener.theme.v1';
  const DEFAULT = 'midnight';
  const buttons = Array.from(document.querySelectorAll('#themeButtons .theme-btn'));
  const valid = new Set(buttons.map(b => b.dataset.theme));

  function apply(theme) {
    if (!valid.has(theme)) theme = DEFAULT;
    document.body.setAttribute('data-theme', theme);
    buttons.forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => apply(btn.dataset.theme));
  });

  let saved = DEFAULT;
  try { saved = localStorage.getItem(STORAGE_KEY) || DEFAULT; } catch {}
  apply(saved);
})();
