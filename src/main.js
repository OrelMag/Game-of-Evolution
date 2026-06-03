import { Genome } from './genome/genome.js';
import { Simulation } from './simulation/simulation.js';
import { ControlsPanel } from './ui/controls.js';
import { SelectionPanel } from './ui/selectionPanel.js';
import { TreeView } from './ui/treeView.js';
import { CreaturePanel } from './ui/creaturePanel.js';

// ── App state ─────────────────────────────────────────────────────────────
let rootGenome     = Genome.random();
let currentRoot    = null;  // TreeNode root of the last simulation
let selectedNode   = null;
let predatorRoot   = null;  // TreeNode root of predator tree (if any)
let awaitingTarget = false; // true while waiting for user to click a node to set as target

// ── UI components ─────────────────────────────────────────────────────────
const controls = new ControlsPanel({
  onRun:       handleRun,
  onRandomize: handleRandomize,
});

const selectionPanel = new SelectionPanel({
  onTargetPick: () => {
    awaitingTarget = true;
    document.getElementById('tree-container').style.cursor = 'crosshair';
    // eslint-disable-next-line no-alert
    window.alert('Click any creature in the tree to set it as the target genome.');
  },
});

const preyTreeView = new TreeView({
  svgId:        'tree-svg',
  nodesGroupId: 'tree-nodes',
  edgesGroupId: 'tree-edges',
  isPredator:   false,
  onSelect:     handleNodeSelect,
});

const predTreeView = new TreeView({
  svgId:        'predator-tree-svg',
  nodesGroupId: 'predator-nodes',
  edgesGroupId: 'predator-edges',
  isPredator:   true,
  onSelect:     () => {}, // predator nodes not inspectable for now
});

const creaturePanel = new CreaturePanel({
  onGotoParent: node => {
    selectedNode = node;
    creaturePanel.show(node);
    preyTreeView.selectNode(node.id);
    selectionPanel.updateHammingFor(node.genome);
  },
  onSetTarget: genome => {
    selectionPanel.setTargetFromGenome(genome);
  },
});

// ── Event handlers ─────────────────────────────────────────────────────────

function handleRun({ generations, branchingFactor, mutationRate }) {
  controls.setRunning(true);

  // Build selection engine from current panel state
  const { engine, predatorMode } = selectionPanel.buildEngine(branchingFactor, mutationRate);

  // Wire predator stepping into the simulation loop if active
  let selEngine = engine;
  if (predatorMode) {
    // Wrap engine so stepPredator is called after each generation
    selEngine = _wrapWithPredator(engine, predatorMode);
  }

  const sim = new Simulation({
    generations,
    branchingFactor,
    mutationRate,
    rootGenome,
    selectionEngine:  selEngine.modes?.length > 0 ? selEngine : null,
    selectionStrength: _getSelectionStrength(selectionPanel),
  });

  // Run (synchronous — capped at 512 nodes so never blocks long)
  currentRoot = sim.run();
  predatorRoot = predatorMode?.predatorRoot ?? null;

  // Render prey tree
  preyTreeView.render(currentRoot);

  // Render predator tree
  const predContainer = document.getElementById('predator-tree-container');
  if (predatorRoot) {
    predContainer.classList.remove('hidden');
    predTreeView.render(predatorRoot);
  } else {
    predContainer.classList.add('hidden');
  }

  // Auto-select root node
  handleNodeSelect(currentRoot);
  preyTreeView.selectNode(currentRoot.id);

  controls.setRunning(false);
}

function handleRandomize() {
  rootGenome = Genome.random();
  // If we already have a simulation, re-run it with the new root
  if (currentRoot) {
    handleRun({
      generations:     controls.generations,
      branchingFactor: controls.branchingFactor,
      mutationRate:    controls.mutationRate,
    });
  } else {
    const node = { genome: rootGenome, parent: null, generation: 0, fitness: 1, alive: true, id: -1, children: [] };
    creaturePanel.show(node);
  }
}

function handleNodeSelect(node) {
  selectedNode = node;

  if (awaitingTarget) {
    awaitingTarget = false;
    document.getElementById('tree-container').style.cursor = '';
    selectionPanel.setTargetFromGenome(node.genome);
    return;
  }

  creaturePanel.show(node);
  preyTreeView.selectNode(node.id);
  selectionPanel.updateHammingFor(node.genome);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _getSelectionStrength(panel) {
  const tab = panel.activeTab;
  if (tab === 'env')     return parseInt(document.getElementById('env-strength')?.value ?? 60, 10) / 100;
  if (tab === 'target')  return parseInt(document.getElementById('target-strength')?.value ?? 70, 10) / 100;
  if (tab === 'predator') return parseInt(document.getElementById('pred-strength')?.value ?? 65, 10) / 100;
  return 0;
}

/**
 * Wraps a SelectionEngine so the predator advances each generation.
 * Achieved by overriding computeFitness to also step the predator
 * the first time a new generation is seen.
 */
function _wrapWithPredator(engine, predatorMode) {
  let lastGen = -1;
  let lastPreyFrontier = [];

  return {
    modes: engine.modes,
    computeFitness(node, allNodes, generation) {
      if (generation !== lastGen) {
        // Advance predator for this new generation using previous prey frontier
        predatorMode.stepPredator(generation, lastPreyFrontier);
        lastGen = generation;
        lastPreyFrontier = [];
      }
      lastPreyFrontier.push(node);
      return engine.computeFitness(node, allNodes, generation);
    },
    applySelection(nodes, strength) {
      return engine.applySelection(nodes, strength);
    },
  };
}

// ── Initial state: show ancestor creature on load ─────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const node = { genome: rootGenome, parent: null, generation: 0, fitness: 1, alive: true, id: -1, children: [] };
  creaturePanel.show(node);
});
