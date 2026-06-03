export const ALPHABET = ['G', 'O', 'D'];
export const PART_COUNT = 15;
export const PART_LENGTH = 8;
export const TOTAL_LENGTH = PART_COUNT * PART_LENGTH; // 120

export class Genome {
  constructor(sequence) {
    if (sequence.length !== TOTAL_LENGTH) {
      throw new Error(`Genome must be ${TOTAL_LENGTH} chars, got ${sequence.length}`);
    }
    this.sequence = sequence;
  }

  getSubstring(index) {
    const start = index * PART_LENGTH;
    return this.sequence.slice(start, start + PART_LENGTH);
  }

  /** Returns raw counts and normalised fractions for one body-part substring. */
  decode(index) {
    const sub = this.getSubstring(index);
    let g = 0, o = 0, d = 0;
    for (const c of sub) {
      if (c === 'G') g++;
      else if (c === 'O') o++;
      else d++;
    }
    return { g, o, d, gn: g / PART_LENGTH, on: o / PART_LENGTH, dn: d / PART_LENGTH };
  }

  /** Number of positions that differ between two genomes. */
  hammingDistance(other) {
    let dist = 0;
    for (let i = 0; i < TOTAL_LENGTH; i++) {
      if (this.sequence[i] !== other.sequence[i]) dist++;
    }
    return dist;
  }

  static random() {
    const seq = Array.from({ length: TOTAL_LENGTH },
      () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    ).join('');
    return new Genome(seq);
  }

  /** Create a genome from a plain string, validating characters. */
  static fromString(str) {
    const clean = str.toUpperCase().replace(/[^GOD]/g, '');
    if (clean.length < TOTAL_LENGTH) {
      // Pad with random chars if too short
      const pad = Array.from({ length: TOTAL_LENGTH - clean.length },
        () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
      ).join('');
      return new Genome(clean + pad);
    }
    return new Genome(clean.slice(0, TOTAL_LENGTH));
  }
}
