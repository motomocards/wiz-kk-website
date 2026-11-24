(async () => {
  const content = document.querySelector('#content'), status = document.querySelector('#status');
  async function load(path) {
    const response = await fetch(path, {cache:'no-cache'});
    if (!response.ok) throw new Error();
    return response.json();
  }
  function thumbnail(item) {
    const img = new Image();
    img.alt = '';
    img.src = item.image || '/news-default.svg';
    return img;
  }
  const id = new URLSearchParams(location.search).get('post');
  const heading = document.querySelector('h1');
  if (id !== null) heading.hidden = true;
  function revealContent() {
    heading.hidden = false;
    if (!window.IntersectionObserver || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target;
        element.style.setProperty('--delay', Math.min(order++, 4) * 110 + 'ms');
        element.classList.replace('news-pending','news-enter');
        observer.unobserve(element);
      }
    });
    for (const element of document.querySelectorAll('h1,.card,article > img,article > .body:not(:empty),article > a')) {
      element.classList.add('news-pending');
      observer.observe(element);
    }
  }
  try {
    if (id !== null) {
      const back = document.querySelector('nav a');
      back.href = '/news.html';
      back.textContent = '← お知らせ一覧';
      if (!/^wiz-post-[a-zA-Z0-9-]+$/.test(id)) throw new Error();
      const item = await load('/'+id+'.json');
      document.querySelector('h1').textContent = item.title;
      document.title = item.title+' | WIZ株式会社';
      const article = document.createElement('article'), body = document.createElement('div');
      body.className = 'body';
      renderNewsBody(body,item.body);
      article.append(thumbnail(item),body);
      if (item.url) {
        const url = new URL(item.url,location.origin+'/');
        if (/^https?:$/.test(url.protocol)) {
          const link = document.createElement('a');
          link.href = url.href;
          link.textContent = '関連ページを見る →';
          article.append(link);
        }
      }
      content.append(article);
    } else {
      content.className = 'grid';
      const paths = await load('/news-feed.json');
      const entries = await Promise.allSettled(paths.map(path => load(path)));
      entries.forEach((result,i) => {
        if (result.status !== 'fulfilled') return;
        const item = result.value, link = document.createElement('a'), title = document.createElement('span');
        link.className = 'card';
        link.href = '?post='+encodeURIComponent(paths[i].slice(1,-5));
        title.textContent = item.title;
        link.append(thumbnail(item),title);
        content.append(link);
      });
      if (entries.some(entry => entry.status === 'rejected')) throw new Error();
      if (!entries.length) {status.textContent = '現在、お知らせはありません。'; return;}
    }
    status.textContent = '';
  } catch {status.textContent = 'お知らせを読み込めませんでした。';}
  finally {revealContent();}
})();
