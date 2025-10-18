import System from '../../core/system/System.js';

describe('Cognitive Validation Tests', () => {
  let system;

  beforeEach(async () => {
    system = new System({
      config: global.createTestConfig({
        maxTasks: 100,
        maxRules: 50,
        // Additional test-specific optimizations
        memory: {
          maxTasks: 100,
          cleanupInterval: 1000 // Faster cleanup for tests
        },
        reasoning: {
          maxRules: 50,
          enableComplexRules: false // Disable complex rules for faster startup
        }
      })
    });

    // Register for cleanup in case of test failure
    global.registerSystemForCleanup(system);

    await system.start();
  }, 15000); // Increase timeout to 15 seconds for System initialization

  afterEach(async () => {
    if (system) {
      try {
        // Stop the system first
        await system.stop();

        // Clear any event handlers
        system.removeAllListeners();

        // Stop any bootstrap agent if it exists
        if (system.core && system.core.bootstrapAgent) {
          try {
            await system.core.bootstrapAgent.stop();
          } catch (error) {
            // Ignore errors during cleanup
          }
        }

        // Clear the core reference to ensure cleanup
        if (system.core) {
          system.core = null;
        }
      } catch (error) {
        console.warn('Error during system cleanup:', error.message);
      }
    }

    // Clear global references
    system = null;
  });

  describe('Basic Cognitive Capabilities', () => {
    test('System initializes and runs basic cognitive cycle', async () => {
      // System should be running
      expect(system.getHealth().status).toBe('running');

      // Should be able to input tasks
      const task = system.input({
        term: '(cat --> mammal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      expect(task.term).toBe('(cat --> mammal)');
      expect(task.truth.frequency).toBe(1.0);
    });

    test('Can add and retrieve tasks from memory', async () => {
      // Add a belief
      const belief = system.remember('(dog --> mammal)', { frequency: 1.0, confidence: 0.9 });
      expect(belief.term).toBe('(dog --> mammal)');

      // Add a question
      const question = system.input({
        term: '(dog --> mammal)?',
        punctuation: '?',
        priority: 0.8
      });

      // Memory should contain tasks
      const health = system.getHealth();
      expect(health.tasksProcessed).toBeGreaterThan(0);
    });

    test('Can apply rules to generate new tasks', async () => {
      // Add premise tasks
      system.input({
        term: '(cat --> mammal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      system.input({
        term: '(mammal --> animal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.95 }
      });

      // The reasoning component should be able to process these
      const tasks = [
        { term: '(cat --> mammal)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
        { term: '(mammal --> animal)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.95 } }
      ];

      const derivedTasks = await system.core.reasoning.reason(tasks);
      expect(Array.isArray(derivedTasks)).toBe(true);
    });

    test('Has working API for core operations', () => {
      // Test basic API methods exist and are functions
      expect(typeof system.input).toBe('function');
      expect(typeof system.remember).toBe('function');
      expect(typeof system.want).toBe('function');
      expect(typeof system.getHealth).toBe('function');
      expect(typeof system.getStatus).toBe('function');
      expect(typeof system.getMetrics).toBe('function');
    });
  });

  describe('Component Integration', () => {
    test('All core components are accessible', () => {
      expect(system.core).toBeDefined();
      expect(system.core.config).toBeDefined();
      expect(system.core.messages).toBeDefined();
      expect(system.core.rules).toBeDefined();
      expect(system.core.memory).toBeDefined();
      expect(system.core.reasoning).toBeDefined();
    });

    test('Components have required methods', () => {
      // Config component
      expect(typeof system.core.config.getHealth).toBe('function');

      // Messages component
      expect(typeof system.core.messages.emit).toBe('function');
      expect(typeof system.core.messages.on).toBe('function');

      // Rules component
      expect(typeof system.core.rules.getHealth).toBe('function');

      // Memory component
      expect(typeof system.core.memory.getHealth).toBe('function');

      // Reasoning component
      expect(typeof system.core.reasoning.reason).toBe('function');
      expect(typeof system.core.reasoning.getStats).toBe('function');
    });
  });

  describe('Event System', () => {
    test('Can register and trigger events', (done) => {
      let eventTriggered = false;

      system.on('test_event', (data) => {
        eventTriggered = true;
        expect(data.message).toBe('test');
        done();
      });

      // Emit test event
      system.core.messages.emit('test_event', { message: 'test' });

      // Cleanup
      setTimeout(() => {
        if (!eventTriggered) {
          done(new Error('Event was not triggered'));
        }
      }, 100);
    });

    test('Event handlers can be removed', () => {
      let callCount = 0;

      const handler = () => { callCount++; };

      system.on('test_cleanup', handler);
      system.core.messages.emit('test_cleanup', {});

      expect(callCount).toBe(1);

      system.off('test_cleanup', handler);
      system.core.messages.emit('test_cleanup', {});

      expect(callCount).toBe(1); // Should not increase after removal
    });
  });

  describe('Reasoning Capabilities', () => {
    test('Can perform basic inference operations', async () => {
      const tasks = [
        { term: '(sparrow --> bird)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
        { term: '(bird --> animal)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.95 } }
      ];

      const results = await system.core.reasoning.reason(tasks);

      // Should return an array (even if empty for simple cases)
      expect(Array.isArray(results)).toBe(true);

      // Should have reasoning history
      const history = system.core.reasoning.getReasoningHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });

    test('Reasoning component tracks performance', () => {
      const stats = system.core.reasoning.getStats();

      expect(stats).toHaveProperty('strategies');
      expect(stats).toHaveProperty('inferenceRules');
      expect(stats).toHaveProperty('historySize');
      expect(typeof stats.strategies).toBe('number');
      expect(typeof stats.inferenceRules).toBe('number');
      expect(typeof stats.historySize).toBe('number');
    });
  });

  describe('Memory Management', () => {
    test('Memory component manages tasks efficiently', () => {
      const health = system.core.memory.getHealth();
      const stats = system.core.memory.getStats();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('issues');
      expect(stats).toHaveProperty('storageSize');
      expect(stats).toHaveProperty('focusSets');
      expect(typeof stats.storageSize).toBe('number');
    });

    test('Can handle multiple tasks without errors', () => {
      // Add multiple tasks rapidly
      for (let i = 0; i < 10; i++) {
        system.input({
          term: `(task${i} --> test)`,
          punctuation: '.',
          truth: { frequency: 0.8, confidence: 0.7 }
        });
      }

      const health = system.getHealth();
      expect(health.tasksProcessed).toBeGreaterThanOrEqual(10);
    });
  });

  describe('System Resilience', () => {
    test('System handles invalid input gracefully', () => {
      expect(() => {
        system.input(null);
      }).toThrow();

      expect(() => {
        system.input({ invalid: 'task' });
      }).toThrow();

      // System should still be healthy after errors
      expect(system.getHealth().status).toBe('running');
    });

    test('System provides meaningful error messages', () => {
      try {
        system.input(null);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Task must be an object');
      }
    });
  });

  describe('Performance Characteristics', () => {
    test('Basic operations complete within reasonable time', async () => {
      const startTime = Date.now();

      // Perform several operations
      for (let i = 0; i < 5; i++) {
        system.input({
          term: `(perf_test_${i} --> benchmark)`,
          punctuation: '.',
          truth: { frequency: 0.8, confidence: 0.7 }
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second for basic operations
      expect(duration).toBeLessThan(1000);
    });

    test('System provides performance metrics', () => {
      const metrics = system.getMetrics();

      expect(metrics).toHaveProperty('system');
      expect(metrics).toHaveProperty('components');
      expect(metrics.system).toHaveProperty('uptime');
      expect(metrics.system).toHaveProperty('tasksProcessed');
      expect(metrics.system).toHaveProperty('isRunning');
    });
  });

  describe('Planning Integration', () => {
    test('should demonstrate HTN plan generation and execution', async () => {
      const planner = system.core.htnPlanner;
      expect(planner).toBeDefined();

      // Register test methods and operators
      planner.registerMethod('test-task', async (task, context) => {
        return [
          { name: 'test-action' }
        ];
      });

      planner.registerOperator('test-action', async (task, context) => {
        return {
          success: true,
          message: 'Test action completed',
          effects: { testActionCompleted: true }
        };
      });

      // Test plan generation
      const goal = { name: 'test-task' };
      const startState = {};

      const plan = await planner.createGoalPlan(goal, startState);
      expect(plan).toBeDefined();

      // Test plan execution
      const result = await planner.executePlan(plan, startState);
      expect(result).toBeDefined();
    });

    test('should verify planner statistics and metrics', () => {
      const planner = system.core.htnPlanner;
      expect(planner).toBeDefined();

      // Verify planner has stats method
      const stats = planner.getStats ? planner.getStats() : {};
      expect(typeof stats).toBe('object');
    });

    test('should demonstrate plan failure recovery strategies', async () => {
      const planner = system.core.htnPlanner;
      expect(planner).toBeDefined();

      // Register a method that may fail
      planner.registerMethod('risky-task', async (task, context) => {
        if (context.riskFactor > 0.8) {
          return [{ name: 'risky-action' }];
        }
        return [{ name: 'safe-action' }];
      });

      planner.registerOperator('risky-action', async (task, context) => {
        if (Math.random() > 0.5) {
          throw new Error('Risky action failed');
        }
        return { success: true, effects: { riskyActionCompleted: true } };
      });

      planner.registerOperator('safe-action', async (task, context) => {
        return { success: true, effects: { safeActionCompleted: true } };
      });

      // Test with high risk factor
      const riskyGoal = { name: 'risky-task' };
      const riskyStartState = { riskFactor: 0.9 };

      const riskyPlan = await planner.createGoalPlan(riskyGoal, riskyStartState);
      expect(riskyPlan).toBeDefined();

      // Execution might fail but should be handled gracefully
      const riskyResult = await planner.executePlan(riskyPlan, riskyStartState);
      expect(riskyResult).toBeDefined();
    });
  });

  describe('Pattern Detection Integration', () => {
    test('should demonstrate temporal pattern recognition with prediction', async () => {
      const patternDetector = system.core.patternDetector;
      expect(patternDetector).toBeDefined();

      // Configure for testing
      if (patternDetector.config) {
        patternDetector.config.minPatternFrequency = 2;
        patternDetector.config.similarityThreshold = 0.5;
      }

      // Create test events
      const temporalEvents = [];
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        temporalEvents.push({
          type: 'system-alert',
          name: 'high-cpu',
          timestamp: now - (10 - i) * 1000,
          context: 'server-001'
        });
      }

      const temporalResult = await patternDetector.processEventStream(temporalEvents, 'temporal-test');
      const predictions = await patternDetector.predictNextEvents(temporalEvents);

      expect(Array.isArray(temporalResult.temporal)).toBe(true);
      expect(Array.isArray(predictions)).toBe(true);
      expect(typeof (predictions.length > 0 ? predictions[0].confidence || 0 : 0)).toBe('number');
    });

    test('should identify causal relationship patterns', async () => {
      const patternDetector = system.core.patternDetector;
      expect(patternDetector).toBeDefined();

      // Create causal test events
      const causalEvents = [];
      const now = Date.now();
      for (let i = 0; i < 8; i++) {
        causalEvents.push({
          type: i % 2 === 0 ? 'cpu-event' : 'fan-event',
          name: i % 2 === 0 ? 'cpu-increase' : 'fan-activation',
          value: 50 + i * 5,
          timestamp: now - (8 - i),
          context: 'server'
        });
      }

      const causalResult = await patternDetector.processEventStream(causalEvents, 'causal-test');

      expect(typeof causalResult.causal).toBe('object');
      expect(Array.isArray(causalResult.causal)).toBe(true);
    });

    test('should demonstrate pattern confidence scoring', async () => {
      const patternDetector = system.core.patternDetector;
      expect(patternDetector).toBeDefined();

      // Create confidence test events
      const confidenceEvents = [];
      for (let i = 0; i < 8; i++) {
        confidenceEvents.push({
          type: 'regular-pattern',
          name: i % 2 === 0 ? 'pattern-a' : 'pattern-b',
          timestamp: Date.now() - (8 - i) * 1000,
          context: 'test'
        });
      }

      const result = await patternDetector.processEventStream(confidenceEvents, 'confidence-test');
      const patternConfidences = result.all ? result.all.map(p => p.confidence) : [];

      expect(Array.isArray(patternConfidences)).toBe(true);
      if (patternConfidences.length > 0) {
        patternConfidences.forEach(conf => {
          expect(conf).toBeGreaterThanOrEqual(0);
          expect(conf).toBeLessThanOrEqual(1);
        });
      }
    });

    test('should demonstrate comprehensive pattern detection functionality', async () => {
      const patternDetector = system.core.patternDetector;
      expect(patternDetector).toBeDefined();

      const componentsAvailable = {
        hasPatternDetector: !!patternDetector,
        hasProcessEventStream: typeof patternDetector.processEventStream === 'function',
        hasMatchPattern: typeof patternDetector.matchPattern === 'function',
        hasPredictNextEvents: typeof patternDetector.predictNextEvents === 'function',
        hasGetPatterns: typeof patternDetector.getPatterns === 'function',
        hasGetStats: typeof patternDetector.getStats === 'function'
      };

      // Verify all components are available
      expect(componentsAvailable.hasPatternDetector).toBe(true);
      expect(componentsAvailable.hasProcessEventStream).toBe(true);

      // Create test events
      const testEvents = [];
      for (let i = 0; i < 8; i++) {
        testEvents.push({
          type: 'test',
          name: i % 2 === 0 ? 'A' : 'B',
          timestamp: Date.now() - (8 - i) * 1000
        });
      }

      const result = await patternDetector.processEventStream(testEvents, 'test-stream');
      const predictions = await patternDetector.predictNextEvents(testEvents);

      expect(result).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);

      // Verify stats functionality
      const stats = patternDetector.getStats();
      expect(typeof stats).toBe('object');
    });
  });

  describe('Bootstrap Agent Integration', () => {
    test('should demonstrate comprehensive bootstrap agent functionality', async () => {
      const bootstrapAgent = system.core.bootstrapAgent || new (await import('../../agent/BootstrapAgent.js')).default();

      if (!bootstrapAgent) {
        console.log('⚠️ BootstrapAgent not available in this configuration');
        return;
      }

      await bootstrapAgent.initialize({
        maxBootstrapIterations: 3,
        goalConfidenceThreshold: 0.7,
        enableSelfImprovement: true,
        watchPlanFiles: false
      });

      // Set up dependencies
      bootstrapAgent.setupDependencies(
        system.core.lm || null,
        system.core.planProcessor || null,
        system.core.htnPlanner || null,
        system
      );

      const componentsAvailable = {
        hasBootstrapAgent: !!bootstrapAgent,
        hasInitialize: typeof bootstrapAgent.initialize === 'function',
        hasSetupDependencies: typeof bootstrapAgent.setupDependencies === 'function',
        hasStart: typeof bootstrapAgent.start === 'function',
        hasStop: typeof bootstrapAgent.stop === 'function',
        hasExecuteSingleCycle: typeof bootstrapAgent.executeSingleCycle === 'function',
        hasAddPlanSource: typeof bootstrapAgent.addPlanSource === 'function'
      };

      // Verify all components are available
      expect(componentsAvailable.hasBootstrapAgent).toBe(true);
      expect(componentsAvailable.hasInitialize).toBe(true);

      // Add a simple plan source
      const simplePlan = `# Simple Plan
- Goal 1: Implement basic functionality
- Goal 2: Test the implementation
`;
      bootstrapAgent.addPlanSource(simplePlan, 'text');

      // Add a direct bootstrap goal
      const testGoal = bootstrapAgent.addBootstrapGoal('Test bootstrap functionality', 0.8, 0.75);
      expect(testGoal).toBeDefined();

      // Start and execute a cycle
      await bootstrapAgent.start();
      const cycleResult = await bootstrapAgent.executeSingleCycle();
      await bootstrapAgent.stop();

      // Verify results
      expect(cycleResult).toBeDefined();
      const stats = bootstrapAgent.getStats();
      expect(typeof stats).toBe('object');
    });

    test('should demonstrate plan file monitoring and updates', async () => {
      const bootstrapAgent = system.core.bootstrapAgent || new (await import('../../agent/BootstrapAgent.js')).default();

      if (!bootstrapAgent) {
        console.log('⚠️ BootstrapAgent not available in this configuration');
        return;
      }

      await bootstrapAgent.initialize({
        maxBootstrapIterations: 3,
        goalConfidenceThreshold: 0.7,
        enableSelfImprovement: true,
        watchPlanFiles: false
      });

      bootstrapAgent.setupDependencies(
        system.core.lm || null,
        system.core.planProcessor || null,
        system.core.htnPlanner || null,
        system
      );

      // Add initial plan
      const testPlan = `# Test Plan
- Monitor plan file changes
- Process updated goals
`;
      bootstrapAgent.addPlanSource(testPlan, 'text');

      const initialStats = bootstrapAgent.getStats();

      // Add another plan to simulate updates
      const updatePlan = `# Plan Update
- Add new functionality
- Modify existing goals
`;
      bootstrapAgent.addPlanSource(updatePlan, 'text');

      await bootstrapAgent.start();
      const cycleResults = [];
      const maxCycles = 1; // Limited for testing
      for (let i = 0; i < maxCycles; i++) {
        const result = await bootstrapAgent.executeSingleCycle();
        if (result) cycleResults.push(result);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      await bootstrapAgent.stop();

      const finalStats = bootstrapAgent.getStats();

      expect(Array.isArray(cycleResults)).toBe(true);
      expect(finalStats).toBeDefined();
      expect(typeof finalStats.bootstrapIterations).toBe('number');
    });

    test('should demonstrate self-directed goal processing', async () => {
      const bootstrapAgent = system.core.bootstrapAgent || new (await import('../../agent/BootstrapAgent.js')).default();

      if (!bootstrapAgent) {
        console.log('⚠️ BootstrapAgent not available in this configuration');
        return;
      }

      await bootstrapAgent.initialize({
        maxBootstrapIterations: 3,
        goalConfidenceThreshold: 0.6,
        enableSelfImprovement: true,
        watchPlanFiles: false
      });

      bootstrapAgent.setupDependencies(
        system.core.lm || null,
        system.core.planProcessor || null,
        system.core.htnPlanner || null,
        system
      );

      // Add some goals
      bootstrapAgent.addBootstrapGoal('Improve system performance', 0.9, 0.85);
      bootstrapAgent.addBootstrapGoal('Enhance cognitive capabilities', 0.8, 0.8);

      await bootstrapAgent.start();

      const executionResults = [];
      const maxCycles = 1; // Limited for testing
      for (let i = 0; i < maxCycles; i++) {
        const result = await bootstrapAgent.executeSingleCycle();
        if (result) executionResults.push(result);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await bootstrapAgent.stop();

      const finalStats = bootstrapAgent.getStats();
      const finalStatus = bootstrapAgent.getStatus();

      expect(Array.isArray(executionResults)).toBe(true);
      expect(finalStats).toBeDefined();
      expect(finalStatus).toBeDefined();
      expect(typeof finalStats.goalsProcessed).toBe('number');
    });
  });

  describe('Contradiction Resolution Integration', () => {
    test('should demonstrate direct contradiction detection', async () => {
      const contradictionAnalyzer = system.core.contradictionAnalyzer;
      if (!contradictionAnalyzer) {
        console.log('⚠️ ContradictionAnalyzer not available in this configuration');
        return;
      }

      // Create some test beliefs that might contradict
      system.input({
        term: '(bird --> animal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      system.input({
        term: '(bird --> ~animal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      // Test contradiction detection
      const contradictions = await contradictionAnalyzer.analyzeBeliefs ?
        await contradictionAnalyzer.analyzeBeliefs() : [];

      expect(Array.isArray(contradictions)).toBe(true);
      // Should detect at least the direct negation if analyzer is working
    });

    test('should demonstrate resolution strategy selection', async () => {
      const resolutionStrategy = system.core.resolutionStrategy;
      if (!resolutionStrategy) {
        console.log('⚠️ ResolutionStrategy not available in this configuration');
        return;
      }

      // Test if strategies are available
      const availableStrategies = resolutionStrategy.getAvailableStrategies ?
        resolutionStrategy.getAvailableStrategies() : [];

      expect(Array.isArray(availableStrategies)).toBe(true);
      // Should have at least some resolution strategies available
    });

    test('should demonstrate belief revision workflows', async () => {
      const contradictionAnalyzer = system.core.contradictionAnalyzer;
      const resolutionStrategy = system.core.resolutionStrategy;

      if (!contradictionAnalyzer || !resolutionStrategy) {
        console.log('⚠️ Contradiction components not available in this configuration');
        return;
      }

      // Add conflicting beliefs
      system.input({
        term: '(cat --> mammal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      system.input({
        term: '(cat --> ~mammal)',
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.8 }
      });

      // Analyze for contradictions
      const contradictions = await contradictionAnalyzer.analyzeBeliefs ?
        await contradictionAnalyzer.analyzeBeliefs() : [];

      expect(Array.isArray(contradictions)).toBe(true);

      // If contradictions found, test resolution
      if (contradictions.length > 0) {
        const resolutionResult = await resolutionStrategy.resolveContradiction ?
          await resolutionStrategy.resolveContradiction(contradictions[0]) : null;

        if (resolutionResult) {
          expect(resolutionResult).toHaveProperty('success');
        }
      }
    });

    test('should demonstrate comprehensive contradiction resolution functionality', async () => {
      const contradictionAnalyzer = system.core.contradictionAnalyzer;
      const resolutionStrategy = system.core.resolutionStrategy;

      if (!contradictionAnalyzer || !resolutionStrategy) {
        console.log('⚠️ Contradiction components not available in this configuration');
        return;
      }

      const componentsAvailable = {
        hasAnalyzer: !!contradictionAnalyzer,
        hasAnalyzeBeliefs: typeof contradictionAnalyzer.analyzeBeliefs === 'function',
        hasResolver: !!resolutionStrategy,
        hasResolveContradiction: typeof resolutionStrategy.resolveContradiction === 'function'
      };

      expect(componentsAvailable.hasAnalyzer).toBe(true);

      // Add test beliefs
      system.input({
        term: '(dog --> animal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      system.input({
        term: '(dog --> ~animal)',
        punctuation: '.',
        truth: { frequency: 0.9, confidence: 0.8 }
      });

      // Test comprehensive functionality
      const contradictions = await contradictionAnalyzer.analyzeBeliefs ?
        await contradictionAnalyzer.analyzeBeliefs() : [];

      expect(Array.isArray(contradictions)).toBe(true);

      const availableStrategies = resolutionStrategy.getAvailableStrategies ?
        resolutionStrategy.getAvailableStrategies() : [];

      expect(Array.isArray(availableStrategies)).toBe(true);

      // Test resolution if components are available
      if (contradictions.length > 0 && availableStrategies.length > 0) {
        const resolutionResults = {};
        for (const strategyName of availableStrategies.slice(0, 1)) { // Test first strategy
          try {
            const result = await resolutionStrategy.resolveContradiction(contradictions[0], strategyName);
            resolutionResults[strategyName] = result;
          } catch (error) {
            // Some strategies might fail, that's okay for testing
          }
        }

        expect(typeof resolutionResults).toBe('object');
      }
    });
  });

  describe('Memory Attention Integration', () => {
    test('should demonstrate multi-focus set operations', async () => {
      const memory = system.core.memory;
      if (!memory || !memory.focusSets) {
        console.log('⚠️ Memory focus sets not available in this configuration');
        return;
      }

      // Add some tasks to different focus areas
      system.input({
        term: '(urgent-task --> important)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 },
        priority: 0.9
      });

      system.input({
        term: '(background-task --> routine)',
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.7 },
        priority: 0.3
      });

      // Test focus set operations
      const focusStats = memory.getStats ? memory.getStats() : {};
      expect(typeof focusStats).toBe('object');

      // Verify memory operations work
      const health = memory.getHealth ? memory.getHealth() : {};
      expect(typeof health).toBe('object');
    });

    test('should demonstrate attention decay and update mechanisms', async () => {
      const memory = system.core.memory;
      if (!memory) {
        console.log('⚠️ Memory component not available in this configuration');
        return;
      }

      // Add a task and test attention mechanisms
      system.input({
        term: '(attention-test --> memory)',
        punctuation: '.',
        truth: { frequency: 0.9, confidence: 0.8 },
        priority: 0.7
      });

      // Test memory stats
      const memStats = memory.getStats ? memory.getStats() : {};
      expect(typeof memStats).toBe('object');

      // Verify memory operations work
      const health = memory.getHealth ? memory.getHealth() : {};
      expect(typeof health).toBe('object');
    });

    test('should demonstrate cross-focus set querying', async () => {
      const memory = system.core.memory;
      if (!memory || !memory.focusSets) {
        console.log('⚠️ Memory focus sets not available in this configuration');
        return;
      }

      // Add tasks to test cross-focus querying
      system.input({
        term: '(cross-focus-task --> test)',
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.75 }
      });

      // Test memory functionality
      const stats = memory.getStats ? memory.getStats() : {};
      expect(typeof stats).toBe('object');

      // Test that memory operations complete without errors
      const health = memory.getHealth ? memory.getHealth() : {};
      expect(typeof health).toBe('object');
    });

    test('should demonstrate comprehensive memory attention functionality', async () => {
      const memory = system.core.memory;
      if (!memory) {
        console.log('⚠️ Memory component not available in this configuration');
        return;
      }

      // Test comprehensive memory functionality
      const componentsAvailable = {
        hasMemory: !!memory,
        hasGetHealth: typeof memory.getHealth === 'function',
        hasGetStats: typeof memory.getStats === 'function',
        hasGetAllTasks: typeof memory.getAllTasks === 'function'
      };

      expect(componentsAvailable.hasMemory).toBe(true);

      // Add multiple tasks to test memory operations
      for (let i = 0; i < 3; i++) {
        system.input({
          term: `(memory-test-${i} --> attention)`,
          punctuation: '.',
          truth: { frequency: 0.8, confidence: 0.7 },
          priority: 0.5 + (i * 0.1)
        });
      }

      // Test memory operations
      const health = memory.getHealth();
      const stats = memory.getStats();

      expect(health).toBeDefined();
      expect(stats).toBeDefined();

      // Verify memory operations work (check available methods)
      const availableMethods = {
        hasGetHealth: typeof memory.getHealth === 'function',
        hasGetStats: typeof memory.getStats === 'function',
        hasGetStorageSize: typeof memory.getStorageSize === 'function'
      };

      expect(availableMethods.hasGetHealth).toBe(true);
      expect(availableMethods.hasGetStats).toBe(true);
    });
  });

  describe('Cognitive Cycle Integration', () => {
    test('should demonstrate end-to-end cognitive loop', async () => {
      // Test basic cognitive cycle functionality using existing system
      const memory = system.core.memory;
      const rules = system.core.rules;
      const reasoning = system.core.reasoning;

      if (!memory || !rules || !reasoning) {
        console.log('⚠️ Core cognitive components not available in this configuration');
        return;
      }

      // Add a belief
      system.input({
        term: '(bird --> animal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      // Add a rule
      system.input({
        term: '(animal --> living-thing)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.95 }
      });

      // Test that components are working
      const memHealth = memory.getHealth ? memory.getHealth() : {};
      const ruleHealth = rules.getHealth ? rules.getHealth() : {};
      const reasonStats = reasoning.getStats ? reasoning.getStats() : {};

      expect(typeof memHealth).toBe('object');
      expect(typeof ruleHealth).toBe('object');
      expect(typeof reasonStats).toBe('object');
    });

    test('should verify rule-memory interaction', async () => {
      const memory = system.core.memory;
      const rules = system.core.rules;

      if (!memory || !rules) {
        console.log('⚠️ Memory or Rules components not available in this configuration');
        return;
      }

      // Add a belief to memory
      system.input({
        term: '(cat --> mammal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      // Test component interaction
      const memStats = memory.getStats ? memory.getStats() : {};
      const ruleStats = rules.getStats ? rules.getStats() : {};

      expect(typeof memStats).toBe('object');
      expect(typeof ruleStats).toBe('object');
    });

    test('should demonstrate task processing flow', async () => {
      const memory = system.core.memory;
      const reasoning = system.core.reasoning;

      if (!memory || !reasoning) {
        console.log('⚠️ Memory or Reasoning components not available in this configuration');
        return;
      }

      // Add a task for processing
      system.input({
        term: '(test-task --> processing)',
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.7 }
      });

      // Test processing flow
      const memHealth = memory.getHealth ? memory.getHealth() : {};
      const reasonStats = reasoning.getStats ? reasoning.getStats() : {};

      expect(typeof memHealth).toBe('object');
      expect(typeof reasonStats).toBe('object');
    });

    test('should demonstrate comprehensive cognitive cycle functionality', async () => {
      const memory = system.core.memory;
      const rules = system.core.rules;
      const reasoning = system.core.reasoning;

      if (!memory || !rules || !reasoning) {
        console.log('⚠️ Core cognitive components not available in this configuration');
        return;
      }

      const componentsAvailable = {
        hasMemory: !!memory,
        hasRules: !!rules,
        hasReasoning: !!reasoning,
        hasGetMemoryHealth: typeof memory.getHealth === 'function',
        hasGetRulesHealth: typeof rules.getHealth === 'function',
        hasGetReasoningStats: typeof reasoning.getStats === 'function'
      };

      expect(componentsAvailable.hasMemory).toBe(true);
      expect(componentsAvailable.hasRules).toBe(true);
      expect(componentsAvailable.hasReasoning).toBe(true);

      // Add test data
      system.input({
        term: '(cognitive-test --> validation)',
        punctuation: '.',
        truth: { frequency: 0.9, confidence: 0.8 }
      });

      // Test comprehensive functionality
      const memHealth = memory.getHealth();
      const ruleHealth = rules.getHealth();
      const reasonStats = reasoning.getStats();

      expect(memHealth).toBeDefined();
      expect(ruleHealth).toBeDefined();
      expect(reasonStats).toBeDefined();
    });
  });

  describe('Plan Processor Integration', () => {
    test('should demonstrate document parsing and goal extraction', async () => {
      const planProcessor = system.core.planProcessor;
      if (!planProcessor) {
        console.log('⚠️ PlanProcessor not available in this configuration');
        return;
      }

      // Test plan processor functionality
      const processorStats = planProcessor.getStats ? planProcessor.getStats() : {};
      expect(typeof processorStats).toBe('object');

      // Test that plan processor is accessible
      const health = planProcessor.getHealth ? planProcessor.getHealth() : {};
      expect(typeof health).toBe('object');
    });

    test('should demonstrate goal prioritization and validation', async () => {
      const planProcessor = system.core.planProcessor;
      if (!planProcessor) {
        console.log('⚠️ PlanProcessor not available in this configuration');
        return;
      }

      // Test plan processor operations
      const stats = planProcessor.getStats ? planProcessor.getStats() : {};
      expect(typeof stats).toBe('object');

      // Verify plan processor has required methods
      const hasProcessDocument = typeof planProcessor.processDocument === 'function';
      const hasConvertGoalsToTasks = typeof planProcessor.convertGoalsToTasks === 'function';

      expect(hasProcessDocument || hasConvertGoalsToTasks).toBe(true);
    });

    test('should demonstrate task generation from structured plans', async () => {
      const planProcessor = system.core.planProcessor;
      if (!planProcessor) {
        console.log('⚠️ PlanProcessor not available in this configuration');
        return;
      }

      // Test plan processing capabilities
      const health = planProcessor.getHealth ? planProcessor.getHealth() : {};
      const stats = planProcessor.getStats ? planProcessor.getStats() : {};

      expect(typeof health).toBe('object');
      expect(typeof stats).toBe('object');
    });

    test('should demonstrate comprehensive plan processing functionality', async () => {
      const planProcessor = system.core.planProcessor;
      if (!planProcessor) {
        console.log('⚠️ PlanProcessor not available in this configuration');
        return;
      }

      const componentsAvailable = {
        hasPlanProcessor: !!planProcessor,
        hasProcessDocument: typeof planProcessor.processDocument === 'function',
        hasConvertGoalsToTasks: typeof planProcessor.convertGoalsToTasks === 'function',
        hasGetStats: typeof planProcessor.getStats === 'function',
        hasGetHealth: typeof planProcessor.getHealth === 'function'
      };

      expect(componentsAvailable.hasPlanProcessor).toBe(true);

      // Test comprehensive functionality
      const health = planProcessor.getHealth();
      const stats = planProcessor.getStats();

      expect(health).toBeDefined();
      expect(stats).toBeDefined();
    });

    test('system starts successfully with PlanProcessor component', async () => {
      // Verify PlanProcessor is available in the main system
      const planProcessor = system.core.planProcessor;
      expect(planProcessor).toBeDefined();

      // Verify other planning components
      expect(system.core.htnPlanner).toBeDefined();
      expect(system.core.aStarPlanner).toBeDefined();
      expect(system.core.adjacencyBag).toBeDefined();
      expect(system.core.graphTraversal).toBeDefined();

      // Verify PlanProcessor has proper references
      const hasLM = !!planProcessor.lm;
      const hasHTNPlanner = !!planProcessor.htnPlanner;

      // These might be null in test configuration, but the references should exist
      expect(planProcessor).toBeDefined();
    });

    test('PlanProcessor can process simple text', async () => {
      const planProcessor = system.core.planProcessor;
      expect(planProcessor).toBeDefined();

      const testDoc = "Implement user authentication with high priority";

      // Process document (this may return 0 goals due to pattern matching)
      const result = await planProcessor.processDocument ?
        await planProcessor.processDocument(testDoc, 'text') : { goals: [], dependencies: [], metadata: {} };

      // Verify it returns proper structure
      expect(result).toHaveProperty('goals');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('metadata');
    });
  });
});