import { Genome } from './genome/genome.js';
import { Simulation } from './simulation/simulation.js';
import { TreeNode } from './simulation/treeNode.js';
import { StatsCollector } from './simulation/statsCollector.js';
import { SpeciationEngine } from './simulation/speciationEngine.js';
import { ControlsPanel } from './ui/controls.js';
import { SelectionPanel } from './ui/selectionPanel.js';
import { TreeView } from './ui/treeView.js';
import { CreaturePanel } from './ui/creaturePanel.js';
import { StatsView } from './ui/statsView.js';
import { VotingOverlay } from './ui/votingOverlay.js';
import { DriftView } from './ui/driftView.js';
import { LineageView } from './ui/lineageView.js';

// Fisher-Yates random subsampling (mirrors the helper in selectionEngine.js)
function _wfSample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  copy.slice(n).forEach(node => { node.alive = false; });
  return copy.slice(0, n);
}

// ── App state ─────────────────────────────────────────────────────────────
let rootGenome   = Genome.random();
let currentRoot  = null;
let selectedNode = null;
let predatorRoot = null;
let awaitingTarget = false;
let compareMode  = false;
let compareNodeA = null;
let compareNodeB = null;

// Playback state
let _playbackGen        = null;
let _playbackState      = 'idle'; // 'idle'|'playing'|'paused'|'voting'|'done'
let _playbackTimer      = null;
let _pendingSurvivors   = undefined;
let _stepInProgress     = false;
let _currentSelEngine   = null;
let _currentStrength    = 0;
let _currentEffPopSize  = Infinity;
let _artificialMode     = false;
let _statsCollector     = new StatsCollector();

const SELECTION_DELAY_MS = 280; // wait after showing nodes before marking dead ones

// ── UI components ─────────────────────────────────────────────────────────
const controls = new ControlsPanel({
  onRun:       params => startPlayback(params),
  onRandomize: handleRandomize,
  onPause:     handlePause,
  onResume:    handleResume,
  onStep:      handleStep,
  onScrub:     gen => {
    preyTreeView.setGenerationCutoff(gen);
    statsView.setTimeCursor(gen);
    statsView.redraw();
  },
});

const selectionPanel = new SelectionPanel({
  onTargetPick: () => {
    awaitingTarget = true;
    document.getElementById('tree-container').style.cursor = 'crosshair';
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
  onSelect:     () => {},
});

const creaturePanel = new CreaturePanel({
  onGotoParent: node => {
    selectedNode = node;
    creaturePanel.show(node);
    preyTreeView.selectNode(node.id);
    selectionPanel.updateHammingFor(node.genome);
  },
  onSetTarget:   genome => selectionPanel.setTargetFromGenome(genome),
  onCompare:     () => handleEnterCompareMode(),
  onExitCompare: () => handleExitCompareMode(),
  onFindMRCA:    (nodeA, nodeB) => handleFindMRCA(nodeA, nodeB),
});

const statsView     = new StatsView('stats-canvas');
const driftView     = new DriftView('drift-canvas');
const votingOverlay = new VotingOverlay();

let _traceState = 'idle'; // 'idle'|'running'|'done'

const lineageView = new LineageView({
  containerId: 'trace-view-mount',
  onSelect: snapshot => creaturePanel.show(snapshot),
  onComplete: () => {
    _traceState = 'done';
    document.getElementById('btn-run-trace').disabled  = false;
    document.getElementById('btn-stop-trace').disabled = true;
  },
});

let _maxGen = 0;
const _speciationEngine = new SpeciationEngine();

// ── Playback ──────────────────────────────────────────────────────────────

function startPlayback({ generations, branchingFactor, mutationRate }) {
  handleExitCompareMode();
  preyTreeView.clearClade();
  preyTreeView.clearMRCA();
  controls.hideScrubber();
  _maxGen = 0;
  // Cancel any in-progress playback
  clearTimeout(_playbackTimer);
  _playbackTimer    = null;
  _stepInProgress   = false;
  _pendingSurvivors = undefined;

  const { engine, predatorMode } = selectionPanel.buildEngine(branchingFactor, mutationRate);
  let selEngine = engine;
  if (predatorMode) selEngine = _wrapWithPredator(engine, predatorMode);

  _currentSelEngine  = selEngine.modes?.length > 0 ? selEngine : null;
  _currentStrength   = selectionPanel.selectionStrength;
  _currentEffPopSize = selectionPanel.effectivePopSize;
  _artificialMode    = selectionPanel.isPlayerMode;
  _statsCollector    = new StatsCollector();
  statsView.update([]);

  const sim = new Simulation({
    generations,
    branchingFactor,
    mutationRate,
    rootGenome,
    selectionEngine:          _currentSelEngine,
    selectionStrength:        _currentStrength,
    useCrossover:             controls.useCrossover,
    mutationMode:             controls.mutationMode,
    transpositionRate:        controls.transpositionRate,
    inversionRate:            controls.inversionRate,
    proportionalReproduction: controls.proportionalReproduction,
    effectivePopSize:         _currentEffPopSize,
  });

  currentRoot  = sim.root;
  predatorRoot = predatorMode?.predatorRoot ?? null;

  _speciationEngine.reset();
  preyTreeView.showSpeciesColors = document.getElementById('ctrl-speciation')?.checked ?? false;

  preyTreeView.render(sim.root);

  const predContainer = document.getElementById('predator-tree-container');
  if (predatorRoot) {
    predContainer.classList.remove('hidden');
    predTreeView.render(predatorRoot);
  } else {
    predContainer.classList.add('hidden');
  }

  handleNodeSelect(sim.root);
  preyTreeView.selectNode(sim.root.id);

  _playbackGen   = sim.runGenerator();
  _playbackState = 'playing';
  controls.setPlaybackState('playing');

  _runStep();
}

function _runStep() {
  if (_stepInProgress) return;
  if (!_playbackGen) return;
  if (_playbackState !== 'playing' && _playbackState !== 'paused') return;

  _stepInProgress = true;

  const { value, done } = _playbackGen.next(_pendingSurvivors);
  _pendingSurvivors = undefined;

  if (done || !value) {
    _stepInProgress = false;
    _playbackState  = 'done';
    controls.setPlaybackState('done');
    controls.showScrubber(_maxGen);
    return;
  }

  const { generation, newNodes } = value;
  if (generation > _maxGen) _maxGen = generation;

  // Show new nodes (all alive initially — selection result shown after a brief delay)
  preyTreeView.addGeneration(currentRoot, newNodes);
  if (preyTreeView.showSpeciesColors) _speciationEngine.assignSpecies(newNodes);
  _statsCollector.record(generation, newNodes);
  statsView.update(_statsCollector.generations);
  driftView.updateLatest(_statsCollector);

  // Player voting mode — async, does not auto-advance
  if (_artificialMode) {
    _playbackState = 'voting';
    controls.setPlaybackState('voting');
    votingOverlay.show(newNodes).then(survivors => {
      const keptIds = new Set(survivors.map(n => n.id));
      newNodes.forEach(n => { n.alive = keptIds.has(n.id); });
      preyTreeView.refreshNodes(newNodes);
      _pendingSurvivors = survivors.filter(n => n.alive);
      _stepInProgress   = false;
      _playbackState    = 'paused';
      controls.setPlaybackState('paused');
      // User must press Step or Resume to continue
    });
    return;
  }

  // Auto selection — compute survivors then show dead overlay after a short delay
  let autoSurvivors;
  if (_currentSelEngine) {
    autoSurvivors = _currentSelEngine.applySelection(newNodes, _currentStrength, _currentEffPopSize);
  } else if (isFinite(_currentEffPopSize) && newNodes.length > _currentEffPopSize) {
    // Pure drift: no selection engine but effective pop size is capped
    newNodes.forEach(n => { n.alive = true; });
    autoSurvivors = _wfSample(newNodes, _currentEffPopSize);
  } else {
    newNodes.forEach(n => { n.alive = true; });
    autoSurvivors = [...newNodes];
  }
  _pendingSurvivors = autoSurvivors;

  setTimeout(() => {
    preyTreeView.refreshNodes(newNodes);
    if (predatorRoot) predTreeView.render(predatorRoot);

    _stepInProgress = false;

    if (_playbackState === 'playing') {
      const delay = Math.max(50, controls.playbackSpeed - SELECTION_DELAY_MS);
      _playbackTimer = setTimeout(_runStep, delay);
    }
    // If paused (user pressed Pause during the delay): stay paused, don't schedule
  }, SELECTION_DELAY_MS);
}

function handlePause() {
  if (_playbackState !== 'playing') return;
  clearTimeout(_playbackTimer);
  _playbackTimer = null;
  _playbackState = 'paused';
  controls.setPlaybackState('paused');
}

function handleResume() {
  if (_playbackState !== 'paused') return;
  _playbackState = 'playing';
  controls.setPlaybackState('playing');
  _runStep();
}

function handleStep() {
  if (_playbackState === 'idle' || _playbackState === 'done') {
    // Start a new simulation but stay paused after each step
    startPlayback({
      generations:     controls.generations,
      branchingFactor: controls.branchingFactor,
      mutationRate:    controls.mutationRate,
    });
    // Will be in 'playing' — immediately go to paused so only 1 step runs
    _playbackState = 'paused';
    controls.setPlaybackState('paused');
    return;
  }
  if (_playbackState === 'paused') {
    clearTimeout(_playbackTimer);
    _playbackState = 'playing'; // temporarily so _runStep proceeds
    _runStep();
    // After _runStep runs (sync part), if it scheduled a timeout, cancel it
    // and go back to paused. The async part (SELECTION_DELAY_MS) will also
    // check state before scheduling the next step.
    clearTimeout(_playbackTimer);
    _playbackTimer = null;
    if (_playbackState === 'playing') {
      _playbackState = 'paused';
      controls.setPlaybackState('paused');
    }
  }
}

// ── Stats panel toggle ────────────────────────────────────────────────────
function _toggleStats() {
  const panel   = document.getElementById('stats-panel');
  const showBtn = document.getElementById('btn-show-stats');
  if (!panel) return;
  const justHid = panel.classList.toggle('hidden');
  if (showBtn) showBtn.classList.toggle('hidden', !justHid);
  if (!justHid) statsView.update(_statsCollector.generations);
}
document.getElementById('btn-toggle-stats')?.addEventListener('click', _toggleStats);
document.getElementById('btn-show-stats')?.addEventListener('click', _toggleStats);

// ── Drift heatmap toggle ──────────────────────────────────────────────────
function _toggleDrift() {
  const panel   = document.getElementById('drift-panel');
  const showBtn = document.getElementById('btn-show-drift');
  if (!panel) return;
  const justHid = panel.classList.toggle('hidden');
  if (showBtn) showBtn.classList.toggle('hidden', !justHid);
  if (!justHid) driftView.updateLatest(_statsCollector);
}
document.getElementById('btn-toggle-drift')?.addEventListener('click', _toggleDrift);
document.getElementById('btn-show-drift')?.addEventListener('click', _toggleDrift);

// ── MRCA finder ───────────────────────────────────────────────────────────
function handleFindMRCA(nodeA, nodeB) {
  const mrca = TreeNode.findMRCA(nodeA, nodeB);
  if (!mrca) {
    creaturePanel.showMRCAInfo(null, 0, 0);
    return;
  }
  const genDistA = nodeA.generation - mrca.generation;
  const genDistB = nodeB.generation - mrca.generation;
  creaturePanel.showMRCAInfo(mrca, genDistA, genDistB);
  preyTreeView.highlightMRCA(mrca);
  preyTreeView.highlightClade(mrca);
}

// ── Other handlers ────────────────────────────────────────────────────────

function handleRandomize() {
  rootGenome = Genome.random();
  if (currentRoot) {
    startPlayback({
      generations:     controls.generations,
      branchingFactor: controls.branchingFactor,
      mutationRate:    controls.mutationRate,
    });
  } else {
    creaturePanel.show({ genome: rootGenome, parent: null, generation: 0, fitness: 1, alive: true, id: -1, children: [] });
  }
}

function handleNodeSelect(node) {
  if (awaitingTarget) {
    awaitingTarget = false;
    document.getElementById('tree-container').style.cursor = '';
    selectionPanel.setTargetFromGenome(node.genome);
    return;
  }

  if (compareMode) {
    handleShowComparison(compareNodeA, node);
    return;
  }

  selectedNode = node;
  creaturePanel.show(node);
  preyTreeView.selectNode(node.id);
  selectionPanel.updateHammingFor(node.genome);
}

function handleEnterCompareMode() {
  if (!selectedNode) return;
  compareMode  = true;
  compareNodeA = selectedNode;
  compareNodeB = null;
  document.getElementById('tree-container').style.cursor = 'crosshair';
  creaturePanel.showComparePrompt();
  preyTreeView.markCompareA(compareNodeA.id);
}

function handleExitCompareMode() {
  compareMode  = false;
  compareNodeA = null;
  compareNodeB = null;
  document.getElementById('tree-container').style.cursor = '';
  preyTreeView.clearCompareMarks();
  document.getElementById('panel-creature').classList.remove('compare-mode');
  creaturePanel.exitCompare();
  if (selectedNode) {
    preyTreeView.selectNode(selectedNode.id);
    creaturePanel.show(selectedNode);
    selectionPanel.updateHammingFor(selectedNode.genome);
  }
}

function handleShowComparison(nodeA, nodeB) {
  if (nodeA.id === nodeB.id) return;
  compareNodeB = nodeB;
  compareMode  = false;
  document.getElementById('tree-container').style.cursor = '';
  preyTreeView.markCompareB(nodeB.id);
  document.getElementById('panel-creature').classList.add('compare-mode');
  creaturePanel.showCompare(nodeA, nodeB);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _wrapWithPredator(engine, predatorMode) {
  let lastGen = -1;
  let lastPreyFrontier = [];

  return {
    modes: engine.modes,
    computeFitness(node, allNodes, generation) {
      if (generation !== lastGen) {
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

// ── Mode tabs (Tree / Trace) ──────────────────────────────────────────────
document.getElementById('tab-tree')?.addEventListener('click', () => {
  document.getElementById('tree-row').classList.remove('hidden');
  document.getElementById('trace-panel').classList.add('hidden');
  document.getElementById('tab-tree').classList.add('active');
  document.getElementById('tab-trace').classList.remove('active');
});

document.getElementById('tab-trace')?.addEventListener('click', () => {
  document.getElementById('tree-row').classList.add('hidden');
  document.getElementById('trace-panel').classList.remove('hidden');
  document.getElementById('tab-tree').classList.remove('active');
  document.getElementById('tab-trace').classList.add('active');
});

// ── Lineage trace controls ────────────────────────────────────────────────
document.getElementById('btn-run-trace')?.addEventListener('click', () => {
  if (_traceState === 'running') return;
  const generations   = Math.max(1, parseInt(document.getElementById('trace-generations').value, 10) || 1000);
  const snapshotCount = Math.max(1, parseInt(document.getElementById('trace-snapshots').value,   10) || 50);
  const { engine } = selectionPanel.buildEngine(1, controls.mutationRate);

  _traceState = 'running';
  document.getElementById('btn-run-trace').disabled  = true;
  document.getElementById('btn-stop-trace').disabled = false;

  lineageView.startTrace({
    startGenome:       rootGenome,
    generations,
    snapshotCount,
    mutationRate:      controls.mutationRate,
    mutationMode:      controls.mutationMode,
    transpositionRate: controls.transpositionRate,
    inversionRate:     controls.inversionRate,
    selectionEngine:   engine.modes?.length > 0 ? engine : null,
  });
});

document.getElementById('btn-stop-trace')?.addEventListener('click', () => {
  lineageView.stopTrace();
  _traceState = 'idle';
  document.getElementById('btn-run-trace').disabled  = false;
  document.getElementById('btn-stop-trace').disabled = true;
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  switch (e.key) {
    case ' ':
      e.preventDefault();
      if (_playbackState === 'playing') handlePause();
      else if (_playbackState === 'paused') handleResume();
      break;
    case 'f':
    case 'F':
      preyTreeView.fitView();
      break;
    case 'Escape':
      preyTreeView.clearClade();
      preyTreeView.clearMRCA();
      if (compareMode || compareNodeA) handleExitCompareMode();
      break;
    case 'ArrowRight':
      if (selectedNode && selectedNode.children.length > 0) {
        const child = selectedNode.children[0];
        selectedNode = child;
        preyTreeView.selectNode(child.id);
        creaturePanel.show(child);
        selectionPanel.updateHammingFor(child.genome);
      }
      break;
    case 'ArrowLeft':
      if (selectedNode && selectedNode.parent) {
        const parent = selectedNode.parent;
        selectedNode = parent;
        preyTreeView.selectNode(parent.id);
        creaturePanel.show(parent);
        selectionPanel.updateHammingFor(parent.genome);
      }
      break;
    case 's':
    case 'S':
      if (_playbackState === 'paused' || _playbackState === 'idle' || _playbackState === 'done') {
        handleStep();
      }
      break;
    case 'g':
    case 'G':
      document.getElementById('ctrl-generations')?.focus();
      break;
  }
});

// ── URL hash: restore a shared creature on load ───────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash;
  if (hash.startsWith('#g=')) {
    try { rootGenome = Genome.fromString(hash.slice(3)); } catch (_) {}
  }
  const node = { genome: rootGenome, parent: null, generation: 0, fitness: 1, alive: true, id: -1, children: [] };
  creaturePanel.show(node);
});
