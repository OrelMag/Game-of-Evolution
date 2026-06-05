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
   * Mark nodes alive/dead based on fitness, selection strength, and effective
   * population size. Returns the surviving nodes (those that will reproduce).
   *
   * @param {import('../simulation/treeNode.js').TreeNode[]} nodes  current-gen nodes
   * @param {number} selectionStrength  0=no selection, 1=ruthless
   * @param {number} [effectivePopSize] Wright-Fisher cap — survivors are randomly
   *   subsampled down to this limit, modelling genetic drift. Default: Infinity.
   * @returns {import('../simulation/treeNode.js').TreeNode[]} survivors
   */
  applySelection(nodes, selectionStrength, effectivePopSize = Infinity) {
    let survivors;

    if (selectionStrength <= 0 || nodes.length <= 1) {
      nodes.forEach(n => { n.alive = true; });
      survivors = [...nodes];
    } else {
      // Normalise fitness within this cohort so the formula is scale-independent
      const maxFit = Math.max(...nodes.map(n => n.fitness));
      const minFit = Math.min(...nodes.map(n => n.fitness));
      const range  = maxFit - minFit || 1;

      // Each node gets an independent Bernoulli trial:
      //   P(survive) = 1 − strength × (1 − normFit)
      survivors = [];
      for (const node of nodes) {
        const normFit = (node.fitness - minFit) / range;
        const prob    = 1 - selectionStrength * (1 - normFit);
        node.alive    = Math.random() < prob;
        if (node.alive) survivors.push(node);
      }

      // Guarantee at least one survivor
      if (survivors.length === 0) {
        const best = nodes.reduce((a, b) => a.fitness > b.fitness ? a : b);
        best.alive = true;
        survivors.push(best);
      }
    }

    // Wright-Fisher sampling: randomly subsample survivors down to effectivePopSize.
    // This models genetic drift — alleles can fix or be lost purely by chance,
    // independent of fitness. Operates even when selectionStrength = 0.
    if (isFinite(effectivePopSize) && survivors.length > effectivePopSize) {
      survivors = _wfSample(survivors, effectivePopSize);
    }

    return survivors;
  }
}

// Fisher-Yates shuffle then slice — unbiased random subsampling (Wright-Fisher)
function _wfSample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  copy.slice(n).forEach(node => { node.alive = false; });
  return copy.slice(0, n);
}
