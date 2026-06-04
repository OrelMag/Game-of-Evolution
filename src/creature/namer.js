// Latin-style genus words keyed by dominant hue bucket (0=red/orange … 5=violet)
const GENUS = ['Rubrocus', 'Flavidus', 'Viridis', 'Caeruleus', 'Cyanus', 'Purpurinus'];
// Species words keyed by body width bucket (small → large)
const SIZE  = ['minutus', 'parvus', 'medius', 'grandis', 'magnus', 'colossus'];
// Optional suffix from surface pattern (0=solid, 1=spots, 2=stripes, 3=mottled)
const PATTERN_SUFFIX = ['', 'maculatus', 'striatus', 'nebularis'];

/**
 * Derive a two-or-three-word Latin binomial name from a genome.
 * Uses only genome.decode() — no dependency on decodeTraits.
 * @param {import('../genome/genome.js').Genome} genome
 * @returns {string}
 */
export function nameCreature(genome) {
  const p0 = genome.decode(0); // body core
  const p1 = genome.decode(1); // hue / saturation
  const p2 = genome.decode(2); // surface pattern

  // Approximate hue from the same formula used in decodeTraits
  const hueApprox = p1.gn * 40 + p1.on * 160 + p1.dn * 280;
  const genusIdx   = Math.floor(hueApprox / 60) % 6;
  const sizeIdx    = Math.min(5, Math.floor(p0.gn * 6));
  const patternIdx = Math.min(3, Math.floor(p2.dn * 4));

  const genus   = GENUS[genusIdx];
  const species = SIZE[sizeIdx];
  const suffix  = PATTERN_SUFFIX[patternIdx];

  return suffix ? `${genus} ${species} ${suffix}` : `${genus} ${species}`;
}
