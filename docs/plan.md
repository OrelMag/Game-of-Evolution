# Plan: Game of Evolution

## Context
Building a browser-based evolution simulation game from scratch. The player configures a genome (string of G/O/D characters split into 15 substrings of 8), sets mutation parameters and branching factor, runs N generations, and watches a tree of diverging procedural creatures grow. There is no win condition yet (sandbox mode first). The code must be modular and scalable so art, selection mechanics, and new mutation types can be added later.

---

## Decisions made
| Topic | Decision |
|---|---|
| Platform | Browser — vanilla JS ES6 modules, no build step, open `index.html` |
| Creature visual | Procedural canvas-drawn creature, 15 named body parts |
| Mutations | Substitution only (letter swaps G↔O↔D), string length never changes |
| Branching | Player sets branching factor (1–4 children per parent per generation) |
| Goal | Pure sandbox for v1; selection pressure left as future extension |
| Tree render | SVG with zoom/pan; creature thumbnails as inlined canvas data-URLs |

---

## Creature anatomy — "Alien deep-sea creature"
*15 substrings, each decoded as (g, o, d) counts where g+o+d=8.*

| Index | Body part | Key traits driven |
|---|---|---|
| 0 | **Body core** | width, height ratio (round vs elongated) |
| 1 | **Body hue** | primary hue (0–360°), saturation |
| 2 | **Body pattern** | solid / spotted / striped / mottled, density |
| 3 | **Head** | head size relative to body, roundness |
| 4 | **Snout/Beak** | length, curve (none → long curved beak) |
| 5 | **Eyes** | count (2–6), size, glow color |
| 6 | **Mouth** | width, curve (gentle smile → wide grin) |
| 7 | **Cranial crest** | type (none / bumps / spikes / frill), height |
| 8 | **Left forelimb** | length, joints, tip (hand / claw / fin) |
| 9 | **Right forelimb** | evolves independently from left — asymmetry possible |
| 10 | **Left hindlimb** | length, shape (leg / fin / tentacle) |
| 11 | **Right hindlimb** | evolves independently |
| 12 | **Dorsal feature** | type (none / ridge / sail fin / spines), height |
| 13 | **Tail** | length, width, curvature |
| 14 | **Bioluminescent markings** | glow hue, intensity, pattern (spots / veins / bands) |

Asymmetric limbs (parts 8 vs 9, 10 vs 11) are intentional — they diverge under mutation and produce visually striking one-sided creatures.

---

## Genome encoding
```
Genome = 120 characters   (15 substrings × 8 chars)
Alphabet = { G, O, D }

decode(substringIndex) → { g, o, d }   where g + o + d = 8
  normalize → { gn, on, dn } = { g/8, o/8, d/8 }
  traits are linear/discrete functions of gn, on, dn
  (all valid genomes produce valid creatures — no invalid states)
```

Example mappings:
- `hue = (g * 40 + o * 160 + d * 280) % 360`
- `size_factor = 0.4 + gn * 1.2`  (g-heavy → larger)
- `roundness = on`                 (o-heavy → rounder)
- `pattern = floor(dn * 4)`       (d-heavy → complex pattern)

---

## Selection pressure (three toggleable modes)

All three modes can be active simultaneously; their fitness scores are multiplied.

### How selection integrates with the tree
- Parent always produces `branchingFactor` children (full branching preserved)
- Each child receives a **fitness score** (0–1) from the active selection modes
- **Survival** uses soft selection: each generation the lowest-fitness fraction of the population is "killed" (shown as greyed branches in the tree, genome still visible)
- Player sets **selection strength** (0 = pure drift, 1 = only top survivors reproduce)
- Dead branches remain in the SVG tree, greyed out — you see what selection removed

### Mode A: Environment card
Pre-built environments: Arctic / Desert / Deep-Sea / Forest / Volcanic  
Fitness = cosine similarity between creature's G/O/D ratios and the environment's preferred ratios.  
Each environment favours different trait combinations (e.g. Arctic → large body, cool hue, thick tail).

### Mode B: Fitness target
Player defines a target 120-char G/O/D genome.  
Fitness = 1 − (Hamming_distance / 120).  
Shows convergent evolution: surviving lineages converge toward the target.

### Mode C: Predator / co-evolution (Red Queen)
A second independent lineage evolves in parallel.  
Prey fitness = distance from predator (evasion).  
Predator fitness = similarity to prey (tracking).  
Both trees shown side-by-side; predator tree in red.

---

## File structure
```
e:\GameOfEvolution\
├── index.html
├── styles.css
├── CLAUDE.md
├── docs/
│   └── plan.md          ← this file
└── src/
    ├── main.js
    ├── genome/
    │   ├── genome.js
    │   └── mutator.js
    ├── creature/
    │   ├── traits.js
    │   ├── renderer.js
    │   └── parts/
    │       ├── body.js
    │       ├── head.js
    │       ├── limbs.js
    │       ├── tail.js
    │       └── markings.js
    ├── selection/
    │   ├── selectionEngine.js
    │   ├── environmentMode.js
    │   ├── targetMode.js
    │   └── predatorMode.js
    ├── simulation/
    │   ├── treeNode.js
    │   └── simulation.js
    └── ui/
        ├── controls.js
        ├── selectionPanel.js
        ├── treeView.js
        └── creaturePanel.js
```

---

## Verification checklist
- `npx serve .` from `e:\GameOfEvolution`, open `http://localhost:3000`
- Run: generations=3, branching=2 → 7 nodes total, all visually distinct
- Mutation rate 0% → all descendants identical to ancestor
- Mutation rate 50% → radically different creatures each generation
- Click any tree node → right panel updates with creature + genome breakdown
- Asymmetric limbs diverge independently over many generations
- Environment mode: switch env mid-run, surviving lineage should shift toward new env traits
- Predator mode: red tree appears alongside prey tree; creatures diverge from each other
