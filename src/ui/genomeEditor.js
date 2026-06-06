import { CreatureRenderer } from '../creature/renderer.js';
import { Genome, ALPHABET, PART_COUNT, PART_LENGTH } from '../genome/genome.js';
import { PART_NAMES } from '../creature/traits.js';

const ALLELES = new Set(['G', 'O', 'D']);

function randomPart() {
  return Array.from({ length: PART_LENGTH },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');
}

export class GenomeEditor {
  constructor() {
    this._renderer = new CreatureRenderer();
    this._parts = Array(PART_COUNT).fill(null).map(randomPart);
    this._resolve = null;
    this._debounceTimer = null;
    this._inputs = [];
    this._applyBtn = null;
    this._fullDisplay = null;
    this._canvas = null;
    this._overlay = null;
    this._buildDOM();
  }

  show(genome) {
    this._loadGenome(genome);
    this._overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    return new Promise(resolve => { this._resolve = resolve; });
  }

  _hide() {
    this._overlay.classList.add('hidden');
    document.body.style.overflow = '';
    clearTimeout(this._debounceTimer);
  }

  _loadGenome(genome) {
    for (let i = 0; i < PART_COUNT; i++) {
      this._parts[i] = genome.getSubstring(i);
      const inp = this._inputs[i];
      inp.value = this._parts[i];
      inp.removeAttribute('data-invalid');
    }
    this._updateFullDisplay();
    this._updateApplyState();
    this._renderPreview();
  }

  _buildDOM() {
    const overlay = document.createElement('div');
    overlay.className = 'genome-editor-overlay hidden';

    const modal = document.createElement('div');
    modal.className = 'genome-editor-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'genome-editor-header';
    const title = document.createElement('h2');
    title.textContent = 'Edit Initial Creature';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'genome-editor-close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Cancel';
    closeBtn.addEventListener('click', () => this._cancel());
    header.append(title, closeBtn);

    // Body: preview + parts list
    const body = document.createElement('div');
    body.className = 'genome-editor-body';

    // Preview side
    const previewCol = document.createElement('div');
    previewCol.className = 'genome-editor-preview';
    const canvas = document.createElement('canvas');
    canvas.width  = 240;
    canvas.height = 292;
    this._canvas = canvas;
    const previewLabel = document.createElement('div');
    previewLabel.className = 'genome-editor-preview-label';
    previewLabel.textContent = 'Live preview';
    previewCol.append(canvas, previewLabel);

    // Parts list side
    const partsCol = document.createElement('div');
    partsCol.className = 'genome-editor-parts';

    for (let i = 0; i < PART_COUNT; i++) {
      const row = document.createElement('div');
      row.className = 'genome-part-row';

      const label = document.createElement('label');
      label.className = 'genome-part-label';
      label.textContent = PART_NAMES[i];
      label.htmlFor = `ge-part-${i}`;

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = `ge-part-${i}`;
      inp.className = 'part-input';
      inp.maxLength = PART_LENGTH;
      inp.spellcheck = false;
      inp.autocomplete = 'off';
      inp.value = this._parts[i];
      this._inputs[i] = inp;

      inp.addEventListener('input', () => this._onPartInput(i, inp.value));
      inp.addEventListener('keydown', e => {
        // Allow only G, O, D, backspace, delete, arrows, etc.
        if (e.key.length === 1 && !ALLELES.has(e.key.toUpperCase())) {
          e.preventDefault();
        }
      });

      const randBtn = document.createElement('button');
      randBtn.className = 'part-rand-btn';
      randBtn.textContent = '↺';
      randBtn.title = `Randomize ${PART_NAMES[i]}`;
      randBtn.addEventListener('click', () => this._randomizePart(i));

      row.append(label, inp, randBtn);
      partsCol.appendChild(row);
    }

    // Full genome display
    const fullRow = document.createElement('div');
    fullRow.className = 'genome-full-row';
    const fullLabel = document.createElement('span');
    fullLabel.className = 'genome-full-label';
    fullLabel.textContent = 'Full genome:';
    const fullDisplay = document.createElement('pre');
    fullDisplay.className = 'genome-display';
    this._fullDisplay = fullDisplay;
    fullRow.append(fullLabel, fullDisplay);
    partsCol.appendChild(fullRow);

    body.append(previewCol, partsCol);

    // Footer actions
    const footer = document.createElement('div');
    footer.className = 'genome-editor-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this._cancel());

    const randAllBtn = document.createElement('button');
    randAllBtn.className = 'btn btn-secondary';
    randAllBtn.textContent = '↺ Randomize All';
    randAllBtn.addEventListener('click', () => this._randomizeAll());

    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => this._apply());
    this._applyBtn = applyBtn;

    footer.append(cancelBtn, randAllBtn, applyBtn);

    modal.append(header, body, footer);
    overlay.appendChild(modal);

    // Close on backdrop click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) this._cancel();
    });

    document.body.appendChild(overlay);
    this._overlay = overlay;
  }

  _onPartInput(index, rawValue) {
    const clean = rawValue.toUpperCase().replace(/[^GOD]/g, '').slice(0, PART_LENGTH);
    this._parts[index] = clean;
    const inp = this._inputs[index];
    // Sync the cleaned value back without losing cursor position by only updating if changed
    if (inp.value.toUpperCase().replace(/[^GOD]/g, '').slice(0, PART_LENGTH) !== clean) {
      inp.value = clean;
    }
    if (clean.length === PART_LENGTH) {
      inp.removeAttribute('data-invalid');
    } else {
      inp.setAttribute('data-invalid', '');
    }
    this._updateFullDisplay();
    this._updateApplyState();
    this._schedulePreview();
  }

  _randomizePart(index) {
    this._parts[index] = randomPart();
    const inp = this._inputs[index];
    inp.value = this._parts[index];
    inp.removeAttribute('data-invalid');
    this._updateFullDisplay();
    this._updateApplyState();
    this._schedulePreview();
  }

  _randomizeAll() {
    for (let i = 0; i < PART_COUNT; i++) {
      this._parts[i] = randomPart();
      this._inputs[i].value = this._parts[i];
      this._inputs[i].removeAttribute('data-invalid');
    }
    this._updateFullDisplay();
    this._updateApplyState();
    this._schedulePreview();
  }

  _updateFullDisplay() {
    this._fullDisplay.textContent = this._parts.join('');
  }

  _updateApplyState() {
    const allValid = this._parts.every(p => p.length === PART_LENGTH);
    this._applyBtn.disabled = !allValid;
  }

  _schedulePreview() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._renderPreview(), 50);
  }

  _renderPreview() {
    if (!this._parts.every(p => p.length === PART_LENGTH)) return;
    try {
      const genome = new Genome(this._parts.join(''));
      this._renderer.render(genome, this._canvas);
    } catch (_) {
      // invalid genome mid-edit — skip render
    }
  }

  _apply() {
    if (this._parts.some(p => p.length !== PART_LENGTH)) return;
    const genome = new Genome(this._parts.join(''));
    this._hide();
    this._resolve(genome);
  }

  _cancel() {
    this._hide();
    this._resolve(null);
  }
}
