import Config from '../config/Config.js';
import Messages from '../messaging/Messages.js';
import Rules from '../reasoning/Rules.js';
import Memory from '../Memory.js';
import { Focus } from '../Focus.js';
import { Reasoner } from '../Reasoner.js';
import LM from '../lm/LM.js'; // Add LM component import
import AdjacencyBag from '../memory/AdjacencyBag.js';
import GraphTraversal from '../memory/GraphTraversal.js';
import HTNPlanner from '../plan/HTNPlanner.js';
import AStarPlanner from '../plan/AStarPlanner.js';
import PlanProcessor from '../plan/PlanProcessor.js';
import AnalysisEngine from '../analysis/AnalysisEngine.js';
import DataIngestor from '../analysis/DataIngestor.js';
import ReportGenerator from '../analysis/ReportGenerator.js';

import PatternDetector from '../analysis/PatternDetector.js';
import WebSocketServer from '../server/WebSocketServer.js';
import { ContradictionAnalyzer } from '../reasoning/ContradictionAnalyzer.js';
import { ResolutionStrategy } from '../reasoning/ResolutionStrategy.js';
import { SystemContext } from '../components/SystemContext.js';
import { StrategyRegistry } from '../components/StrategyRegistry.js';
import CommonMiddleware from '../messaging/Middleware.js';
import Cycle from './Cycle.js';

class Core {
  constructor() {
    this.componentMap = new Map();
    this.registrationOrder = [];
    this.isInitialized = false;

    this.registerComponent('config', new Config());
    this.registerComponent('messages', new Messages());
    this.registerComponent('rules', new Rules());
    const focus = new Focus();
    this.registerComponent('focus', focus);
    this.registerComponent('memory', new Memory(focus));

    // Create and set a default focus set
    focus.createFocusSet('default');
    focus.setFocus('default');

    this.registerComponent('lm', new LM()); // Register LM component
    // Create reasoner without dependencies initially, will set them up in _setupDependencies
    this.registerComponent('reasoning', new Reasoner(this.getComponent('lm')));

    // Initialize graph components
    const adjacencyBag = new AdjacencyBag();
    this.registerComponent('adjacencyBag', adjacencyBag);
    this.registerComponent('graphTraversal', new GraphTraversal(adjacencyBag));

    // Initialize planning components
    const htnPlanner = new HTNPlanner();
    this.registerComponent('htnPlanner', htnPlanner);
    this.registerComponent('aStarPlanner', new AStarPlanner(adjacencyBag));

    // Initialize PlanProcessor (dependencies will be set up during initialization)
    this.registerComponent('planProcessor', new PlanProcessor(null, null));

    // Register Phase 3 metacognition components
    this.registerComponent('strategyRegistry', new StrategyRegistry());
    this.registerComponent('systemContext', new SystemContext(null)); // Initialize with null, will set in _setupDependencies
    this.registerComponent('contradictionAnalyzer', new ContradictionAnalyzer());
    this.registerComponent('resolutionStrategy', new ResolutionStrategy());

    this.registerComponent('analysis', new AnalysisEngine()); // Register AnalysisEngine component
    this.registerComponent('ingestor', new DataIngestor()); // Register DataIngestor component
    this.registerComponent('reports', new ReportGenerator()); // Register ReportGenerator component

    this.registerComponent('patternDetector', new PatternDetector()); // Register PatternDetector component
    this.registerComponent('webSocketServer', new WebSocketServer(this)); // Register WebSocketServer component
    this.registerComponent('cycle', new Cycle()); // Register Cycle component

    return new Proxy(this, {
      get: (target, prop) => target.componentMap.has(prop) ? target.componentMap.get(prop) : target[prop],
    });
  }

  registerComponent(name, component) {
    if (this.componentMap.has(name)) {
      throw new Error(`Component "${name}" already registered`);
    }
    this.componentMap.set(name, component);
    this.registrationOrder.push(name);
    component.core = this;
  }

  getComponent(name) {
    return this.componentMap.get(name);
  }

  async initialize(config = {}) {
    // Initialize config component first as others may depend on it
    await this.config.initialize(config);

    // Initialize all other components with their specific configurations
    for (const name of this.registrationOrder) {
      if (name === 'config') continue;
      try {
        const componentConfig = this.config.get(`components.${name}`, {});
        await this.componentMap.get(name).initialize(componentConfig);
      } catch (error) {
        console.error(`Failed to initialize component "${name}":`, error);
        throw error;
      }
    }

    // Establish cross-component dependencies
    this._setupDependencies();

    // Initialize any new components that may have been added but not initialized
    // This handles components that are added in constructor but need special initialization
    await this._initializeNewComponents();

    // Mark core as initialized
    this.isInitialized = true;
  }

  /**
   * Establish cross-component dependencies after all components are initialized
   */
  _setupDependencies() {
    // PlanProcessor dependencies
    if (this.planProcessor) {
      this.planProcessor.lm = this.lm || null;
      this.planProcessor.htnPlanner = this.htnPlanner || null;
    }

    // Graph traversal dependencies
    if (this.graphTraversal && this.adjacencyBag) {
      this.graphTraversal.adjacencyBag = this.adjacencyBag;
    }

    if (this.aStarPlanner && this.adjacencyBag) {
      this.aStarPlanner.adjacencyBag = this.adjacencyBag;
    }

    // Focus dependencies
    if (this.focus) {
      this.focus.core = this;
      this.focus.memory = this.memory;
    }


    // Messages middleware and event broadcasting
    if (this.messages) {
      // Add logging middleware for observability
      this.messages.use(CommonMiddleware.loggingMiddleware());

      // Connect WebSocketServer to the event stream
      if (this.webSocketServer) {
        const eventsToBroadcast = ['task.input', 'cycle.start', 'system.started'];
        for (const event of eventsToBroadcast) {
          this.messages.on(event, (data) => {
            this.webSocketServer.broadcast({
              type: 'system-event',
              event: event,
              data: data,
            });
          });
        }
        
        // Listen for cycle stats events and broadcast them
        this.messages.on('cycle.stats', (data) => {
          this.webSocketServer.broadcast({
            type: 'cycle_stats',
            data: data,
            timestamp: Date.now()
          });
        });
        
        // Listen for task.input and evaluate rules
        this.messages.on('task.input', (task) => {
          // Process the task through reasoning when it's input
          if (this.reasoning && this.memory) {
            // Create a focus set with just this task and run reasoning on it
            const focusSet = [task];
            this.reasoning.reason(focusSet, this.memory, { source: 'input' })
              .catch(error => {
                console.error('Error processing input task with reasoning:', error);
              });
          }
          
          // Also try to add task to focus so it can be processed in the cycle
          if (this.focus) {
            try {
              const priority = task.getPriority ? task.getPriority() : (task.priority || 0.5);
              this.focus.addTaskToFocus(task, priority);
            } catch (error) {
              console.error('Error adding task to focus:', error);
            }
          }
        });
        
        // Listen for task.derived events and broadcast them
        this.messages.on('task.derived', (data) => {
          this.webSocketServer.broadcast({
            type: 'task_derived',
            data: data,
            timestamp: Date.now()
          });
        });
        
        // Listen for task.processed events and broadcast them
        this.messages.on('task.processed', (data) => {
          this.webSocketServer.broadcast({
            type: 'task_processed',
            data: data,
            timestamp: Date.now()
          });
        });
        
        // Listen for concept.updated events and broadcast them
        this.messages.on('concept.updated', (data) => {
          this.webSocketServer.broadcast({
            type: 'concept_updated',
            data: data,
            timestamp: Date.now()
          });
        });
      }
    }

    // Set up cycle component with core reference
    if (this.cycle) {
      this.cycle.core = this;
    }
    
    // WebSocketServer reference
    if (this.webSocketServer) {
      this.webSocketServer.core = this;
    }

    // Set up SystemContext with reference to core
    if (this.systemContext) {
      this.systemContext.system = this;
    }

    // Set up reasoning to use strategy registry and system context (if they exist)
    if (this.reasoning && this.strategyRegistry && this.systemContext) {
      // Update the reasoning component to use the strategy registry and system context
      this.reasoning.strategyRegistry = this.strategyRegistry;
      this.reasoning.systemContext = this.systemContext;
      // Call any initialization if needed after setting up dependencies
      if (typeof this.reasoning.initialize === 'function') {
        // Dependencies are already passed in constructor, but may need to re-initialize
      }
    }
    

    // Set up contradiction analyzer to use system context
    if (this.contradictionAnalyzer && this.systemContext) {
      // The contradiction analyzer can access memory and other components through system context
    }

    // Set up resolution strategy to use system context
    if (this.resolutionStrategy && this.systemContext) {
      // The resolution strategy can access other components through system context
    }

    // Register strategies after dependencies are set up to avoid circular references during initialization
    if (this.strategyRegistry && this.reasoning) {
      // Register default reasoning strategies
      this.strategyRegistry.registerStrategy('basic_reasoning', {
        execute: (tasks, context) => this.reasoning.reason(tasks, context)
      }, {
        description: 'Basic reasoning using inference rules',
        type: 'reasoning',
        group: 'default'
      });

      // Register contradiction resolution strategies if available
      if (this.resolutionStrategy) {
        for (const strategyName of this.resolutionStrategy.getAvailableStrategies()) {
          const strategy = {
            execute: (contradiction, sysContext) => this.resolutionStrategy.resolveContradiction(contradiction, strategyName, sysContext)
          };

          this.strategyRegistry.registerStrategy(`resolution_${strategyName}`, strategy, {
            description: `Contradiction resolution using ${strategyName} strategy`,
            type: 'contradiction_resolution',
            group: 'resolution'
          });
        }
      }
    }
  }

  /**
   * Initialize components that were added but may not have been initialized yet
   * This method can be called after all dependencies are set up
   */
  async _initializeNewComponents() {
    // Initialize Phase 3 components with appropriate configuration
    if (this.strategyRegistry && !this.strategyRegistry.isInitialized) {
      await this.strategyRegistry.initialize(this.config?.get('components.strategyRegistry', {}) || {});
    }

    if (this.systemContext && !this.systemContext.isInitialized) {
      await this.systemContext.initialize(this.config?.get('components.systemContext', {}) || {});
    }

    if (this.contradictionAnalyzer && !this.contradictionAnalyzer.isInitialized) {
      await this.contradictionAnalyzer.initialize(this.config?.get('components.contradictionAnalyzer', {}) || {});
    }

    if (this.resolutionStrategy && !this.resolutionStrategy.isInitialized) {
      await this.resolutionStrategy.initialize(this.config?.get('components.resolutionStrategy', {}) || {});
    }
  }

  // Methods for broadcasting current state
  _broadcastCurrentState() {
    if (!this.messages) return;
    
    // Emit snapshot of current tasks
    if (this.memory) {
      const tasksSnapshot = this._getTasksSnapshot();
      this.messages.emit('tasks_snapshot', tasksSnapshot);
      
      // Emit snapshot of current concepts
      const conceptsSnapshot = this._getConceptsSnapshot();
      this.messages.emit('concepts_snapshot', conceptsSnapshot);
    }
    
    // Emit system stats
    const stats = this._getSystemStats();
    this.messages.emit('system_stats', stats);
  }

  // Get a snapshot of all tasks
  _getTasksSnapshot() {
    if (!this.memory || !this.memory.getAllTasks) return [];
    
    const allTasks = this.memory.getAllTasks();
    return allTasks.map(task => ({
      id: task.hashCode ? task.hashCode() : (task.id || `task_${Date.now()}`),
      content: task.toString ? task.toString() : (task.content || 'Unknown Task'),
      priority: task.getPriority ? task.getPriority() : (task.priority || 0.5),
      status: this._getTaskStatus(task),
      type: this._getTaskType(task),
      createdAt: task.createdAt || Date.now(),
      lastModified: task.getAccessedAt ? task.getAccessedAt() : Date.now(),
      punctuation: task.punctuation || '.',
      truth: task.truth || null,
      occurrenceTime: task.occurrenceTime || Date.now(),
      derivationPath: task.derivationPath || []
    }));
  }

  // Get a snapshot of all concepts
  _getConceptsSnapshot() {
    if (!this.memory || !this.memory.conceptStorage) return [];
    
    const concepts = [];
    for (const [hash, concept] of this.memory.conceptStorage) {
      concepts.push({
        id: hash,
        content: concept.term?.toString() || concept.name || 'Unknown Concept',
        priority: this._getConceptTaskCount(concept),
        type: concept.term?.termType || 'concept'
      });
    }
    return concepts;
  }

  // Get count of tasks associated with a concept
  _getConceptTaskCount(concept) {
    if (!concept || !concept.taskTable) return 0;
    // Return the number of tasks in the concept's task table
    return concept.taskTable?.size || 0;
  }

  // Get the status of a task
  _getTaskStatus(task) {
    if (!task) return 'Unknown';
    if (task.isBelief && task.isBelief()) return 'Belief';
    if (task.isGoal && task.isGoal()) return 'Goal';
    if (task.isQuestion && task.isQuestion()) return 'Question';
    return 'Derived';
  }

  // Get the type of a task based on its characteristics
  _getTaskType(task) {
    if (!task) return 'Unknown';
    if (task.punctuation === '.') return 'Belief';
    if (task.punctuation === '!') return 'Goal';
    if (task.punctuation === '?') return 'Question';
    return 'Derived';
  }

  // Get system statistics
  _getSystemStats() {
    const stats = {
      isRunning: this.cycle ? this.cycle.isRunning : false,
      isPaused: this.cycle ? this.cycle.isPaused : true,
      cycles: this.cycle ? this.cycle.cycleCount : 0,
      tasks: this.memory && this.memory.getAllTasks ? this.memory.getAllTasks().length : 0,
      concepts: this.memory && this.memory.conceptStorage ? this.memory.conceptStorage.size : 0,
      timestamp: Date.now()
    };
    
    return stats;
  }

  async start() {
    // Check if core has been initialized - if not, initialize first
    // This maintains backward compatibility for cases where start() is called without prior initialize()
    if (!this.isInitialized) {
      await this.initialize({});
    }

    // Start components in registration order
    for (const name of this.registrationOrder) {
      try {
        await this.componentMap.get(name).start();
      } catch (error) {
        console.error(`Failed to start component "${name}":`, error);
        throw error;
      }
    }
  }

  async stop() {
    // Stop components in reverse registration order (cleanup dependencies properly)
    for (const name of [...this.registrationOrder].reverse()) {
      try {
        await this.componentMap.get(name).stop();
      } catch (error) {
        console.error(`Failed to stop component "${name}":`, error);
        // Continue stopping other components even if one fails
      }
    }
  }

  async destroy() {
    // Destroy components in reverse registration order (cleanup dependencies properly)
    for (const name of [...this.registrationOrder].reverse()) {
      try {
        await this.componentMap.get(name).destroy();
      } catch (error) {
        console.error(`Failed to destroy component "${name}":`, error);
        // Continue destroying other components even if one fails
      }
    }
  }
}

export default Core;
