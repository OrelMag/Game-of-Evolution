import { PART_NAMES } from '../creature/traits.js';

const PART_COUNT  = 15;
const PART_LENGTH = 8;
const MAX_ENTROPY = Math.log2(3); // ≈ 1.585

export class DriftView {
  constructor(canvasId) {
    this._canvas      = document.getElementById(canvasId);
    this._currentGen  = null;
    this._tooltip     = null;
    this._lastCollector = null;
    this._bindTooltip();
  }

  /** Update to show drift for the latest recorded generation. */
  updateLatest(statsCollector) {
    this._lastCollector = statsCollector;
    const gens = statsCollector.generations;
    if (gens.length === 0) return;
    this.update(gens[gens.length - 1].gen, statsCollector);
  }

  update(gen, statsCollector) {
    if (!this._canvas) return;
    this._lastCollector = statsCollector;
    this._currentGen = gen;
    const entropy = statsCollector.getPositionEntropy(gen);
    if (!entropy) { this._drawEmpty(); return; }
    this._draw(entropy, gen);
  }

  _draw(entropy, gen) {
    const canvas = this._canvas;
    const PAD = { top: 20, left: 62, bottom: 38, right: 8 };
    const rect = canvas.getBoundingClientRect();
    const W = canvas.width  = Math.max(200, Math.floor(rect.width  || 300));
    const H = canvas.height = Math.max(140, Math.floor(rect.height || 160));

    const cellW = (W - PAD.left - PAD.right) / PART_COUNT;
    const cellH = (H - PAD.top - PAD.bottom) / PART_LENGTH;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    for (let part = 0; part < PART_COUNT; part++) {
      for (let pos = 0; pos < PART_LENGTH; pos++) {
        const idx = part * PART_LENGTH + pos;
        const t   = entropy[idx] / MAX_ENTROPY; // 0–1
        ctx.fillStyle = _entropyColor(t);
        const x = PAD.left + part * cellW;
        const y = PAD.top  + pos * cellH;
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
      }
    }

    // Part name labels on X axis (rotated, abbreviated to 4 chars)
    ctx.fillStyle = '#5a6480';
    ctx.font = '8px Segoe UI,system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (let part = 0; part < PART_COUNT; part++) {
      const x     = PAD.left + (part + 0.5) * cellW;
      const label = PART_NAMES[part].slice(0, 5);
      ctx.save();
      ctx.translate(x, H - PAD.bottom + 4);
      ctx.rotate(-Math.PI / 3.5);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // Position labels on Y axis (1–8)
    ctx.textAlign = 'right';
    ctx.font = '9px Segoe UI,system-ui,sans-serif';
    for (let pos = 0; pos < PART_LENGTH; pos++) {
      const y = PAD.top + (pos + 0.5) * cellH + 3;
      ctx.fillText(pos + 1, PAD.left - 4, y);
    }

    // Title
    ctx.fillStyle = '#5a6480';
    ctx.textAlign = 'left';
    ctx.font = '9px Segoe UI,system-ui,sans-serif';
    ctx.fillText(`Genome drift — Gen ${gen}  (blue=conserved, orange=variable)`, PAD.left, 12);
  }

  _drawEmpty() {
    if (!this._canvas) return;
    const rect = this._canvas.getBoundingClientRect();
    const W = this._canvas.width  = Math.max(200, Math.floor(rect.width  || 300));
    const H = this._canvas.height = Math.max(140, Math.floor(rect.height || 160));
    const ctx = this._canvas.getContext('2d');
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5a6480';
    ctx.font = '12px Segoe UI,system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run simulation with selection to see drift', W / 2, H / 2);
  }

  _bindTooltip() {
    if (!this._canvas) return;
    this._canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    this._canvas.addEventListener('mouseleave', () => this._hideTooltip());
  }

  _onMouseMove(e) {
    if (this._currentGen === null || !this._lastCollector) return;
    const PAD  = { top: 20, left: 62, bottom: 38, right: 8 };
    const W    = this._canvas.width;
    const H    = this._canvas.height;
    const cellW = (W - PAD.left - PAD.right) / PART_COUNT;
    const cellH = (H - PAD.top - PAD.bottom) / PART_LENGTH;

    const rect = this._canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const part = Math.floor((mx - PAD.left) / cellW);
    const pos  = Math.floor((my - PAD.top)  / cellH);

    if (part < 0 || part >= PART_COUNT || pos < 0 || pos >= PART_LENGTH) {
      this._hideTooltip();
      return;
    }

    const freqs = this._lastCollector.getPositionFreqs(this._currentGen);
    if (!freqs) return;

    const idx  = (part * PART_LENGTH + pos) * 3;
    const gPct = (freqs[idx]     * 100).toFixed(1);
    const oPct = (freqs[idx + 1] * 100).toFixed(1);
    const dPct = (freqs[idx + 2] * 100).toFixed(1);

    this._showTooltip(
      e.clientX, e.clientY,
      `${PART_NAMES[part]}, pos ${pos + 1}\nG: ${gPct}%  O: ${oPct}%  D: ${dPct}%`
    );
  }

  _showTooltip(x, y, text) {
    if (!this._tooltip) {
      this._tooltip = document.createElement('div');
      this._tooltip.className = 'drift-tooltip';
      document.body.appendChild(this._tooltip);
    }
    this._tooltip.textContent = text;
    this._tooltip.style.cssText =
      `left:${x + 14}px;top:${y - 10}px;white-space:pre;display:block;`;
  }

  _hideTooltip() {
    if (this._tooltip) this._tooltip.style.display = 'none';
  }
}

// Maps t (0–1 entropy fraction) to a CSS color: cold blue (conserved) → hot orange (variable)
function _entropyColor(t) {
  // t=0: #1e2444 (dark cold), t=0.5: #5b8af5 (blue), t=1: #fb923c (orange)
  const r = Math.round(t < 0.5
    ? 30  + t * 2 * (91 - 30)
    : 91  + (t - 0.5) * 2 * (251 - 91));
  const g = Math.round(t < 0.5
    ? 36  + t * 2 * (138 - 36)
    : 138 - (t - 0.5) * 2 * 138);
  const b = Math.round(t < 0.5
    ? 68  + t * 2 * (245 - 68)
    : 245 - (t - 0.5) * 2 * (245 - 60));
  return `rgb(${r},${g},${b})`;
}
