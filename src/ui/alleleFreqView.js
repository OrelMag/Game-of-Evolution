const LINES = [
  { key: 'g', color: '#4ade80', label: 'G (growth/round)' },
  { key: 'o', color: '#fb923c', label: 'O (elongated/complex)' },
  { key: 'd', color: '#a78bfa', label: 'D (reduced/narrow)' },
];

const PAD = { left: 36, right: 12, top: 10, bottom: 28 };

/**
 * Stacked allele-frequency chart. Shows mean G / O / D frequencies
 * across all 120 genome positions over time — a classic population-genetics view.
 * Because G+O+D = 1 at every position, the three lines sum to 1.
 */
export class AlleleFreqView {
  constructor(canvasId) {
    this._canvas   = document.getElementById(canvasId);
    this._lastData = [];
  }

  update(statsCollector) {
    this._lastData = statsCollector.generations;
    this._draw();
  }

  _draw() {
    if (!this._canvas) return;

    const data  = this._lastData;
    const rect  = this._canvas.getBoundingClientRect();
    const W     = this._canvas.width  = Math.max(200, Math.floor(rect.width  || 300));
    const H     = this._canvas.height = Math.max(80,  Math.floor(rect.height || 120));
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top  - PAD.bottom;

    const ctx = this._canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Y grid lines (0, 1/3, 2/3, 1)
    ctx.font = '9px Segoe UI,system-ui,sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 3; i++) {
      const y = PAD.top + (i / 3) * chartH;
      ctx.strokeStyle = '#1e2436';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
      ctx.fillStyle = '#5a6480';
      ctx.fillText((1 - i / 3).toFixed(2), PAD.left - 4, y + 3);
    }

    if (data.length === 0) {
      _drawLegend(ctx, W, H);
      _drawEmptyMsg(ctx, W, H, chartW, chartH);
      return;
    }

    const maxGen = data[data.length - 1].gen;

    // X labels
    ctx.fillStyle = '#5a6480';
    ctx.textAlign = 'center';
    const step = Math.ceil(maxGen / 6);
    for (let g = 1; g <= maxGen; g += step) {
      const x = PAD.left + ((g - 1) / Math.max(1, maxGen - 1)) * chartW;
      ctx.fillText(g, x, H - PAD.bottom + 12);
    }

    // Neutral frequency reference line at 1/3
    ctx.strokeStyle = 'rgba(90,100,128,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const refY = PAD.top + (2 / 3) * chartH; // y for freq = 1/3
    ctx.beginPath(); ctx.moveTo(PAD.left, refY); ctx.lineTo(PAD.left + chartW, refY); ctx.stroke();
    ctx.setLineDash([]);

    // Data lines
    for (const { key, color } of LINES) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const freq = d.alleleFreqs ? d.alleleFreqs[key] : 1 / 3;
        const x = PAD.left + (i / Math.max(1, data.length - 1)) * chartW;
        const y = PAD.top + (1 - freq) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dot at last point
      const last = data[data.length - 1];
      const lastFreq = last.alleleFreqs ? last.alleleFreqs[key] : 1 / 3;
      const lx = PAD.left + chartW;
      const ly = PAD.top + (1 - lastFreq) * chartH;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2); ctx.fill();

      // Value label at right edge
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.font = '9px Segoe UI,system-ui,sans-serif';
      ctx.fillText((lastFreq * 100).toFixed(0) + '%', lx + 4, ly + 3);
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

function _drawEmptyMsg(ctx, W, H, chartW, chartH) {
  ctx.fillStyle = '#5a6480';
  ctx.font = '11px Segoe UI,system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Run simulation to see allele frequencies', PAD.left + chartW / 2, PAD.top + chartH / 2);
}
