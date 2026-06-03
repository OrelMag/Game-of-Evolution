import { TOTAL_LENGTH } from '../genome/genome.js';

/**
 * Fitness Target Mode — creatures are scored by similarity to a target genome.
 * Fitness = 1 - (Hamming distance / TOTAL_LENGTH)
 * Identical genome → 1.0;  completely different → ~0.33 (random baseline).
 */
export class TargetMode {
  /** @param {import('../genome/genome.js').Genome} targetGenome */
  constructor(targetGenome = null) {
    this.target = targetGenome;
  }

  setTarget(genome) { this.target = genome; }

  /**
   * @param {import('../genome/genome.js').Genome} genome
   * @returns {number} 0–1
   */
  computeFitness(genome) {
    if (!this.target) return 1.0;
    const dist = genome.hammingDistance(this.target);
    return 1 - dist / TOTAL_LENGTH;
  }

  /** Normalised distance to the target (0 = identical, 1 = maximally different). */
  normalisedDistance(genome) {
    if (!this.target) return 0;
    return genome.hammingDistance(this.target) / TOTAL_LENGTH;
  }
}
