# Game of Evolution

A browser-based evolution simulation. A root organism (encoded as a genome string) spawns offspring each generation, each with random mutations. Organisms branch over N generations forming a visual evolutionary tree. Optional selection pressures determine which lineages thrive.

## Quick start

```sh
npx serve .
# open http://localhost:3000
```

ES6 modules require an HTTP server — the simulation cannot be opened via `file://` directly.

## How it works

### Genome

Each organism carries a 120-character genome drawn from the alphabet `{G, O, D}`. The genome is split into 15 substrings of 8 characters, each controlling the visual traits of one body part:

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

Decoding a part: count G, O, D in its 8 characters → normalise to fractions `gn, on, dn` (sum = 1). These fractions linearly map to visual values (body width, hue, eye count, limb segments, etc.).

### Simulation

1. A root genome is created (random or user-provided).
2. Each generation, every surviving node produces `branchingFactor` children via point mutation.
3. An optional `SelectionEngine` scores each child (fitness 0–1) and culls low-fitness nodes before the next generation begins.
4. The tree is capped at **512 nodes** to prevent browser slowdown.
5. The resulting evolutionary tree is rendered as an SVG with creature thumbnails at each node.

### Selection modes

| Mode | Description |
|------|-------------|
| **None** | Neutral drift — all offspring survive |
| **Environment** | 5 presets (Arctic, Deep Sea, Desert, Forest, Volcanic). Fitness = mean cosine similarity of each part's G/O/D ratios to the environment's preferences |
| **Target** | Fitness = 1 − Hamming distance / 120 vs a user-chosen target genome |
| **Predator** | A second co-evolving lineage. Prey fitness = maximum distance from any predator; predator fitness = maximum similarity to nearest prey |
| **Artificial Selection** | Manual player voting. Each generation, vote for creatures to keep; low-voted creatures are culled |

Multiple modes can be active simultaneously; the final fitness is the product of all active mode scores.

## Controls

- **Generations** (1–10): how many generational steps to simulate
- **Branching factor** (1–4): offspring per surviving parent per generation
- **Mutation rate** (1–100, log scale → 0.001–0.1 per character): how aggressively genomes change
- **Run**: executes the simulation with current settings
- **Randomize**: generates a new random root genome and re-runs

The UI also shows an estimated node count before running and blocks execution if it would exceed 512 nodes.

## Interacting with the tree

- **Click a node** to open the creature detail panel (large render, genome breakdown, fitness, generation).
- **Creature name**: each creature has an auto-generated Latin binomial name based on its hue, body size, and pattern.
- **↑ Parent**: navigate to the parent node.
- **Set as target**: when Target mode is active, sets the clicked creature's genome as the fitness target.
- **Vote**: when Artificial Selection mode is active, click to vote for creatures to survive the next generation.
- **Pan & zoom**: drag to pan the tree; scroll wheel to zoom.

## Statistics tracking

When any selection mode is active, the simulation tracks per-generation statistics:
- **Average fitness**: mean fitness of all surviving nodes
- **Best fitness**: highest fitness in the current generation
- **Diversity**: average pairwise Hamming distance (normalised 0–1)

Statistics are displayed in the stats panel and reset when you start a new simulation.

## Architecture

```
src/
  genome/        pure data — no UI or rendering imports
    genome.js       Genome class, alphabet constants
    mutator.js      Point-mutation engine
  creature/      trait decoding + Canvas 2D drawing
    traits.js       decodeTraits() — genome → visual properties
    renderer.js     Orchestrates draw order; exposes render() & thumbnail()
    namer.js        Generates Latin binomial creature names
    parts/
      body.js       Body ellipse, radial gradient, pattern overlay
      head.js       Head, snout, eyes, mouth, cranial crest
      limbs.js      4 limbs with 1–3 segments, 3 tip types
      tail.js       Tail curve + dorsal ridge/sail/spines
      markings.js   Bioluminescent overlay (screen blend)
  simulation/    tree data structure + generation runner
    simulation.js   Evolutionary loop, MAX_NODES cap
    treeNode.js     Node with genome, fitness, alive flag, children
    statsCollector.js Tracks fitness, diversity per generation
  selection/     pluggable fitness modes
    selectionEngine.js   Multiplicative blending of active modes
    environmentMode.js   5 environment presets
    targetMode.js        Hamming-distance target
    predatorMode.js      Co-evolutionary predator/prey
    artificialMode.js    Manual player voting (marker for UI)
  ui/            DOM components — no business logic
    controls.js       Parameter sliders & run/randomize buttons
    selectionPanel.js Tabbed selection UI
    creaturePanel.js  Creature detail sidebar
    treeView.js       SVG tree with pan/zoom
    statsView.js      Statistics panel (fitness, diversity trends)
    votingOverlay.js  Voting UI for artificial selection mode
main.js          Wires everything; owns app state
index.html       Entry point & layout
styles.css       Styling
```

### Module boundaries

- `genome/` imports nothing from this project.
- `creature/` imports only from `genome/`.
- `simulation/` imports from `genome/` and optionally `selection/`.
- `selection/` imports from `genome/` only.
- `ui/` may import from all layers above.
- `main.js` is the only file that imports from `ui/`.

## Extending the simulation

**Add a body part**: declare its index in `PART_NAMES` in [src/creature/traits.js](src/creature/traits.js), add a decode entry in `decodeTraits()`, add a drawing function in `src/creature/parts/`, and call it from [src/creature/renderer.js](src/creature/renderer.js) in the correct draw order.

**Add a selection mode**: create `src/selection/myMode.js` exporting a class with `computeFitness(genome, allNodes, generation) → 0..1`. Register it in [src/selection/selectionEngine.js](src/selection/selectionEngine.js) and add its UI in [src/ui/selectionPanel.js](src/ui/selectionPanel.js).

**Add a mutation type**: subclass or extend `Mutator` in [src/genome/mutator.js](src/genome/mutator.js). Pass the new mutator instance to `Simulation` — no other changes required.

## Requirements

A modern browser with ES6 module support (Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+). No build step, no bundler.
