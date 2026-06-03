/**
 * Draws bioluminescent markings as an overlay on the creature.
 * Skipped when intensity is negligible or type is 0.
 */
export function drawMarkings(ctx, traits, layout) {
  const { markings: m, body: b } = traits;
  if (m.type === 0 || m.intensity < 0.05) return;

  const { body: lb, head: lh, scale } = layout;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const color = `hsla(${m.hue}, 100%, 65%, ${m.intensity})`;
  ctx.shadowColor = `hsl(${m.hue}, 100%, 65%)`;
  ctx.shadowBlur = 12 * scale;

  const rng = _seededRng(m.hue * 100 + m.type * 17);

  if (m.type === 1) {
    // Glowing spots
    const count = 8 + Math.floor(m.intensity * 14);
    _clipToCreature(ctx, lb, lh, scale);
    for (let i = 0; i < count; i++) {
      const px = lb.cx + (rng() - 0.5) * lb.w * 0.85;
      const py = lb.cy + (rng() - 0.5) * lb.h * 0.75;
      const r = (3 + rng() * 8) * scale;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  } else if (m.type === 2) {
    // Vein pattern (branching lines)
    _clipToCreature(ctx, lb, lh, scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2 * scale;
    ctx.lineCap = 'round';
    _drawVeins(ctx, lb.cx, lb.cy - lb.h * 0.2, lb.h * 0.7, 4, rng, scale);
    ctx.restore();
  } else {
    // Bands (horizontal glowing stripes)
    _clipToCreature(ctx, lb, lh, scale);
    const bandCount = 3 + Math.floor(m.intensity * 3);
    const gap = lb.h / (bandCount + 1);
    for (let i = 1; i <= bandCount; i++) {
      const by = lb.cy - lb.h / 2 + gap * i;
      ctx.beginPath();
      ctx.ellipse(lb.cx, by, lb.w * 0.48, gap * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }
}

function _clipToCreature(ctx, lb, lh, scale) {
  ctx.beginPath();
  ctx.ellipse(lb.cx, lb.cy, lb.w / 2 + 2, lb.h / 2 + 2, 0, 0, Math.PI * 2);
  ctx.ellipse(lh.cx, lh.cy, lh.w / 2 + 2, lh.hh / 2 + 2, 0, 0, Math.PI * 2);
  ctx.clip('nonzero');
}

function _drawVeins(ctx, x, y, len, depth, rng, scale) {
  if (depth === 0 || len < 4 * scale) return;
  const angle1 = -Math.PI / 2 + (rng() - 0.5) * 0.6;
  const angle2 = angle1 + (rng() > 0.5 ? 0.5 : -0.5) + (rng() - 0.5) * 0.3;
  const l1 = len * (0.55 + rng() * 0.2);
  const l2 = len * (0.45 + rng() * 0.2);
  const ex1 = x + Math.cos(angle1) * l1, ey1 = y + Math.sin(angle1) * l1;
  const ex2 = x + Math.cos(angle2) * l2, ey2 = y + Math.sin(angle2) * l2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex1, ey1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex2, ey2); ctx.stroke();
  _drawVeins(ctx, ex1, ey1, l1 * 0.6, depth - 1, rng, scale);
  _drawVeins(ctx, ex2, ey2, l2 * 0.6, depth - 1, rng, scale);
}

function _seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}
