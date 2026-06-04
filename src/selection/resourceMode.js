import { TOTAL_LENGTH } from '../genome/genome.js';

/**
 * Resource Competition Mode
 *
 * Penalises organisms that share a niche with many genetically similar peers.
 * Fitness = 1 / (1 + nichePeers), so an organism alone in its niche scores 1.0;
 * each additional neighbour halves the remaining headroom.
 *
 * Two creatures are "in the same niche" when their Hamming distance < nicheRadius × 120.
 */
export class ResourceMode {
  /** @param {number} nicheRadius  fraction of TOTAL_LENGTH used as the niche threshold (0–1) */
  constructor({ nicheRadius = 0.25 } = {}) {
    this.nicheRadius = nicheRadius;
  }

  /**
   * @param {import('./genome.js').Genome} genome
   * @param {import('../simulation/treeNode.js').TreeNode[]} allNodes
   * @param {number} generation
   * @returns {number} 0–1
   */
  computeFitness(genome, allNodes, generation) {
    const threshold = Math.round(this.nicheRadius * TOTAL_LENGTH);
    let nichePeers = 0;
    for (const node of allNodes) {
      if (node.generation !== generation) continue;
      if (node.genome === genome) continue; // skip self (reference equality)
      if (genome.hammingDistance(node.genome) < threshold) nichePeers++;
    }
    return 1 / (1 + nichePeers);
  }
}
