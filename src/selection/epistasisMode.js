/**
 * Epistasis Mode — pairwise gene interactions between body parts.
 *
 * Body part indices (0–14):
 *   0  Body core   1  Body hue    2  Body pattern  3  Head       4  Snout
 *   5  Eyes        6  Mouth       7  Cranial crest  8  L forelimb 9  R forelimb
 *  10  L hindlimb 11  R hindlimb 12  Dorsal        13  Tail      14  Markings
 *
 * Each rule returns a bonus (+) or penalty (−) delta.
 * Base score is 0.5 (neutral); deltas accumulate; result clamped to [0, 1].
 */

const RULES = [
  // Large body + all limbs stubby → locomotion penalty
  {
    check: g => {
      if (g.decode(0).gn > 0.6 &&
          g.decode(8).gn < 0.25 && g.decode(9).gn < 0.25 &&
          g.decode(10).gn < 0.25 && g.decode(11).gn < 0.25) return -0.25;
      return 0;
    },
  },
  // Long snout + many eyes → sensory predator synergy
  {
    check: g => {
      if (g.decode(4).gn > 0.6 && g.decode(5).gn > 0.5) return 0.20;
      return 0;
    },
  },
  // Sail dorsal + long tail → aquatic stability bonus
  {
    check: g => {
      if (g.decode(12).on > 0.5 && g.decode(13).gn > 0.5) return 0.20;
      return 0;
    },
  },
  // Tiny head + long snout → structural mismatch penalty
  {
    check: g => {
      if (g.decode(3).gn < 0.2 && g.decode(4).gn > 0.6) return -0.20;
      return 0;
    },
  },
  // Spiky crest + few eyes → intimidation-specialist bonus
  {
    check: g => {
      if (g.decode(7).gn > 0.6 && g.decode(5).gn < 0.2) return 0.15;
      return 0;
    },
  },
  // Wide mouth + no tail → inefficient locomotion penalty
  {
    check: g => {
      if (g.decode(6).gn > 0.6 && g.decode(13).gn < 0.15) return -0.15;
      return 0;
    },
  },
  // Symmetric fore + hind limbs → coordinated locomotion bonus
  {
    check: g => {
      const foreSym = Math.abs(g.decode(8).gn - g.decode(9).gn);
      const hindSym = Math.abs(g.decode(10).gn - g.decode(11).gn);
      if (foreSym < 0.1 && hindSym < 0.1) return 0.15;
      return 0;
    },
  },
  // Spines dorsal + powerful hindlimbs → defensive runner bonus
  {
    check: g => {
      if (g.decode(12).gn > 0.6 && g.decode(10).gn > 0.6 && g.decode(11).gn > 0.6) return 0.20;
      return 0;
    },
  },
];

export class EpistasisMode {
  /**
   * @param {import('../genome/genome.js').Genome} genome
   * @returns {number} 0–1
   */
  computeFitness(genome) {
    let score = 0.5;
    for (const rule of RULES) score += rule.check(genome);
    return Math.max(0, Math.min(1, score));
  }
}
