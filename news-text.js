function renderNewsBody(container, text = '') {
  container.replaceChildren();
  const pieces = text.split(/(https?:\/\/[^\s<>"「」『』、。]+)/gi);
  for (const piece of pieces) {
    if (/^https?:\/\//i.test(piece)) {
      const address = piece.replace(/[.,!?:;）】]+$/u, '');
      try {
        const url = new URL(address);
        const link = document.createElement('a');
        link.href = url.href;
        link.textContent = address;
        container.append(link, piece.slice(address.length));
        continue;
      } catch { /* Keep incomplete addresses as text. */ }
    }
    container.append(piece);
  }
}
