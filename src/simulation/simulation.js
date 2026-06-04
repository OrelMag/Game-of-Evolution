import { Mutator } from '../genome/mutator.js';
import { Genome } from '../genome/genome.js';
import { TreeNode } from './treeNode.js';

export const MAX_NODES = 1024;

export class Simulation {
  /**
   * @param {object} opts
   * @param {number}  opts.generations
   * @param {number}  opts.branchingFactor
   * @param {number}  opts.mutationRate
   * @param {Genome}  [opts.rootGenome]
   * @param {import('../selection/selectionEngine.js').SelectionEngine} [opts.selectionEngine]
   * @param {number}  [opts.selectionStrength]   0–1
   * @param {boolean} [opts.useCrossover]         enable sexual reproduction
   * @param {string}  [opts.mutationMode]         'point'|'inversion'|'swap'|'mixed'
   * @param {import('./statsCollector.js').StatsCollector} [opts.statsCollector]
   */
  constructor({
    generations,
    branchingFactor,
    mutationRate,
    rootGenome,
    selectionEngine   = null,
    selectionStrength = 0,
    useCrossover      = false,
    mutationMode      = 'point',
    statsCollector    = null,
  }) {
    this.generations      = generations;
    this.branchingFactor  = branchingFactor;
    this.mutator          = new Mutator({ mutationRate });
    this.selectionEngine  = selectionEngine;
    this.selectionStrength = selectionStrength;
    this.useCrossover     = useCrossover;
    this.mutationMode     = mutationMode;
    this.statsCollector   = statsCollector;

    TreeNode.resetIdCounter();
    this.root = new TreeNode(rootGenome ?? Genome.random(), null, 0);
  }

  _makeChildGenome(parent, frontier) {
    if (this.useCrossover && frontier.length >= 2) {
      const mate = _randomMate(frontier, parent);
      if (mate) return this.mutator.mutateWithMode(
        this.mutator.crossover(parent.genome, mate.genome),
        this.mutationMode
      );
    }
    return this.mutator.mutateWithMode(parent.genome, this.mutationMode);
  }

  /** Run all generations synchronously. Returns root TreeNode. */
  run() {
    let activeFrontier = [this.root];
    let totalNodes = 1;

    for (let gen = 0; gen < this.generations; gen++) {
      const newNodes = [];

      for (const parent of activeFrontier) {
        for (let i = 0; i < this.branchingFactor; i++) {
          if (totalNodes >= MAX_NODES) break;
          const child = new TreeNode(
            this._makeChildGenome(parent, activeFrontier),
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

      if (this.selectionEngine) {
        const allNodes = this.root.flatten();
        for (const node of newNodes) {
          node.fitness = this.selectionEngine.computeFitness(node, allNodes, gen + 1);
        }
        activeFrontier = this.selectionEngine.applySelection(newNodes, this.selectionStrength);
      } else {
        activeFrontier = newNodes;
      }

      this.statsCollector?.record(gen + 1, newNodes);
      if (activeFrontier.length === 0) break;
    }

    return this.root;
  }

  /**
   * Generator version. Yields { generation, newNodes } after fitness is scored
   * but before selection is applied. The caller must pass survivors back via
   * generator.next(survivors). Passing null/undefined triggers auto-selection.
   *
   * This allows: animated rendering, manual (voting) selection, and stats collection
   * to happen between generations without blocking.
   */
  *runGenerator() {
    let activeFrontier = [this.root];
    let totalNodes = 1;

    for (let gen = 0; gen < this.generations; gen++) {
      const newNodes = [];

      for (const parent of activeFrontier) {
        for (let i = 0; i < this.branchingFactor; i++) {
          if (totalNodes >= MAX_NODES) break;
          const child = new TreeNode(
            this._makeChildGenome(parent, activeFrontier),
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

      // Score fitness (keeps _wrapWithPredator working since it hooks computeFitness)
      if (this.selectionEngine) {
        const allNodes = this.root.flatten();
        for (const node of newNodes) {
          node.fitness = this.selectionEngine.computeFitness(node, allNodes, gen + 1);
        }
      }

      // Yield to caller; receive optional override survivors
      const overrideSurvivors = yield { generation: gen + 1, newNodes };

      // Apply selection (override from caller, or auto-select, or all survive)
      if (overrideSurvivors != null) {
        activeFrontier = overrideSurvivors;
      } else if (this.selectionEngine) {
        activeFrontier = this.selectionEngine.applySelection(newNodes, this.selectionStrength);
      } else {
        newNodes.forEach(n => { n.alive = true; });
        activeFrontier = newNodes;
      }

      this.statsCollector?.record(gen + 1, newNodes);
      if (activeFrontier.length === 0) break;
    }
  }

  static estimateNodeCount(generations, branchingFactor) {
    let total = 1, level = 1;
    for (let g = 0; g < generations; g++) {
      level *= branchingFactor;
      total += level;
    }
    return total;
  }
}

function _randomMate(frontier, exclude) {
  const candidates = frontier.filter(n => n !== exclude);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
