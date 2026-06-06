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
   * @param {boolean} [opts.useCrossover]            enable sexual reproduction
   * @param {string}  [opts.mutationMode]            'point'|'inversion'|'swap'|'mixed'
   * @param {number}  [opts.transpositionRate]       0–1 per-genome probability of a segment swap
   * @param {number}  [opts.inversionRate]           0–1 per-genome probability of a part inversion
   * @param {boolean} [opts.proportionalReproduction] fitter parents produce more offspring
   * @param {number}  [opts.effectivePopSize]        Wright-Fisher drift cap (Infinity = off)
   * @param {import('./statsCollector.js').StatsCollector} [opts.statsCollector]
   */
  constructor({
    generations,
    branchingFactor,
    mutationRate,
    rootGenome,
    selectionEngine          = null,
    selectionStrength        = 0,
    useCrossover             = false,
    mutationMode             = 'point',
    transpositionRate        = 0,
    inversionRate            = 0,
    proportionalReproduction = false,
    effectivePopSize         = Infinity,
    statsCollector           = null,
  }) {
    this.generations             = generations;
    this.branchingFactor         = branchingFactor;
    this.mutator                 = new Mutator({ mutationRate, transpositionRate, inversionRate });
    this.selectionEngine         = selectionEngine;
    this.selectionStrength       = selectionStrength;
    this.useCrossover            = useCrossover;
    this.mutationMode            = mutationMode;
    this.proportionalReproduction = proportionalReproduction;
    this.effectivePopSize        = effectivePopSize;
    this.statsCollector          = statsCollector;

    TreeNode.resetIdCounter();
    this.root = new TreeNode(rootGenome ?? Genome.random(), null, 0);
  }

  _makeChildGenome(parent, frontier) {
    if (this.useCrossover && frontier.length >= 2) {
      const mate = _randomMate(frontier, parent);
      if (mate) return {
        genome:       this.mutator.mutateAll(this.mutator.crossover(parent.genome, mate.genome), this.mutationMode),
        secondParent: mate,
      };
    }
    return { genome: this.mutator.mutateAll(parent.genome, this.mutationMode), secondParent: null };
  }

  /** Run all generations synchronously. Returns root TreeNode. */
  run() {
    let activeFrontier = [this.root];
    let totalNodes = 1;

    for (let gen = 0; gen < this.generations; gen++) {
      const newNodes = [];
      const avgFit = _avgFitness(activeFrontier);

      for (const parent of activeFrontier) {
        const count = _offspringCount(this.branchingFactor, parent.fitness, avgFit, this.proportionalReproduction);
        for (let i = 0; i < count; i++) {
          if (totalNodes >= MAX_NODES) break;
          const { genome, secondParent } = this._makeChildGenome(parent, activeFrontier);
          const child = new TreeNode(genome, parent, gen + 1);
          child.secondParent = secondParent;
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
          const { combined, perMode } = this.selectionEngine.computeFitnessDetailed(node, allNodes, gen + 1);
          node.fitness          = combined;
          node.fitnessBreakdown = perMode;
        }
        activeFrontier = this.selectionEngine.applySelection(newNodes, this.selectionStrength, this.effectivePopSize);
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
      const avgFit = _avgFitness(activeFrontier);

      const capNodes = this.generations !== Infinity;
      for (const parent of activeFrontier) {
        const count = _offspringCount(this.branchingFactor, parent.fitness, avgFit, this.proportionalReproduction);
        for (let i = 0; i < count; i++) {
          if (capNodes && totalNodes >= MAX_NODES) break;
          const { genome, secondParent } = this._makeChildGenome(parent, activeFrontier);
          const child = new TreeNode(genome, parent, gen + 1);
          child.secondParent = secondParent;
          parent.children.push(child);
          newNodes.push(child);
          totalNodes++;
        }
        if (capNodes && totalNodes >= MAX_NODES) break;
      }

      if (newNodes.length === 0) break;

      // Score fitness (keeps _wrapWithPredator working since it hooks computeFitness)
      if (this.selectionEngine) {
        const allNodes = this.root.flatten();
        for (const node of newNodes) {
          const { combined, perMode } = this.selectionEngine.computeFitnessDetailed(node, allNodes, gen + 1);
          node.fitness          = combined;
          node.fitnessBreakdown = perMode;
        }
      }

      // Yield to caller; receive optional override survivors
      const overrideSurvivors = yield { generation: gen + 1, newNodes };

      // Apply selection (override from caller, or auto-select, or all survive)
      if (overrideSurvivors != null) {
        activeFrontier = overrideSurvivors;
      } else if (this.selectionEngine) {
        activeFrontier = this.selectionEngine.applySelection(newNodes, this.selectionStrength, this.effectivePopSize);
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

// Returns average fitness of a frontier (default 1 when no fitness set yet)
function _avgFitness(frontier) {
  if (frontier.length === 0) return 1;
  return frontier.reduce((s, n) => s + (n.fitness ?? 1), 0) / frontier.length;
}

// Probabilistic offspring count for fitness-proportional reproduction.
// Uses stochastic rounding so the expected total equals branchingFactor × N.
function _offspringCount(branchingFactor, fitness, avgFitness, proportional) {
  if (!proportional || avgFitness <= 0) return branchingFactor;
  const target = branchingFactor * (fitness ?? 1) / avgFitness;
  return Math.floor(target) + (Math.random() < (target % 1) ? 1 : 0);
}

function _randomMate(frontier, exclude) {
  const candidates = frontier.filter(n => n !== exclude);
  if (candidates.length === 0) return null;

  // Roulette-wheel selection weighted by fitness
  const totalFit = candidates.reduce((s, n) => s + n.fitness, 0);
  if (totalFit === 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  let r = Math.random() * totalFit;
  for (const c of candidates) {
    r -= c.fitness;
    if (r <= 0) return c;
  }
  return candidates[candidates.length - 1];
}
