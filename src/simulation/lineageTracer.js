import { Mutator } from '../genome/mutator.js';

let _nextTraceId = 0;

export class LineageTracer {
  constructor({
    startGenome,
    generations,
    mutationRate    = 0.01,
    mutationMode    = 'point',
    transpositionRate = 0,
    inversionRate   = 0,
    sampleEvery     = 1,
    selectionEngine = null,
    mutationBias    = null,
  }) {
    this.startGenome      = startGenome;
    this.generations      = generations;
    this.mutationMode     = mutationMode;
    this.sampleEvery      = Math.max(1, sampleEvery);
    this.selectionEngine  = selectionEngine;

    this._mutator     = new Mutator({
      mutationRate, transpositionRate, inversionRate,
      biasAllele:   mutationBias?.allele ?? null,
      biasStrength: mutationBias?.strength ?? 0,
    });
    this._snapshots   = [];
    this._stopped     = false;
    this._done        = false;
    this._currentGen  = 0;
  }

  stop() { this._stopped = true; }
  get isDone()    { return this._done; }
  get snapshots() { return this._snapshots; }

  *runGenerator(batchSize = 1000) {
    this._snapshots = [];
    this._stopped   = false;
    this._done      = false;

    let genome = this.startGenome;
    let gen    = 0;

    this._snapshots.push(this._snap(genome, 0));

    while (gen < this.generations && !this._stopped) {
      const batchEnd = Math.min(gen + batchSize, this.generations);

      for (let g = gen + 1; g <= batchEnd && !this._stopped; g++) {
        genome = this._mutator.mutateAll(genome, this.mutationMode);
        gen = g;
        this._currentGen = g;

        if (g % this.sampleEvery === 0 || g === this.generations) {
          this._snapshots.push(this._snap(genome, g));
        }
      }

      yield {
        progress:   gen / this.generations,
        snapshots:  this._snapshots,
        currentGen: gen,
      };
    }

    // Ensure final generation is always captured
    if (this._snapshots[this._snapshots.length - 1]?.generation !== gen && !this._stopped) {
      this._snapshots.push(this._snap(genome, gen));
    }

    this._done = true;
  }

  _snap(genome, generation) {
    const snapshot = { genome, generation, fitness: 1.0, alive: true, parent: null, children: [], id: _nextTraceId++ };
    if (this.selectionEngine) {
      snapshot.fitness = this.selectionEngine.computeFitness(snapshot, [], generation);
    }
    return snapshot;
  }
}
