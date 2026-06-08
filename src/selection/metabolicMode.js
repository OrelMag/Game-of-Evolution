/**
 * Metabolic Mode — energy budget vs. cost of "expensive" traits.
 *
 * Big bodies, many eyes, long limbs, large tails/crests/dorsals and
 * bioluminescent glands all cost energy. Each organism has a fixed budget;
 * staying under it is free, exceeding it is penalised proportionally.
 *
 * Because the SelectionEngine multiplies modes, this creates genuine
 * trade-offs: a pressure that rewards a big body (e.g. Arctic) fights the
 * metabolic penalty, so fitness peaks at an intermediate body plan rather
 * than "max everything".
 *
 * Stays within the genome-only module boundary: cost is derived from
 * genome.decode() ratios, never from creature/decodeTraits().
 */

// Each entry: [partIndex, channel] contributing to metabolic cost.
// channel ∈ 'gn' | 'on' | 'dn'. All contributions are in [0,1].
const COST_TERMS = [
  [0, 'gn'],  // wide body
  [0, 'on'],  // tall body
  [5, 'gn'],  // many eyes
  [8, 'gn'],  // left forelimb length
  [9, 'gn'],  // right forelimb length
  [10, 'gn'], // left hindlimb length
  [11, 'gn'], // right hindlimb length
  [13, 'gn'], // tail length
  [7, 'on'],  // crest height
  [12, 'on'], // dorsal height
  [14, 'on'], // bioluminescent markings (glands are expensive)
];

export class MetabolicMode {
  /** @param {number} budget  energy budget as a fraction of max cost (0–1) */
  constructor({ budget = 0.4 } = {}) {
    this.budget = budget;
  }

  /**
   * @param {import('../genome/genome.js').Genome} genome
   * @returns {number} 0–1
   */
  computeFitness(genome) {
    let cost = 0;
    for (const [part, ch] of COST_TERMS) cost += genome.decode(part)[ch];
    const normCost = cost / COST_TERMS.length; // 0–1

    const budget = this.budget;
    if (normCost <= budget) return 1;
    // Over budget: linear penalty, reaching 0 when cost is maximal.
    const over = (normCost - budget) / (1 - budget || 1);
    return Math.max(0, 1 - over);
  }
}
