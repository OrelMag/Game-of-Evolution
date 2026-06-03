import { Simulation } from '../simulation/simulation.js';

/**
 * Controls panel — manages the simulation parameter sliders and run button.
 * Emits events via onRun callback.
 */
export class ControlsPanel {
  /**
   * @param {object} opts
   * @param {function} opts.onRun    called with (params) when Run is clicked
   * @param {function} opts.onRandomize  called when Randomize is clicked
   */
  constructor({ onRun, onRandomize }) {
    this.onRun       = onRun;
    this.onRandomize = onRandomize;

    this._genSlider  = document.getElementById('ctrl-generations');
    this._branchSlider = document.getElementById('ctrl-branching');
    this._mutSlider  = document.getElementById('ctrl-mutation');
    this._genVal     = document.getElementById('val-generations');
    this._branchVal  = document.getElementById('val-branching');
    this._mutVal     = document.getElementById('val-mutation');
    this._hint       = document.getElementById('node-count-hint');
    this._btnRun     = document.getElementById('btn-run');
    this._btnRandomize = document.getElementById('btn-randomize');

    this._bind();
    this._updateHint();
    // Initialize display values to match slider defaults
    this._genVal.textContent = this._genSlider.value;
    this._branchVal.textContent = this._branchSlider.value;
    const initRate = this.mutationRate;
    this._mutVal.textContent = initRate < 0.01
      ? (initRate * 100).toFixed(2) + '%'
      : (initRate * 100).toFixed(1) + '%';
  }

  get generations()     { return parseInt(this._genSlider.value, 10); }
  get branchingFactor() { return parseInt(this._branchSlider.value, 10); }

  /** Mutation rate as a probability 0–1 (slider is log-scale 1–100). */
  get mutationRate() {
    // slider 1→100 maps to rate 0.001→0.10 (log scale)
    const v = parseInt(this._mutSlider.value, 10);
    return Math.round(0.001 * Math.pow(100, (v - 1) / 99) * 1000) / 1000;
  }

  _bind() {
    this._genSlider.addEventListener('input', () => {
      this._genVal.textContent = this._genSlider.value;
      this._updateHint();
    });
    this._branchSlider.addEventListener('input', () => {
      this._branchVal.textContent = this._branchSlider.value;
      this._updateHint();
    });
    this._mutSlider.addEventListener('input', () => {
      const r = this.mutationRate;
      this._mutVal.textContent = r < 0.01
        ? (r * 100).toFixed(2) + '%'
        : (r * 100).toFixed(1) + '%';
    });

    this._btnRun.addEventListener('click', () => {
      const est = Simulation.estimateNodeCount(this.generations, this.branchingFactor);
      if (est > 512) {
        // Show warning but allow; simulation will cap at 512
        this._hint.textContent = `⚠ Capped at 512 nodes`;
        this._hint.className = 'hint warn';
      }
      this.onRun({
        generations:     this.generations,
        branchingFactor: this.branchingFactor,
        mutationRate:    this.mutationRate,
      });
    });

    this._btnRandomize.addEventListener('click', () => this.onRandomize());
  }

  _updateHint() {
    const est = Simulation.estimateNodeCount(this.generations, this.branchingFactor);
    if (est > 512) {
      this._hint.textContent = `~${est} nodes (capped at 512)`;
      this._hint.className = 'hint warn';
    } else {
      this._hint.textContent = `~${est} creatures`;
      this._hint.className = 'hint';
    }
  }

  setRunning(running) {
    this._btnRun.disabled = running;
    this._btnRun.textContent = running ? '⏳ Running…' : '▶ Run';
  }
}
