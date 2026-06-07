/**
 * Logistic population regulation: carrying capacity + density-dependent,
 * fitness-weighted, age-structured survival.
 *
 * Pure data/logic — no UI, no rendering imports.
 *
 * Each tick the simulation assembles the combined living population (aged
 * adults + new offspring) and calls regulate(). Survival probability is:
 *
 *     P(survive) = crowding × fitnessTerm × ageTerm
 *
 *   crowding    = min(1, K / N)               — density feedback → logistic curve
 *   fitnessTerm = 1 − strength × (1 − normFit) — same blend as SelectionEngine
 *   ageTerm     = senescence factor in [0, 1] — declines toward end of lifespan
 *
 * As N exceeds K, crowding shrinks and more individuals die, pushing N back
 * toward K. Below K, crowding ≈ 1 so the population rebounds. The result is a
 * self-regulating population that plateaus near the carrying capacity.
 */
export class PopulationDynamics {
  /**
   * @param {object} opts
   * @param {number} opts.carryingCapacity  K — target standing population
   * @param {number} opts.longevity         max age in ticks (1 ⇒ non-overlapping generations)
   * @param {number} opts.fecundity         offspring per mature adult per tick
   * @param {number} [opts.matureAge]       min age to reproduce (0 ⇒ reproduce from birth tick)
   * @param {number} [opts.senescenceStart] age at which survival starts declining
   */
  constructor({ carryingCapacity, longevity, fecundity, matureAge = 0, senescenceStart = null }) {
    this.carryingCapacity = Math.max(1, carryingCapacity);
    this.longevity        = Math.max(1, longevity);
    this.fecundity        = Math.max(1, fecundity);
    this.matureAge        = matureAge;
    // Default: senescence kicks in halfway through the lifespan.
    this.senescenceStart  = senescenceStart ?? Math.max(this.matureAge, Math.floor(this.longevity * 0.5));
  }

  /** True if an adult of this age is old enough to reproduce. */
  isMature(age) { return age >= this.matureAge; }

  /**
   * Age-related survival multiplier in [0, 1].
   *  - longevity ≤ 1: any survivor dies after reproducing once (non-overlapping).
   *  - full survival until senescenceStart, then linear decline to 0 at longevity.
   */
  ageTerm(age) {
    if (this.longevity <= 1) return age >= 1 ? 0 : 1;
    if (age >= this.longevity) return 0;
    if (age <= this.senescenceStart) return 1;
    return (this.longevity - age) / (this.longevity - this.senescenceStart);
  }

  /**
   * Apply mortality to the combined living population in two stages, then
   * return the survivors. Mutates each node's `alive` flag.
   *
   *   1. Intrinsic, density-INdependent mortality (age + fitness) — drives
   *      turnover: old and unfit individuals die regardless of crowding.
   *   2. Density regulation — if more than K individuals remain, randomly thin
   *      down to the carrying capacity (drift-style mortality from crowding).
   *
   * Capping to K in stage 2 (rather than scaling survival by K/N) avoids the
   * single-step overshoot that a naive density term produces when the
   * population is far below K, so the population saturates smoothly at K.
   *
   * @param {import('./treeNode.js').TreeNode[]} combined  aged adults + new offspring
   * @param {number} selectionStrength  0 = fitness ignored, 1 = ruthless
   * @returns {import('./treeNode.js').TreeNode[]} survivors (next tick's adults)
   */
  regulate(combined, selectionStrength = 0) {
    const N = combined.length;
    if (N === 0) return [];

    // Stage 1 — intrinsic mortality. Normalise fitness within the cohort so the
    // blend is scale-independent (mirrors SelectionEngine.applySelection).
    const maxFit = Math.max(...combined.map(n => n.fitness));
    const minFit = Math.min(...combined.map(n => n.fitness));
    const range  = maxFit - minFit || 1;

    let viable = [];
    for (const node of combined) {
      const normFit     = (node.fitness - minFit) / range;
      const fitnessTerm = 1 - selectionStrength * (1 - normFit);
      const prob        = fitnessTerm * this.ageTerm(node.age);
      node.alive        = Math.random() < prob;
      if (node.alive) viable.push(node);
    }

    // Stage 2 — density cap. Random thinning to K models crowding mortality
    // that is independent of fitness (already applied above).
    let survivors = viable;
    if (viable.length > this.carryingCapacity) {
      survivors = _thinTo(viable, this.carryingCapacity);
    }

    // Guarantee at least one survivor — prefer the fittest individual still
    // within its lifespan, falling back to the fittest overall.
    if (survivors.length === 0) {
      const fresh = combined.filter(n => this.ageTerm(n.age) > 0);
      const pool  = fresh.length > 0 ? fresh : combined;
      const best  = pool.reduce((a, b) => (a.fitness > b.fitness ? a : b));
      best.alive = true;
      survivors.push(best);
    }

    return survivors;
  }
}

// Fisher-Yates shuffle then slice — unbiased random thinning. Marks the
// removed nodes alive=false so the tree shows them as crowding casualties.
function _thinTo(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  copy.slice(n).forEach(node => { node.alive = false; });
  return copy.slice(0, n);
}
