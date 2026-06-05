import { Genome, ALPHABET, TOTAL_LENGTH, PART_COUNT, PART_LENGTH } from './genome.js';

export class Mutator {
  /**
   * @param {object} opts
   * @param {number}   opts.mutationRate      per-position substitution probability
   * @param {number}   opts.transpositionRate per-genome segment-swap probability
   * @param {number}   opts.inversionRate     per-genome part-inversion probability
   * @param {number[]|null} opts.partRates    optional 15-element array of per-part rate
   *                                          multipliers (e.g. [3,3,1,...] for hotspot parts)
   */
  constructor({ mutationRate = 0.01, transpositionRate = 0, inversionRate = 0, partRates = null } = {}) {
    this.mutationRate      = mutationRate;
    this.transpositionRate = transpositionRate;
    this.inversionRate     = inversionRate;
    this.partRates         = partRates; // null = uniform across all parts
  }

  mutate(genome) {
    const chars = [...genome.sequence];
    for (let i = 0; i < chars.length; i++) {
      const part = Math.floor(i / PART_LENGTH);
      const rate = this.mutationRate * (this.partRates ? this.partRates[part] : 1.0);
      if (Math.random() < rate) {
        const others = ALPHABET.filter(c => c !== chars[i]);
        chars[i] = others[Math.floor(Math.random() * others.length)];
      }
    }
    return new Genome(chars.join(''));
  }

  // Reverses the 8-char substring of a randomly chosen body part
  invertGene(genome) {
    const partIndex = Math.floor(Math.random() * PART_COUNT);
    const start = partIndex * PART_LENGTH;
    const chars = [...genome.sequence];
    const sub = chars.slice(start, start + PART_LENGTH).reverse();
    chars.splice(start, PART_LENGTH, ...sub);
    return new Genome(chars.join(''));
  }

  // Picks two random distinct part indices and swaps their 8-char substrings
  swapSegments(genome) {
    const idxA = Math.floor(Math.random() * PART_COUNT);
    let idxB = Math.floor(Math.random() * (PART_COUNT - 1));
    if (idxB >= idxA) idxB++;
    const chars = [...genome.sequence];
    const a = chars.slice(idxA * PART_LENGTH, (idxA + 1) * PART_LENGTH);
    const b = chars.slice(idxB * PART_LENGTH, (idxB + 1) * PART_LENGTH);
    chars.splice(idxA * PART_LENGTH, PART_LENGTH, ...b);
    chars.splice(idxB * PART_LENGTH, PART_LENGTH, ...a);
    return new Genome(chars.join(''));
  }

  // Apply mode-based mutation then independently stack transposition/inversion events
  mutateAll(genome, mode = 'point') {
    let g = this.mutateWithMode(genome, mode);
    if (this.transpositionRate > 0 && Math.random() < this.transpositionRate) g = this.swapSegments(g);
    if (this.inversionRate     > 0 && Math.random() < this.inversionRate)     g = this.invertGene(g);
    return g;
  }

  // mode: 'point' | 'inversion' | 'swap' | 'mixed'
  mutateWithMode(genome, mode = 'point') {
    switch (mode) {
      case 'inversion': return this.invertGene(genome);
      case 'swap':      return this.swapSegments(genome);
      case 'mixed': {
        const r = Math.random();
        if (r < 0.34) return this.mutate(genome);
        if (r < 0.67) return this.invertGene(genome);
        return this.swapSegments(genome);
      }
      default: return this.mutate(genome);
    }
  }

  // Single-point crossover: genomeA[:point] + genomeB[point:]
  crossover(genomeA, genomeB) {
    const point = 1 + Math.floor(Math.random() * (TOTAL_LENGTH - 1));
    return new Genome(genomeA.sequence.slice(0, point) + genomeB.sequence.slice(point));
  }

  crossoverAndMutate(genomeA, genomeB) {
    return this.mutate(this.crossover(genomeA, genomeB));
  }

  get expectedMutations() {
    const avgMultiplier = this.partRates
      ? this.partRates.reduce((s, r) => s + r, 0) / this.partRates.length
      : 1.0;
    return Math.round(this.mutationRate * avgMultiplier * TOTAL_LENGTH * 10) / 10;
  }
}
