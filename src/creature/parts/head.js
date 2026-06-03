/**
 * Draws head, snout, eyes, mouth, and cranial crest.
 */

export function drawHead(ctx, traits, layout) {
  const { body: b, head: h } = traits;
  const { head: lh, scale } = layout;
  const { cx, cy, w, hh } = lh;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, hh / 2, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(
    cx - w * 0.15, cy - hh * 0.18, 0,
    cx, cy, Math.max(w, hh) * 0.6
  );
  grad.addColorStop(0, `hsl(${b.hue}, ${b.saturation}%, ${b.lightness + 20}%)`);
  grad.addColorStop(0.6, `hsl(${b.hue}, ${b.saturation}%, ${b.lightness + 3}%)`);
  grad.addColorStop(1, `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 8}%)`);
  ctx.fillStyle = grad;
  ctx.shadowColor = `hsla(${b.hue}, 60%, 10%, 0.4)`;
  ctx.shadowBlur = 8 * scale;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, hh / 2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 16}%)`;
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();
}

export function drawSnout(ctx, traits, layout) {
  const { body: b, snout: s } = traits;
  if (s.length < 2) return;
  const { head: lh, scale } = layout;
  const { cx, cy, hh } = lh;

  const baseY = cy + hh / 2 - 4 * scale;
  const tipX = cx;
  const tipY = baseY + s.length * scale;
  const halfBase = s.baseWidth * scale * 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - halfBase, baseY);
  ctx.quadraticCurveTo(cx, baseY + s.length * scale * 0.5 + s.droop * s.length * scale, tipX - halfBase * 0.3, tipY);
  ctx.quadraticCurveTo(cx, tipY + 2 * scale, tipX + halfBase * 0.3, tipY);
  ctx.quadraticCurveTo(cx, baseY + s.length * scale * 0.5 + s.droop * s.length * scale, cx + halfBase, baseY);
  ctx.closePath();

  ctx.fillStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 5}%)`;
  ctx.fill();
  ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 20}%)`;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Nostrils
  const noY = baseY + s.length * scale * 0.35;
  for (const nx of [cx - halfBase * 0.35, cx + halfBase * 0.35]) {
    ctx.beginPath();
    ctx.ellipse(nx, noY, 1.8 * scale, 1.2 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 30}%)`;
    ctx.fill();
  }
  ctx.restore();
}

export function drawEyes(ctx, traits, layout) {
  const { eyes: e } = traits;
  const { head: lh, scale } = layout;
  const { cx, cy, w, hh } = lh;

  const positions = _eyePositions(e.count, cx, cy - hh * 0.1, w, hh, e.spread);
  const r = e.radius * scale;

  for (const { x, y } of positions) {
    ctx.save();

    // Glow
    ctx.shadowColor = `hsl(${e.glowHue}, 100%, 65%)`;
    ctx.shadowBlur = 10 * scale;

    // Sclera
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f4ff';
    ctx.fill();

    // Iris
    ctx.shadowBlur = 6 * scale;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${e.glowHue}, 85%, 52%)`;
    ctx.fill();

    // Pupil
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0c14';
    ctx.fill();

    // Specular
    ctx.beginPath();
    ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();

    ctx.restore();
  }
}

export function drawMouth(ctx, traits, layout) {
  const { body: b, mouth: m, snout: s } = traits;
  const { head: lh, scale } = layout;
  const { cx, cy, w, hh } = lh;

  const mouthY = cy + hh * 0.32 + s.length * scale * 0.55;
  const halfW = w * m.width * 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - halfW, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + m.curve * scale, cx + halfW, mouthY);

  if (m.openness > 0.05) {
    const openH = m.openness * 14 * scale;
    ctx.quadraticCurveTo(cx + halfW * 1.05, mouthY + openH * 0.5, cx, mouthY + openH);
    ctx.quadraticCurveTo(cx - halfW * 1.05, mouthY + openH * 0.5, cx - halfW, mouthY);
    ctx.closePath();
    ctx.fillStyle = `hsl(${b.hue}, 40%, 18%)`;
    ctx.fill();
  }

  ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 24}%)`;
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();
  ctx.restore();
}

export function drawCrest(ctx, traits, layout) {
  const { body: b, crest: c } = traits;
  if (c.type === 0) return;
  const { head: lh, scale } = layout;
  const { cx, cy, w, hh } = lh;

  const baseY = cy - hh / 2;
  const tipH = c.height * scale;

  ctx.save();
  ctx.strokeStyle = `hsl(${b.hue}, ${b.saturation}%, ${b.lightness - 12}%)`;
  ctx.fillStyle = `hsl(${(b.hue + 20) % 360}, ${b.saturation}%, ${b.lightness + 8}%)`;
  ctx.lineWidth = 1.5 * scale;

  if (c.type === 1) {
    // Bumps along the top arc
    for (let i = 0; i < c.count; i++) {
      const t = (i + 0.5) / c.count;
      const bx = cx + (t - 0.5) * w * 0.75;
      const by = baseY - Math.sin(t * Math.PI) * tipH * 0.4;
      const br = tipH * 0.28;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (c.type === 2) {
    // Spikes
    for (let i = 0; i < c.count; i++) {
      const t = (i + 0.5) / c.count;
      const bx = cx + (t - 0.5) * w * 0.7;
      const by = baseY - Math.sin(t * Math.PI) * 4 * scale;
      ctx.beginPath();
      ctx.moveTo(bx - tipH * 0.15, by);
      ctx.lineTo(bx, by - tipH * (0.6 + Math.sin(t * Math.PI) * 0.4));
      ctx.lineTo(bx + tipH * 0.15, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Frill: fan of triangular membranes
    const frillW = w * 0.9;
    for (let i = 0; i < c.count; i++) {
      const t = i / (c.count - 1);
      const bx = cx + (t - 0.5) * frillW;
      const by = baseY;
      const height = tipH * (0.5 + Math.sin(t * Math.PI) * 0.5);
      ctx.beginPath();
      ctx.moveTo(bx - frillW / c.count * 0.38, by);
      ctx.lineTo(bx, by - height);
      ctx.lineTo(bx + frillW / c.count * 0.38, by);
      ctx.closePath();
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Helpers ─────────────────────────────────────────────────────────────

function _eyePositions(count, hcx, hcy, hw, hhh, spread) {
  const positions = [];
  const rowY = hcy - hhh * 0.06;
  if (count <= 2) {
    const offset = hw * spread * 0.4;
    positions.push({ x: hcx - offset, y: rowY });
    if (count === 2) positions.push({ x: hcx + offset, y: rowY });
  } else if (count <= 4) {
    const offset = hw * spread * 0.38;
    const row2Y = rowY + hhh * 0.22;
    positions.push({ x: hcx - offset, y: rowY });
    positions.push({ x: hcx + offset, y: rowY });
    if (count >= 3) positions.push({ x: hcx - offset * 0.55, y: row2Y });
    if (count >= 4) positions.push({ x: hcx + offset * 0.55, y: row2Y });
  } else {
    // 5–6 eyes: two rows
    const offset = hw * spread * 0.4;
    const row2Y = rowY + hhh * 0.22;
    positions.push({ x: hcx - offset,       y: rowY });
    positions.push({ x: hcx,                y: rowY - hhh * 0.06 });
    positions.push({ x: hcx + offset,       y: rowY });
    positions.push({ x: hcx - offset * 0.6, y: row2Y });
    positions.push({ x: hcx + offset * 0.6, y: row2Y });
    if (count === 6) positions.push({ x: hcx, y: row2Y + hhh * 0.14 });
  }
  return positions;
}
