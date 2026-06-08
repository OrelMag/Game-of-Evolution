import { SelectionEngine } from '../selection/selectionEngine.js';
import { Tooltip } from './tooltip.js';
import { EnvironmentMode, ENVIRONMENTS } from '../selection/environmentMode.js';
import { TargetMode } from '../selection/targetMode.js';
import { PredatorMode } from '../selection/predatorMode.js';
import { ResourceMode } from '../selection/resourceMode.js';
import { EpistasisMode } from '../selection/epistasisMode.js';
import { MetabolicMode } from '../selection/metabolicMode.js';
import { Genome } from '../genome/genome.js';

/**
 * Selection panel — accordion UI allowing multiple simultaneous selection modes.
 * Injects its DOM into #selection-panel-mount.
 * Exposes buildEngine() which returns a configured SelectionEngine.
 */
export class SelectionPanel {
  constructor({ onTargetPick, onEnvironmentChange }) {
    this.onTargetPick        = onTargetPick;
    this.onEnvironmentChange = onEnvironmentChange;
    this._enabledModes  = new Set();
    this._targetMode    = new TargetMode();
    this._envMode       = new EnvironmentMode('deepSea');
    this._resourceMode  = new ResourceMode();
    this._epistasisMode = new EpistasisMode();
    this._metabolicMode = new MetabolicMode();

    this._mount = document.getElementById('selection-panel-mount');
    this._render();
    this._bind();
    this._addHelpIcons();
  }

  _render() {
    this._mount.innerHTML = `
      <section class="control-section selection-section">
        <h2>Selection pressure</h2>

        <div class="sel-section">
          <label class="sel-section-header">
            <input type="checkbox" id="chk-env" />
            <span>Environment</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-env">
            <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
              Each body part scored by cosine similarity to the habitat's preferred G/O/D ratios.
              Switch environments mid-run to drive rapid adaptation.
            </p>
            <select class="env-select" id="env-select">
              ${Object.entries(ENVIRONMENTS).map(([k, v]) =>
                `<option value="${k}">${v.label}</option>`
              ).join('')}
            </select>
            <label class="control-row" style="margin-top:8px;">
              <span class="label-text">Change over time</span>
              <select class="speed-select" id="env-dynamics">
                <option value="static" selected>Static</option>
                <option value="drift">Climate drift →</option>
                <option value="oscillate">Seasonal oscillation</option>
                <option value="catastrophe">Catastrophe cycle</option>
              </select>
            </label>
            <div id="env-dynamics-body" class="hidden">
              <label class="control-row">
                <span class="label-text">Toward habitat</span>
                <select class="env-select" id="env-target">
                  ${Object.entries(ENVIRONMENTS).map(([k, v]) =>
                    `<option value="${k}">${v.label}</option>`
                  ).join('')}
                </select>
              </label>
              <label class="control-row">
                <span class="label-text">Timescale (gens)</span>
                <input type="range" id="env-rate" min="2" max="40" value="15" />
                <span class="value-display" id="val-env-rate">15</span>
              </label>
            </div>
            <label class="control-row selection-strength-row">
              <span class="label-text">Strength</span>
              <input type="range" id="env-strength" min="0" max="100" value="60" />
              <span class="value-display" id="val-env-strength">60%</span>
            </label>
          </div>
        </div>

        <div class="sel-section">
          <label class="sel-section-header">
            <input type="checkbox" id="chk-target" />
            <span>Target genome</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-target">
            <textarea class="target-input" id="target-genome" placeholder="120-char G/O/D string…" rows="3"></textarea>
            <div style="display:flex;gap:6px;margin-top:6px;">
              <button class="btn btn-secondary btn-sm" id="btn-random-target">↺ Random</button>
              <button class="btn btn-ghost btn-sm" id="btn-pick-target">🖱 Pick from tree</button>
            </div>
            <div class="hamming-bar" style="margin-top:8px;">
              <div class="hamming-fill" id="hamming-fill" style="width:0%"></div>
            </div>
            <p style="font-size:10px;color:var(--text-dim);margin-top:3px;" id="hamming-label">No target set</p>
            <p style="font-size:11px;color:var(--text-dim);margin-top:6px;margin-bottom:4px;">
              Fitness = 1 − (Hamming / 120). Use ↺ Random or 🖱 Pick from tree,
              or type a 120-char G/O/D string directly.
            </p>
            <label class="control-row selection-strength-row">
              <span class="label-text">Strength</span>
              <input type="range" id="target-strength" min="0" max="100" value="70" />
              <span class="value-display" id="val-target-strength">70%</span>
            </label>
          </div>
        </div>

        <div class="sel-section">
          <label class="sel-section-header">
            <input type="checkbox" id="chk-predator" />
            <span>Predator</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-predator">
            <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
              A co-evolving <span style="color:var(--red);">red-tree lineage</span> tracks prey genomes.
              Prey fitness falls when the predator is genetically close; diverging prey survive.
              Pred. mutation sets how fast the predator evolves.
            </p>
            <label class="control-row">
              <span class="label-text">Pred. mutation</span>
              <input type="range" id="pred-mutation" min="1" max="100" value="20" />
              <span class="value-display" id="val-pred-mutation">1.5%</span>
            </label>
            <label class="control-row selection-strength-row">
              <span class="label-text">Strength</span>
              <input type="range" id="pred-strength" min="0" max="100" value="65" />
              <span class="value-display" id="val-pred-strength">65%</span>
            </label>
          </div>
        </div>

        <div class="sel-section">
          <label class="sel-section-header">
            <input type="checkbox" id="chk-resource" />
            <span>Resource competition</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-resource">
            <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
              Creatures within Niche radius% Hamming distance compete for the same niche.
              Crowded niches cut fitness proportionally — equivalent to frequency-dependent selection.
              Drives diversification without explicit predation.
            </p>
            <label class="control-row">
              <span class="label-text">Niche radius</span>
              <input type="range" id="resource-niche-radius" min="1" max="100" value="25" />
              <span class="value-display" id="val-resource-niche">25%</span>
            </label>
            <label class="control-row selection-strength-row">
              <span class="label-text">Strength</span>
              <input type="range" id="resource-strength" min="0" max="100" value="60" />
              <span class="value-display" id="val-resource-strength">60%</span>
            </label>
          </div>
        </div>

        <div class="sel-section">
          <label class="sel-section-header">
            <input type="checkbox" id="chk-epistasis" />
            <span>Epistasis</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-epistasis">
            <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
              Certain gene combinations score a synergy bonus; incompatible ones are penalised.
              Simulates co-adapted gene complexes. High strength locks genomes into stable epistatic peaks.
            </p>
            <label class="control-row selection-strength-row">
              <span class="label-text">Strength</span>
              <input type="range" id="epistasis-strength" min="0" max="100" value="40" />
              <span class="value-display" id="val-epistasis-strength">40%</span>
            </label>
          </div>
        </div>

        <div class="sel-section">
          <label class="sel-section-header">
            <input type="checkbox" id="chk-metabolic" />
            <span>Metabolism</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-metabolic">
            <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
              Big bodies, many eyes, long limbs and bright markings cost energy.
              Staying under the budget is free; exceeding it cuts fitness.
              Stacks with other modes to force trade-offs — and turns a
              sexually-selected ornament into a costly handicap.
            </p>
            <label class="control-row">
              <span class="label-text">Energy budget</span>
              <input type="range" id="metabolic-budget" min="0" max="100" value="40" />
              <span class="value-display" id="val-metabolic-budget">40%</span>
            </label>
            <label class="control-row selection-strength-row">
              <span class="label-text">Strength</span>
              <input type="range" id="metabolic-strength" min="0" max="100" value="60" />
              <span class="value-display" id="val-metabolic-strength">60%</span>
            </label>
          </div>
        </div>

        <div class="sel-section">
          <label class="sel-section-header">
            <input type="checkbox" id="chk-drift" />
            <span>Genetic drift</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-drift">
            <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
              After each gen, only N<sub>e</sub> survivors are kept by random lottery regardless of fitness (Wright-Fisher).
              Small N<sub>e</sub> → strong drift; alleles fix or vanish by chance alone.
              Combine with selection to see how drift limits adaptive response.
            </p>
            <label class="control-row">
              <span class="label-text">Pop. size N<sub>e</sub></span>
              <input type="range" id="drift-pop-size" min="2" max="50" value="10" />
              <span class="value-display" id="val-drift-pop">10</span>
            </label>
          </div>
        </div>

        <div class="sel-section">
          <label class="sel-section-header">
            <input type="checkbox" id="chk-player" />
            <span>Player selection</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-player">
            <p style="font-size:11px;color:var(--text-dim);">
              A voting panel appears after each gen. Click a card green to keep it, grey to cull.
              At least one must survive. Use ⏭ Step to advance one gen at a time at your own pace.
            </p>
          </div>
        </div>
      </section>
    `;
  }

  _bind() {
    const modeCheckboxes = [
      { id: 'chk-env',       key: 'env' },
      { id: 'chk-target',    key: 'target' },
      { id: 'chk-predator',  key: 'predator' },
      { id: 'chk-resource',  key: 'resource' },
      { id: 'chk-epistasis', key: 'epistasis' },
      { id: 'chk-metabolic', key: 'metabolic' },
      { id: 'chk-drift',     key: 'drift' },
      { id: 'chk-player',    key: 'player' },
    ];

    for (const { id, key } of modeCheckboxes) {
      const chk  = document.getElementById(id);
      const body = document.getElementById(`sel-body-${key}`);
      chk?.addEventListener('change', () => {
        if (chk.checked) {
          this._enabledModes.add(key);
          body?.classList.remove('hidden');
        } else {
          this._enabledModes.delete(key);
          body?.classList.add('hidden');
        }
      });
    }

    // Environment checkbox → notify habitat background
    document.getElementById('chk-env')?.addEventListener('change', e => {
      const key = document.getElementById('env-select').value;
      this.onEnvironmentChange?.(key, e.target.checked);
    });

    // Environment select
    document.getElementById('env-select')?.addEventListener('change', e => {
      this._envMode.setEnvironment(e.target.value);
      if (document.getElementById('chk-env')?.checked) {
        this.onEnvironmentChange?.(e.target.value, true);
      }
    });
    document.getElementById('env-strength')?.addEventListener('input', e => {
      document.getElementById('val-env-strength').textContent = e.target.value + '%';
    });

    // Environment temporal dynamics
    document.getElementById('env-dynamics')?.addEventListener('change', e => {
      const body = document.getElementById('env-dynamics-body');
      body?.classList.toggle('hidden', e.target.value === 'static');
    });
    document.getElementById('env-rate')?.addEventListener('input', e => {
      document.getElementById('val-env-rate').textContent = e.target.value;
    });

    // Target genome input
    document.getElementById('target-genome')?.addEventListener('input', e => {
      this._parseTargetInput(e.target.value);
    });
    document.getElementById('btn-random-target')?.addEventListener('click', () => {
      const g = Genome.random();
      document.getElementById('target-genome').value = g.sequence;
      this._targetMode.setTarget(g);
      this._updateHamming(g);
    });
    document.getElementById('btn-pick-target')?.addEventListener('click', () => {
      this.onTargetPick?.();
    });

    // Target strength
    document.getElementById('target-strength')?.addEventListener('input', e => {
      document.getElementById('val-target-strength').textContent = e.target.value + '%';
    });

    // Resource competition
    document.getElementById('resource-niche-radius')?.addEventListener('input', e => {
      this._resourceMode.nicheRadius = parseInt(e.target.value, 10) / 100;
      document.getElementById('val-resource-niche').textContent = e.target.value + '%';
    });
    document.getElementById('resource-strength')?.addEventListener('input', e => {
      document.getElementById('val-resource-strength').textContent = e.target.value + '%';
    });

    // Epistasis strength
    document.getElementById('epistasis-strength')?.addEventListener('input', e => {
      document.getElementById('val-epistasis-strength').textContent = e.target.value + '%';
    });

    // Metabolism
    document.getElementById('metabolic-budget')?.addEventListener('input', e => {
      this._metabolicMode.budget = parseInt(e.target.value, 10) / 100;
      document.getElementById('val-metabolic-budget').textContent = e.target.value + '%';
    });
    document.getElementById('metabolic-strength')?.addEventListener('input', e => {
      document.getElementById('val-metabolic-strength').textContent = e.target.value + '%';
    });

    // Genetic drift pop size
    document.getElementById('drift-pop-size')?.addEventListener('input', e => {
      document.getElementById('val-drift-pop').textContent = e.target.value;
    });

    // Predator mutation rate display
    document.getElementById('pred-mutation')?.addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      const r = Math.round(0.001 * Math.pow(100, (v - 1) / 99) * 1000) / 1000;
      document.getElementById('val-pred-mutation').textContent =
        r < 0.01 ? (r * 100).toFixed(2) + '%' : (r * 100).toFixed(1) + '%';
    });
    document.getElementById('pred-strength')?.addEventListener('input', e => {
      document.getElementById('val-pred-strength').textContent = e.target.value + '%';
    });
  }

  _addHelpIcons() {
    const add = (id, text) => {
      const el  = document.getElementById(id);
      const row = el?.closest('.control-row');
      const lbl = row?.querySelector('.label-text');
      if (lbl) lbl.appendChild(Tooltip.makeIcon(text));
    };

    const STRENGTH_TEXT =
      'How strongly this pressure shapes survival.\n' +
      '0% = active but no effect.\n' +
      '100% = only top scorers survive.\n' +
      'Multiple modes stack multiplicatively.';

    add('env-strength',       STRENGTH_TEXT);
    add('target-strength',    STRENGTH_TEXT);
    add('pred-strength',      STRENGTH_TEXT);
    add('resource-strength',  STRENGTH_TEXT);
    add('epistasis-strength', STRENGTH_TEXT);
    add('metabolic-strength', STRENGTH_TEXT);

    add('metabolic-budget',
      'Energy an organism can spend on costly\ntraits (size, eyes, limbs, markings).\nUnder budget = free; over budget cuts\nfitness. Low budget favours lean body plans.');

    add('env-rate',
      'Drift: generations to fully reach the\ntarget habitat.\nOscillation / Catastrophe: the period\nin generations.');

    add('resource-niche-radius',
      'Hamming distance threshold (% of 120 chars)\nwithin which creatures share a niche.\nSmall = tight niches, more species coexist.\nLarge = broad competition, fewer niches.');

    add('pred-mutation',
      'Mutation rate for the predator lineage.\nFaster predator = tighter arms race.\nSame log scale as the main mutation slider.');

    add('drift-pop-size',
      'Effective population size N_e.\nN_e survivors chosen each gen by lottery.\nSmall N_e → strong drift; large → negligible.');
  }

  _parseTargetInput(val) {
    const clean = val.toUpperCase().replace(/[^GOD]/g, '');
    if (clean.length >= 120) {
      const g = Genome.fromString(clean);
      this._targetMode.setTarget(g);
      this._updateHamming(g);
    } else {
      this._targetMode.setTarget(null);
      document.getElementById('hamming-fill').style.width = '0%';
      document.getElementById('hamming-label').textContent =
        clean.length > 0 ? `${clean.length}/120 chars entered` : 'No target set';
    }
  }

  _updateHamming(targetGenome) {
    const sim = targetGenome ? 1 - Genome.random().hammingDistance(targetGenome) / 120 : 0;
    document.getElementById('hamming-fill').style.width = (sim * 100).toFixed(1) + '%';
    document.getElementById('hamming-label').textContent = 'Target set ✓';
  }

  /** Set the target genome from an external source (e.g. clicking a tree node). */
  setTargetFromGenome(genome) {
    document.getElementById('target-genome').value = genome.sequence;
    this._targetMode.setTarget(genome);
    this._updateHamming(genome);
  }

  /** Update the hamming display for a specific creature (selected in tree). */
  updateHammingFor(genome) {
    if (!this._targetMode.target) return;
    const dist = this._targetMode.normalisedDistance(genome);
    document.getElementById('hamming-fill').style.width = ((1 - dist) * 100).toFixed(1) + '%';
    document.getElementById('hamming-label').textContent =
      `Distance: ${Math.round(dist * 120)}/120`;
  }

  /**
   * Build a SelectionEngine from current UI state.
   * All checked modes contribute simultaneously.
   * Returns { engine, predatorMode } — predatorMode is non-null only when predator is enabled.
   */
  buildEngine(branchingFactor, mutationRate) {
    const modes = [];
    let predatorMode = null;

    if (this._enabledModes.has('env')) {
      const dyn   = document.getElementById('env-dynamics')?.value ?? 'static';
      const scale = parseInt(document.getElementById('env-rate')?.value ?? '15', 10);
      this._envMode.setSchedule({
        mode:      dyn,
        targetKey: document.getElementById('env-target')?.value ?? null,
        rate:      1 / scale,   // drift completes after `scale` generations
        period:    scale,       // oscillation / catastrophe period
      });
      const strength = parseInt(document.getElementById('env-strength').value, 10) / 100;
      modes.push({ mode: this._envMode, strength, label: 'Environment' });
    }

    if (this._enabledModes.has('target') && this._targetMode.target) {
      const strength = parseInt(document.getElementById('target-strength').value, 10) / 100;
      modes.push({ mode: this._targetMode, strength, label: 'Target' });
    }

    if (this._enabledModes.has('predator')) {
      const mv = parseInt(document.getElementById('pred-mutation').value, 10);
      const predRate = Math.round(0.001 * Math.pow(100, (mv - 1) / 99) * 1000) / 1000;
      predatorMode = new PredatorMode({ mutationRate: predRate, branchingFactor });
      const strength = parseInt(document.getElementById('pred-strength').value, 10) / 100;
      modes.push({ mode: predatorMode, strength, label: 'Predator' });
    }

    if (this._enabledModes.has('resource')) {
      const strength = parseInt(document.getElementById('resource-strength').value, 10) / 100;
      modes.push({ mode: this._resourceMode, strength, label: 'Resources' });
    }

    if (this._enabledModes.has('epistasis')) {
      const strength = parseInt(document.getElementById('epistasis-strength').value, 10) / 100;
      modes.push({ mode: this._epistasisMode, strength, label: 'Epistasis' });
    }

    if (this._enabledModes.has('metabolic')) {
      const strength = parseInt(document.getElementById('metabolic-strength').value, 10) / 100;
      modes.push({ mode: this._metabolicMode, strength, label: 'Metabolism' });
    }

    return { engine: new SelectionEngine(modes), predatorMode };
  }

  /** Returns max strength among all enabled computational modes (used for applySelection). */
  get selectionStrength() {
    let max = 0;
    if (this._enabledModes.has('env'))
      max = Math.max(max, parseInt(document.getElementById('env-strength')?.value ?? 60, 10) / 100);
    if (this._enabledModes.has('target'))
      max = Math.max(max, parseInt(document.getElementById('target-strength')?.value ?? 70, 10) / 100);
    if (this._enabledModes.has('predator'))
      max = Math.max(max, parseInt(document.getElementById('pred-strength')?.value ?? 65, 10) / 100);
    if (this._enabledModes.has('resource'))
      max = Math.max(max, parseInt(document.getElementById('resource-strength')?.value ?? 60, 10) / 100);
    if (this._enabledModes.has('epistasis'))
      max = Math.max(max, parseInt(document.getElementById('epistasis-strength')?.value ?? 40, 10) / 100);
    if (this._enabledModes.has('metabolic'))
      max = Math.max(max, parseInt(document.getElementById('metabolic-strength')?.value ?? 60, 10) / 100);
    return max;
  }

  get isPlayerMode() { return this._enabledModes.has('player'); }

  /** Wright-Fisher effective population size, or Infinity when drift is off. */
  get effectivePopSize() {
    if (!this._enabledModes.has('drift')) return Infinity;
    return parseInt(document.getElementById('drift-pop-size')?.value ?? 10, 10);
  }
}
