import { Mutator } from '../genome/mutator.js';
import { Genome } from '../genome/genome.js';
import { TreeNode } from './treeNode.js';

export const MAX_NODES = 512;

export class Simulation {
  /**
   * @param {object} opts
   * @param {number}  opts.generations
   * @param {number}  opts.branchingFactor   children per surviving parent
   * @param {number}  opts.mutationRate       probability per char per copy
   * @param {import('../genome/genome.js').Genome} [opts.rootGenome]
   * @param {import('../selection/selectionEngine.js').SelectionEngine} [opts.selectionEngine]
   * @param {number}  [opts.selectionStrength]  0–1
   */
  constructor({
    generations,
    branchingFactor,
    mutationRate,
    rootGenome,
    selectionEngine = null,
    selectionStrength = 0,
  }) {
    this.generations     = generations;
    this.branchingFactor = branchingFactor;
    this.mutator         = new Mutator({ mutationRate });
    this.selectionEngine = selectionEngine;
    this.selectionStrength = selectionStrength;

    TreeNode.resetIdCounter();
    this.root = new TreeNode(rootGenome ?? Genome.random(), null, 0);
  }

  /**
   * Run all generations synchronously.
   * Returns the root TreeNode of the completed evolutionary tree.
   */
  run() {
    // activeFrontier = nodes that will reproduce this generation
    let activeFrontier = [this.root];
    let totalNodes = 1;

    for (let gen = 0; gen < this.generations; gen++) {
      const newNodes = [];

      for (const parent of activeFrontier) {
        for (let i = 0; i < this.branchingFactor; i++) {
          if (totalNodes >= MAX_NODES) break;
          const child = new TreeNode(
            this.mutator.mutate(parent.genome),
            parent,
            gen + 1
          );
          parent.children.push(child);
          newNodes.push(child);
          totalNodes++;
        }
        if (totalNodes >= MAX_NODES) break;
      }

      if (newNodes.length === 0) break;

      // Score fitness for this generation
      if (this.selectionEngine) {
        const allNodes = this.root.flatten();
        for (const node of newNodes) {
          node.fitness = this.selectionEngine.computeFitness(node, allNodes, gen + 1);
        }
        activeFrontier = this.selectionEngine.applySelection(
          newNodes, this.selectionStrength
        );
      } else {
        activeFrontier = newNodes;
      }

      if (activeFrontier.length === 0) break;
    }

    return this.root;
  }

  /** Estimate total nodes for given params (may exceed MAX_NODES). */
  static estimateNodeCount(generations, branchingFactor) {
    let total = 1, level = 1;
    for (let g = 0; g < generations; g++) {
      level *= branchingFactor;
      total += level;
    }
    return total;
  }
}
