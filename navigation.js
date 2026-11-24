(() => {
  const header = document.querySelector('.site-header');
  const button = document.querySelector('.menu-toggle');
  const menu = document.getElementById('site-menu');
  if (!header || !button || !menu) return;

  const setMenu = open => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    menu.hidden = !open;
  };
  const syncHeader = () => {
    const visible = window.scrollY > 48;
    header.classList.toggle('is-visible', visible);
    header.inert = !visible;
    if (!visible) setMenu(false);
  };

  setMenu(false);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });
  window.addEventListener('pageshow', syncHeader);
  button.addEventListener('click', () => setMenu(menu.hidden));
  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMenu(true);
      menu.querySelector('a').focus();
    }
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) {
      button.focus({ preventScroll: true });
      setMenu(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      setMenu(false);
      button.focus({ preventScroll: true });
    }
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) setMenu(false);
  });
  document.addEventListener('focusin', event => {
    if (!header.contains(event.target)) setMenu(false);
  });
})();
