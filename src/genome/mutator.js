import { Genome, ALPHABET } from './genome.js';

export class Mutator {
  /**
   * @param {number} mutationRate  probability per character per copy (0–1)
   */
  constructor({ mutationRate = 0.01 } = {}) {
    this.mutationRate = mutationRate;
  }

  /** Returns a new Genome; the original is never modified. */
  mutate(genome) {
    const chars = [...genome.sequence];
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < this.mutationRate) {
        const others = ALPHABET.filter(c => c !== chars[i]);
        chars[i] = others[Math.floor(Math.random() * others.length)];
      }
    }
    return new Genome(chars.join(''));
  }

  /** Expected number of mutations per copy (informational). */
  get expectedMutations() {
    return Math.round(this.mutationRate * 120 * 10) / 10;
  }
}
