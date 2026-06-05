import { SelectionEngine } from '../selection/selectionEngine.js';
import { EnvironmentMode, ENVIRONMENTS } from '../selection/environmentMode.js';
import { TargetMode } from '../selection/targetMode.js';
import { PredatorMode } from '../selection/predatorMode.js';
import { ResourceMode } from '../selection/resourceMode.js';
import { EpistasisMode } from '../selection/epistasisMode.js';
import { Genome } from '../genome/genome.js';

/**
 * Selection panel — accordion UI allowing multiple simultaneous selection modes.
 * Injects its DOM into #selection-panel-mount.
 * Exposes buildEngine() which returns a configured SelectionEngine.
 */
export class SelectionPanel {
  constructor({ onTargetPick }) {
    this.onTargetPick  = onTargetPick;
    this._enabledModes  = new Set();
    this._targetMode    = new TargetMode();
    this._envMode       = new EnvironmentMode('deepSea');
    this._resourceMode  = new ResourceMode();
    this._epistasisMode = new EpistasisMode();

    this._mount = document.getElementById('selection-panel-mount');
    this._render();
    this._bind();
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
            <select class="env-select" id="env-select">
              ${Object.entries(ENVIRONMENTS).map(([k, v]) =>
                `<option value="${k}">${v.label}</option>`
              ).join('')}
            </select>
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
              A second lineage evolves to track prey. Prey evolves to evade.<br>
              <span style="color:var(--red);">Red tree</span> = predator.
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
              Creatures with similar genomes compete for the same niche.<br>
              Crowded niches reduce fitness.
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
              Gene interactions: compatible body plans score bonuses;<br>
              mismatched morphologies are penalised.
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
            <input type="checkbox" id="chk-drift" />
            <span>Genetic drift</span>
          </label>
          <div class="sel-section-body hidden" id="sel-body-drift">
            <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
              Limits survivors each generation via random sampling (Wright-Fisher).<br>
              Alleles can fix or vanish purely by chance, independent of fitness.
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
              After each generation you choose which creatures survive.<br>
              Click a creature card to keep or cull it, then confirm.
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

    // Environment select
    document.getElementById('env-select')?.addEventListener('change', e => {
      this._envMode.setEnvironment(e.target.value);
    });
    document.getElementById('env-strength')?.addEventListener('input', e => {
      document.getElementById('val-env-strength').textContent = e.target.value + '%';
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
      const strength = parseInt(document.getElementById('env-strength').value, 10) / 100;
      modes.push({ mode: this._envMode, strength });
    }

    if (this._enabledModes.has('target') && this._targetMode.target) {
      const strength = parseInt(document.getElementById('target-strength').value, 10) / 100;
      modes.push({ mode: this._targetMode, strength });
    }

    if (this._enabledModes.has('predator')) {
      const mv = parseInt(document.getElementById('pred-mutation').value, 10);
      const predRate = Math.round(0.001 * Math.pow(100, (mv - 1) / 99) * 1000) / 1000;
      predatorMode = new PredatorMode({ mutationRate: predRate, branchingFactor });
      predatorMode.init();
      const strength = parseInt(document.getElementById('pred-strength').value, 10) / 100;
      modes.push({ mode: predatorMode, strength });
    }

    if (this._enabledModes.has('resource')) {
      const strength = parseInt(document.getElementById('resource-strength').value, 10) / 100;
      modes.push({ mode: this._resourceMode, strength });
    }

    if (this._enabledModes.has('epistasis')) {
      const strength = parseInt(document.getElementById('epistasis-strength').value, 10) / 100;
      modes.push({ mode: this._epistasisMode, strength });
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
    return max;
  }

  get isPlayerMode() { return this._enabledModes.has('player'); }

  /** Wright-Fisher effective population size, or Infinity when drift is off. */
  get effectivePopSize() {
    if (!this._enabledModes.has('drift')) return Infinity;
    return parseInt(document.getElementById('drift-pop-size')?.value ?? 10, 10);
  }
}
