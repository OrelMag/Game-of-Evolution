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
    this.secondParent = null; // set when crossover is used
    this.children = [];
    this.generation = generation;

    // Set by SelectionEngine after each generation
    this.fitness   = 1.0;
    this.alive     = true;    // false = selected against (shown grey in tree)
    this.speciesId = null;    // set by SpeciationEngine when species coloring is on
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

  /** BFS collect all descendant nodes (not including this node). */
  getDescendants() {
    const result = [];
    const queue = [...this.children];
    while (queue.length) {
      const node = queue.shift();
      result.push(node);
      for (const child of node.children) queue.push(child);
    }
    return result;
  }

  /**
   * Returns a Map<id, TreeNode> of all ancestors of `node` (not including the node itself).
   * Walks up the primary parent chain only.
   */
  static getAncestors(node) {
    const ancestors = new Map();
    let cursor = node.parent;
    while (cursor !== null) {
      ancestors.set(cursor.id, cursor);
      cursor = cursor.parent;
    }
    return ancestors;
  }

  /**
   * Finds the Most Recent Common Ancestor of nodeA and nodeB.
   * Returns the MRCA TreeNode, or null if no common ancestor exists.
   */
  static findMRCA(nodeA, nodeB) {
    const ancestorsA = TreeNode.getAncestors(nodeA);
    ancestorsA.set(nodeA.id, nodeA); // nodeA itself is a candidate
    let cursor = nodeB;
    while (cursor !== null) {
      if (ancestorsA.has(cursor.id)) return cursor;
      cursor = cursor.parent;
    }
    return null;
  }

  static resetIdCounter() { nextId = 0; }
}
