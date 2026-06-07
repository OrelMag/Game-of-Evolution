const LINES = [
  { key: 'avgFitness',  color: '#5b8af5', label: 'Avg fitness' },
  { key: 'bestFitness', color: '#4ade80', label: 'Best fitness' },
  { key: 'diversity',   color: '#fb923c', label: 'Diversity' },
];

const PAD = { left: 36, right: 12, top: 10, bottom: 28 };

const POP_COLOR = '#e879f9'; // population line (population dynamics only)

export class StatsView {
  constructor(canvasId) {
    this._canvas     = document.getElementById(canvasId);
    this._timeCursor = null;
    this._lastData   = [];
    this._carryingCapacity = null; // non-null ⇒ draw population line + K reference
  }

  setTimeCursor(gen) { this._timeCursor = gen; }

  /** Enable the population line + dashed carrying-capacity reference (null = off). */
  setCarryingCapacity(k) { this._carryingCapacity = k; }

  redraw() { this.update(this._lastData); }

  update(data) {
    this._lastData = data;
    if (!this._canvas) return;

    // Sync logical pixel size to CSS size for crisp rendering
    const rect = this._canvas.getBoundingClientRect();
    const W = this._canvas.width  = Math.max(200, Math.floor(rect.width));
    const H = this._canvas.height = Math.max(80,  Math.floor(rect.height));

    const ctx = this._canvas.getContext('2d');
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Horizontal grid lines + Y labels
    ctx.font = '9px Segoe UI,system-ui,sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (i / 4) * chartH;
      ctx.strokeStyle = '#1e2436';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
      ctx.fillStyle = '#5a6480';
      ctx.fillText((1 - i / 4).toFixed(2), PAD.left - 4, y + 3);
    }

    if (data.length === 0) { _drawLegend(ctx, W, H, this._carryingCapacity != null); return; }

    const maxGen = data[data.length - 1].gen;

    // X labels
    ctx.fillStyle = '#5a6480';
    ctx.textAlign = 'center';
    const step = Math.ceil(maxGen / 8);
    for (let g = 1; g <= maxGen; g += step) {
      const x = PAD.left + ((g - 1) / Math.max(1, maxGen - 1)) * chartW;
      ctx.fillText(g, x, H - PAD.bottom + 12);
    }

    // Data lines
    for (const { key, color } of LINES) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = PAD.left + (i / Math.max(1, data.length - 1)) * chartW;
        const y = PAD.top + (1 - Math.max(0, Math.min(1, d[key]))) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dot at last point
      const last = data[data.length - 1];
      const lx = PAD.left + chartW;
      const ly = PAD.top + (1 - Math.max(0, Math.min(1, last[key]))) * chartH;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Population line + carrying-capacity reference (population dynamics only).
    if (this._carryingCapacity != null) {
      const K = this._carryingCapacity;
      const observedMax = data.reduce((m, d) => Math.max(m, d.population ?? 0), 0);
      const scale = Math.max(1, K, observedMax) * 1.1;

      // Dashed K reference line
      const ky = PAD.top + (1 - K / scale) * chartH;
      ctx.save();
      ctx.strokeStyle = 'rgba(232,121,249,0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(PAD.left, ky); ctx.lineTo(PAD.left + chartW, ky); ctx.stroke();
      ctx.restore();

      // Population trend
      ctx.strokeStyle = POP_COLOR;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = PAD.left + (i / Math.max(1, data.length - 1)) * chartW;
        const y = PAD.top + (1 - Math.min(1, (d.population ?? 0) / scale)) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      const last = data[data.length - 1];
      const lx = PAD.left + chartW;
      const ly = PAD.top + (1 - Math.min(1, (last.population ?? 0) / scale)) * chartH;
      ctx.fillStyle = POP_COLOR;
      ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Time cursor vertical line (generation scrubber)
    if (this._timeCursor !== null && data.length > 1) {
      const cursorFrac = (this._timeCursor - 1) / Math.max(1, maxGen - 1);
      const cx = PAD.left + cursorFrac * chartW;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, PAD.top);
      ctx.lineTo(cx, PAD.top + chartH);
      ctx.stroke();
      ctx.restore();
    }

    _drawLegend(ctx, W, H, this._carryingCapacity != null);
  }
}

function _drawLegend(ctx, W, H, showPop = false) {
  ctx.font = '9px Segoe UI,system-ui,sans-serif';
  ctx.textAlign = 'left';
  const entries = showPop ? [...LINES, { color: POP_COLOR, label: 'Population' }] : LINES;
  let lx = PAD.left;
  for (const { color, label } of entries) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, H - PAD.bottom + 18, 10, 2);
    ctx.fillStyle = '#5a6480';
    ctx.fillText(label, lx + 14, H - PAD.bottom + 20);
    lx += ctx.measureText(label).width + 28;
  }
}
