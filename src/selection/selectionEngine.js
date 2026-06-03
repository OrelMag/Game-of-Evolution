/**
 * Combines multiple selection modes into a single fitness score.
 * Modes are multiplied: fitness = ∏(mode_i fitness).
 * applySelection marks the weakest nodes as alive=false so they won't reproduce.
 */
export class SelectionEngine {
  constructor(modes = []) {
    // modes: array of { mode: SelectionMode, strength: 0–1 }
    this.modes = modes;
  }

  /**
   * Compute combined fitness for a single node.
   * @param {import('../simulation/treeNode.js').TreeNode} node
   * @param {import('../simulation/treeNode.js').TreeNode[]} allNodes
   * @param {number} generation
   * @returns {number} 0–1
   */
  computeFitness(node, allNodes, generation) {
    if (this.modes.length === 0) return 1.0;

    let fitness = 1.0;
    for (const { mode, strength } of this.modes) {
      if (strength <= 0) continue;
      const mf = mode.computeFitness(node.genome, allNodes, generation);
      // Blend: no-selection (1.0) at strength=0, full mode fitness at strength=1
      fitness *= (1.0 - strength) + strength * mf;
    }
    return Math.max(0, Math.min(1, fitness));
  }

  /**
   * Mark nodes alive/dead based on fitness and selection strength.
   * Returns the surviving nodes (those that will reproduce).
   *
   * @param {import('../simulation/treeNode.js').TreeNode[]} nodes  current-gen nodes
   * @param {number} selectionStrength  0=no selection, 1=ruthless
   * @returns {import('../simulation/treeNode.js').TreeNode[]} survivors
   */
  applySelection(nodes, selectionStrength) {
    if (selectionStrength <= 0 || nodes.length <= 1) {
      nodes.forEach(n => { n.alive = true; });
      return nodes;
    }

    // Sort by fitness descending
    const sorted = [...nodes].sort((a, b) => b.fitness - a.fitness);

    // Survival fraction: at strength=1 only top 30% survive; at strength=0.5 top 65%
    const survivalRate = 1 - selectionStrength * 0.7;
    const survivors = Math.max(1, Math.ceil(sorted.length * survivalRate));

    for (let i = 0; i < sorted.length; i++) {
      sorted[i].alive = i < survivors;
    }

    return sorted.filter(n => n.alive);
  }
}
