/* Logical game coordinates stay fixed; the drawing surface follows device pixels. */
const PixelSurface = (() => {
  const scaledFrames = new Map(), sourceIds = new WeakMap();
  let nextSourceId = 0, scaledBytes = 0;
  const maxBytes = 8 * 1024 * 1024;
  function scaledFrame(source, region, width, height) {
    if (!sourceIds.has(source)) sourceIds.set(source, ++nextSourceId);
    const key = `${sourceIds.get(source)}|${region.join(',')}|${width},${height}`;
    if (scaledFrames.has(key)) { const c = scaledFrames.get(key); scaledFrames.delete(key); scaledFrames.set(key, c); return c; }
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, ...region, 0, 0, width, height);
    scaledFrames.set(key, c); scaledBytes += width * height * 4;
    while (scaledBytes > maxBytes || scaledFrames.size > 192) {
      const [oldKey, old] = scaledFrames.entries().next().value; scaledBytes -= old.width * old.height * 4; scaledFrames.delete(oldKey);
    }
    return c;
  }
  function dimensions(width, height, dpr = 1) {
    const ratio = Math.max(1, Math.min(3, Number(dpr) || 1));
    return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)), ratio };
  }
  function pixelRect(x, y, w, h, m) {
    // Projected shadows deliberately use a shear. Ordinary sprites stay aligned
    // to physical pixels, with the same sampled width at every map position.
    if (!m || m.b || m.c || m.a <= 0 || m.d <= 0) return null;
    return [Math.round(x * m.a + m.e), Math.round(y * m.d + m.f), Math.max(1, Math.round(w * m.a)), Math.max(1, Math.round(h * m.d))];
  }
  function drawImage(ctx, source, region, destination) {
    const pixels = pixelRect(...destination, ctx.getTransform());
    if (!pixels) { ctx.drawImage(source, ...region, ...destination); return; }
    // Draw directly in backing-store pixels. Dividing snapped coordinates back
    // through a fractional transform can reintroduce nearest-neighbour shimmer
    // through floating-point sampling. Alpha, clipping and compositing remain.
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const [x, y, w, h] = pixels;
    // Canvas texture sampling can vary with destination even at whole pixels.
    // Resample immutable sprite frames once at the origin, then copy 1:1. Large
    // static backgrounds bypass this bounded sprite cache.
    if ((region[2] !== w || region[3] !== h) && w * h <= 256 * 256) ctx.drawImage(scaledFrame(source, region, w, h), x, y);
    else ctx.drawImage(source, ...region, ...pixels);
    ctx.restore();
  }
  function bounds(canvas) {
    const r = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
    const left = parseFloat(style.borderLeftWidth) || 0, top = parseFloat(style.borderTopWidth) || 0;
    const right = parseFloat(style.borderRightWidth) || 0, bottom = parseFloat(style.borderBottomWidth) || 0;
    const width = Math.max(0, r.width - left - right), height = Math.max(0, r.height - top - bottom);
    return { left: r.left + left, top: r.top + top, width, height, right: r.right - right, bottom: r.bottom - bottom };
  }
  function bind(canvas, width, height, onResize = () => {}) {
    let dirty = true, previousDpr = 0;
    const invalidate = () => { dirty = true; onResize(); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(invalidate);
    observer?.observe(canvas); window.addEventListener('resize', invalidate);
    return {
      prepare(ctx) {
        const dpr = window.devicePixelRatio || 1;
        if (canvas.isConnected && (dirty || dpr !== previousDpr)) {
          const rect = bounds(canvas);
          if (rect.width && rect.height) {
            const size = dimensions(rect.width, rect.height, dpr);
            if (canvas.width !== size.width) canvas.width = size.width;
            if (canvas.height !== size.height) canvas.height = size.height;
            canvas.dataset.pixelRatio = size.ratio; dirty = false; previousDpr = dpr;
          }
        }
        ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0); ctx.imageSmoothingEnabled = false;
      },
      dispose() { observer?.disconnect(); window.removeEventListener('resize', invalidate); },
    };
  }
  return { dimensions, pixelRect, drawImage, bounds, bind, get status() { return { frames: scaledFrames.size, bytes: scaledBytes, maxBytes }; } };
})();
if (typeof window !== 'undefined') window.PixelSurface = PixelSurface;
if (typeof module !== 'undefined') module.exports = PixelSurface;
