import { Simulation, MAX_NODES } from '../simulation/simulation.js';
import { Tooltip } from './tooltip.js';

export class ControlsPanel {
  constructor({ onRun, onRandomize, onPause, onResume, onStep, onScrub, onEditCreature }) {
    this.onRun          = onRun;
    this.onRandomize    = onRandomize;
    this.onPause        = onPause;
    this.onResume       = onResume;
    this.onStep         = onStep;
    this.onEditCreature = onEditCreature;
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
    this._btnEdit      = document.getElementById('btn-edit');
    this._btnRandomize = document.getElementById('btn-randomize');
    this._transpositionSlider = document.getElementById('ctrl-transposition');
    this._inversionSlider     = document.getElementById('ctrl-inversion');
    this._chkCrossover        = document.getElementById('ctrl-crossover');
    this._scrubberRow  = document.getElementById('scrubber-row');
    this._scrubber     = document.getElementById('ctrl-scrubber');
    this._scrubberVal  = document.getElementById('val-scrubber');
    this._infiniteCheck   = document.getElementById('ctrl-infinite');
    this._survivorsSlider = document.getElementById('ctrl-max-survivors');
    this._survivorsVal    = document.getElementById('val-max-survivors');
    this._popdynCheck     = document.getElementById('ctrl-popdyn');
    this._carryingSlider  = document.getElementById('ctrl-carrying-capacity');
    this._longevitySlider = document.getElementById('ctrl-longevity');
    this._fecunditySlider = document.getElementById('ctrl-fecundity');

    this._bind();
    this._updateHint();
    this._syncPopDynRows();
    this._addHelpIcons();

    this._genVal.textContent   = this._genSlider.value;
    this._branchVal.textContent = this._branchSlider.value;
    const r = this.mutationRate;
    this._mutVal.textContent   = r < 0.01 ? (r * 100).toFixed(2) + '%' : (r * 100).toFixed(1) + '%';
  }

  get generations()     { return parseInt(this._genSlider.value, 10); }
  get infinite()        { return this._infiniteCheck?.checked ?? false; }
  get maxSurvivors()    { return parseInt(this._survivorsSlider?.value ?? '8', 10); }
  get branchingFactor() { return parseInt(this._branchSlider.value, 10); }
  get useCrossover()           { return this._chkCrossover?.checked ?? false; }
  get proportionalReproduction() { return document.getElementById('ctrl-prop-reproduction')?.checked ?? false; }
  get playbackSpeed()   { return parseInt(this._speedSelect?.value ?? '500', 10); }
  get mutationMode()        { return this._mutModeSelect?.value ?? 'point'; }
  get transpositionRate()   { return parseInt(this._transpositionSlider?.value ?? 0, 10) / 100; }
  get inversionRate()       { return parseInt(this._inversionSlider?.value ?? 0, 10) / 100; }
  get populationDynamicsEnabled() { return this._popdynCheck?.checked ?? false; }
  get carryingCapacity()    { return parseInt(this._carryingSlider?.value ?? '60', 10); }
  get longevity()           { return parseInt(this._longevitySlider?.value ?? '8', 10); }
  get fecundity()           { return parseInt(this._fecunditySlider?.value ?? '2', 10); }

  get mutationRate() {
    const v = parseInt(this._mutSlider.value, 10);
    return Math.round(0.001 * Math.pow(100, (v - 1) / 99) * 1000) / 1000;
  }

  // Show/hide the population-dynamics sliders, and hide the now-redundant
  // "max survivors" row when PD is active (carrying capacity supersedes it).
  _syncPopDynRows() {
    const on = this.populationDynamicsEnabled;
    for (const id of ['row-carrying-capacity', 'row-longevity', 'row-fecundity']) {
      const row = document.getElementById(id);
      if (row) row.style.display = on ? '' : 'none';
    }
    if (on) {
      const surRow = document.getElementById('row-max-survivors');
      if (surRow) surRow.style.display = 'none';
    }
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

    this._infiniteCheck?.addEventListener('change', () => {
      const on = this._infiniteCheck.checked;
      const genRow = document.getElementById('row-generations');
      if (genRow) genRow.style.display = on ? 'none' : '';
      const surRow = document.getElementById('row-max-survivors');
      if (surRow) surRow.style.display = on ? '' : 'none';
      this._syncPopDynRows();
      this._updateHint();
    });

    this._survivorsSlider?.addEventListener('input', () => {
      if (this._survivorsVal) this._survivorsVal.textContent = this._survivorsSlider.value;
    });

    this._popdynCheck?.addEventListener('change', () => this._syncPopDynRows());

    const popDynVal = (slider, valId) => {
      slider?.addEventListener('input', () => {
        const el = document.getElementById(valId);
        if (el) el.textContent = slider.value;
      });
    };
    popDynVal(this._carryingSlider,  'val-carrying-capacity');
    popDynVal(this._longevitySlider, 'val-longevity');
    popDynVal(this._fecunditySlider, 'val-fecundity');

    this._btnRun.addEventListener('click', () => {
      if (!this.infinite) {
        const est = Simulation.estimateNodeCount(this.generations, this.branchingFactor);
        if (est > MAX_NODES) {
          this._hint.textContent = `⚠ Capped at ${MAX_NODES} nodes`;
          this._hint.className   = 'hint warn';
        }
      }
      this.onRun({ generations: this.generations, branchingFactor: this.branchingFactor, mutationRate: this.mutationRate });
    });

    this._btnPause?.addEventListener('click', () => {
      if (this._btnPause.textContent.includes('Pause')) this.onPause?.();
      else this.onResume?.();
    });

    this._btnStep?.addEventListener('click', () => this.onStep?.());

    this._btnEdit?.addEventListener('click', () => this.onEditCreature?.());
    this._btnRandomize.addEventListener('click', () => this.onRandomize());

    this._scrubber?.addEventListener('input', () => {
      const v = parseInt(this._scrubber.value, 10);
      if (this._scrubberVal) this._scrubberVal.textContent = `Gen ${v}`;
      this.onScrub?.(v);
    });
  }

  _addHelpIcons() {
    const add = (el, text) => {
      const row = el?.closest('.control-row');
      const lbl = row?.querySelector('.label-text');
      if (lbl) lbl.appendChild(Tooltip.makeIcon(text));
    };

    add(this._genSlider,
      'Number of generations to simulate.\nEach generation every surviving creature\nspawns children. More gens = deeper tree.\nHigh values + high branching can hit\nthe 512-node cap.');

    add(this._branchSlider,
      'Children per surviving parent each gen.\n1 = linear chain  4 = dense bush.\nTree size ≈ branching ^ generations;\nsimulation caps at 512 nodes.');

    add(this._mutSlider,
      'Probability a genome character mutates\neach generation. Log scale — slider\nmidpoint ≈ 1%.\nLow (<0.1%): stable lineages.\nHigh (>10%): rapid divergence.');

    add(this._mutModeSelect,
      'How mutations are applied:\n• Point — random character swaps\n• Inversion — segment reversed in place\n• Segment swap — two segments exchange\n• Mixed — all three every generation');

    add(this._speedSelect,
      'Animation delay between generations.\nInstant skips the delay entirely;\nSlow lets you watch selection\neliminate lineages step by step.');

    add(this._transpositionSlider,
      'Chance a genome segment jumps to a\nnew position each generation (transposon).\nPreserves local sequence but causes\nlarge phenotypic jumps.');

    add(this._inversionSlider,
      'Chance a genome segment is flipped\nend-to-end each generation.\nPreserves characters but changes\nwhich body part they encode.');

    add(this._chkCrossover,
      'Two-parent recombination: offspring\ninherits left segment from one parent\nand right from another.\nProduces the ✕ badge on tree nodes.');

    add(document.getElementById('ctrl-prop-reproduction'),
      'Fitter creatures produce more children;\nweaker ones produce fewer (min 1).\nAmplifies selection without\nexplicitly culling lineages.');

    add(document.getElementById('ctrl-speciation'),
      'Colours each detected species ring.\nSpecies split when Hamming distance\nexceeds ~20% from clade founder.');

    add(this._scrubber,
      'Scrub back through completed gens.\nNodes beyond the selected gen are\ndimmed. Stats chart cursor follows.');

    add(this._infiniteCheck,
      'Run indefinitely — simulation never\nstops on its own. Max survivors caps\nhow many organisms advance each gen,\nkeeping tree growth linear not exponential.');

    add(this._survivorsSlider,
      'Max organisms that survive each gen\nin infinite mode. Lower = leaner tree,\nfaster. Higher = richer evolutionary\nhistory, more memory over time.');

    add(this._popdynCheck,
      'Logistic population dynamics: survivors\npersist as aging adults (overlapping\ngenerations) and the population\nself-regulates toward the carrying\ncapacity instead of growing unbounded.');

    add(this._carryingSlider,
      'Carrying capacity (K) — the standing\npopulation the environment supports.\nSurvival drops as the population nears K,\nso the population plateaus near this value.');

    add(this._longevitySlider,
      'Maximum lifespan in ticks. Survival\ndeclines with age past mid-life\n(senescence). Set to 1 for classic\nnon-overlapping generations.');

    add(this._fecunditySlider,
      'Offspring each mature adult produces\nper tick. Higher fecundity fills the\ncarrying capacity faster.');
  }

  _updateHint() {
    if (this._infiniteCheck?.checked) {
      this._hint.textContent = '∞ — runs until stopped';
      this._hint.className   = 'hint';
      return;
    }
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
    if (this._btnEdit) this._btnEdit.disabled = (state === 'voting');
  }

  setRunning(running) {
    this.setPlaybackState(running ? 'playing' : 'idle');
  }
}
