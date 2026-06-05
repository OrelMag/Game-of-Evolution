import { Mutator } from '../genome/mutator.js';
import { Genome, TOTAL_LENGTH } from '../genome/genome.js';
import { TreeNode } from '../simulation/treeNode.js';

/**
 * Predator / Co-evolution Mode
 *
 * A second lineage (the predator) evolves in parallel.
 * - Prey fitness  = normalised distance from nearest predator (evasion).
 * - Predator fitness = similarity to nearest prey (tracking).
 *
 * The predator tree is built alongside the prey simulation and can be
 * retrieved after run() completes for independent rendering.
 */
export class PredatorMode {
  /**
   * @param {number} mutationRate  predator mutation rate (can differ from prey)
   * @param {number} branchingFactor
   */
  constructor({ mutationRate = 0.015, branchingFactor = 2 } = {}) {
    this.mutator         = new Mutator({ mutationRate });
    this.branchingFactor = branchingFactor;
    this.predatorRoot    = null;
    this._predFrontier   = [];
    this._predGeneration = [];  // predGeneration[g] = array of TreeNodes at gen g
  }

  /** Called after new Simulation() so the prey root already holds id=0. */
  init() {
    this.predatorRoot  = new TreeNode(Genome.random(), null, 0);
    this._predFrontier = [this.predatorRoot];
    this._predGeneration = [[this.predatorRoot]];
  }

  /**
   * Advance the predator one generation.  Called by Simulation after each prey generation.
   * @param {number} generation
   * @param {TreeNode[]} preyFrontier  current surviving prey nodes
   */
  stepPredator(generation, preyFrontier) {
    const newPreds = [];
    for (const parent of this._predFrontier) {
      for (let i = 0; i < this.branchingFactor; i++) {
        const child = new TreeNode(
          this.mutator.mutate(parent.genome),
          parent,
          generation
        );
        parent.children.push(child);
        newPreds.push(child);
      }
    }

    // Score predators: high fitness = similar to prey
    for (const pred of newPreds) {
      pred.fitness = this._predatorFitness(pred.genome, preyFrontier);
      pred.alive   = true;
    }

    this._predFrontier    = newPreds;
    this._predGeneration[generation] = newPreds;
    return newPreds;
  }

  /**
   * Compute prey fitness for one prey genome at a given generation.
   * @param {import('../genome/genome.js').Genome} preyGenome
   * @param {number} generation  — used to look up the PREVIOUS gen predators
   * @returns {number} 0–1
   */
  computeFitness(preyGenome, _allNodes, generation) {
    const prevGen = generation - 1;
    const preds = this._predGeneration[prevGen] ?? [];
    if (preds.length === 0) return 1.0;

    // Prey wants MAX distance from any predator
    let maxDist = 0;
    for (const pred of preds) {
      const d = preyGenome.hammingDistance(pred.genome) / TOTAL_LENGTH;
      if (d > maxDist) maxDist = d;
    }
    return maxDist;
  }

  _predatorFitness(predGenome, preyNodes) {
    if (preyNodes.length === 0) return 0.5;
    let maxSim = 0;
    for (const prey of preyNodes) {
      const sim = 1 - predGenome.hammingDistance(prey.genome) / TOTAL_LENGTH;
      if (sim > maxSim) maxSim = sim;
    }
    return maxSim;
  }
}
