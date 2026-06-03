import { decodeTraits } from './traits.js';
import { drawBody } from './parts/body.js';
import { drawHead, drawSnout, drawEyes, drawMouth, drawCrest } from './parts/head.js';
import { drawLimbs } from './parts/limbs.js';
import { drawTail, drawDorsal } from './parts/tail.js';
import { drawMarkings } from './parts/markings.js';

// Reference canvas dimensions that all coordinate values are designed for.
const REF_W = 320;
const REF_H = 390;

export class CreatureRenderer {
  /** Draw a genome onto the given canvas element. */
  render(genome, canvas) {
    const traits = decodeTraits(genome);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const layout = computeLayout(traits, canvas.width, canvas.height);
    _draw(ctx, traits, layout);
  }

  /**
   * Return a PNG data-URL thumbnail for use in the SVG tree.
   * @param {import('../genome/genome.js').Genome} genome
   * @param {number} size  width in px; height is proportional
   */
  thumbnail(genome, size = 60) {
    const traits = decodeTraits(genome);
    const h = Math.round(size * REF_H / REF_W);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const layout = computeLayout(traits, size, h);
    _draw(ctx, traits, layout, false); // false = skip expensive glow at small size
    return canvas.toDataURL('image/png');
  }
}

// ── Layout ───────────────────────────────────────────────────────────────

function computeLayout(traits, W, H) {
  const scale = Math.min(W / REF_W, H / REF_H);

  const bw = traits.body.width  * scale;
  const bh = traits.body.height * scale;
  const cx = W / 2;
  const bodyCY = H * 0.58;

  const headW = bw * traits.head.size;
  const headH = headW * traits.head.elongation;
  const headCY = bodyCY - bh / 2 - headH * 0.38; // slight overlap at neck

  return {
    scale,
    body: { cx, cy: bodyCY, w: bw, h: bh },
    head: { cx, cy: headCY, w: headW, hh: headH },
    foreAttach: {
      leftX:  cx - bw * 0.48,
      rightX: cx + bw * 0.48,
      y:      bodyCY - bh * 0.12,
    },
    hindAttach: {
      leftX:  cx - bw * 0.4,
      rightX: cx + bw * 0.4,
      y:      bodyCY + bh * 0.3,
    },
  };
}

// ── Draw order: back → front ──────────────────────────────────────────────

function _draw(ctx, traits, layout, highDetail = true) {
  drawTail(ctx, traits, layout);
  drawLimbs(ctx, traits, layout, 'hind');
  drawDorsal(ctx, traits, layout);
  drawBody(ctx, traits, layout);
  drawLimbs(ctx, traits, layout, 'fore');
  drawHead(ctx, traits, layout);
  drawSnout(ctx, traits, layout);
  drawEyes(ctx, traits, layout);
  drawMouth(ctx, traits, layout);
  drawCrest(ctx, traits, layout);
  if (highDetail) drawMarkings(ctx, traits, layout);
}
