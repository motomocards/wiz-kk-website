(() => {
  const root = document.documentElement;
  const loader = document.getElementById('intro-loader');
  const page = document.querySelector('.wrap');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const started = window.wizIntroStarted || performance.now();
  let ready = !root.classList.contains('intro-loading');
  const pendingLines = new Set();

  function revealLine(line) {
    if (!ready) { pendingLines.add(line); return; }
    line.chars.forEach(char => char.classList.add('is-readable'));
  }
  function finishIntro() {
    if (ready) return;
    ready = true;
    clearTimeout(window.wizIntroSafety);
    page.inert = false;
    root.classList.remove('intro-loading');
    root.classList.add('intro-ready');
    loader.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      pendingLines.forEach(revealLine);
      pendingLines.clear();
    }, preference.matches ? 0 : 260);
    setTimeout(() => { loader.hidden = true; }, 560);
  }
  if (!ready) page.inert = true;
  loader.querySelector('button').addEventListener('click', finishIntro);
  setTimeout(finishIntro, Math.max(0, 3000 - (performance.now() - started)));
  window.addEventListener('pageshow', event => {
    if (event.persisted) finishIntro();
  });

  const blocks = [];
  let lineObserver;
  let resizeTimer;
  const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null;
  if (!preference.matches && 'IntersectionObserver' in window) {
    const selectors = '.intro h2, .hero-description, .story-prologue > .story-eyebrow, .story-prologue > h2, .story-prologue-copy p, .heading span, .heading small, .chapter-heading > *, .chapter-copy p, .service-story h4, .service-story p, .story-closing > *';
    document.querySelectorAll(selectors).forEach(element => {
      const original = element.textContent;
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      while (element.firstChild) visual.append(element.firstChild);
      const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      const chars = [];
      textNodes.forEach(node => {
        const fragment = document.createDocumentFragment();
        const graphemes = segmenter ? Array.from(segmenter.segment(node.textContent), item => item.segment) : Array.from(node.textContent);
        graphemes.forEach(text => {
          if (/^\s+$/.test(text)) { fragment.append(document.createTextNode(text)); return; }
          const span = document.createElement('span');
          span.className = 'text-char';
          span.textContent = text;
          chars.push(span);
          fragment.append(span);
        });
        node.replaceWith(fragment);
      });
      const accessible = document.createElement('span');
      accessible.className = 'sr-only';
      accessible.textContent = original;
      element.append(visual, accessible);
      element.classList.add('text-reveal');
      blocks.push({ element, chars });
    });

    function measureLines() {
      lineObserver?.disconnect();
      pendingLines.clear();
      const lines = new Map();
      blocks.forEach(({ chars }) => {
        let group;
        let top;
        chars.forEach(char => {
          const rect = char.getBoundingClientRect();
          if (!group || Math.abs(rect.top - top) > 2) {
            group = { first: char, chars: [] };
            lines.set(char, group);
            top = rect.top;
          }
          char.style.setProperty('--char-delay', Math.min(group.chars.length * 20, 700) + 'ms');
          group.chars.push(char);
        });
      });
      lineObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          revealLine(lines.get(entry.target));
          lineObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
      lines.forEach(line => {
        if (line.chars.every(char => char.classList.contains('is-readable'))) return;
        lineObserver.observe(line.first);
      });
    }
    requestAnimationFrame(measureLines);
    document.fonts?.ready.then(measureLines);
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measureLines, 180);
    });
    preference.addEventListener('change', () => {
      if (!preference.matches) return;
      lineObserver?.disconnect();
      blocks.forEach(({ chars }) => chars.forEach(char => char.classList.add('is-readable')));
    });
  }

  const scenes = [...document.querySelectorAll('.chapter-scene')].map(element => ({
    element, photo: element.querySelector('.chapter-photo'), y: 0, blur: 8, active: false
  }));
  let animation;
  let previousTime;
  function frame(time) {
    animation = null;
    const ease = 1 - Math.exp(-Math.min(64, time - (previousTime || time - 16)) / 140);
    previousTime = time;
    let unsettled = false;
    scenes.forEach(scene => {
      if (!scene.active) return;
      const rect = scene.element.getBoundingClientRect();
      const distance = innerHeight / 2 - (rect.top + rect.height / 2);
      const targetY = preference.matches ? 0 : Math.max(-80, Math.min(80, distance * .16));
      const focus = Math.max(0, 1 - Math.abs(distance) / (innerHeight * .85));
      const targetBlur = preference.matches ? 9 : focus * focus * 11;
      scene.y += (targetY - scene.y) * ease;
      scene.blur += (targetBlur - scene.blur) * ease;
      scene.photo.style.setProperty('--photo-y', scene.y.toFixed(2) + 'px');
      scene.photo.style.setProperty('--photo-blur', scene.blur.toFixed(2) + 'px');
      unsettled ||= Math.abs(targetY - scene.y) > .1 || Math.abs(targetBlur - scene.blur) > .05;
    });
    if (unsettled) animation = requestAnimationFrame(frame);
    else previousTime = undefined;
  }
  function schedule() { if (!animation) animation = requestAnimationFrame(frame); }
  if ('IntersectionObserver' in window) {
    const sceneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const scene = scenes.find(item => item.element === entry.target);
        scene.active = entry.isIntersecting;
      });
      schedule();
    }, { rootMargin: '200px 0px' });
    scenes.forEach(scene => sceneObserver.observe(scene.element));
  } else scenes.forEach(scene => { scene.active = true; });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  preference.addEventListener('change', schedule);
  schedule();
})();
