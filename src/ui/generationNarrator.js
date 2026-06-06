export class GenerationNarrator {
  constructor(mountId) {
    this._el = document.getElementById(mountId);
  }

  /**
   * @param {{
   *   generation: number,
   *   newNodes: import('../simulation/treeNode.js').TreeNode[],
   *   survivors: import('../simulation/treeNode.js').TreeNode[],
   *   prevStats: {avgFitness:number, diversity:number} | null,
   *   currStats: {avgFitness:number, diversity:number} | null,
   * }} opts
   */
  update({ generation, newNodes, survivors, prevStats, currStats }) {
    if (!this._el) return;

    const total   = newNodes.length;
    const dead    = total - survivors.length;
    const cullPct = total > 0 ? Math.round(dead / total * 100) : 0;

    const parts = [];

    // Offspring count
    parts.push(`<strong>Gen ${generation}</strong> — ${total} offspring`);

    // Survival / culling
    if (dead === 0) {
      parts.push('all survived');
    } else {
      parts.push(`${dead} culled (${cullPct}%)`);
    }

    // Fitness change
    if (prevStats && currStats) {
      const delta = currStats.avgFitness - prevStats.avgFitness;
      if (Math.abs(delta) > 0.005) {
        const arrow = delta > 0 ? '↑' : '↓';
        parts.push(`avg fitness ${arrow} ${(currStats.avgFitness * 100).toFixed(1)}%`);
      }
    }

    // Dominant selection pressure
    if (survivors.length > 0) {
      const breakdown = survivors
        .filter(n => n.fitnessBreakdown?.length > 0)
        .map(n => n.fitnessBreakdown);

      if (breakdown.length > 0) {
        const labels = breakdown[0].map(b => b.label);
        const avgByMode = labels.map(label => {
          const sum = breakdown.reduce((acc, bd) => {
            const entry = bd.find(b => b.label === label);
            return acc + (entry ? entry.score : 1);
          }, 0);
          return { label, avg: sum / breakdown.length };
        });
        avgByMode.sort((a, b) => a.avg - b.avg); // lowest = most limiting
        const limiting = avgByMode[0];
        if (limiting && limiting.avg < 0.8) {
          parts.push(`strongest pressure: <em>${limiting.label}</em> (avg ${(limiting.avg * 100).toFixed(0)}%)`);
        }
      }
    }

    // Diversity change
    if (prevStats && currStats) {
      const delta = currStats.diversity - prevStats.diversity;
      if (delta > 0.04)  parts.push('diversity increased ↑');
      if (delta < -0.04) parts.push('diversity decreased ↓');
    }

    this._el.innerHTML = parts.join(' · ');
  }

  clear() {
    if (this._el) this._el.textContent = '';
  }
}
