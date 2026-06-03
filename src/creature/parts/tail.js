/**
 * Draws the tail and dorsal feature.
 */

export function drawTail(ctx, traits, layout) {
  const { body: b, tail: t } = traits;
  if (t.length < 4) return;

  const { body: lb, scale } = layout;
  const { cx, cy, h } = lb;

  const startX = cx;
  const startY = cy + h / 2 - 2 * scale;
  const totalLen = t.length * scale;
  const curvature = t.curvature;

  // Control point offset to make the tail curve
  const cpX = startX + curvature * totalLen * 0.7;
  const cpY = startY + totalLen * 0.55;
  const endX = startX + curvature * totalLen * 1.2;
  const endY = startY + totalLen;

  const baseW = t.baseWidth * scale;

  ctx.save();

  // Draw tail as a tapered quad using two parallel bezier paths
  ctx.beginPath();
  ctx.moveTo(startX - baseW / 2, startY);
  ctx.quadraticCurveTo(cpX - baseW * 0.3, cpY, endX - 1.5 * scale, endY);
  ctx.lineTo(endX + 1.5 * scale, endY);
  ctx.quadraticCurveTo(cpX + baseW * 0.3, cpY, startX + baseW / 2, startY);
  ctx.closePath();

  const grad = ctx.createLinearGradient(startX, startY, endX, endY);
  grad.addColorStop(0, `hsl(${b.hue}, ${b.saturation}%, ${b.lightness}%)`);
  grad.addColorStop(1, `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 8}%)`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 18}%)`;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
  ctx.restore();
}

export function drawDorsal(ctx, traits, layout) {
  const { body: b, dorsal: d } = traits;
  if (d.type === 0) return;

  const { body: lb, scale } = layout;
  const { cx, cy, w, h } = lb;

  const baseY = cy - h * 0.35;
  const tipH = d.height * scale;
  const dorsalW = w * 0.6;

  ctx.save();

  if (d.type === 1) {
    // Ridge of bumps along the back
    for (let i = 0; i < d.count; i++) {
      const t = (i + 0.5) / d.count;
      const bx = cx + (t - 0.5) * dorsalW;
      const by = baseY - Math.sin(t * Math.PI) * tipH * 0.3;
      const br = tipH * 0.25;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness + 10}%)`;
      ctx.fill();
      ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 15}%)`;
      ctx.lineWidth = 1.2 * scale;
      ctx.stroke();
    }
  } else if (d.type === 2) {
    // Sail fin: smooth arc above the body
    ctx.beginPath();
    ctx.moveTo(cx - dorsalW / 2, baseY);
    ctx.quadraticCurveTo(cx, baseY - tipH, cx + dorsalW / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = `hsla(${b.hue}, ${b.saturation}%, ${b.lightness + 12}%, 0.75)`;
    ctx.fill();
    ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 10}%)`;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Fin rays
    ctx.strokeStyle = `hsla(${b.hue}, ${b.saturation}%, ${b.lightness - 20}%, 0.5)`;
    ctx.lineWidth = 1 * scale;
    for (let i = 1; i < d.count; i++) {
      const t = i / d.count;
      const rx = cx - dorsalW / 2 + t * dorsalW;
      const ryBase = baseY;
      const ryTip = baseY - tipH * Math.sin(t * Math.PI) * 0.95;
      ctx.beginPath();
      ctx.moveTo(rx, ryBase);
      ctx.lineTo(rx, ryTip);
      ctx.stroke();
    }
  } else {
    // Spines: individual tapered spikes
    for (let i = 0; i < d.count; i++) {
      const t = (i + 0.5) / d.count;
      const sx = cx + (t - 0.5) * dorsalW;
      const sy = baseY - Math.sin(t * Math.PI) * 4 * scale;
      const sHeight = tipH * (0.45 + Math.sin(t * Math.PI) * 0.55);
      const sBase = tipH * 0.14;
      ctx.beginPath();
      ctx.moveTo(sx - sBase, sy);
      ctx.lineTo(sx, sy - sHeight);
      ctx.lineTo(sx + sBase, sy);
      ctx.closePath();
      ctx.fillStyle = `hsl(${(b.hue + 15) % 360}, ${b.saturation}%, ${b.lightness + 8}%)`;
      ctx.fill();
      ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 14}%)`;
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
    }
  }
  ctx.restore();
}
