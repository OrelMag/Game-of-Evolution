import { Genome, ALPHABET, TOTAL_LENGTH, PART_COUNT, PART_LENGTH } from './genome.js';

export class Mutator {
  constructor({ mutationRate = 0.01 } = {}) {
    this.mutationRate = mutationRate;
  }

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
    return Math.round(this.mutationRate * 120 * 10) / 10;
  }
}
