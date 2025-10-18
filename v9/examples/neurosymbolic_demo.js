#!/usr/bin/env node

/**
 * @file: examples/neurosymbolic_demo.js
 * @description: Runnable example showcasing SeNARS's neurosymbolic integration capabilities
 * This is a full-screen console TUI demonstrating the collaboration between 
 * neural (LM) and symbolic (NARS) components.
 */

import System from '../core/system/System.js';  // The main System with LM integration
import Bag from '../core/memory/Bag.js';
import blessed from 'blessed';
import { GoalDecompositionRule } from '../core/reasoning/lm/rules/GoalDecompositionRule.js';
import { HypothesisGenerationRule } from '../core/reasoning/lm/rules/HypothesisGenerationRule.js';
import { VariableGroundingRule } from '../core/reasoning/lm/rules/VariableGroundingRule.js';
import { BeliefRevisionRule } from '../core/reasoning/lm/rules/BeliefRevisionRule.js';
import { ExplanationGenerationRule } from '../core/reasoning/lm/rules/ExplanationGenerationRule.js';
import { SchemaInductionRule } from '../core/reasoning/lm/rules/SchemaInductionRule.js';
import { UncertaintyCalibrationRule } from '../core/reasoning/lm/rules/UncertaintyCalibrationRule.js';
import { TemporalCausalModelingRule } from '../core/reasoning/lm/rules/TemporalCausalModelingRule.js';
import { MetaReasoningGuidanceRule } from '../core/reasoning/lm/rules/MetaReasoningGuidanceRule.js';
import { InteractiveClarificationRule } from '../core/reasoning/lm/rules/InteractiveClarificationRule.js';
import { AnalogicalReasoningRule } from '../core/reasoning/lm/rules/AnalogicalReasoningRule.js';
import { TaskPremise } from '../core/reasoning/Premise.js';

// Default configuration
const DEFAULT_INPUT = "Ensure Earth Happiness!";
const DEFAULT_LM_PROVIDER = "xenova";

// Global state
let system = null;  // The main System instance (with both NAR and LM)
let nar = null;     // The NAR component within the system
let isRunning = false;
let taskSortMode = 'priority'; // priority, creationTime
let taskUpdateInterval = null;
let logLines = [];
const MAX_LOG_LINES = 5000;

/**
 * Process tasks through the new unified reasoning system with enhanced neurosymbolic capabilities
 */
async function processNeurosymbolicRules() {
  if (!system || !system.core || !system.core.focus || !system.lm) return;

  try {
    // Get focus items to process
    const focusItems = system.core.focus.getFocusItems ? system.core.focus.getFocusItems() : [];
    if (focusItems.length === 0) {
      return;
    }

    // For reasoning, we use probabilistic sampling from a Bag.
    const taskBag = new Bag();
    for (const [key, taskData] of focusItems) {
      const priority = typeof taskData.getPriority === 'function' ? taskData.getPriority() : (taskData.priority || 0);
      taskBag.put(key, taskData, priority);
    }

    // Sample one task to process for this cycle to simulate the NAR's single-premise reasoning.
    const sampledTaskData = taskBag.sample();
    if (!sampledTaskData) {
      return;
    }
    const focusTask = sampledTaskData.item;

    // Enhanced neurosymbolic processing with multiple capabilities
    await processNeurosymbolicCapabilities(focusTask);

  } catch (error) {
    console.error('Error processing neurosymbolic rules:', error);
    addLogLine(`⚠️  Neurosymbolic reasoning error: ${error.message}`);
  }
}

/**
 * Enhanced neurosymbolic processing demonstrating multiple capabilities
 */
async function processNeurosymbolicCapabilities(focusTask) {
  if (!focusTask || !system || !system.lm) return;

  const taskTerm = typeof focusTask.term === 'string' ? focusTask.term :
                   (focusTask.term && typeof focusTask.term.toString === 'function' ? focusTask.term.toString() : 'Unknown');

  // 1. Goal Decomposition: Break down high-level goals into subtasks
  if (focusTask.punctuation === '!' && taskTerm && !isPrimitiveGoal(taskTerm)) {
    await demonstrateGoalDecomposition(focusTask, taskTerm);
  }

  // 2. Hypothesis Generation: Generate explanations for questions/observations
  if (focusTask.punctuation === '?' || focusTask.punctuation === '.') {
    await demonstrateHypothesisGeneration(focusTask, taskTerm);
  }

  // 3. Symbol Grounding: Link abstract symbols to real-world meaning
  if (focusTask.punctuation === '.' && containsAbstractSymbol(taskTerm)) {
    await demonstrateSymbolGrounding(focusTask, taskTerm);
  }

  // 4. Explanation Generation: Translate formal conclusions to natural language
  if (focusTask.punctuation === '.' && isConclusion(taskTerm)) {
    await demonstrateExplanationGeneration(focusTask, taskTerm);
  }

  // 5. Belief Revision: Help resolve contradictions using LM
  if (focusTask.punctuation === '.' && isContradiction(taskTerm)) {
    await demonstrateBeliefRevision(focusTask, taskTerm);
  }

  // 6. Schema Induction: Extract action schemas from narrative or instructions
  if (focusTask.punctuation === '.' && isNarrative(taskTerm)) {
    await demonstrateSchemaInduction(focusTask, taskTerm);
  }

  // 7. Uncertainty Calibration: Map LM confidence to NARS truth values
  if (focusTask.punctuation === '.' && hasUncertainty(taskTerm)) {
    await demonstrateUncertaintyCalibration(focusTask, taskTerm);
  }

  // 8. Temporal/Causal Modeling: Infer time order or causality from text
  if (focusTask.punctuation === '.' && isTemporalCausal(taskTerm)) {
    await demonstrateTemporalCausalModeling(focusTask, taskTerm);
  }

  // 9. Meta-Reasoning Guidance: Get reasoning strategy recommendations
  if (focusTask.punctuation === '!' && isComplexGoal(taskTerm)) {
    await demonstrateMetaReasoningGuidance(focusTask, taskTerm);
  }

  // 10. Interactive Clarification: Generate disambiguating questions when needed
  if (focusTask.punctuation === '?' && isAmbiguous(taskTerm)) {
    await demonstrateInteractiveClarification(focusTask, taskTerm);
  }

  // 11. Enhanced Task Tree Visualization: Show reasoning hierarchy
  await enhanceTaskTreeVisualization(focusTask, taskTerm);
}

/**
 * Check if a goal is primitive (doesn't need decomposition)
 */
function isPrimitiveGoal(taskTerm) {
  const primitiveGoals = ['eat', 'sleep', 'walk', 'run', 'drink', 'breathe'];
  return primitiveGoals.some(goal => taskTerm.toLowerCase().includes(goal));
}

/**
 * Check if task term contains abstract symbols that need grounding
 */
function containsAbstractSymbol(taskTerm) {
  const abstractSymbols = ['happiness', 'wealth', 'success', 'health', 'freedom', 'justice', 'love'];
  return abstractSymbols.some(symbol => taskTerm.toLowerCase().includes(symbol));
}

/**
 * Check if task represents a conclusion that should be explained
 */
function isConclusion(taskTerm) {
  return taskTerm.includes('==>') || taskTerm.includes('<->') || taskTerm.includes('=/');
}

/**
 * Demonstrate goal decomposition capabilities
 */
async function demonstrateGoalDecomposition(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.decomposition} ${COLORS.process.translation}Triggering goal decomposition for: ${taskTerm}{/}`);

    // Create a task that will trigger the GoalDecompositionRule
    const decompositionTask = {
      term: taskTerm,
      punctuation: '!',
      truth: { frequency: 0.9, confidence: 0.8 },
      priority: 0.8
    };

    await system.input(decompositionTask);
    addLogLine(`${NEUROSYMBOLIC.icons.decomposition} ${COLORS.task.decomposition}Goal decomposition triggered{/}`);

    // The rule will automatically generate subgoals when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Goal decomposition error: ${error.message}`);
  }
}

/**
 * Demonstrate hypothesis generation capabilities
 */
async function demonstrateHypothesisGeneration(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.hypothesis} ${COLORS.process.lmConsultation}Triggering hypothesis generation for: ${taskTerm}{/}`);

    // Create a belief that will trigger the HypothesisGenerationRule
    const beliefTask = {
      term: taskTerm,
      punctuation: '.',
      truth: { frequency: 0.8, confidence: 0.7 },
      priority: 0.7
    };

    await system.input(beliefTask);
    addLogLine(`${NEUROSYMBOLIC.icons.hypothesis} ${COLORS.task.hypothesis}Hypothesis generation triggered{/}`);

    // The rule will automatically generate hypotheses when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Hypothesis generation error: ${error.message}`);
  }
}

/**
 * Demonstrate symbol grounding capabilities
 */
async function demonstrateSymbolGrounding(focusTask, taskTerm) {
  try {
    // Extract abstract symbols from the task term
    const abstractSymbols = extractAbstractSymbols(taskTerm);

    for (const symbol of abstractSymbols) {
      addLogLine(`${NEUROSYMBOLIC.icons.grounding} ${COLORS.process.grounding}Triggering symbol grounding for: ${symbol}{/}`);

      // Create a belief containing the variable that will trigger VariableGroundingRule
      const variableTask = {
        term: `(${symbol.replace(/ /g, '_')} --> ?X)`,  // Using variable pattern to trigger grounding
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.7 },
        priority: 0.7
      };

      await system.input(variableTask);
      addLogLine(`${NEUROSYMBOLIC.icons.grounding} ${COLORS.task.grounding}Symbol grounding triggered for ${symbol}{/}`);

      // The rule will automatically ground the symbol when it processes this task
    }
  } catch (error) {
    addLogLine(`⚠️  Symbol grounding error: ${error.message}`);
  }
}

/**
 * Demonstrate explanation generation capabilities
 */
async function demonstrateExplanationGeneration(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.explanation} ${COLORS.process.explanation}Triggering explanation generation for: ${taskTerm}{/}`);

    // Create a complex relationship that will trigger the ExplanationGenerationRule
    const explanationTask = {
      term: taskTerm,
      punctuation: '.',
      truth: { frequency: 0.8, confidence: 0.7 },
      priority: 0.6
    };

    await system.input(explanationTask);
    addLogLine(`${NEUROSYMBOLIC.icons.explanation} ${COLORS.task.belief}Explanation generation triggered{/}`);

    // The rule will automatically generate explanations when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Explanation generation error: ${error.message}`);
  }
}

/**
 * Extract abstract symbols from a task term
 */
function extractAbstractSymbols(taskTerm) {
  const abstractSymbols = ['happiness', 'wealth', 'success', 'health', 'freedom', 'justice', 'love', 'peace', 'knowledge', 'power'];
  return abstractSymbols.filter(symbol => taskTerm.toLowerCase().includes(symbol));
}

/**
 * Check if a term represents a decomposition relationship
 */
function isDecomposition(term) {
  return term.includes('decomposition') || term.includes('subgoal') || term.includes('part_of');
}

/**
 * Check if a term represents symbol grounding
 */
function isGrounding(term) {
  return term.includes('grounded_meaning') || term.includes('definition') || term.includes('means');
}

/**
 * Get visual indicator for task type
 */
function getTaskTypeIndicator(taskType) {
  const indicators = {
    goal: '[GOAL]',
    belief: '[BELIEF]',
    question: '[QUESTION]',
    hypothesis: '[HYPOTHESIS]',
    decomposition: '[DECOMP]',
    grounding: '[GROUNDING]'
  };
  return indicators[taskType] || '[BELIEF]';
}

/**
 * Get task type description from punctuation
 */
function getTaskTypeFromPunctuation(punctuation) {
  const typeMap = {
    '!': '[GOAL]',
    '?': '[QUESTION]',
    '.': '[BELIEF]'
  };
  return typeMap[punctuation] || '[BELIEF]';
}

/**
 * Check if a task represents narrative that can be used for schema induction
 */
function isNarrative(taskTerm) {
  const narrativeKeywords = ['story', 'procedure', 'instruction', 'guide', 'when', 'then', 'after', 'before'];
  return narrativeKeywords.some(keyword => taskTerm.toLowerCase().includes(keyword));
}

/**
 * Check if a task has uncertainty indicators
 */
function hasUncertainty(taskTerm) {
  const uncertaintyKeywords = ['maybe', 'perhaps', 'likely', 'unlikely', 'uncertain', 'probably', 'possibly'];
  return uncertaintyKeywords.some(keyword => taskTerm.toLowerCase().includes(keyword));
}

/**
 * Demonstrate schema induction from narrative or instructions
 */
async function demonstrateSchemaInduction(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.decomposition} ${COLORS.process.translation}Triggering schema induction for: ${taskTerm}{/}`);

    // Create a narrative or procedural task that will trigger the SchemaInductionRule
    const narrativeTask = {
      term: `when ${taskTerm.replace(/ /g, '_')} then perform_action_sequence`,  // Pattern to indicate procedure/narrative
      punctuation: '.',
      truth: { frequency: 0.8, confidence: 0.7 },
      priority: 0.6
    };

    await system.input(narrativeTask);
    addLogLine(`${NEUROSYMBOLIC.icons.decomposition} ${COLORS.task.decomposition}Schema induction triggered{/}`);

    // The rule will automatically induce schemas when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Schema induction error: ${error.message}`);
  }
}

/**
 * Demonstrate uncertainty calibration from LM confidence to NARS truth values
 */
async function demonstrateUncertaintyCalibration(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.uncertainty} ${COLORS.process.uncertainty}Triggering uncertainty calibration for: ${taskTerm}{/}`);

    // Create a belief with uncertainty indicators that will trigger the UncertaintyCalibrationRule
    const uncertainTask = {
      term: `maybe_${taskTerm.replace(/ /g, '_')} happens`,  // Use uncertainty-indicating pattern
      punctuation: '.',
      truth: { frequency: 0.5, confidence: 0.5 }, // Start with neutral values
      priority: 0.6
    };

    await system.input(uncertainTask);
    addLogLine(`${NEUROSYMBOLIC.icons.uncertainty} ${COLORS.task.belief}Uncertainty calibration triggered{/}`);

    // The rule will automatically calibrate truth values when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Uncertainty calibration error: ${error.message}`);
  }
}

/**
 * Check if a task contains temporal or causal relationships
 */
function isTemporalCausal(taskTerm) {
  const temporalKeywords = ['before', 'after', 'when', 'then', 'while', 'during', 'causes', 'leads to', 'results in'];
  return temporalKeywords.some(keyword => taskTerm.toLowerCase().includes(keyword));
}

/**
 * Check if a goal is complex and needs meta-reasoning guidance
 */
function isComplexGoal(taskTerm) {
  const complexityIndicators = ['achieve', 'ensure', 'maintain', 'optimize', 'balance', 'maximize', 'minimize'];
  return complexityIndicators.some(indicator => taskTerm.toLowerCase().includes(indicator));
}

/**
 * Demonstrate temporal/causal modeling capabilities
 */
async function demonstrateTemporalCausalModeling(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.temporal} ${COLORS.process.temporal}Triggering temporal/causal modeling for: ${taskTerm}{/}`);

    // Create a belief with temporal/causal indicators that will trigger the TemporalCausalModelingRule
    const temporalTask = {
      term: `after ${taskTerm.replace(/ /g, '_')}_event then consequence_event`,  // Use temporal pattern
      punctuation: '.',
      truth: { frequency: 0.7, confidence: 0.6 },
      priority: 0.7
    };

    await system.input(temporalTask);
    addLogLine(`${NEUROSYMBOLIC.icons.temporal} ${COLORS.task.belief}Temporal/causal modeling triggered{/}`);

    // The rule will automatically model temporal/causal relationships when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Temporal modeling error: ${error.message}`);
  }
}

/**
 * Demonstrate meta-reasoning guidance capabilities
 */
async function demonstrateMetaReasoningGuidance(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.meta} ${COLORS.process.meta}Triggering meta-reasoning guidance for: ${taskTerm}{/}`);

    // Create a complex goal that will trigger the MetaReasoningGuidanceRule
    const complexGoalTask = {
      term: `achieve_${taskTerm.replace(/ /g, '_')}_optimally`,  // Use complexity-indicating pattern
      punctuation: '!',
      truth: { frequency: 0.8, confidence: 0.7 },
      priority: 0.9
    };

    await system.input(complexGoalTask);
    addLogLine(`${NEUROSYMBOLIC.icons.meta} ${COLORS.task.belief}Meta-reasoning guidance triggered{/}`);

    // The rule will automatically provide strategy recommendations when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Meta-reasoning guidance error: ${error.message}`);
  }
}

/**
 * Check if a question is ambiguous and needs clarification
 */
function isAmbiguous(taskTerm) {
  const ambiguousTerms = ['it', 'this', 'that', 'they', 'them', 'which', 'what kind', 'how much'];
  return ambiguousTerms.some(term => taskTerm.toLowerCase().includes(term));
}

/**
 * Demonstrate interactive clarification capabilities
 */
async function demonstrateInteractiveClarification(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.clarification} ${COLORS.process.clarification}Triggering interactive clarification for: ${taskTerm}{/}`);

    // Create an ambiguous task that will trigger the InteractiveClarificationRule
    const ambiguousTask = {
      term: `it_${taskTerm.replace(/ /g, '_')} happens`,  // Use ambiguity-indicating pattern like "it" 
      punctuation: '?',
      truth: { frequency: 0.6, confidence: 0.4 }, // Lower confidence due to ambiguity
      priority: 0.7
    };

    await system.input(ambiguousTask);
    addLogLine(`${NEUROSYMBOLIC.icons.clarification} ${COLORS.task.question}Interactive clarification triggered{/}`);

    // The rule will automatically generate clarifying questions when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Interactive clarification error: ${error.message}`);
  }
}

/**
 * Enhance task tree visualization to show reasoning hierarchy
 */
async function enhanceTaskTreeVisualization(focusTask, taskTerm) {
  try {
    // Build and display task hierarchy tree
    const taskTree = await buildTaskHierarchy(focusTask);

    if (taskTree && taskTree.children && taskTree.children.length > 0) {
      addLogLine(`${NEUROSYMBOLIC.icons.decomposition} ${COLORS.process.translation}Task hierarchy updated: ${taskTree.children.length} branches{/}`);

      // Create hierarchy visualization belief
      const hierarchyBelief = `(task_hierarchy_${taskTerm.replace(/[^a-zA-Z0-9]/g, '_')} --> "${taskTree.children.length} branches")`;
      await system.input({
        term: hierarchyBelief,
        punctuation: '.',
        truth: { frequency: 0.95, confidence: 0.9 }
      });
    }
  } catch (error) {
    addLogLine(`⚠️  Task tree visualization error: ${error.message}`);
  }
}

/**
 * Build task hierarchy for visualization
 */
async function buildTaskHierarchy(parentTask) {
  try {
    // Get related tasks from memory
    const relatedTasks = await getRelatedTasks(parentTask);

    return {
      task: parentTask,
      children: relatedTasks || [],
      depth: 0
    };
  } catch (error) {
    console.error('Error building task hierarchy:', error);
    return null;
  }
}

/**
 * Get tasks related to a parent task
 */
async function getRelatedTasks(parentTask) {
  try {
    if (!system || !system.core || !system.core.memory) return [];

    // Get all tasks from memory
    const allTasks = system.core.memory.getAllTasks ? system.core.memory.getAllTasks() : [];

    // Filter tasks that are likely related (subgoals, hypotheses, etc.)
    return allTasks.filter(task => {
      if (!task.term) return false;

      const taskTerm = typeof task.term === 'string' ? task.term :
                      (task.term && typeof task.term.toString === 'function' ? task.term.toString() : '');

      // Check if this task is likely derived from the parent
      return taskTerm.includes('subgoal') ||
             taskTerm.includes('hypothesis') ||
             taskTerm.includes('grounded') ||
             taskTerm.includes('calibrated') ||
             taskTerm.includes('revised');
    }).slice(0, 5); // Limit for display
  } catch (error) {
    console.error('Error getting related tasks:', error);
    return [];
  }
}

/**
 * Check if a task represents a contradiction that needs revision
 */
function isContradiction(taskTerm) {
  return taskTerm.includes('contradiction') || taskTerm.includes('conflict') || taskTerm.includes('inconsistency');
}

/**
 * Demonstrate belief revision capabilities using LM
 */
async function demonstrateBeliefRevision(focusTask, taskTerm) {
  try {
    addLogLine(`${NEUROSYMBOLIC.icons.validation} ${COLORS.process.validation}Triggering belief revision for: ${taskTerm}{/}`);

    // Create a belief with contradiction indicators that will trigger the BeliefRevisionRule
    const contradictionTask = {
      term: `(${taskTerm} && ${taskTerm.replace(/ /g, '_')}_opposite)`,  // Create a contradiction pattern
      punctuation: '.',
      truth: { frequency: 0.5, confidence: 0.5 }, // Lower confidence for contradiction
      priority: 0.8
    };

    await system.input(contradictionTask);
    addLogLine(`${NEUROSYMBOLIC.icons.validation} ${COLORS.task.belief}Belief revision triggered{/}`);

    // The rule will automatically handle contradiction resolution when it processes this task
  } catch (error) {
    addLogLine(`⚠️  Belief revision error: ${error.message}`);
  }
}

/**
 * Setup neurosymbolic integration rules by registering them with the rule manager
 */
function setupNeurosymbolicRules() {
  if (!system || !system.core || !system.core.reasoning || !system.core.lm) {
    addLogLine("⚠️  System not ready for rule registration");
    return;
  }
  
  try {
    // Register all neurosymbolic LM rules with the reasoner
    const rules = [
      new GoalDecompositionRule(system.core.lm),
      new HypothesisGenerationRule(system.core.lm),
      new VariableGroundingRule(system.core.lm),
      new BeliefRevisionRule(system.core.lm),
      new ExplanationGenerationRule(system.core.lm),
      new SchemaInductionRule(system.core.lm),
      new UncertaintyCalibrationRule(system.core.lm),
      new TemporalCausalModelingRule(system.core.lm),
      new MetaReasoningGuidanceRule(system.core.lm),
      new InteractiveClarificationRule(system.core.lm),
      new AnalogicalReasoningRule(system.core.lm)
    ];
    
    for (const rule of rules) {
      system.core.reasoning.registerRule(rule);
      addLogLine(`✅ Registered rule: ${rule.name}`);
    }
    
    addLogLine(`✅ All ${rules.length} neurosymbolic rules registered with reasoner`);
  } catch (error) {
    addLogLine(`❌ Error registering neurosymbolic rules: ${error.message}`);
    console.error('Error registering neurosymbolic rules:', error);
  }
}

// Enhanced color scheme for neurosymbolic visualization
const COLORS = {
  border: 'cyan',
  text: 'white',
  highlight: 'yellow',
  success: 'green',
  error: 'red',
  info: 'blue',
  warning: 'yellow',
  neural: 'magenta',
  symbolic: 'green',
  task: {
    goal: 'magenta',
    belief: 'green',
    question: 'cyan',
    hypothesis: 'yellow',
    decomposition: 'blue',
    grounding: 'red'
  },
  process: {
    lmConsultation: 'brightMagenta',
    reasoningStep: 'brightGreen',
    translation: 'brightCyan',
    validation: 'brightYellow'
  }
};

// Neurosymbolic process indicators
const NEUROSYMBOLIC = {
  icons: {
    neural: '🧠',
    symbolic: '⚙️',
    translation: '🔄',
    hypothesis: '💡',
    grounding: '🔗',
    decomposition: '🌳',
    validation: '✅',
    uncertainty: '📊',
    explanation: '📝',
    clarification: '❓',
    temporal: '⏰',
    meta: '🤔'
  },
  labels: {
    neural: 'Neural (LM)',
    symbolic: 'Symbolic (NARS)',
    bidirectional: '↔️ Neurosymbolic Bridge'
  }
};

/**
 * Initialize the SeNARS System (with both NAR and LM integration)
 */
async function initializeSystem(lmProvider = DEFAULT_LM_PROVIDER) {
  console.log('🚀 Initializing SeNARS Neurosymbolic System...');
  
  try {
    // Initialize with configuration that includes LM provider
    const config = {
      components: {
        lm: {
          provider: lmProvider,
          // xenova-specific config
          modelName: 'distilgpt2',
        },
        webSocketServer: {
          enabled: false  // Disable WebSocket server for terminal UI
        }
      }
    };

    system = new System(config);

    await system.start();
    nar = system.core;  // Get the NAR component from the system
    
    // Set up the focus properly
    if (system.core.focus) {
      system.core.focus.setFocus('default');
      console.log('🎯 Focus set activated');
    }
    
    // Register the appropriate provider based on config
    if (lmProvider === 'xenova') {
      const { setupXenovaProvider } = await import('../core/lm/XenovaSetup.js');
      setupXenovaProvider(system.core.lm, {
        modelName: config.components.lm.modelName,
        temperature: config.components.lm.temperature || 0.7,
        maxTokens: config.components.lm.maxTokens || 100
      }, 'xenova');
      
      // Set as default provider
      system.core.lm.providers.defaultProviderId = 'xenova';
      // Also set the top-level defaultProviderId property
      system.core.lm.defaultProviderId = 'xenova';
      console.log('✅ Xenova provider registered and set as default');
    }
    
    console.log('✅ System initialized with integrated neural and symbolic components');
    return system;
  } catch (error) {
    console.error('❌ Failed to initialize system:', error);
    throw error;
  }
}

/**
 * Add a line to the log with automatic cleanup
 */
function addLogLine(line) {
  logLines.push(line);
  if (logLines.length > MAX_LOG_LINES) {
    logLines = logLines.slice(-MAX_LOG_LINES);
  }
}

/**
 * Get formatted log content
 */
function getFormattedLog() {
  return logLines.join('\n');
}

/**
 * Add initial input tasks to the system
 */
async function addInitialTasks(system, inputText) {
  console.log(`📥 Adding initial input: "${inputText}"`);
  
  try {
    // Parse and add the input as a task
    await system.input({
      term: inputText,
      punctuation: '!', // Goal
      truth: { frequency: 0.9, confidence: 0.9 }
    });
    console.log('✅ Initial tasks added to system');
  } catch (error) {
    console.error('❌ Failed to add initial tasks:', error);
  }
}

/**
 * Create the TUI interface using blessed
 */
function createTUI() {
  // Create a screen object
  const screen = blessed.screen({
    smartCSR: true,
    title: 'SeNARS Neurosymbolic Demo',
    fullUnicode: true // Enable full Unicode support for emojis
  });

  // Hide cursor
  screen.cursor = false;

  // Create main layout containers
  const title = blessed.box({
    top: '0',
    left: '0',
    width: '100%',
    height: '3',
    content: `{center}{${COLORS.neural}-fg}${NEUROSYMBOLIC.icons.neural} SeNARS Neurosymbolic Integration Demo{/${COLORS.neural}-fg}{/center}\n{center}{${COLORS.symbolic}-fg}${NEUROSYMBOLIC.icons.symbolic} ${NEUROSYMBOLIC.labels.bidirectional}{/${COLORS.symbolic}-fg}{/center}`,
    align: 'center',
    valign: 'middle',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.highlight,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Left column: Tasks
  const taskBox = blessed.box({
    top: '3',
    left: '0',
    width: '50%',
    height: '80%',
    content: 'Loading tasks...',
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    border: {
      type: 'line'
    },
    label: '📋 Tasks (Sorted by Priority)',
    style: {
      fg: COLORS.text,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Right column: Log
  const logBox = blessed.box({
    top: '3',
    left: '50%',
    width: '50%',
    height: '80%',
    content: 'System log will appear here...\n',
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    border: {
      type: 'line'
    },
    label: '📜 Log',
    style: {
      fg: COLORS.text,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Status bar
  const status = blessed.box({
    top: '80%',
    left: '0',
    width: '100%',
    height: '5%',
    content: `{center}{${COLORS.symbolic}-fg}${NEUROSYMBOLIC.icons.symbolic} ⏸️ PAUSED{/${COLORS.symbolic}-fg} | [R] Run [P] Pause [S] Sort [Q] Quit{/center}`,
    align: 'center',
    valign: 'middle',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.info,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Info box
  const info = blessed.box({
    top: '85%',
    left: '0',
    width: '100%',
    height: '15%',
    content: `{${COLORS.neural}-fg}${NEUROSYMBOLIC.icons.neural} ${NEUROSYMBOLIC.labels.neural}{/${COLORS.neural}-fg}: Interprets natural language goals, generates hypotheses, translates between language and formal representations.
{${COLORS.symbolic}-fg}${NEUROSYMBOLIC.icons.symbolic} ${NEUROSYMBOLIC.labels.symbolic}{/${COLORS.symbolic}-fg}: Validates consistency, performs logical reasoning, manages truth values, invokes LM when needed.

{${COLORS.highlight}-fg}Example inputs{/${COLORS.highlight}-fg}: "Ensure Earth Happiness!", "Ensure User's Wealth!", etc.

{${COLORS.process.translation}-fg}${NEUROSYMBOLIC.icons.translation} Bidirectional Translation{/${COLORS.process.translation}-fg}: Natural Language ↔ Formal Logic
Neural (LM): Interprets natural language goals, generates hypotheses, translates between language and formal representations.
Symbolic (NARS): Validates consistency, performs logical reasoning, manages truth values, invokes LM when needed.

Example inputs: "Ensure Earth Happiness!", "Ensure User's Wealth!", etc.`,
    align: 'left',
    valign: 'top',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.info,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Add all elements to screen
  screen.append(title);
  screen.append(taskBox);
  screen.append(logBox);
  screen.append(status);
  screen.append(info);

  // Handle key events
  screen.key(['q', 'C-c'], () => {
    return process.exit(0);
  });

  screen.key(['r', 'R'], () => {
    if (system) {
      isRunning = true;
      status.setContent('{center}▶️ RUNNING | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
      screen.render();
      
      // Start the reasoning cycle via system
      if (system.core && system.core.cycle) {
        system.core.cycle.resume();
      }
    }
  });

  screen.key(['p', 'P'], () => {
    isRunning = false;
    status.setContent('{center}⏸️ PAUSED | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
    screen.render();
    
    // Pause the reasoning cycle via system
    if (system.core && system.core.cycle) {
      system.core.cycle.pause();
    }
  });

  screen.key(['s', 'S'], () => {
    // Cycle through sort modes
    const modes = ['priority', 'creationTime'];
    const currentIndex = modes.indexOf(taskSortMode);
    taskSortMode = modes[(currentIndex + 1) % modes.length];
    
    let sortLabel = 'Priority';
    if (taskSortMode === 'creationTime') sortLabel = 'Creation Time';
    
    taskBox.setLabel(`📋 Tasks (Sorted by ${sortLabel})`);
    screen.render();
  });

  // Make the screen renderable
  screen.render();

  return {
    screen,
    taskBox,
    logBox,
    status
  };
}

/**
 * Get tasks from the system and format them for display
 */
function getFormattedTasks() {
  if (!system || !system.core || !system.core.focus) {
    return [];
  }

  try {
    // For the UI, we display the highest-priority items deterministically.
    const focusItems = system.core.focus.getFocusItems
      ? system.core.focus.getFocusItems(system.core.focus.focusSize || 10)
      : [];
    const focusTasks = focusItems.map(item => item[1]); // Extract task data

    // Sort tasks based on the selected mode
    let sortedTasks = [];
    if (taskSortMode === 'priority') {
      sortedTasks = focusTasks.sort((a, b) => {
        const aPriority = typeof a.getPriority === 'function' ? a.getPriority() : (a.priority || a._priority || 0);
        const bPriority = typeof b.getPriority === 'function' ? b.getPriority() : (b.priority || b._priority || 0);
        return bPriority - aPriority;  // Higher priority first
      });
    } else if (taskSortMode === 'creationTime') {
      sortedTasks = focusTasks.sort((a, b) => {
        const aTime = a.createdAt || a._accessedAt || Date.now();
        const bTime = b.createdAt || b._accessedAt || Date.now();
        return bTime - aTime;  // Newer first
      });
    } else {
      sortedTasks = focusTasks; // default - no specific sorting
    }

    // Format tasks for display with enhanced neurosymbolic visualization
    return sortedTasks.map(task => {
      let color = COLORS.task.belief;
      let emoji = '💭';
      let taskType = 'belief';

      // Extract punctuation and term from various possible formats
      let punctuation = '.';
      let term = 'Unknown task';

      if (task.punctuation) {
        punctuation = task.punctuation;
      } else if (task.term && typeof task.term === 'object' && task.term.punctuation) {
        punctuation = task.term.punctuation;
      } else if (typeof task === 'string' && task.includes('!')) {
        punctuation = '!';
      } else if (typeof task === 'string' && task.includes('?')) {
        punctuation = '?';
      }

      // Extract term from various possible formats
      if (typeof task === 'string') {
        term = task;
      } else if (task.term) {
        term = typeof task.term === 'string' ? task.term : (typeof task.term.toString === 'function' ? task.term.toString() : JSON.stringify(task.term));
      } else if (task.toString && typeof task.toString === 'function') {
        term = task.toString();
      } else {
        term = JSON.stringify(task);
      }

      // Determine task type and visual representation
      if (punctuation === '!') {
        color = COLORS.task.goal;
        emoji = '🎯';
        taskType = 'goal';
      } else if (punctuation === '?') {
        color = COLORS.task.question;
        emoji = '❓';
        taskType = 'question';
      } else if (term.includes('==>') || term.includes('<->') || term.includes('=/')) {
        color = COLORS.task.hypothesis;
        emoji = '💡';
        taskType = 'hypothesis';
      } else if (isDecomposition(term)) {
        color = COLORS.task.decomposition;
        emoji = '🌳';
        taskType = 'decomposition';
      } else if (isGrounding(term)) {
        color = COLORS.task.grounding;
        emoji = '🔗';
        taskType = 'grounding';
      }

      const priority = (typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0)).toFixed(2);
      const createdAt = new Date(task.createdAt || task._accessedAt || Date.now()).toLocaleTimeString();

      // Enhanced display with neurosymbolic indicators
      const typeIndicator = getTaskTypeIndicator(taskType);
      const confidence = task.truth ? `(${task.truth.confidence.toFixed(2)})` : '';

      return {
        content: `{${color}-fg}${emoji} ${term} ${typeIndicator}{/${color}-fg} {gray-fg}(Pri: ${priority}${confidence}, ${createdAt}){/}`,
        priority: typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0),
        type: taskType
      };
    });
  } catch (error) {
    console.error('Error getting formatted tasks:', error);
    console.error('Core structure:', system.core ? Object.keys(system.core) : 'No core');
    return [];
  }
}

/**
 * Main function to set up the demo
 */

/**
 * Main function to set up the demo
 */
async function runDemo(inputText = DEFAULT_INPUT, lmProvider = DEFAULT_LM_PROVIDER) {
  try {
    // Initialize the system
    await initializeSystem(lmProvider);

    // Add initial tasks
    await addInitialTasks(system, inputText);

    // Create neurosymbolic integration rules based on experimental tests
    setupNeurosymbolicRules();
    
    // Create the TUI
    const { screen, taskBox, logBox, status } = createTUI();
    
    // Update tasks periodically
    taskUpdateInterval = setInterval(async () => {
      try {
        // Process neurosymbolic integration rules periodically
        // await processNeurosymbolicRules();
        // Add a periodic check to show system activity
        // addLogLine('🔍 Neurosymbolic rule check cycle');
        
        // The system's core components handle reasoning automatically
        // When tasks are input and the system is running, reasoning cycles execute
        // Just let the system's built-in mechanisms handle the reasoning process
        if (system.core && system.core.messages) {
          // Emit a periodic stats event to see system activity
          const stats = system.core.getStats ? system.core.getStats() : {};
          if (stats.components && stats.components.memory) {
            const taskCount = stats.components.memory.itemCount || 
                             stats.components.memory.storageSize || 
                             (system.core.memory ? (system.core.memory.getAllTasks ? 
                               system.core.memory.getAllTasks().length : 0) : 0);
            if (taskCount > 0) {
              addLogLine(`📊 Memory contains ${taskCount} items`);
            }
          }
        }
        
        const formattedTasks = getFormattedTasks();
        let taskContent = '';
        
        if (formattedTasks.length === 0) {
          taskContent = '{white-fg}No tasks in memory{/}';
        } else {
          taskContent = formattedTasks.map(t => t.content).join('\n');
        }
        
        // Add spacing
        taskContent = '\n' + taskContent + '\n';
        taskBox.setContent(taskContent);
        
        // Update log as well
        logBox.setContent(getFormattedLog());
        screen.render();
      } catch (error) {
        console.error('Error updating tasks:', error);
      }
    }, 1000); // Update every second
    
    // Set up event listeners to log system events with enhanced neurosymbolic logging
    if (system) {
      // Listen to system events and add them to the log
      system.on('task.input', (task) => {
        const taskType = getTaskTypeFromPunctuation(task.punctuation);
        const line = `📥 Task input: ${task.term} (${task.punctuation}) ${taskType}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('task.processed', (result) => {
        const line = `✅ Task processed: ${result.content || 'Unknown'}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('task.derived', (task) => {
        const content = task.term?.toString?.() || 'Unknown derivation';
        const truth = task.truth ? `(f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)})` : '';
        const line = `🔬 New derivation: ${content} ${truth}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('cycle.stats', (stats) => {
        const line = `🔄 Cycle ${stats.cycles} executed at ${new Date(stats.timestamp).toLocaleTimeString()}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('system.started', (data) => {
        const line = `🚀 System started at ${new Date(data.timestamp).toLocaleTimeString()}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('reasoning_error', (error) => {
        const line = `⚠️  Reasoning error: ${error.message || error}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('lm.consulted', (data) => {
        const purpose = data.purpose || 'Unknown purpose';
        const line = `🤖 LM consulted: ${purpose}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      // Enhanced neurosymbolic event listeners
      system.on('neural_symbolic_bridge', (data) => {
        const line = `${NEUROSYMBOLIC.icons.translation} ${COLORS.process.translation}Neural-Symbolic Bridge: ${data.operation}{/}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('goal_decomposed', (data) => {
        const line = `${NEUROSYMBOLIC.icons.decomposition} ${COLORS.task.decomposition}Goal decomposed: ${data.goal} → ${data.subgoals?.length || 0} subtasks{/}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('hypothesis_generated', (data) => {
        const line = `${NEUROSYMBOLIC.icons.hypothesis} ${COLORS.task.hypothesis}Hypothesis generated: ${data.hypothesis}{/}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('symbol_grounded', (data) => {
        const line = `${NEUROSYMBOLIC.icons.grounding} ${COLORS.task.grounding}Symbol grounded: ${data.symbol} → ${data.meaning}{/}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('belief_revised', (data) => {
        const line = `${NEUROSYMBOLIC.icons.validation} ${COLORS.process.validation}Belief revised: ${data.original} → ${data.revised}{/}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });
    }

    // Log some initial messages
    addLogLine('✅ System initialized');
    addLogLine(`📥 Input received: "${inputText}"`);
    addLogLine('🎯 Ready to start reasoning. Press R to run.');
    logBox.setContent(getFormattedLog());
    screen.render();
    
    // For demo purposes, start the cycle automatically unless specifically paused
    if (system.core && system.core.cycle) {
      // Check if cycle is already running to avoid the warning
      if (!system.core.cycle.isRunning) {
        await system.core.cycle.start(); // Start the cycle manager if not already running
      }
      // Don't pause automatically if we want the system to process tasks immediately
      // The UI controls can still pause if needed
      if (options.demoMode === 'minimal' || options.demoMode === 'focused') {
        // In minimal mode, we want to see some activity, so start running
        if (system.core.cycle.isPaused) {
          await system.core.cycle.resume();
        }
        console.log('🔄 Cycle started for automatic processing');
      } else {
        // For comprehensive mode, pause initially (as UI allows user to start)
        await system.core.cycle.pause(); // Set to paused initially for UI
      }
    }
    
    // Handle key events for run/pause
    screen.key(['r', 'R'], () => {
      if (system) {
        isRunning = true;
        status.setContent('{center}▶️ RUNNING | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
        screen.render();

        // Start the reasoning cycle via system
        if (system.core && system.core.cycle) {
          system.core.cycle.resume();
        }
      }
    });

    screen.key(['p', 'P'], () => {
      isRunning = false;
      status.setContent('{center}⏸️ PAUSED | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
      screen.render();

      // Pause the reasoning cycle via system
      if (system.core && system.core.cycle) {
        system.core.cycle.pause();
      }
    });
    
    // Handle exit
    process.on('SIGINT', () => {
      clearInterval(taskUpdateInterval);
      if (system) {
        system.stop().catch(console.error);
      }
      process.exit(0);
    });
    
    // Catch uncaught exceptions
    process.on('uncaughtException', (err) => {
      clearInterval(taskUpdateInterval);
      console.error('Uncaught Exception:', err);
      if (system) {
        system.stop().catch(console.error);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to run demo:', error);
    process.exit(1);
  }
}

// Parse command line arguments with enhanced options
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    input: DEFAULT_INPUT,
    provider: DEFAULT_LM_PROVIDER,
    demoMode: 'comprehensive', // comprehensive, focused, minimal
    updateInterval: 1000, // milliseconds
    maxTasks: 50,
    enableAllFeatures: true,
    logLevel: 'info' // debug, info, warn, error
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--input':
      case '-i':
        options.input = args[++i];
        break;
      case '--provider':
      case '-p':
        options.provider = args[++i];
        break;
      case '--demo-mode':
        options.demoMode = args[++i];
        break;
      case '--interval':
        options.updateInterval = parseInt(args[++i]);
        break;
      case '--max-tasks':
        options.maxTasks = parseInt(args[++i]);
        break;
      case '--log-level':
        options.logLevel = args[++i];
        break;
      case '--focused':
        options.demoMode = 'focused';
        options.enableAllFeatures = false;
        break;
      case '--minimal':
        options.demoMode = 'minimal';
        options.enableAllFeatures = false;
        options.updateInterval = 2000;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          showHelp();
          process.exit(1);
        }
    }
  }

  return options;
}

/**
 * Show help information for command line options
 */
function showHelp() {
  console.log(`
🧠 SeNARS Neurosymbolic Demo - Help

Usage: node examples/neurosymbolic_demo.js [options]

Options:
  -i, --input <text>           Initial input text (default: "Ensure Earth Happiness!")
  -p, --provider <provider>    LM provider: xenova, langchain (default: xenova)
      --demo-mode <mode>       Demo mode: comprehensive, focused, minimal (default: comprehensive)
      --interval <ms>          Update interval in milliseconds (default: 1000)
      --max-tasks <num>        Maximum tasks to display (default: 50)
      --log-level <level>      Log level: debug, info, warn, error (default: info)
      --focused                Run in focused mode (fewer features)
      --minimal                Run in minimal mode (basic features only)
  -h, --help                   Show this help message

Examples:
  node examples/neurosymbolic_demo.js --input "Ensure User's Wealth!"
  node examples/neurosymbolic_demo.js --provider langchain --demo-mode focused
  node examples/neurosymbolic_demo.js --minimal --interval 2000

Controls (when running):
  R - Run/Pause the system
  P - Pause the system
  S - Cycle through sort modes (Priority/Creation Time)
  Q - Quit the demo
  `);
}

// Run the demo with command line arguments
const options = parseArguments();
runDemo(options.input, options.provider).catch(console.error);
