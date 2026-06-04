import { SelectionEngine } from '../selection/selectionEngine.js';
import { EnvironmentMode, ENVIRONMENTS } from '../selection/environmentMode.js';
import { TargetMode } from '../selection/targetMode.js';
import { PredatorMode } from '../selection/predatorMode.js';
import { Genome } from '../genome/genome.js';

/**
 * Selection panel — tabbed UI for the three selection modes.
 * Injects its DOM into #selection-panel-mount.
 * Exposes buildEngine() which returns a configured SelectionEngine.
 */
export class SelectionPanel {
  constructor({ onTargetPick }) {
    this.onTargetPick = onTargetPick; // called when "Pick from tree" is clicked
    this._activeTab   = 'none';
    this._targetMode  = new TargetMode();
    this._envMode     = new EnvironmentMode('deepSea');
    this._predMode    = null; // created on demand in buildEngine()

    this._mount = document.getElementById('selection-panel-mount');
    this._render();
    this._bind();
  }

  _render() {
    this._mount.innerHTML = `
      <section class="control-section selection-section">
        <h2>Selection pressure</h2>
        <div class="selection-tabs">
          <button class="tab-btn active" data-tab="none">None</button>
          <button class="tab-btn" data-tab="env">Environment</button>
          <button class="tab-btn" data-tab="target">Target</button>
          <button class="tab-btn" data-tab="predator">Predator</button>
          <button class="tab-btn" data-tab="player">Player</button>
        </div>

        <!-- None -->
        <div class="tab-content active" data-content="none">
          <p style="font-size:11px;color:var(--text-dim);">Pure drift — no fitness filtering.</p>
        </div>

        <!-- Environment -->
        <div class="tab-content" data-content="env">
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

        <!-- Target -->
        <div class="tab-content" data-content="target">
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

        <!-- Player -->
        <div class="tab-content" data-content="player">
          <p style="font-size:11px;color:var(--text-dim);">
            After each generation you choose which creatures survive.<br>
            Click a creature card to keep or cull it, then confirm.
          </p>
        </div>

        <!-- Predator -->
        <div class="tab-content" data-content="predator">
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
      </section>
    `;
  }

  _bind() {
    // Tab switching
    this._mount.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeTab = btn.dataset.tab;
        this._mount.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this._mount.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this._mount.querySelector(`[data-content="${this._activeTab}"]`).classList.add('active');
      });
    });

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
    // Show similarity to a new random genome as baseline indicator
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
   * Returns { engine, predatorMode } — predatorMode is non-null only in predator tab.
   */
  buildEngine(branchingFactor, mutationRate) {
    const modes = [];
    let predatorMode = null;

    if (this._activeTab === 'player') {
      // Artificial selection — no automatic engine needed
      return { engine: new SelectionEngine([]), predatorMode: null };
    }

    if (this._activeTab === 'env') {
      const strength = parseInt(document.getElementById('env-strength').value, 10) / 100;
      modes.push({ mode: this._envMode, strength });

    } else if (this._activeTab === 'target') {
      if (this._targetMode.target) {
        const strength = parseInt(document.getElementById('target-strength').value, 10) / 100;
        modes.push({ mode: this._targetMode, strength });
      }

    } else if (this._activeTab === 'predator') {
      const mv = parseInt(document.getElementById('pred-mutation').value, 10);
      const predRate = Math.round(0.001 * Math.pow(100, (mv - 1) / 99) * 1000) / 1000;
      predatorMode = new PredatorMode({
        mutationRate:    predRate,
        branchingFactor: branchingFactor,
      });
      predatorMode.init();
      const strength = parseInt(document.getElementById('pred-strength').value, 10) / 100;
      modes.push({ mode: predatorMode, strength });
    }

    const engine = modes.length > 0
      ? new SelectionEngine(modes)
      : new SelectionEngine([]);

    return { engine, predatorMode };
  }

  get activeTab() { return this._activeTab; }
}
