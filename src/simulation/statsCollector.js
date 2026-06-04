export class StatsCollector {
  constructor() {
    this.generations = [];
    this._posFreqs   = []; // _posFreqs[gen] = Float32Array(120 * 3) — G/O/D freq per position
  }

  record(gen, nodes) {
    if (nodes.length === 0) return;
    const fitnesses = nodes.map(n => n.fitness);
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const bestFitness = Math.max(...fitnesses);
    const diversity = _sampledDiversity(nodes);
    this.generations.push({ gen, avgFitness, bestFitness, diversity });

    // Track per-position allele frequencies over alive nodes (fallback to all)
    const sample = nodes.filter(n => n.alive).length > 0 ? nodes.filter(n => n.alive) : nodes;
    const counts = new Float32Array(120 * 3);
    for (const node of sample) {
      const seq = node.genome.sequence;
      for (let i = 0; i < 120; i++) {
        const c = seq[i];
        counts[i * 3 + (c === 'G' ? 0 : c === 'O' ? 1 : 2)]++;
      }
    }
    const n = sample.length;
    for (let i = 0; i < counts.length; i++) counts[i] /= n;
    this._posFreqs[gen] = counts;
  }

  /**
   * Shannon entropy per position for a given generation (0 = conserved, log2(3) ≈ 1.585 = max drift).
   * Returns Float32Array(120) or null if no data.
   */
  getPositionEntropy(gen) {
    const counts = this._posFreqs[gen];
    if (!counts) return null;
    const entropy = new Float32Array(120);
    for (let i = 0; i < 120; i++) {
      let h = 0;
      for (let c = 0; c < 3; c++) {
        const p = counts[i * 3 + c];
        if (p > 0) h -= p * Math.log2(p);
      }
      entropy[i] = h;
    }
    return entropy;
  }

  /** Raw normalized frequency array for a generation: Float32Array(120 * 3). */
  getPositionFreqs(gen) { return this._posFreqs[gen] ?? null; }

  reset() {
    this.generations = [];
    this._posFreqs   = [];
  }
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
