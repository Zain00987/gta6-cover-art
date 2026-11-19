// Vice Cover Studio editor: wires the controls to the drawing engine, loads photos from
// the machine (or the bundled samples), lets each panel be panned and zoomed, and exports
// the cover as a PNG. A `?shot=` query sets up a fixed scene for a screenshot instead.
import { drawCover, renderCover, GRADES, SIZES, LAYOUTS, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');
const zoomInput = document.getElementById('zoom');
const capSizeInput = document.getElementById('capSize');
const panelPhotoSelect = document.getElementById('panelPhoto');
const thumbsEl = document.getElementById('thumbs');

const state = {
  layout: 'three',
  grade: 'sunset',
  size: '1080x1080',
  caption: 'VICE CITY NIGHTS',
  tagline: 'A POSTER MADE WITH VICE COVER STUDIO',
  captionPos: 'bottom',
  captionScale: 1,
  captionColor: '#ffffff',
  outline: true,
  panels: [
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
  ],
};

let photos = []; // { name, img } in load order
let activePanel = 0;
let dragging = null;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** How many panels the current layout shows. */
function panelCount() {
  return layoutPanels(state.layout, 100, 100).length;
}

/** Redraws the preview at the chosen export size. */
function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
}

/** Marks the active choice in a group of buttons carrying data-value. */
function markActive(groupId, value) {
  document.querySelectorAll(`#${groupId} button`).forEach((b) => {
    b.classList.toggle('active', b.dataset.value === value);
  });
}

/** Rebuilds the panel picker buttons for the current layout. */
function buildPanelButtons() {
  const wrap = document.getElementById('panelBtns');
  wrap.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    b.classList.toggle('active', i === activePanel);
    b.addEventListener('click', () => {
      activePanel = i;
      syncPanelControls();
      buildPanelButtons();
    });
    wrap.appendChild(b);
  }
}

/** Rebuilds the photo picker for the active panel. */
function buildPhotoSelect() {
  panelPhotoSelect.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = 'No photo (gradient sky)';
  panelPhotoSelect.appendChild(none);
  photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.name;
    panelPhotoSelect.appendChild(o);
  });
  const current = state.panels[activePanel].img;
  const idx = photos.findIndex((p) => p.img === current);
  panelPhotoSelect.value = String(idx);
}

/** Rebuilds the photo thumbnail strip. */
function buildThumbs() {
  thumbsEl.innerHTML = '';
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = p.name;
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      state.panels[activePanel].img = p.img;
      state.panels[activePanel].ox = 0;
      state.panels[activePanel].oy = 0;
      buildPhotoSelect();
      redraw();
    });
    void i;
    thumbsEl.appendChild(b);
  });
}

/** Syncs the panel controls (zoom slider, photo select) with the active panel. */
function syncPanelControls() {
  const panel = state.panels[activePanel];
  zoomInput.value = String(panel.zoom);
  document.getElementById('zoomVal').textContent = `${panel.zoom.toFixed(1)}x`;
  buildPhotoSelect();
}

/** Syncs every control group with the current state. */
function syncAll() {
  markActive('layoutBtns', state.layout);
  markActive('gradeBtns', state.grade);
  markActive('sizeBtns', state.size);
  markActive('posBtns', state.captionPos);
  markActive('colorBtns', state.captionColor);
  document.getElementById('outline').checked = state.outline;
  captionInput.value = state.caption;
  taglineInput.value = state.tagline;
  capSizeInput.value = String(state.captionScale);
  document.getElementById('capSizeVal').textContent = `${Math.round(state.captionScale * 100)}%`;
  buildPanelButtons();
  syncPanelControls();
  buildThumbs();
}

/** Assigns a photo to the first panel that has none, or to the active panel. */
function placePhoto(img) {
  const empty = state.panels.slice(0, panelCount()).findIndex((p) => !p.img);
  const target = empty === -1 ? activePanel : empty;
  state.panels[target].img = img;
  state.panels[target].ox = 0;
  state.panels[target].oy = 0;
}

/** Adds files from the machine as photos. */
async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      photos.push({ name: file.name, img });
      placePhoto(img);
    } catch {
      statusEl.textContent = `Could not read ${file.name}`;
    }
  }
  buildThumbs();
  buildPhotoSelect();
  redraw();
}

/** Loads bundled sample photos by name (samples/<name>.jpg). */
async function loadSamples(names) {
  for (const name of names) {
    if (photos.some((p) => p.name === `${name}.jpg`)) continue;
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      photos.push({ name: `${name}.jpg`, img });
      placePhoto(img);
    } catch {
      statusEl.textContent = `Sample ${name}.jpg did not load`;
    }
  }
  // Fill any panel still empty by cycling the loaded photos, so every panel shows art.
  const count = panelCount();
  for (let i = 0; i < count; i++) {
    if (!state.panels[i].img && photos.length) {
      state.panels[i].img = photos[i % photos.length].img;
    }
  }
  buildThumbs();
  buildPhotoSelect();
  redraw();
}

/** Which panel lies under a point on the canvas (canvas pixels). */
function panelAt(x, y) {
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const i = panelAt(x, y);
  if (i === -1) return;
  activePanel = i;
  buildPanelButtons();
  syncPanelControls();
  dragging = { x: e.clientX, y: e.clientY, ox: state.panels[i].ox, oy: state.panels[i].oy };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const panel = state.panels[activePanel];
  panel.ox = dragging.ox + (e.clientX - dragging.x) * scale;
  panel.oy = dragging.oy + (e.clientY - dragging.y) * scale;
  redraw();
});

canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('pointercancel', () => { dragging = null; });

document.getElementById('photos').addEventListener('change', (e) => {
  addFiles([...e.target.files]);
  e.target.value = '';
});
document.getElementById('samples').addEventListener('click', () => loadSamples(['pier', 'boulevard']));
document.getElementById('layoutBtns').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.layout = b.dataset.value;
  activePanel = 0;
  syncAll();
  redraw();
});
document.getElementById('gradeBtns').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.grade = b.dataset.value;
  syncAll();
  redraw();
});
document.getElementById('sizeBtns').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.size = b.dataset.value;
  syncAll();
  redraw();
});
document.getElementById('posBtns').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.captionPos = b.dataset.value;
  syncAll();
  redraw();
});
document.getElementById('colorBtns').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.captionColor = b.dataset.value;
  syncAll();
  redraw();
});
document.getElementById('outline').addEventListener('change', (e) => {
  state.outline = e.target.checked;
  redraw();
});
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
taglineInput.addEventListener('input', () => {
  state.tagline = taglineInput.value;
  redraw();
});
capSizeInput.addEventListener('input', () => {
  state.captionScale = Number(capSizeInput.value);
  document.getElementById('capSizeVal').textContent = `${Math.round(state.captionScale * 100)}%`;
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[activePanel].zoom = Number(zoomInput.value);
  document.getElementById('zoomVal').textContent = `${state.panels[activePanel].zoom.toFixed(1)}x`;
  redraw();
});
panelPhotoSelect.addEventListener('change', () => {
  const idx = Number(panelPhotoSelect.value);
  const panel = state.panels[activePanel];
  panel.img = idx === -1 ? null : photos[idx].img;
  panel.ox = 0;
  panel.oy = 0;
  redraw();
});
document.getElementById('recenter').addEventListener('click', () => {
  const panel = state.panels[activePanel];
  panel.ox = 0;
  panel.oy = 0;
  panel.zoom = 1;
  syncPanelControls();
  redraw();
});
document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const out = renderCover(w, h, state);
  out.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved vice-cover-${w}x${h}.png`;
  }, 'image/png');
});

/** Applies a shot scene (layout, grade, size, photos, caption) then draws it. */
async function applyShot(scene) {
  if (scene.layout && LAYOUTS[scene.layout]) state.layout = scene.layout;
  if (scene.grade && GRADES[scene.grade]) state.grade = scene.grade;
  if (scene.size && SIZES[scene.size]) state.size = scene.size;
  if (scene.caption !== undefined) state.caption = scene.caption;
  if (scene.tagline !== undefined) state.tagline = scene.tagline;
  if (scene.captionPos) state.captionPos = scene.captionPos;
  if (scene.captionColor) state.captionColor = scene.captionColor;
  activePanel = 0;
  if (scene.photos && scene.photos.length) {
    state.panels.forEach((p) => { p.img = null; p.ox = 0; p.oy = 0; });
    await loadSamples(scene.photos);
  }
  syncAll();
  redraw();
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  await runShot(shot, params, applyShot, redraw);
} else {
  syncAll();
  await loadSamples(['pier', 'boulevard']);
  if (document.fonts) {
    document.fonts.load('100px Anton').then(redraw).catch(() => {});
  }
  redraw();
}
