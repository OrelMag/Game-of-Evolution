# Game of Evolution — CLAUDE.md

## Project overview
Browser-based evolution simulation. A root organism (genome string) spawns offspring each generation, each with random mutations. Organisms branch over N generations forming an evolutionary tree. Optional selection pressures determine which lineages thrive.

## Quick start
```sh
npx serve .    # ES6 modules require HTTP — cannot use file:// directly
# open http://localhost:3000
```

## Genome format
120 characters, alphabet `{G, O, D}`, split into **15 substrings of 8**:
```
[Part 0 · 8 chars][Part 1 · 8 chars] … [Part 14 · 8 chars]
```
Each substring drives one body part's visual traits.  
Decoding: count G, O, D → `{g, o, d, gn, on, dn}` where `gn = g/8`, etc., and `gn+on+dn = 1`.

| Index | Body part              |
|-------|------------------------|
| 0     | Body core (shape/size) |
| 1     | Body hue & saturation  |
| 2     | Body surface pattern   |
| 3     | Head shape & size      |
| 4     | Snout / beak           |
| 5     | Eyes                   |
| 6     | Mouth                  |
| 7     | Cranial crest          |
| 8     | Left forelimb          |
| 9     | Right forelimb         |
| 10    | Left hindlimb          |
| 11    | Right hindlimb         |
| 12    | Dorsal feature         |
| 13    | Tail                   |
| 14    | Bioluminescent markings|

## Architecture
```
src/
  genome/        pure data — zero UI / rendering imports
  creature/      trait decoding + Canvas 2D drawing
  simulation/    tree data structure + generation runner
  selection/     pluggable fitness modes
  ui/            DOM components — no business logic
main.js          wires everything, owns app state
```

## Strict module boundaries
- `genome/` imports nothing from this project.
- `creature/` imports only from `genome/`.
- `simulation/` imports from `genome/` and optionally `selection/`.
- `selection/` imports from `genome/` only.
- `ui/` imports from all layers above, but nothing imports from `ui/`.
- `main.js` is the only file allowed to import from `ui/`.

## Scalability rules (follow when adding code)
1. **Add a body part**: declare index in `PART_NAMES` (`traits.js`), add decode entry in `decodeTraits()`, add/extend a drawing function in `parts/`, call it from `renderer.js` in draw order. Nothing else changes.
2. **Add a selection mode**: create `src/selection/myMode.js` exporting a class with `computeFitness(genome, allNodes, generation) → 0..1`. Register in `selectionEngine.js`. Add UI in `selectionPanel.js`.
3. **Add a mutation type**: subclass or extend `Mutator` in `mutator.js`. Simulation accepts a mutator instance — no other changes required.

## Code conventions
- ES6 modules (`import`/`export`). No transpiler, no bundler.
- No globals. All state passed as arguments or held in class instances.
- Pure functions wherever possible; side effects only in `ui/` and `main.js`.
- Named constants at the top of each file — no magic numbers inline.
- Comments only for non-obvious invariants or workarounds.
- Drawing functions signature: `(ctx, traits, layout)` → void.

## Tree size cap
`Simulation.MAX_NODES = 512` hard cap prevents browser freeze.  
UI shows estimated node count before running and blocks if >512.

## Selection modes
| Mode | File | How it works |
|------|------|-------------|
| Environment | `selection/environmentMode.js` | Pre-built environment defines preferred G/O/D ratios per part; fitness = cosine similarity |
| Target | `selection/targetMode.js` | Fitness = 1 − Hamming_distance/120 vs a target genome |
| Predator | `selection/predatorMode.js` | Second co-evolving lineage; prey maximises distance from predator |

Multiple modes stack: final fitness = product of all active mode scores.
