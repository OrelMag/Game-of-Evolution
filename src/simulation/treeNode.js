let nextId = 0;

export class TreeNode {
  /**
   * @param {import('../genome/genome.js').Genome} genome
   * @param {TreeNode|null} parent
   * @param {number} generation
   */
  constructor(genome, parent = null, generation = 0) {
    this.id = nextId++;
    this.genome = genome;
    this.parent = parent;
    this.children = [];
    this.generation = generation;

    // Set by SelectionEngine after each generation
    this.fitness = 1.0;
    this.alive = true; // false = selected against (shown grey in tree)
  }

  get isRoot() { return this.parent === null; }

  /** Walk every node in the subtree rooted here (BFS). */
  walkBFS(callback) {
    const queue = [this];
    while (queue.length) {
      const node = queue.shift();
      callback(node);
      for (const child of node.children) queue.push(child);
    }
  }

  /** Collect all nodes into a flat array (BFS order). */
  flatten() {
    const result = [];
    this.walkBFS(n => result.push(n));
    return result;
  }

  /** Return all leaf nodes (nodes with no children). */
  leaves() {
    const result = [];
    this.walkBFS(n => { if (n.children.length === 0) result.push(n); });
    return result;
  }

  static resetIdCounter() { nextId = 0; }
}
