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
    // Static by default — the preferred ratios never change.
    this.schedule = { mode: 'static', target: null, rate: 0.05, period: 10 };
  }

  setEnvironment(envKey) {
    this.envKey = envKey;
    this.env = ENVIRONMENTS[envKey] ?? ENVIRONMENTS.deepSea;
  }

  /**
   * Configure how the preferred ratios change over generations.
   * @param {object} opts
   * @param {'static'|'drift'|'oscillate'|'catastrophe'} opts.mode
   * @param {string} [opts.targetKey]  habitat the environment moves toward
   * @param {number} [opts.rate]       drift speed (fraction of the way per generation)
   * @param {number} [opts.period]     oscillation / catastrophe period in generations
   */
  setSchedule({ mode = 'static', targetKey = null, rate = 0.05, period = 10 } = {}) {
    this.schedule = {
      mode,
      target: targetKey ? (ENVIRONMENTS[targetKey] ?? null) : null,
      rate,
      period: Math.max(1, period),
    };
  }

  /**
   * Effective 15×3 preference array at a given generation, after applying the
   * temporal schedule. Returns the base prefs when static or no target is set.
   * @param {number} generation
   * @returns {number[][]}
   */
  _effectivePrefs(generation) {
    const { mode, target, rate, period } = this.schedule;
    if (mode === 'static' || !target) return this.env.prefs;

    if (mode === 'catastrophe') {
      // Alternate between base and target every `period` generations.
      const flipped = Math.floor(generation / period) % 2 === 1;
      return flipped ? target.prefs : this.env.prefs;
    }

    let t;
    if (mode === 'oscillate') {
      t = (Math.sin((2 * Math.PI * generation) / period) + 1) / 2;
    } else { // drift
      t = Math.max(0, Math.min(1, generation * rate));
    }
    return this.env.prefs.map((base, i) => _lerpVec(base, target.prefs[i], t));
  }

  /**
   * Fitness = mean cosine similarity across all 15 body parts.
   * @param {import('../genome/genome.js').Genome} genome
   * @param {*} _allNodes  unused
   * @param {number} [generation]  used by the temporal schedule
   * @returns {number} 0–1
   */
  computeFitness(genome, _allNodes, generation = 0) {
    const prefs = this._effectivePrefs(generation);
    let totalSim = 0;
    for (let i = 0; i < 15; i++) {
      const { gn, on, dn } = genome.decode(i);
      const [pg, po, pd] = prefs[i];
      totalSim += _cosineSimilarity([gn, on, dn], [pg, po, pd]);
    }
    return totalSim / 15;
  }
}

// Element-wise linear interpolation between two 3-vectors.
function _lerpVec(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function _cosineSimilarity(a, b) {
  const dot  = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const magA = Math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2);
  const magB = Math.sqrt(b[0] ** 2 + b[1] ** 2 + b[2] ** 2);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}
