/** Maps genome part index → human-readable name (used in UI). */
export const PART_NAMES = [
  'Body core',
  'Body hue',
  'Body pattern',
  'Head',
  'Snout',
  'Eyes',
  'Mouth',
  'Cranial crest',
  'Left forelimb',
  'Right forelimb',
  'Left hindlimb',
  'Right hindlimb',
  'Dorsal feature',
  'Tail',
  'Markings',
];

/**
 * Decode a genome into a flat traits object used by all drawing functions.
 * Pure function — no side effects.
 *
 * @param {import('../genome/genome.js').Genome} genome
 * @returns {object} traits
 */
export function decodeTraits(genome) {
  const p = Array.from({ length: 15 }, (_, i) => genome.decode(i));

  return {
    body: {
      width:          70 + p[0].gn * 90,          // 70–160 px (reference scale)
      height:         90 + p[0].on * 110,          // 90–200 px
      hue:            Math.round((p[1].gn * 40 + p[1].on * 160 + p[1].dn * 280) % 360),
      saturation:     Math.round(50 + p[1].gn * 50), // 50–100 %
      lightness:      Math.round(42 + p[1].dn * 18),  // 42–60 %
      pattern:        Math.floor(p[2].dn * 4),         // 0=solid 1=spots 2=stripes 3=mottled
      patternCount:   6 + Math.floor(p[2].gn * 14),   // 6–20 elements
      patternScale:   0.15 + p[2].on * 0.55,           // pattern element size
    },
    head: {
      size:           0.35 + p[3].gn * 0.45,       // fraction of body width (0.35–0.8)
      elongation:     0.85 + p[3].on * 0.55,        // height/width ratio (0.85–1.4)
    },
    snout: {
      length:         p[4].gn * 36,                 // 0–36 px
      baseWidth:      4 + p[4].on * 16,             // 4–20 px
      droop:          p[4].dn * 0.45 - 0.05,        // −0.05 to +0.40 rad (up vs down)
    },
    eyes: {
      count:          2 + Math.floor(p[5].gn * 4.99), // 2–6
      radius:         4 + p[5].on * 11,              // 4–15 px
      glowHue:        Math.round((p[5].dn * 300 + 170) % 360),
      spread:         0.28 + p[5].gn * 0.38,          // fraction of head width between outermost eyes
    },
    mouth: {
      width:          0.25 + p[6].gn * 0.5,          // fraction of head width
      curve:          p[6].on * 14 - 4,               // −4 to +10 px (positive = smile)
      openness:       p[6].dn * 0.35,                 // 0=closed 0.35=open gap
    },
    crest: {
      type:           Math.floor(p[7].gn * 4),        // 0=none 1=bumps 2=spikes 3=frill
      height:         8 + p[7].on * 34,               // 8–42 px
      count:          3 + Math.floor(p[7].dn * 5.99), // 3–8 elements
    },
    limbs: {
      leftFore:       _decodeLimb(p[8]),
      rightFore:      _decodeLimb(p[9]),
      leftHind:       _decodeLimb(p[10]),
      rightHind:      _decodeLimb(p[11]),
    },
    dorsal: {
      type:           Math.floor(p[12].gn * 4),       // 0=none 1=ridge 2=sail 3=spines
      height:         6 + p[12].on * 42,              // 6–48 px
      count:          2 + Math.floor(p[12].dn * 6.99),// 2–8 elements
    },
    tail: {
      length:         p[13].gn * 92,                  // 0–92 px
      baseWidth:      8 + p[13].on * 22,              // 8–30 px
      curvature:      (p[13].dn - 0.33) * 2.2,        // −0.73 to +1.47 rad
    },
    markings: {
      hue:            Math.round((p[14].gn * 300 + 60) % 360),
      intensity:      p[14].on * 0.72,                // 0–0.72 opacity
      type:           Math.floor(p[14].dn * 4),        // 0=none 1=spots 2=veins 3=bands
    },
  };
}

function _decodeLimb({ gn, on, dn }) {
  return {
    length:    gn * 65,                    // 0–65 px
    segments:  1 + Math.floor(on * 2.99),  // 1–3 segments
    tipType:   Math.floor(dn * 3),         // 0=round 1=clawed 2=fin
  };
}
