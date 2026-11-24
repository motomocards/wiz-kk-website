(async () => {
  const track = document.querySelector('.news-track');
  const [prev, next] = document.querySelectorAll('.news-controls button');
  const sync = () => {
    prev.disabled = track.scrollLeft < 1;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
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
  new ResizeObserver(sync).observe(track);
  async function json(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('news');
    return response.json();
  }
  let paths;
  try { paths = await json('/news-feed.json'); }
  catch { paths = ['/wiz-post-20261125-3.json','/wiz-post-20261124-2.json','/wiz-post-20261124-1.json']; }
  for (const path of paths) {
    try {
      const item = await json(path);
      const article = document.createElement('article');
      const url = item.url && new URL(item.url, location.href);
      const box = document.createElement(url && /^https?:$/.test(url.protocol) ? 'a' : 'div');
      if (box.tagName === 'A') box.href = url.href;
      const image = new Image();
      image.alt = '';
      image.src = item.image;
      const title = document.createElement('h3');
      title.textContent = item.title;
      box.append(image,title);
      article.append(box);
      track.append(article);
    } catch { continue; }
  }
  sync();
})();
