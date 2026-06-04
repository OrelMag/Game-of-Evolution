import { TOTAL_LENGTH } from '../genome/genome.js';

const SPECIES_PALETTE = [
  '#60a5fa', // blue
  '#f87171', // red
  '#4ade80', // green
  '#facc15', // yellow
  '#c084fc', // purple
  '#fb923c', // orange
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#a3e635', // lime
  '#94a3b8', // slate
];

/**
 * Greedy single-linkage species clustering.
 *
 * Each generation's new nodes are compared against the stored founder genomes.
 * A node joins the first species whose founder is within `threshold × TOTAL_LENGTH`
 * Hamming distance. If no species matches, a new one is created with this node
 * as the founder. Species IDs persist across generations so lineages keep their colour.
 */
export class SpeciationEngine {
  /** @param {number} threshold  fraction of genome length used as species boundary (0–1) */
  constructor({ threshold = 0.3 } = {}) {
    this.threshold = threshold;
    this._founders  = new Map(); // speciesId → founder Genome
    this._nextId    = 0;
  }

  /**
   * Assign node.speciesId to every node in `nodes`.
   * Modifies nodes in place.
   * @param {import('./treeNode.js').TreeNode[]} nodes
   */
  assignSpecies(nodes) {
    const maxDist = Math.round(this.threshold * TOTAL_LENGTH);
    for (const node of nodes) {
      let assigned = false;
      for (const [id, founderGenome] of this._founders) {
        if (node.genome.hammingDistance(founderGenome) <= maxDist) {
          node.speciesId = id;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        const newId = this._nextId++;
        this._founders.set(newId, node.genome);
        node.speciesId = newId;
      }
    }
  }

  /** CSS color string for a given species ID. */
  static colorFor(speciesId) {
    if (speciesId == null) return null;
    return SPECIES_PALETTE[speciesId % SPECIES_PALETTE.length];
  }

  reset() {
    this._founders.clear();
    this._nextId = 0;
  }
}
