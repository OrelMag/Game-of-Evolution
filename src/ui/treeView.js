import { CreatureRenderer } from '../creature/renderer.js';

const NODE_R   = 28;   // circle radius
const GEN_GAP  = 130;  // horizontal px between generations
const NODE_GAP = 72;   // minimum vertical px between nodes

export class TreeView {
  constructor({ svgId, nodesGroupId, edgesGroupId, isPredator = false, onSelect }) {
    this.svg        = document.getElementById(svgId);
    this.nodesGroup = document.getElementById(nodesGroupId);
    this.edgesGroup = document.getElementById(edgesGroupId);
    this.isPredator = isPredator;
    this.onSelect   = onSelect;

    this._renderer   = new CreatureRenderer();
    this._transform  = { x: 60, y: 40, scale: 1 };
    this._selectedId = null;
    this._positions  = new Map();

    this._bindPanZoom();
  }

  /** Render the entire tree rooted at `root`. */
  render(root) {
    this._positions = new Map();
    _layoutTree(root, this._positions);

    this.nodesGroup.innerHTML = '';
    this.edgesGroup.innerHTML = '';

    root.walkBFS(node => {
      if (node.parent) this._drawEdge(node);
      this._drawNode(node);
    });

    this._applyTransform();
    document.getElementById('tree-empty-msg')?.classList.add('hidden');
  }

  /**
   * Incrementally add a new generation to the already-rendered tree.
   * Re-layouts the full tree (positions may shift as the tree grows),
   * updates existing node positions, redraws all edges, and appends
   * new nodes with a fade-in animation.
   */
  addGeneration(root, newNodes) {
    const newPositions = new Map();
    _layoutTree(root, newPositions);

    // Move existing nodes to updated positions
    for (const [nodeId, pos] of newPositions) {
      const g = this.svg.querySelector(`[data-id="${nodeId}"]`);
      if (g) g.setAttribute('transform', `translate(${pos.x},${pos.y})`);
    }

    this._positions = newPositions;

    // Redraw all edges (parent positions may have shifted)
    this.edgesGroup.innerHTML = '';
    root.walkBFS(node => { if (node.parent) this._drawEdge(node); });

    // Append new nodes with enter animation
    for (const node of newNodes) {
      const g = this._drawNode(node);
      if (g) g.classList.add('node-entering');
    }

    document.getElementById('tree-empty-msg')?.classList.add('hidden');
  }

  /**
   * Redraw specific nodes in-place (used after alive/dead status changes).
   */
  refreshNodes(nodes) {
    for (const node of nodes) {
      const existing = this.svg.querySelector(`[data-id="${node.id}"]`);
      if (existing) existing.remove();
      this._drawNode(node);
    }
  }

  clear() {
    this.nodesGroup.innerHTML = '';
    this.edgesGroup.innerHTML = '';
    document.getElementById('tree-empty-msg')?.classList.remove('hidden');
  }

  selectNode(id) {
    if (this._selectedId !== null) {
      const prev = this.svg.querySelector(`[data-id="${this._selectedId}"] .node-ring`);
      if (prev) prev.classList.remove('selected');
    }
    this._selectedId = id;
    const ring = this.svg.querySelector(`[data-id="${id}"] .node-ring`);
    if (ring) ring.classList.add('selected');
  }

  // ── Private ──────────────────────────────────────────────────────────

  /** Draws and appends a node group. Returns the group element. */
  _drawNode(node) {
    const pos = this._positions.get(node.id);
    if (!pos) return null;
    const { x, y } = pos;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'tree-node-group');
    g.setAttribute('data-id', node.id);
    g.setAttribute('transform', `translate(${x},${y})`);

    const tw = NODE_R * 2 - 4;
    const th = Math.round(tw * 390 / 320);
    const thumb = this._renderer.thumbnail(node.genome, tw);
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', thumb);
    img.setAttribute('x', -(tw / 2));
    img.setAttribute('y', -(th / 2));
    img.setAttribute('width', tw);
    img.setAttribute('height', th);
    img.setAttribute('clip-path', `circle(${NODE_R - 3}px at center)`);
    g.appendChild(img);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', NODE_R);
    circle.setAttribute('class',
      `node-ring ${node.alive ? 'alive' : 'dead'} ${this.isPredator ? 'predator-ring' : ''}`
    );
    g.appendChild(circle);

    if (!node.alive) {
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      overlay.setAttribute('r', NODE_R - 1);
      overlay.setAttribute('class', 'node-dead-overlay');
      g.appendChild(overlay);
    }

    if (node.fitness < 1) {
      const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      badge.setAttribute('y', NODE_R + 11);
      badge.setAttribute('text-anchor', 'middle');
      badge.setAttribute('font-size', '9');
      badge.setAttribute('fill', node.fitness > 0.6 ? '#4ade80' : '#fb923c');
      badge.textContent = (node.fitness * 100).toFixed(0) + '%';
      g.appendChild(badge);
    }

    // Crossover second-parent indicator (small ✕ badge)
    if (node.secondParent) {
      const xmark = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      xmark.setAttribute('x', NODE_R - 8);
      xmark.setAttribute('y', -(NODE_R - 10));
      xmark.setAttribute('font-size', '9');
      xmark.setAttribute('fill', '#a78bfa');
      xmark.textContent = '✕';
      g.appendChild(xmark);
    }

    g.addEventListener('click', () => {
      this.selectNode(node.id);
      this.onSelect?.(node);
    });

    this.nodesGroup.appendChild(g);
    return g;
  }

  _drawEdge(node) {
    const { x: x2, y: y2 } = this._positions.get(node.id);
    const { x: x1, y: y1 } = this._positions.get(node.parent.id);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const cpX = (x1 + x2) / 2;
    path.setAttribute('d', `M${x1},${y1} C${cpX},${y1} ${cpX},${y2} ${x2},${y2}`);
    path.setAttribute('class',
      `tree-edge ${!node.alive ? 'dead' : ''} ${this.isPredator ? 'predator' : ''}`
    );
    this.edgesGroup.appendChild(path);
  }

  // ── Zoom / Pan ────────────────────────────────────────────────────────

  _applyTransform() {
    const rg = this.svg.querySelector('[id$="-root-group"], #tree-root-group, #predator-root-group');
    if (rg) {
      rg.setAttribute('transform',
        `translate(${this._transform.x},${this._transform.y}) scale(${this._transform.scale})`
      );
    }
  }

  _bindPanZoom() {
    let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;

    this.svg.addEventListener('mousedown', e => {
      if (e.target.closest('.tree-node-group')) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      origX = this._transform.x; origY = this._transform.y;
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      this._transform.x = origX + (e.clientX - startX);
      this._transform.y = origY + (e.clientY - startY);
      this._applyTransform();
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    this.svg.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = this.svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this._transform.x = mx + (this._transform.x - mx) * factor;
      this._transform.y = my + (this._transform.y - my) * factor;
      this._transform.scale = Math.max(0.2, Math.min(4, this._transform.scale * factor));
      this._applyTransform();
    }, { passive: false });
  }
}

// ── Tree layout (simplified Reingold-Tilford) ─────────────────────────────

function _layoutTree(root, posMap) {
  const gens = [];
  root.walkBFS(node => {
    if (!gens[node.generation]) gens[node.generation] = [];
    gens[node.generation].push(node);
  });
  for (let g = 0; g < gens.length; g++) {
    const nodes = gens[g];
    const totalH = (nodes.length - 1) * NODE_GAP;
    for (let i = 0; i < nodes.length; i++) {
      posMap.set(nodes[i].id, {
        x: g * GEN_GAP,
        y: i * NODE_GAP - totalH / 2,
      });
    }
  }
}
