const LINES = [
  { key: 'avgFitness',  color: '#5b8af5', label: 'Avg fitness' },
  { key: 'bestFitness', color: '#4ade80', label: 'Best fitness' },
  { key: 'diversity',   color: '#fb923c', label: 'Diversity' },
];

const PAD = { left: 36, right: 12, top: 10, bottom: 28 };

export class StatsView {
  constructor(canvasId) {
    this._canvas = document.getElementById(canvasId);
  }

  update(data) {
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

    if (data.length === 0) { _drawLegend(ctx, W, H); return; }

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

    _drawLegend(ctx, W, H);
  }
}

function _drawLegend(ctx, W, H) {
  ctx.font = '9px Segoe UI,system-ui,sans-serif';
  ctx.textAlign = 'left';
  let lx = PAD.left;
  for (const { color, label } of LINES) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, H - PAD.bottom + 18, 10, 2);
    ctx.fillStyle = '#5a6480';
    ctx.fillText(label, lx + 14, H - PAD.bottom + 20);
    lx += ctx.measureText(label).width + 28;
  }
}
