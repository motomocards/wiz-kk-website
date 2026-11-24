(async () => {
  const track = document.querySelector('.news-track');
  const frame = document.createElement('div');
  frame.className = 'news-frame';
  track.before(frame);
  frame.append(track);
  const segmenter = typeof Intl.Segmenter === 'function' && new Intl.Segmenter('ja', {granularity:'grapheme'});
  const [prev, next] = document.querySelectorAll('.news-controls button');
  const sync = () => {
    prev.disabled = track.scrollLeft < 1;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    frame.classList.toggle("has-more", !next.disabled);
  };
  function step(direction) {
    const card = track.firstElementChild;
    if (!card) return;
    track.scrollBy({left: direction * (card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap)),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  prev.onclick = () => step(-1);
  next.onclick = () => step(1);
  track.addEventListener('scroll', sync, {passive:true});
  const intro = document.querySelector('.hero-description');
  const section = frame.parentElement;
  const sizeFrame = () => {
    frame.style.setProperty('--news-viewport', document.documentElement.clientWidth + 'px');
    frame.style.setProperty('--news-offset', -section.getBoundingClientRect().left + 'px');
    frame.style.setProperty('--news-intro-inset', intro.getBoundingClientRect().left + parseFloat(getComputedStyle(intro).paddingLeft) + 'px');
  };
  sizeFrame();
  new ResizeObserver(sizeFrame).observe(document.documentElement);
  new ResizeObserver(sync).observe(track);
  async function json(path, version) {
    const response = await fetch(path + '?v=' + version, {cache:'no-store'});
    if (!response.ok) throw new Error('news');
    return response.json();
  }
  let request = 0, displayed = '';
  async function refresh() {
    const current = ++request, version = Date.now();
    let paths;
    try { paths = await json('/news-feed.json', version); }
    catch { return; }
    if (current !== request || !Array.isArray(paths)) return;
    const signature = JSON.stringify(paths);
    if (signature === displayed) return;
    const cards = document.createDocumentFragment();
    for (const path of paths) {
      if (cards.childElementCount >= 10) break;
      try {
        const item = await json(path, version);
        if (current !== request) return;
        const article = document.createElement('article');
        const box = document.createElement('a');
        box.href = '/news.html?post='+encodeURIComponent(path.slice(1,-5));
        const image = new Image();
        image.alt = '';
        image.src = item.image || '/news-default.svg';
        const title = document.createElement('h3');
        const chars = segmenter ? Array.from(segmenter.segment(item.title), part => part.segment) : Array.from(item.title);
        title.textContent = chars.length >= 20 ? chars.slice(0,19).join('') + '...' : item.title;
        if (chars.length >= 20) {
          title.title = item.title;
          box.setAttribute('aria-label',item.title);
        }
        box.append(image,title);
        article.append(box);
        cards.append(article);
      } catch { continue; }
    }
    if (current !== request) return;
    displayed = cards.childElementCount === Math.min(10, paths.length) ? signature : '';
    section.hidden = !cards.childElementCount;
    track.replaceChildren(cards);
    sizeFrame();
    sync();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  refresh();
})();
