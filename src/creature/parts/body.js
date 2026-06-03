/**
 * Draws the main body ellipse and its surface pattern.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} traits
 * @param {object} layout
 */
export function drawBody(ctx, traits, layout) {
  const { body: b, head } = traits;
  const { body: lb, scale } = layout;
  const { cx, cy, w, h } = lb;

  // Neck connector (filled trapezoid between head and body)
  const headW = w * head.size;
  const neckW = headW * 0.55;
  const neckTop = layout.head.cy + layout.head.hh * 0.45;
  const neckBot = cy - h * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.5, neckTop);
  ctx.lineTo(cx + neckW * 0.5, neckTop);
  ctx.lineTo(cx + w * 0.22, neckBot);
  ctx.lineTo(cx - w * 0.22, neckBot);
  ctx.closePath();
  ctx.fillStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness + 3}%)`;
  ctx.fill();

  // Main body with radial gradient
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);

  const grad = ctx.createRadialGradient(
    cx - w * 0.18, cy - h * 0.2, 0,
    cx, cy, Math.max(w, h) * 0.6
  );
  grad.addColorStop(0, `hsl(${b.hue}, ${b.saturation}%, ${b.lightness + 18}%)`);
  grad.addColorStop(0.55, `hsl(${b.hue}, ${b.saturation}%, ${b.lightness}%)`);
  grad.addColorStop(1, `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 10}%)`);
  ctx.fillStyle = grad;

  ctx.shadowColor = `hsla(${b.hue}, 60%, 10%, 0.6)`;
  ctx.shadowBlur = 14 * scale;
  ctx.shadowOffsetX = 3 * scale;
  ctx.shadowOffsetY = 5 * scale;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 18}%)`;
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  // Surface pattern
  if (b.pattern > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    _drawPattern(ctx, b, cx, cy, w, h, scale);
    ctx.restore();
  }
}

function _drawPattern(ctx, b, cx, cy, w, h, scale) {
  const patHue = (b.hue + 30) % 360;
  const alpha = 0.22 + b.patternScale * 0.18;
  ctx.fillStyle = `hsla(${patHue}, ${b.saturation}%, ${b.lightness + 25}%, ${alpha})`;
  ctx.strokeStyle = `hsla(${patHue}, ${b.saturation}%, ${b.lightness + 25}%, ${alpha * 0.6})`;
  ctx.lineWidth = 1 * scale;

  const rng = _seededRng(b.pattern * 1000 + b.patternCount);

  if (b.pattern === 1) {
    // Spots
    const r = w * b.patternScale * 0.12;
    for (let i = 0; i < b.patternCount; i++) {
      const px = cx + (rng() - 0.5) * w * 0.85;
      const py = cy + (rng() - 0.5) * h * 0.8;
      ctx.beginPath();
      ctx.ellipse(px, py, r * scale, r * 0.75 * scale, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.pattern === 2) {
    // Horizontal stripes
    const stripeCount = 3 + Math.floor(b.patternScale * 4);
    const gap = h / (stripeCount * 2);
    for (let i = 0; i < stripeCount; i++) {
      const sy = cy - h / 2 + gap * (i * 2 + 0.5);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5, sy);
      ctx.lineTo(cx + w * 0.5, sy);
      ctx.lineWidth = gap * 0.65 * scale;
      ctx.stroke();
    }
  } else {
    // Mottled: overlapping irregular blobs
    const r = w * b.patternScale * 0.18;
    for (let i = 0; i < b.patternCount; i++) {
      const px = cx + (rng() - 0.5) * w * 0.9;
      const py = cy + (rng() - 0.5) * h * 0.85;
      const rx = r * (0.5 + rng()) * scale;
      const ry = r * (0.4 + rng() * 0.6) * scale;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, rng() * Math.PI * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Deterministic pseudo-random generator (avoids re-render jitter)
function _seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}
