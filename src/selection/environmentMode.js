/**
 * Environment Mode — each environment defines a preferred G/O/D ratio
 * for every body part.  Fitness = cosine similarity between creature's
 * normalised counts and the environment's preferred distribution.
 */

export const ENVIRONMENTS = {
  arctic: {
    label: 'Arctic Tundra',
    // Prefers: large body (G-heavy p0), pale/blue hue (D-heavy p1),
    // compact limbs (D-heavy), thick tail (G-heavy)
    prefs: [
      [0.7, 0.2, 0.1], // body core: G-heavy → wide
      [0.1, 0.2, 0.7], // body hue: D-heavy → cool/purple
      [0.5, 0.3, 0.2], // pattern
      [0.6, 0.2, 0.2], // head: larger
      [0.1, 0.1, 0.8], // snout: short
      [0.5, 0.3, 0.2], // eyes
      [0.3, 0.4, 0.3], // mouth
      [0.2, 0.2, 0.6], // crest: none
      [0.1, 0.2, 0.7], // left fore: short
      [0.1, 0.2, 0.7], // right fore: short
      [0.2, 0.3, 0.5], // left hind
      [0.2, 0.3, 0.5], // right hind
      [0.2, 0.1, 0.7], // dorsal: none
      [0.7, 0.2, 0.1], // tail: long + wide
      [0.3, 0.1, 0.6], // markings: minimal
    ],
  },
  deepSea: {
    label: 'Deep Sea',
    prefs: [
      [0.3, 0.7, 0.0], // elongated body
      [0.1, 0.7, 0.2], // blue/cyan hue
      [0.2, 0.4, 0.4], // pattern: mottled
      [0.3, 0.5, 0.2], // head: round
      [0.6, 0.3, 0.1], // long snout
      [0.7, 0.2, 0.1], // many eyes
      [0.6, 0.3, 0.1], // wide mouth
      [0.2, 0.1, 0.7], // no crest
      [0.5, 0.4, 0.1], // long fins
      [0.5, 0.4, 0.1],
      [0.4, 0.5, 0.1],
      [0.4, 0.5, 0.1],
      [0.2, 0.7, 0.1], // sail dorsal
      [0.6, 0.4, 0.0], // long tail
      [0.1, 0.8, 0.1], // intense markings
    ],
  },
  desert: {
    label: 'Scorched Desert',
    prefs: [
      [0.5, 0.1, 0.4], // compact body
      [0.7, 0.2, 0.1], // warm hue (G=yellow-orange)
      [0.4, 0.1, 0.5], // mottled pattern
      [0.2, 0.1, 0.7], // small head
      [0.8, 0.1, 0.1], // long snout
      [0.1, 0.1, 0.8], // few eyes
      [0.3, 0.1, 0.6], // small mouth
      [0.7, 0.2, 0.1], // spikes crest
      [0.6, 0.3, 0.1], // clawed fore
      [0.6, 0.3, 0.1],
      [0.7, 0.2, 0.1], // powerful hind
      [0.7, 0.2, 0.1],
      [0.7, 0.1, 0.2], // spines dorsal
      [0.2, 0.1, 0.7], // short tail
      [0.2, 0.1, 0.7], // no markings
    ],
  },
  forest: {
    label: 'Ancient Forest',
    prefs: [
      [0.3, 0.5, 0.2],
      [0.2, 0.7, 0.1], // green hue
      [0.2, 0.5, 0.3], // spotted
      [0.4, 0.4, 0.2],
      [0.4, 0.4, 0.2],
      [0.3, 0.5, 0.2],
      [0.4, 0.4, 0.2],
      [0.3, 0.6, 0.1], // frill crest
      [0.5, 0.4, 0.1],
      [0.5, 0.4, 0.1],
      [0.5, 0.4, 0.1],
      [0.5, 0.4, 0.1],
      [0.3, 0.6, 0.1], // sail dorsal
      [0.4, 0.5, 0.1],
      [0.3, 0.6, 0.1], // veins
    ],
  },
  volcanic: {
    label: 'Volcanic Vents',
    prefs: [
      [0.6, 0.2, 0.2],
      [0.8, 0.1, 0.1], // red/orange hue
      [0.3, 0.2, 0.5],
      [0.5, 0.1, 0.4],
      [0.5, 0.3, 0.2],
      [0.2, 0.1, 0.7],
      [0.5, 0.4, 0.1],
      [0.7, 0.2, 0.1], // spiky crest
      [0.4, 0.2, 0.4],
      [0.4, 0.2, 0.4],
      [0.6, 0.3, 0.1],
      [0.6, 0.3, 0.1],
      [0.7, 0.2, 0.1], // spines dorsal
      [0.5, 0.3, 0.2],
      [0.5, 0.4, 0.1], // glowing bands
    ],
  },
};

export class EnvironmentMode {
  /** @param {string} envKey  key of ENVIRONMENTS */
  constructor(envKey = 'deepSea') {
    this.setEnvironment(envKey);
  }

  setEnvironment(envKey) {
    this.envKey = envKey;
    this.env = ENVIRONMENTS[envKey] ?? ENVIRONMENTS.deepSea;
  }

  /**
   * Fitness = mean cosine similarity across all 15 body parts.
   * @param {import('../genome/genome.js').Genome} genome
   * @returns {number} 0–1
   */
  computeFitness(genome) {
    let totalSim = 0;
    for (let i = 0; i < 15; i++) {
      const { gn, on, dn } = genome.decode(i);
      const [pg, po, pd] = this.env.prefs[i];
      totalSim += _cosineSimilarity([gn, on, dn], [pg, po, pd]);
    }
    return totalSim / 15;
  }
}

function _cosineSimilarity(a, b) {
  const dot  = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const magA = Math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2);
  const magB = Math.sqrt(b[0] ** 2 + b[1] ** 2 + b[2] ** 2);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}
