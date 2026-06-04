import { CreatureRenderer } from '../creature/renderer.js';

/**
 * Full-screen overlay that shows creature thumbnails after each generation.
 * Player clicks to keep (green ring) or reject (grey) each creature.
 * Resolves the promise with the surviving nodes when Confirm is clicked.
 */
export class VotingOverlay {
  constructor() {
    this._renderer = new CreatureRenderer();
    this._el       = document.getElementById('voting-overlay');
    this._grid     = document.getElementById('voting-grid');
    this._btnConfirm = document.getElementById('voting-confirm');
    this._genLabel = document.getElementById('voting-gen-label');
    this._kept = new Set();
  }

  /** Show the overlay for a set of new-generation nodes. Returns Promise<TreeNode[]>. */
  show(nodes) {
    return new Promise(resolve => {
      // By default all nodes are kept
      this._kept = new Set(nodes.map(n => n.id));

      if (this._genLabel && nodes.length > 0) {
        this._genLabel.textContent = `Generation ${nodes[0].generation} — click to keep or cull`;
      }

      this._grid.innerHTML = '';
      for (const node of nodes) {
        this._grid.appendChild(this._makeCard(node));
      }

      this._el.classList.remove('hidden');

      const onConfirm = () => {
        this._btnConfirm.removeEventListener('click', onConfirm);
        this._el.classList.add('hidden');

        const survivors = nodes.filter(n => this._kept.has(n.id));
        // Always keep at least one creature so the simulation can continue
        resolve(survivors.length > 0 ? survivors : [nodes[0]]);
      };
      this._btnConfirm.addEventListener('click', onConfirm);
    });
  }

  _makeCard(node) {
    const card = document.createElement('div');
    card.className = 'vote-card kept';
    card.dataset.id = node.id;

    // Creature thumbnail canvas
    const canvas = document.createElement('canvas');
    canvas.width  = 80;
    canvas.height = 98;
    this._renderer.render(node.genome, canvas);
    card.appendChild(canvas);

    // Fitness hint badge
    const badge = document.createElement('div');
    badge.className = 'vote-badge';
    badge.textContent = (node.fitness * 100).toFixed(0) + '%';
    badge.style.color = node.fitness >= 0.6 ? '#4ade80' : '#fb923c';
    card.appendChild(badge);

    // Toggle on click
    card.addEventListener('click', () => {
      if (this._kept.has(node.id)) {
        this._kept.delete(node.id);
        card.classList.replace('kept', 'culled');
      } else {
        this._kept.add(node.id);
        card.classList.replace('culled', 'kept');
      }
    });

    return card;
  }
}
