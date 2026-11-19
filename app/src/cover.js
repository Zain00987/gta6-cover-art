// Vice Cover Studio drawing engine: turns photos, a layout and a colour grade into
// GTA-style poster cover art on a canvas. Every panel, gradient, sun, skyline, halftone
// dot and letter is drawn here from scratch — no game artwork, logo or font is used.

export const GRADES = {
  sunset: {
    label: 'Sunset', sky: ['#ffb347', '#ff6a3d', '#c22a72'], wash: '#ff7a3d', washOp: 0.20,
    sun: '#ffd166', sunCore: '#fff3c4', accent: '#ffd166', frame: '#1c0b26',
    caption: '#ffffff', captionStroke: '#2b0a1e', mono: false,
  },
  neon: {
    label: 'Neon', sky: ['#ff2ea6', '#7b2ff7', '#00e5ff'], wash: '#ff2ea6', washOp: 0.22,
    sun: '#00f0ff', sunCore: '#d8fbff', accent: '#00f0ff', frame: '#0b0620',
    caption: '#ffffff', captionStroke: '#12002e', mono: false,
  },
  vice: {
    label: 'Vice City', sky: ['#ff8fb3', '#ff4d8d', '#19c3c3'], wash: '#ff5c9e', washOp: 0.18,
    sun: '#ffe066', sunCore: '#fffbe0', accent: '#19c3c3', frame: '#120a24',
    caption: '#fff7d6', captionStroke: '#1c0b26', mono: false,
  },
  noir: {
    label: 'Noir', sky: ['#8a8a8a', '#3d3d3d', '#0d0d0d'], wash: '#000000', washOp: 0.10,
    sun: '#e8e8e8', sunCore: '#ffffff', accent: '#e8e8e8', frame: '#000000',
    caption: '#f2f2f2', captionStroke: '#000000', mono: true,
  },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUTS = {
  one: { label: '1 panel', panels: 1 },
  two: { label: '2 panels', panels: 2 },
  three: { label: '3 panels', panels: 3 },
  four: { label: '4 panels', panels: 4 },
};

/** Deterministic pseudo-random stream from a seed, so skylines are stable per panel. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rectangles for a layout, as fractions of the canvas, with gutters between them. */
export function layoutPanels(layout, w, h) {
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  const full = { x: 0, y: 0, w, h };
  if (layout === 'one') return [full];
  if (layout === 'two') {
    const half = (w - g) / 2;
    return [
      { x: 0, y: 0, w: half, h },
      { x: half + g, y: 0, w: half, h },
    ];
  }
  if (layout === 'three') {
    const heroW = Math.round(w * 0.62);
    const sideW = w - heroW - g;
    const halfH = (h - g) / 2;
    return [
      { x: 0, y: 0, w: heroW, h },
      { x: heroW + g, y: 0, w: sideW, h: halfH },
      { x: heroW + g, y: halfH + g, w: sideW, h: halfH },
    ];
  }
  const halfW = (w - g) / 2;
  const halfH = (h - g) / 2;
  return [
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW + g, y: 0, w: halfW, h: halfH },
    { x: 0, y: halfH + g, w: halfW, h: halfH },
    { x: halfW + g, y: halfH + g, w: halfW, h: halfH },
  ];
}

/** Clamps a panel's pan offset so the zoomed photo still covers its rectangle. */
function clampPan(rect, dw, dh, ox, oy) {
  const maxX = Math.max(0, (dw - rect.w) / 2);
  const maxY = Math.max(0, (dh - rect.h) / 2);
  return {
    ox: Math.max(-maxX, Math.min(maxX, ox)),
    oy: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

/** Draws one photo into its panel rectangle, cover-fit, zoomed and panned. */
function drawPhoto(ctx, rect, panel, grade) {
  const img = panel.img;
  if (!img) return;
  const zoom = panel.zoom || 1;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const { ox, oy } = clampPan(rect, dw, dh, panel.ox || 0, panel.oy || 0);
  const dx = rect.x + (rect.w - dw) / 2 + ox;
  const dy = rect.y + (rect.h - dh) / 2 + oy;
  ctx.save();
  if (grade.mono) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.06)';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** A striped synthwave sun, drawn in the grade's colours. */
function drawSun(ctx, cx, cy, r, grade) {
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.8);
  glow.addColorStop(0, grade.sunCore);
  glow.addColorStop(0.35, grade.sun);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  body.addColorStop(0, grade.sunCore);
  body.addColorStop(1, grade.sun);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const stripe = grade.sky[1];
  for (let i = 0; i < 4; i++) {
    const y = cy + r * (0.05 + i * 0.22);
    const th = r * (0.05 + i * 0.03);
    ctx.fillStyle = stripe;
    ctx.globalAlpha = 0.55 + i * 0.1;
    ctx.fillRect(cx - r, y, r * 2, th);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** A dark skyline silhouette with a few lit windows along a panel's foot. */
function drawSkyline(ctx, rect, seed, grade) {
  const rand = seeded(seed);
  const baseY = rect.y + rect.h;
  const top = rect.y + rect.h * 0.82;
  ctx.fillStyle = 'rgba(10, 4, 18, 0.88)';
  let x = rect.x;
  while (x < rect.x + rect.w) {
    const bw = rect.w * (0.06 + rand() * 0.09);
    const bh = rect.h * (0.05 + rand() * 0.13);
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (rand() > 0.45) {
      ctx.fillRect(x + bw * 0.2, baseY - bh - rect.h * 0.03, bw * 0.18, rect.h * 0.03);
    }
    ctx.fillStyle = grade.accent;
    ctx.globalAlpha = 0.75;
    const windows = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < windows; i++) {
      const wx = x + bw * (0.15 + rand() * 0.6);
      const wy = baseY - bh + rect.h * (0.02 + rand() * 0.08);
      ctx.fillRect(wx, wy, Math.max(2, rect.w * 0.008), Math.max(2, rect.h * 0.006));
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(10, 4, 18, 0.88)';
    x += bw + rect.w * 0.012;
  }
  void top;
}

/** A faint halftone dot grid across the top of a panel. */
function drawHalftone(ctx, rect) {
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  const step = Math.max(14, rect.w * 0.028);
  for (let y = rect.y + step / 2; y < rect.y + rect.h * 0.30; y += step) {
    for (let x = rect.x + step / 2; x < rect.x + rect.w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, step * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The caption in big bold lettering, with outline, shadow and a small tagline. */
function drawCaption(ctx, w, h, state, grade) {
  const text = (state.caption || '').trim().toUpperCase();
  if (!text) return;
  const pos = state.captionPos || 'bottom';
  let size = h * 0.105 * (state.captionScale || 1);
  const font = (s) => `${s}px Anton, 'Arial Black', 'Helvetica Neue', sans-serif`;
  ctx.font = font(size);
  try { ctx.letterSpacing = `${Math.round(size * 0.03)}px`; } catch { /* older canvas */ }
  while (ctx.measureText(text).width > w * 0.92 && size > 14) {
    size -= 2;
    ctx.font = font(size);
  }
  const bandY = pos === 'top' ? h * 0.06 + size * 0.85 : h - h * 0.055;
  ctx.save();
  ctx.translate(w / 2, bandY);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.04;
  if (state.outline !== false) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.captionStroke;
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = state.captionColor || grade.caption;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    const ts = Math.max(13, Math.round(h * 0.016));
    ctx.save();
    ctx.font = `700 ${ts}px 'Arial Black', 'Helvetica Neue', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(ts * 0.35)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ty = pos === 'top' ? bandY + size * 0.75 : bandY - size * 0.72;
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = ts * 0.4;
    ctx.fillText(tag, w / 2, ty);
    ctx.restore();
  }
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/**
 * Draws the whole cover onto `canvas` from `state`:
 * { panels: [{img, zoom, ox, oy}], layout, grade, caption, tagline,
 *   captionPos, captionScale, captionColor, outline }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutPanels(state.layout || 'three', w, h);
  ctx.fillStyle = grade.frame;
  ctx.fillRect(0, 0, w, h);
  const heroIndex = rects.reduce((best, r, i) => (r.w * r.h > rects[best].w * rects[best].h ? i : best), 0);
  rects.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.img) {
      drawPhoto(ctx, rect, panel, grade);
    } else {
      const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      sky.addColorStop(0, grade.sky[0]);
      sky.addColorStop(0.55, grade.sky[1]);
      sky.addColorStop(1, grade.sky[2]);
      ctx.fillStyle = sky;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, grade.sky[0]);
    wash.addColorStop(1, grade.sky[2]);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grade.washOp;
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (i === heroIndex) {
      // Sun in the hero panel's top corner, clear of the subject's face.
      const r = Math.min(rect.w, rect.h) * 0.11;
      drawSun(ctx, rect.x + rect.w * 0.80, rect.y + rect.h * 0.13, r, grade);
      drawHalftone(ctx, rect);
    }
    drawSkyline(ctx, rect, 1000 + i * 77, grade);
    const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.004));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  const frameW = Math.max(6, Math.round(Math.min(w, h) * 0.012));
  ctx.strokeStyle = grade.frame;
  ctx.lineWidth = frameW;
  ctx.strokeRect(frameW / 2, frameW / 2, w - frameW, h - frameW);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, frameW * 0.18);
  ctx.strokeRect(frameW * 1.6, frameW * 1.6, w - frameW * 3.2, h - frameW * 3.2);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  drawCaption(ctx, w, h, state, grade);
}

/** Renders the cover at the export size and returns the canvas. */
export function renderCover(width, height, state) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
