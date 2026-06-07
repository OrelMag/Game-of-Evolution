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

    // Single pass: compute per-position counts (for drift heatmap) and overall G/O/D totals (for allele chart)
    const sample = nodes.filter(n => n.alive).length > 0 ? nodes.filter(n => n.alive) : nodes;
    const counts = new Float32Array(120 * 3);
    let gSum = 0, oSum = 0, dSum = 0;
    for (const node of sample) {
      const seq = node.genome.sequence;
      for (let i = 0; i < 120; i++) {
        const c = seq[i];
        const ci = c === 'G' ? 0 : c === 'O' ? 1 : 2;
        counts[i * 3 + ci]++;
        if (ci === 0) gSum++; else if (ci === 1) oSum++; else dSum++;
      }
    }
    const n = sample.length;
    for (let i = 0; i < counts.length; i++) counts[i] /= n;
    this._posFreqs[gen] = counts;

    const total = n * 120;
    const alleleFreqs = { g: gSum / total, o: oSum / total, d: dSum / total };

    // Population-dynamics metrics: standing population size and mean age.
    // `nodes` is the living population when PD is active, the new cohort otherwise.
    const population = nodes.length;
    const meanAge    = nodes.reduce((a, b) => a + (b.age ?? 0), 0) / population;

    this.generations.push({ gen, avgFitness, bestFitness, diversity, alleleFreqs, population, meanAge });
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
