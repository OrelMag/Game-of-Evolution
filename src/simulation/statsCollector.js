export class StatsCollector {
  constructor() {
    this.generations = [];
  }

  record(gen, nodes) {
    if (nodes.length === 0) return;
    const fitnesses = nodes.map(n => n.fitness);
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const bestFitness = Math.max(...fitnesses);
    const diversity = _sampledDiversity(nodes);
    this.generations.push({ gen, avgFitness, bestFitness, diversity });
  }

  reset() { this.generations = []; }
}

// Average pairwise Hamming distance (normalised 0–1) over up to MAX_PAIRS random pairs.
function _sampledDiversity(nodes) {
  if (nodes.length <= 1) return 0;
  const MAX_PAIRS = 30;
  let total = 0, pairs = 0;
  for (let i = 0; i < MAX_PAIRS; i++) {
    const a = nodes[Math.floor(Math.random() * nodes.length)];
    const b = nodes[Math.floor(Math.random() * nodes.length)];
    if (a !== b) { total += a.genome.hammingDistance(b.genome) / 120; pairs++; }
  }
  return pairs > 0 ? total / pairs : 0;
}
