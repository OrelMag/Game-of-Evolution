import { CreatureRenderer } from '../creature/renderer.js';
import { PART_NAMES } from '../creature/traits.js';
import { nameCreature } from '../creature/namer.js';

export class CreaturePanel {
  constructor({ onGotoParent, onSetTarget }) {
    this.onGotoParent = onGotoParent;
    this.onSetTarget  = onSetTarget;
    this._renderer    = new CreatureRenderer();
    this._currentNode = null;

    this._canvas       = document.getElementById('creature-canvas');
    this._detail       = document.getElementById('creature-detail');
    this._empty        = document.getElementById('creature-detail-empty');
    this._metaGen      = document.getElementById('meta-generation');
    this._metaFitness  = document.getElementById('meta-fitness');
    this._fitnessFill  = document.getElementById('fitness-bar-fill');
    this._genomeParts  = document.getElementById('genome-parts');
    this._btnParent    = document.getElementById('btn-goto-parent');
    this._btnSetTarget = document.getElementById('btn-set-target');
    this._btnCopy      = document.getElementById('btn-copy-genome');
    this._btnShare     = document.getElementById('btn-share');
    this._nameEl       = document.getElementById('creature-name');

    this._btnParent.addEventListener('click', () => {
      if (this._currentNode?.parent) this.onGotoParent?.(this._currentNode.parent);
    });
    this._btnSetTarget.addEventListener('click', () => {
      if (this._currentNode) this.onSetTarget?.(this._currentNode.genome);
    });
    this._btnCopy?.addEventListener('click', () => this._copyGenome());
    this._btnShare?.addEventListener('click', () => this._shareCreature());
  }

  show(node) {
    this._currentNode = node;
    this._detail.classList.remove('hidden');
    this._empty.classList.add('hidden');

    this._renderer.render(node.genome, this._canvas);

    this._metaGen.textContent     = `Gen ${node.generation}`;
    const fitPct = (node.fitness * 100).toFixed(1) + '%';
    this._metaFitness.textContent = node.fitness < 1 ? fitPct : '—';
    this._fitnessFill.style.width = (node.fitness * 100).toFixed(1) + '%';

    if (this._nameEl) {
      this._nameEl.textContent = nameCreature(node.genome);
    }

    this._btnParent.disabled = !node.parent;
    this._renderGenome(node.genome);
  }

  _renderGenome(genome) {
    this._genomeParts.innerHTML = '';
    for (let i = 0; i < 15; i++) {
      const sub = genome.getSubstring(i);
      const row = document.createElement('div');
      row.className = 'genome-part';

      const nameSpan = document.createElement('span');
      nameSpan.className   = 'genome-part-name';
      nameSpan.textContent = PART_NAMES[i];

      const seqSpan = document.createElement('span');
      seqSpan.className = 'genome-part-seq';
      seqSpan.innerHTML = [...sub].map(c => `<span class="${c.toLowerCase()}">${c}</span>`).join('');

      row.appendChild(nameSpan);
      row.appendChild(seqSpan);
      this._genomeParts.appendChild(row);
    }
  }

  _copyGenome() {
    if (!this._currentNode) return;
    navigator.clipboard.writeText(this._currentNode.genome.sequence).then(() => {
      this._flash(this._btnCopy, 'Copied!');
    }).catch(() => {});
  }

  _shareCreature() {
    if (!this._currentNode) return;
    window.location.hash = '#g=' + this._currentNode.genome.sequence;
    navigator.clipboard.writeText(window.location.href).then(() => {
      this._flash(this._btnShare, 'Link copied!');
    }).catch(() => {});
  }

  _flash(btn, text) {
    const orig = btn.textContent;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = orig; }, 1800);
  }
}
