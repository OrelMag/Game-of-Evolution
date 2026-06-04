import { CreatureRenderer } from '../creature/renderer.js';
import { PART_NAMES } from '../creature/traits.js';
import { nameCreature } from '../creature/namer.js';

export class CreaturePanel {
  constructor({ onGotoParent, onSetTarget, onCompare, onExitCompare, onFindMRCA }) {
    this.onGotoParent  = onGotoParent;
    this.onSetTarget   = onSetTarget;
    this.onCompare     = onCompare;
    this.onExitCompare = onExitCompare;
    this.onFindMRCA    = onFindMRCA;
    this._renderer     = new CreatureRenderer();
    this._currentNode  = null;
    this._compareNodeA = null;
    this._compareNodeB = null;

    this._canvas        = document.getElementById('creature-canvas');
    this._detail        = document.getElementById('creature-detail');
    this._empty         = document.getElementById('creature-detail-empty');
    this._metaGen       = document.getElementById('meta-generation');
    this._metaFitness   = document.getElementById('meta-fitness');
    this._fitnessFill   = document.getElementById('fitness-bar-fill');
    this._genomeParts   = document.getElementById('genome-parts');
    this._btnParent     = document.getElementById('btn-goto-parent');
    this._btnSetTarget  = document.getElementById('btn-set-target');
    this._btnCopy       = document.getElementById('btn-copy-genome');
    this._btnShare      = document.getElementById('btn-share');
    this._nameEl        = document.getElementById('creature-name');
    this._btnCompare    = document.getElementById('btn-compare');
    this._comparePrompt = document.getElementById('compare-prompt');
    this._compareView   = document.getElementById('compare-view');

    this._btnParent.addEventListener('click', () => {
      if (this._currentNode?.parent) this.onGotoParent?.(this._currentNode.parent);
    });
    this._btnSetTarget.addEventListener('click', () => {
      if (this._currentNode) this.onSetTarget?.(this._currentNode.genome);
    });
    this._btnCopy?.addEventListener('click', () => this._copyGenome());
    this._btnShare?.addEventListener('click', () => this._shareCreature());
    this._btnCompare?.addEventListener('click', () => this.onCompare?.());
    document.getElementById('btn-exit-compare')?.addEventListener('click', () => this.onExitCompare?.());
    document.getElementById('btn-find-mrca')?.addEventListener('click', () => {
      if (this._compareNodeA && this._compareNodeB) {
        this.onFindMRCA?.(this._compareNodeA, this._compareNodeB);
      }
    });
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

  showComparePrompt() {
    this._btnCompare.textContent = 'Cancel';
    this._comparePrompt.classList.remove('hidden');
  }

  showCompare(nodeA, nodeB) {
    this._compareNodeA = nodeA;
    this._compareNodeB = nodeB;
    this._detail.classList.add('hidden');
    this._comparePrompt.classList.add('hidden');
    this._btnCompare.textContent = '⊕ Compare';

    this._compareView.classList.remove('hidden');
    document.getElementById('mrca-info').textContent = '';

    this._renderer.render(nodeA.genome, document.getElementById('compare-canvas-a'));
    this._renderer.render(nodeB.genome, document.getElementById('compare-canvas-b'));

    document.getElementById('compare-name-a').textContent = nameCreature(nodeA.genome);
    document.getElementById('compare-name-b').textContent = nameCreature(nodeB.genome);
    document.getElementById('compare-gen-a').textContent  = `Gen ${nodeA.generation}`;
    document.getElementById('compare-gen-b').textContent  = `Gen ${nodeB.generation}`;

    const hamming = nodeA.genome.hammingDistance(nodeB.genome);
    document.getElementById('compare-hamming').textContent      = `${hamming} / 120`;
    document.getElementById('compare-gen-gap').textContent      = Math.abs(nodeA.generation - nodeB.generation);
    document.getElementById('compare-fitness').textContent      =
      `${(nodeA.fitness * 100).toFixed(1)}% / ${(nodeB.fitness * 100).toFixed(1)}%`;
    document.getElementById('compare-relationship').textContent = _ancestorRelationship(nodeA, nodeB);

    this._renderCompareGenome(nodeA.genome, nodeB.genome);
  }

  showMRCAInfo(mrca, genDistA, genDistB) {
    const el = document.getElementById('mrca-info');
    if (!el) return;
    if (!mrca) {
      el.textContent = 'No common ancestor found';
      return;
    }
    el.textContent = `MRCA at Gen ${mrca.generation} (${genDistA} above A, ${genDistB} above B)`;
  }

  exitCompare() {
    this._compareView.classList.add('hidden');
    this._comparePrompt.classList.add('hidden');
    this._btnCompare.textContent = '⊕ Compare';
    this._compareNodeA = null;
    this._compareNodeB = null;
    if (this._currentNode) {
      this._detail.classList.remove('hidden');
      this._empty.classList.add('hidden');
    }
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

  _renderCompareGenome(genomeA, genomeB) {
    const container = document.getElementById('compare-genome-parts');
    container.innerHTML = '';
    for (let i = 0; i < 15; i++) {
      const subA = genomeA.getSubstring(i);
      const subB = genomeB.getSubstring(i);

      const row = document.createElement('div');
      row.className = 'compare-genome-part';

      const nameSpan = document.createElement('span');
      nameSpan.className   = 'compare-genome-part-name';
      nameSpan.textContent = PART_NAMES[i];

      const seqA = document.createElement('span');
      seqA.className = 'compare-genome-part-seq';
      const seqB = document.createElement('span');
      seqB.className = 'compare-genome-part-seq';

      for (let j = 0; j < 8; j++) {
        const cA = subA[j], cB = subB[j];
        const diff = cA !== cB;

        const spA = document.createElement('span');
        spA.className   = diff ? `${cA.toLowerCase()} letter-diff` : cA.toLowerCase();
        spA.textContent = cA;

        const spB = document.createElement('span');
        spB.className   = diff ? `${cB.toLowerCase()} letter-diff` : cB.toLowerCase();
        spB.textContent = cB;

        seqA.appendChild(spA);
        seqB.appendChild(spB);
      }

      row.appendChild(nameSpan);
      row.appendChild(seqA);
      row.appendChild(seqB);
      container.appendChild(row);
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

function _ancestorRelationship(nodeA, nodeB) {
  let cursor = nodeA.parent;
  while (cursor !== null) {
    if (cursor.id === nodeB.id) return 'B is ancestor of A';
    cursor = cursor.parent;
  }
  cursor = nodeB.parent;
  while (cursor !== null) {
    if (cursor.id === nodeA.id) return 'A is ancestor of B';
    cursor = cursor.parent;
  }
  return 'No direct ancestry';
}
