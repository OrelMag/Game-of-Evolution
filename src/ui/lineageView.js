import { LineageTracer } from '../simulation/lineageTracer.js';
import { CreatureRenderer } from '../creature/renderer.js';

export class LineageView {
  constructor({ containerId, onSelect, onComplete }) {
    this.onSelect   = onSelect;
    this.onComplete = onComplete;

    this._renderer      = new CreatureRenderer();
    this._tracer        = null;
    this._generator     = null;
    this._rafId         = null;
    this._renderedCount = 0;
    this._selectedId    = null;
    this._compareMode   = false;
    this._compareSnap   = null;

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    this._progressWrap = this._el('div', 'trace-progress-wrap hidden');
    this._progressBar  = this._el('div', 'trace-progress-bar');
    this._progressWrap.appendChild(this._progressBar);

    this._status = this._el('div', 'trace-status', 'Configure parameters and click ▶ Run Trace.');

    this._filmstrip = this._el('div', 'trace-filmstrip');

    container.append(this._progressWrap, this._status, this._filmstrip);
  }

  startTrace({ startGenome, generations, snapshotCount, mutationRate, mutationMode,
               transpositionRate, inversionRate, selectionEngine }) {
    this._cancelRaf();

    const sampleEvery = Math.max(1, Math.floor(generations / Math.max(1, snapshotCount)));

    this._tracer = new LineageTracer({
      startGenome, generations, mutationRate, mutationMode,
      transpositionRate, inversionRate, sampleEvery, selectionEngine,
    });

    this._generator     = this._tracer.runGenerator(1000);
    this._renderedCount = 0;
    this._selectedId    = null;
    this._filmstrip.innerHTML = '';

    this._progressWrap.classList.remove('hidden');
    this._progressBar.style.width = '0%';
    this._status.textContent = 'Running…';

    this._rafId = requestAnimationFrame(() => this._tick());
  }

  enterCompareMode(snap) {
    this._compareMode = true;
    this._compareSnap = snap;
    this._filmstrip.querySelector(`[data-id="${snap.id}"]`)?.classList.add('compare-a');
  }

  exitCompareMode() {
    this._filmstrip.querySelectorAll('.trace-thumb.compare-a')
      .forEach(c => c.classList.remove('compare-a'));
    this._compareMode = false;
    this._compareSnap = null;
  }

  stopTrace() {
    this._tracer?.stop();
    this._cancelRaf();
    this._progressWrap.classList.add('hidden');
    this._status.textContent = `Stopped at generation ${this._tracer?._currentGen ?? '?'}.`;
  }

  _tick() {
    const result = this._generator.next();
    if (result.done || this._tracer.isDone) {
      this._updateFilmstrip(this._tracer.snapshots);
      this._finalizeFilmstrip(this._tracer.snapshots);
      return;
    }

    const { progress, snapshots } = result.value;
    this._progressBar.style.width = `${(progress * 100).toFixed(1)}%`;
    this._updateFilmstrip(snapshots);
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  _updateFilmstrip(snapshots) {
    for (let i = this._renderedCount; i < snapshots.length; i++) {
      const snap = snapshots[i];
      const card = this._el('div', 'trace-thumb');
      card.dataset.id = snap.id;

      const img = document.createElement('img');
      img.src    = this._renderer.thumbnail(snap.genome, 56);
      img.width  = 56;
      img.height = Math.round(56 * (390 / 320));

      const label = this._el('span', 'trace-thumb-label', `Gen ${snap.generation}`);

      if (snap.fitness < 1.0) {
        const fit = this._el('span', 'trace-thumb-fitness', `${(snap.fitness * 100).toFixed(0)}%`);
        card.append(img, label, fit);
      } else {
        card.append(img, label);
      }

      card.addEventListener('click', () => this._selectCard(card, snap));
      this._filmstrip.appendChild(card);
    }
    this._renderedCount = snapshots.length;
  }

  _finalizeFilmstrip(snapshots) {
    this._progressWrap.classList.add('hidden');
    this._status.textContent = `Trace complete — ${snapshots.length} snapshots over ${snapshots.at(-1)?.generation ?? 0} generations.`;
    this.onComplete?.();
  }

  _selectCard(card, snap) {
    this._filmstrip.querySelectorAll('.trace-thumb.selected')
      .forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    this._selectedId = snap.id;
    this.onSelect?.(snap);
  }

  _cancelRaf() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _el(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
}
