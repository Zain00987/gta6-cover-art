// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor shows the
// page with photos loaded. Query knobs: layout, grade, size, photo (comma list of sample
// names), caption, tagline, capPos, capColor. window.__shotReady is set once painted.
export async function runShot(shot, query, apply, redraw) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    layout: query.get('layout') ?? undefined,
    grade: query.get('grade') ?? undefined,
    size: query.get('size') ?? undefined,
    photos: (query.get('photo') ?? 'pier').split(',').map((s) => s.trim()).filter(Boolean),
    caption: query.get('caption') ?? undefined,
    tagline: query.get('tagline') ?? undefined,
    captionPos: query.get('capPos') ?? undefined,
    captionColor: query.get('capColor') ?? undefined,
  };
  await apply(scene);
  if (document.fonts) {
    try {
      await document.fonts.load('100px Anton');
      await document.fonts.ready;
    } catch { /* fall back to the system font stack */ }
  }
  redraw();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  window.__shotReady = true;
}
