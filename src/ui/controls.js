import { Simulation, MAX_NODES } from '../simulation/simulation.js';

export class ControlsPanel {
  constructor({ onRun, onRandomize, onPause, onResume, onStep, onScrub }) {
    this.onRun       = onRun;
    this.onRandomize = onRandomize;
    this.onPause     = onPause;
    this.onResume    = onResume;
    this.onStep      = onStep;
    this.onScrub     = onScrub;

    this._genSlider    = document.getElementById('ctrl-generations');
    this._branchSlider = document.getElementById('ctrl-branching');
    this._mutSlider    = document.getElementById('ctrl-mutation');
    this._speedSelect  = document.getElementById('ctrl-speed');
    this._mutModeSelect = document.getElementById('ctrl-mutation-mode');
    this._genVal       = document.getElementById('val-generations');
    this._branchVal    = document.getElementById('val-branching');
    this._mutVal       = document.getElementById('val-mutation');
    this._hint         = document.getElementById('node-count-hint');
    this._btnRun       = document.getElementById('btn-run');
    this._btnPause     = document.getElementById('btn-pause');
    this._btnStep      = document.getElementById('btn-step');
    this._btnRandomize = document.getElementById('btn-randomize');
    this._transpositionSlider = document.getElementById('ctrl-transposition');
    this._inversionSlider     = document.getElementById('ctrl-inversion');
    this._chkCrossover        = document.getElementById('ctrl-crossover');
    this._scrubberRow  = document.getElementById('scrubber-row');
    this._scrubber     = document.getElementById('ctrl-scrubber');
    this._scrubberVal  = document.getElementById('val-scrubber');

    this._bind();
    this._updateHint();

    this._genVal.textContent   = this._genSlider.value;
    this._branchVal.textContent = this._branchSlider.value;
    const r = this.mutationRate;
    this._mutVal.textContent   = r < 0.01 ? (r * 100).toFixed(2) + '%' : (r * 100).toFixed(1) + '%';
  }

  get generations()     { return parseInt(this._genSlider.value, 10); }
  get branchingFactor() { return parseInt(this._branchSlider.value, 10); }
  get useCrossover()    { return this._chkCrossover?.checked ?? false; }
  get playbackSpeed()   { return parseInt(this._speedSelect?.value ?? '500', 10); }
  get mutationMode()        { return this._mutModeSelect?.value ?? 'point'; }
  get transpositionRate()   { return parseInt(this._transpositionSlider?.value ?? 0, 10) / 100; }
  get inversionRate()       { return parseInt(this._inversionSlider?.value ?? 0, 10) / 100; }

  get mutationRate() {
    const v = parseInt(this._mutSlider.value, 10);
    return Math.round(0.001 * Math.pow(100, (v - 1) / 99) * 1000) / 1000;
  }

  showScrubber(maxGen) {
    if (!this._scrubberRow || !this._scrubber) return;
    this._scrubber.max   = maxGen;
    this._scrubber.value = maxGen;
    if (this._scrubberVal) this._scrubberVal.textContent = `Gen ${maxGen}`;
    this._scrubberRow.classList.remove('hidden');
  }

  hideScrubber() {
    this._scrubberRow?.classList.add('hidden');
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
      this._mutVal.textContent = r < 0.01 ? (r * 100).toFixed(2) + '%' : (r * 100).toFixed(1) + '%';
    });
    this._transpositionSlider?.addEventListener('input', e => {
      document.getElementById('val-transposition').textContent = e.target.value + '%';
    });
    this._inversionSlider?.addEventListener('input', e => {
      document.getElementById('val-inversion').textContent = e.target.value + '%';
    });

    this._btnRun.addEventListener('click', () => {
      const est = Simulation.estimateNodeCount(this.generations, this.branchingFactor);
      if (est > MAX_NODES) {
        this._hint.textContent = `⚠ Capped at ${MAX_NODES} nodes`;
        this._hint.className   = 'hint warn';
      }
      this.onRun({ generations: this.generations, branchingFactor: this.branchingFactor, mutationRate: this.mutationRate });
    });

    this._btnPause?.addEventListener('click', () => {
      if (this._btnPause.textContent.includes('Pause')) this.onPause?.();
      else this.onResume?.();
    });

    this._btnStep?.addEventListener('click', () => this.onStep?.());

    this._btnRandomize.addEventListener('click', () => this.onRandomize());

    this._scrubber?.addEventListener('input', () => {
      const v = parseInt(this._scrubber.value, 10);
      if (this._scrubberVal) this._scrubberVal.textContent = `Gen ${v}`;
      this.onScrub?.(v);
    });
  }

  _updateHint() {
    const est = Simulation.estimateNodeCount(this.generations, this.branchingFactor);
    if (est > MAX_NODES) {
      this._hint.textContent = `~${est} nodes (capped at ${MAX_NODES})`;
      this._hint.className   = 'hint warn';
    } else {
      this._hint.textContent = `~${est} creatures`;
      this._hint.className   = 'hint';
    }
  }

  /**
   * Update button states to reflect current playback state.
   * @param {'idle'|'playing'|'paused'|'voting'|'done'} state
   */
  setPlaybackState(state) {
    const run   = this._btnRun;
    const pause = this._btnPause;
    const step  = this._btnStep;

    if (state === 'idle' || state === 'done') {
      run.textContent  = '▶ Run';
      run.disabled     = false;
      if (pause) { pause.textContent = '⏸ Pause'; pause.disabled = true; }
      if (step)  { step.disabled = false; }
    } else if (state === 'playing') {
      run.textContent  = '⏳ Running…';
      run.disabled     = true;
      if (pause) { pause.textContent = '⏸ Pause'; pause.disabled = false; }
      if (step)  { step.disabled = true; }
    } else if (state === 'paused') {
      run.textContent  = '▶ Run';
      run.disabled     = false;
      if (pause) { pause.textContent = '▶ Resume'; pause.disabled = false; }
      if (step)  { step.disabled = false; }
    } else if (state === 'voting') {
      run.disabled = true;
      if (pause) pause.disabled = true;
      if (step)  step.disabled  = true;
    }
  }

  setRunning(running) {
    this.setPlaybackState(running ? 'playing' : 'idle');
  }
}
