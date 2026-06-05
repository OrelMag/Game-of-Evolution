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
2. Each generation, every surviving node produces offspring via mutation (and optionally crossover).
3. An optional `SelectionEngine` scores each child (fitness 0–1) and culls low-fitness nodes before the next generation begins.
4. The tree is capped at **1024 nodes** to prevent browser slowdown.
5. The resulting evolutionary tree is rendered as an SVG with creature thumbnails at each node.

### Mutation types

| Type | Description |
|------|-------------|
| **Point** | Each position mutates independently at the configured rate (default ~1% per character) |
| **Inversion** | Reverses the 8-character substring of a randomly chosen body-part module |
| **Segment swap** | Exchanges the complete 8-character blocks of two random body-part modules |
| **Mixed** | Stochastically applies point (34%), inversion (33%), or swap (33%) each generation |

Transposition and inversion can be stacked on top of the primary mutation type via independent per-genome probability sliders. Mutation hotspots can be configured in code via `Mutator`'s `partRates` array (15 per-part rate multipliers).

### Reproduction modes

- **Asexual** (default): each parent clones itself with mutations.
- **Sexual reproduction**: enable the checkbox to allow fitness-weighted mate selection and single-point crossover before mutation. Nodes produced by crossover are marked with a ✕ badge in the tree.
- **Fitness-scaled fecundity**: enable the checkbox to give fitter parents proportionally more offspring each generation (stochastic rounding keeps total offspring count stable).

### Selection modes

| Mode | Description |
|------|-------------|
| **Environment** | 5 presets (Arctic Tundra, Deep Sea, Scorched Desert, Ancient Forest, Volcanic Vents). Fitness = mean cosine similarity of each part's G/O/D ratios to the environment's preferred ratios |
| **Target genome** | Fitness = 1 − Hamming distance / 120 vs a user-chosen target genome |
| **Predator** | A second co-evolving lineage rendered in red. Prey fitness = max distance from any predator; predator fitness = max similarity to nearest prey (Red Queen dynamics) |
| **Resource competition** | Fitness = 1 / (1 + niche competitors). Creatures with similar genomes within a configurable Hamming radius compete for the same niche, modelling negative frequency-dependent selection |
| **Epistasis** | 8 pairwise body-plan interaction rules award bonuses (e.g. long snout + many eyes → sensory predator synergy +0.20) or penalties (e.g. large body + stubby limbs → locomotion penalty −0.25) |
| **Genetic drift** | Wright-Fisher effective population size cap. Survivors are randomly subsampled to N_e each generation, independent of fitness. Alleles can fix or be lost purely by chance — operates even with no other selection mode active |
| **Player selection** | Manual voting. Each generation, click creature cards to keep or cull them, then confirm |

Multiple modes can be active simultaneously; the final fitness is the product of all active mode scores, each blended by its own strength slider.

## Controls

### Simulation panel

- **Generations** (1–20): how many generational steps to simulate
- **Branching factor** (1–4): offspring per surviving parent per generation
- **Mutation rate** (log scale → 0.1%–10% per character)
- **Mutation type**: Point / Inversion / Segment swap / Mixed
- **Playback speed**: Slow / Normal / Fast / Instant
- **Transposition rate**: per-genome probability of a random segment swap (stacked on top of primary mutation)
- **Inversion rate**: per-genome probability of a random part inversion
- **Sexual reproduction**: enable fitness-weighted crossover before mutation
- **Fitness-scaled fecundity**: fitter parents produce more offspring
- **Species colouring**: colour nodes by inferred species (genetic distance clustering)

### Playback controls

- **▶ Run**: start the simulation from the current root genome
- **⏸ Pause / ▶ Resume**: pause between generations
- **⏭ Step**: advance one generation at a time while paused
- **↺ Randomize**: generate a new random root genome and re-run
- **View gen scrubber** (appears after simulation completes): scrub back to view any past generation

## Interacting with the tree

- **Click a node** to open the creature detail panel (large render, genome breakdown, fitness, generation).
- **Creature name**: each creature has an auto-generated Latin binomial name based on its hue, body size, and pattern.
- **↑ Parent**: navigate to the parent node.
- **🎯 Set target**: when Target mode is active, sets the clicked creature's genome as the fitness target.
- **⊕ Compare**: enter compare mode — then click a second creature to see a side-by-side diff (Hamming distance, generation gap, fitness, genome diff highlighted per part).
- **⬆ Find MRCA**: from compare mode, highlights the Most Recent Common Ancestor of the two selected creatures.
- **Pan & zoom**: drag to pan the tree; scroll wheel to zoom.

## Statistics & visualisations

### Stats panel (📊 Stats)

Tracks per-generation statistics when any selection mode is active:
- **Average fitness** and **best fitness** trend lines
- **Diversity**: mean pairwise Hamming distance (normalised 0–1)

### Drift heatmap (🧬 Drift)

Shows a heatmap of per-position Shannon entropy across the 120-character genome over time. Blue = conserved positions (low entropy); orange = highly variable positions (high drift). Useful for identifying which body-part modules are under strongest selection.

## Architecture

```
src/
  genome/        pure data — no UI or rendering imports
    genome.js         Genome class, alphabet constants, Hamming distance
    mutator.js        Point / inversion / swap mutation + crossover; partRates hotspots
  creature/      trait decoding + Canvas 2D drawing
    traits.js         decodeTraits() — genome → visual properties
    renderer.js       Orchestrates draw order; exposes render() & thumbnail()
    namer.js          Generates Latin binomial creature names
    parts/
      body.js         Body ellipse, radial gradient, pattern overlay
      head.js         Head, snout, eyes, mouth, cranial crest
      limbs.js        4 limbs with 1–3 segments, 3 tip types
      tail.js         Tail curve + dorsal ridge/sail/spines
      markings.js     Bioluminescent overlay (screen blend)
  simulation/    tree data structure + generation runner
    simulation.js         Evolutionary loop, proportional reproduction, MAX_NODES cap
    treeNode.js           Node with genome, fitness, alive flag, secondParent, children
    statsCollector.js     Per-generation fitness, diversity, and per-position entropy
    speciationEngine.js   Genetic-distance clustering for species colour assignment
  selection/     pluggable fitness modes
    selectionEngine.js    Multiplicative blending + Wright-Fisher drift sampling
    environmentMode.js    5 environment presets (cosine similarity)
    targetMode.js         Hamming-distance target
    predatorMode.js       Co-evolutionary predator/prey (Red Queen)
    resourceMode.js       Niche competition / negative frequency-dependent selection
    epistasisMode.js      8 pairwise body-plan interaction rules
    artificialMode.js     Marker class for manual player voting
  ui/            DOM components — no business logic
    controls.js           Parameter sliders, playback buttons, scrubber
    selectionPanel.js     Accordion selection UI with per-mode strength sliders
    creaturePanel.js      Creature detail sidebar + compare mode
    treeView.js           SVG tree with pan/zoom, dead-node overlay, clade highlight
    statsView.js          Fitness & diversity trend chart
    driftView.js          Genome drift heatmap (Shannon entropy per position)
    votingOverlay.js      Card-based voting UI for player selection mode
    lineageView.js        Lineage trace panel
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

**Add a mutation type**: extend `Mutator` in [src/genome/mutator.js](src/genome/mutator.js) and handle the new mode in `mutateWithMode()`. Pass the mode string to `Simulation` — no other changes required.

**Configure mutation hotspots**: pass a `partRates` array (15 elements, one multiplier per body-part module) to the `Mutator` constructor. Values > 1 increase that part's mutation rate; < 1 conserve it.

## Requirements

A modern browser with ES6 module support (Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+). No build step, no bundler.
