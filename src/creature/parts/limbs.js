/**
 * Draws forelimbs and hindlimbs.
 * Each limb can have 1–3 segments and three tip types.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} traits
 * @param {object} layout
 * @param {'fore'|'hind'} group
 */
export function drawLimbs(ctx, traits, layout, group) {
  const { body: b, limbs } = traits;
  const { scale } = layout;

  if (group === 'fore') {
    const att = layout.foreAttach;
    _drawLimb(ctx, b, limbs.leftFore,  att.leftX,  att.y, 'left',  scale);
    _drawLimb(ctx, b, limbs.rightFore, att.rightX, att.y, 'right', scale);
  } else {
    const att = layout.hindAttach;
    _drawLimb(ctx, b, limbs.leftHind,  att.leftX,  att.y, 'left',  scale);
    _drawLimb(ctx, b, limbs.rightHind, att.rightX, att.y, 'right', scale);
  }
}

function _drawLimb(ctx, bodyTraits, limb, startX, startY, side, scale) {
  if (limb.length < 2) return;

  const dir = side === 'left' ? -1 : 1;
  const totalLen = limb.length * scale;
  const segLen = totalLen / limb.segments;

  const { hue, saturation, lightness } = bodyTraits;
  const strokeColor = `hsl(${hue}, ${saturation}%, ${lightness - 12}%)`;
  const fillColor   = `hsl(${hue}, ${saturation}%, ${lightness + 2}%)`;

  // Angle for each layer: fore slightly up, hind slightly down
  const baseAngle = side === 'left' ? Math.PI * 0.8 : Math.PI * 0.2;

  const joints = [{ x: startX, y: startY }];
  let angle = baseAngle;

  for (let i = 0; i < limb.segments; i++) {
    const last = joints[joints.length - 1];
    const bend = (i === 0 ? 0 : Math.PI * 0.18 * dir * -1);
    angle += bend;
    joints.push({
      x: last.x + Math.cos(angle) * segLen,
      y: last.y + Math.sin(angle) * segLen,
    });
  }

  // Draw limb as rounded stroke
  const limbW = (8 - limb.segments * 1.5) * scale;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer (darker) outline
  ctx.beginPath();
  ctx.moveTo(joints[0].x, joints[0].y);
  for (let i = 1; i < joints.length; i++) ctx.lineTo(joints[i].x, joints[i].y);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = (limbW + 2.5) * scale;
  ctx.stroke();

  // Inner (lighter) fill
  ctx.beginPath();
  ctx.moveTo(joints[0].x, joints[0].y);
  for (let i = 1; i < joints.length; i++) ctx.lineTo(joints[i].x, joints[i].y);
  ctx.strokeStyle = fillColor;
  ctx.lineWidth = limbW;
  ctx.stroke();

  // Joint circles for multi-segment limbs
  if (limb.segments > 1) {
    for (let i = 1; i < joints.length - 1; i++) {
      ctx.beginPath();
      ctx.arc(joints[i].x, joints[i].y, limbW * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness + 6}%)`;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
    }
  }

  const tip = joints[joints.length - 1];
  _drawTip(ctx, tip.x, tip.y, limb.tipType, scale, dir, bodyTraits, limbW);
  ctx.restore();
}

function _drawTip(ctx, x, y, type, scale, dir, b, baseW) {
  const { hue, saturation, lightness } = b;
  ctx.save();

  if (type === 0) {
    // Round hand: small circle
    ctx.beginPath();
    ctx.arc(x, y, baseW * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness + 8}%)`;
    ctx.fill();
    ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness - 16}%)`;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Finger nubs
    for (let f = 0; f < 3; f++) {
      const fa = (f - 1) * 0.45 + (dir > 0 ? 0.1 : Math.PI - 0.1);
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(fa) * baseW * 1.1,
        y + Math.sin(fa) * baseW * 0.9,
        baseW * 0.38, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }
  } else if (type === 1) {
    // Claws: three narrow triangles
    for (let c = 0; c < 3; c++) {
      const ca = (c - 1) * 0.35 + (dir > 0 ? -0.1 : Math.PI + 0.1);
      const clawLen = baseW * 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(ca - 0.15) * clawLen,
        y + Math.sin(ca - 0.15) * clawLen
      );
      ctx.lineTo(
        x + Math.cos(ca + 0.15) * clawLen * 0.6,
        y + Math.sin(ca + 0.15) * clawLen * 0.6
      );
      ctx.closePath();
      ctx.fillStyle = `hsl(${(hue + 180) % 360}, 30%, 75%)`;
      ctx.fill();
      ctx.strokeStyle = `hsl(${hue}, 40%, 25%)`;
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
    }
  } else {
    // Fin: flattened triangle
    const finLen = baseW * 3.5;
    const finDir = dir > 0 ? 0.15 : Math.PI - 0.15;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(finDir - 0.5) * finLen, y + Math.sin(finDir - 0.5) * finLen);
    ctx.lineTo(x + Math.cos(finDir + 0.5) * finLen, y + Math.sin(finDir + 0.5) * finLen);
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness + 15}%, 0.8)`;
    ctx.fill();
    ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness - 12}%)`;
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
  }
  ctx.restore();
}
