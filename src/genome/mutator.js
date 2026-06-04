import { Genome, ALPHABET, TOTAL_LENGTH } from './genome.js';

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
