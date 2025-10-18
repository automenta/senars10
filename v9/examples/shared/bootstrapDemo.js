/**
 * @file: examples/shared/bootstrapDemo.js
 * @description: Shared functionality for bootstrap agent demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';
import BootstrapSystem from '../../agent/BootstrapAgent.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateBootstrapAgent() {
  // Create and start the system
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Create and initialize the bootstrap agent
    const bootstrapAgent = new BootstrapSystem();
    await bootstrapAgent.initialize({
      maxBootstrapIterations: 5,  // Limit iterations for demo
      goalConfidenceThreshold: 0.7,
      enableSelfImprovement: true,
      watchPlanFiles: false  // Disable file watching for demo
    });

    // Set up dependencies
    bootstrapAgent.setupDependencies(
      system.core.lm,  // Language Model
      system.core.planProcessor,  // Plan Processor
      system.core.htnPlanner,  // HTN Planner
      system
    );

    console.log('\\n📋 Bootstrap Agent Initial Stats:');
    const initialStats = bootstrapAgent.getStats();
    console.log('   Bootstrap Iterations:', initialStats.bootstrapIterations);
    console.log('   Goals Processed:', initialStats.goalsProcessed);
    console.log('   Goals Completed:', initialStats.goalsCompleted);

    // Add a plan source for the bootstrap agent
    console.log('\\n🎯 Adding development plan as source...');
    const demoPlan = `# Development Plan
## Phase 1: Core Implementation
- Implement basic memory system
- Create rule processing engine
- Build cognitive cycle framework

## Phase 2: Advanced Features
- Add pattern detection capabilities
- Implement contradiction resolution
- Enhance attention mechanisms

## Phase 3: Integration
- Connect all components
- Perform system testing
- Optimize performance
`;
    bootstrapAgent.addPlanSource(demoPlan, 'text');

    // Add some direct bootstrap goals
    bootstrapAgent.addBootstrapGoal('Implement memory management system', 0.9, 0.85);
    bootstrapAgent.addBootstrapGoal('Create rule evaluation mechanism', 0.8, 0.8);
    bootstrapAgent.addBootstrapGoal('Build cognitive processing pipeline', 0.85, 0.75);

    console.log('\\n🔄 Starting bootstrap process...');
    await bootstrapAgent.start();

    // Execute a few bootstrap cycles manually (fewer in test environment)
    const maxCycles = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 1 : 3;
    for (let i = 0; i < maxCycles; i++) {
      console.log(`   Executing bootstrap cycle ${i + 1}...`);
      const cycleResult = await bootstrapAgent.executeSingleCycle();
      if (cycleResult) {
        console.log(`      Iteration: ${cycleResult.iteration}, Goals Processed: ${cycleResult.goalsProcessed}`);
      }
      // Small delay between cycles in demo mode (shorter in tests)
      const delay = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 10 : 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Stop the bootstrap agent
    await bootstrapAgent.stop();

    console.log('\\n📊 Bootstrap Processing Results:');
    const status = bootstrapAgent.getStatus();
    console.log('   Phase:', status.phase);
    console.log('   Total Goals:', status.goals.total);
    console.log('   Completed:', status.goals.completed);
    console.log('   Failed:', status.goals.failed);

    // Show updated stats
    console.log('\\n📈 Updated Bootstrap Agent Stats:');
    const finalStats = bootstrapAgent.getStats();
    console.log('   Bootstrap Iterations:', finalStats.bootstrapIterations);
    console.log('   Goals Processed:', finalStats.goalsProcessed);
    console.log('   Goals Completed:', finalStats.goalsCompleted);
    console.log('   Plans Processed:', finalStats.plansProcessed);
    console.log('   Self Improvements:', finalStats.selfImprovements);

    // Return results for verification
    return {
      initialStats,
      finalStats,
      status,
      hasBootstrapAgent: !!bootstrapAgent,
      system
    };

  } catch (error) {
    console.error('❌ Error during bootstrap agent example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Export a function specifically for testing bootstrap agent functionality
export async function testBootstrapAgentFunctionality() {
  const system = new System({});

  try {
    await system.start();

    const bootstrapAgent = new BootstrapSystem();
    await bootstrapAgent.initialize({
      maxBootstrapIterations: 3,
      goalConfidenceThreshold: 0.7,
      enableSelfImprovement: true,
      watchPlanFiles: false
    });

    // Set up dependencies
    bootstrapAgent.setupDependencies(
      system.core.lm,
      system.core.planProcessor,
      system.core.htnPlanner,
      system
    );

    // Test component availability
    const componentsAvailable = {
      hasBootstrapAgent: !!bootstrapAgent,
      hasInitialize: typeof bootstrapAgent.initialize === 'function',
      hasSetupDependencies: typeof bootstrapAgent.setupDependencies === 'function',
      hasStart: typeof bootstrapAgent.start === 'function',
      hasStop: typeof bootstrapAgent.stop === 'function',
      hasExecuteSingleCycle: typeof bootstrapAgent.executeSingleCycle === 'function',
      hasAddPlanSource: typeof bootstrapAgent.addPlanSource === 'function',
      hasGetStats: typeof bootstrapAgent.getStats === 'function',
      hasGetStatus: typeof bootstrapAgent.getStatus === 'function',
      hasAddBootstrapGoal: typeof bootstrapAgent.addBootstrapGoal === 'function'
    };

    // Add a simple plan source
    const simplePlan = `# Simple Plan
- Goal 1: Implement basic functionality
- Goal 2: Test the implementation
- Goal 3: Optimize performance
`;
    bootstrapAgent.addPlanSource(simplePlan, 'text');

    // Add a direct bootstrap goal
    const testGoal = bootstrapAgent.addBootstrapGoal('Test bootstrap functionality', 0.8, 0.75);

    // Start the bootstrap process
    await bootstrapAgent.start();

    // Execute a single cycle to process the plan
    const cycleResult = await bootstrapAgent.executeSingleCycle();

    // Get current stats and status
    const stats = bootstrapAgent.getStats();
    const status = bootstrapAgent.getStatus();

    // Stop the bootstrap agent
    await bootstrapAgent.stop();

    return {
      componentsAvailable,
      testGoal,
      cycleResult,
      stats,
      status
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing plan file monitoring and updates
export async function testPlanFileMonitoringAndUpdates() {
  const system = new System({});

  try {
    await system.start();

    const bootstrapAgent = new BootstrapSystem();
    await bootstrapAgent.initialize({
      maxBootstrapIterations: 5,
      goalConfidenceThreshold: 0.7,
      enableSelfImprovement: true,
      // Disable file watching during tests to avoid file system dependencies
      watchPlanFiles: false
    });

    // Set up dependencies
    bootstrapAgent.setupDependencies(
      system.core.lm,
      system.core.planProcessor,
      system.core.htnPlanner,
      system
    );

    // Add a plan source for monitoring
    const testPlan = `# Test Plan
## Goals
- Monitor plan file changes
- Process updated goals
- Track changes over time

## Objectives
- Implement file watching mechanism
- Detect changes in plan files
- Update bootstrap goals accordingly
`;
    bootstrapAgent.addPlanSource(testPlan, 'text');

    // Get initial stats
    const initialStats = bootstrapAgent.getStats();

    // Add another plan source to simulate updates
    const updatePlan = `# Plan Update
- Add new functionality
- Modify existing goals
- Enhance system capabilities
`;
    bootstrapAgent.addPlanSource(updatePlan, 'text');

    // Start and run a few cycles to process updates
    await bootstrapAgent.start();

    const cycleResults = [];
    const maxCycles = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 1 : 2;
    for (let i = 0; i < maxCycles; i++) {
      const result = await bootstrapAgent.executeSingleCycle();
      if (result) cycleResults.push(result);
      const delay = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 10 : 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    await bootstrapAgent.stop();

    // Get final stats
    const finalStats = bootstrapAgent.getStats();

    return {
      initialStats,
      finalStats,
      cycleResults,
      planSourcesCount: bootstrapAgent.planSources.length
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing self-directed goal processing
export async function testSelfDirectedGoalProcessing() {
  const system = new System({});

  try {
    await system.start();

    const bootstrapAgent = new BootstrapSystem();
    await bootstrapAgent.initialize({
      maxBootstrapIterations: 5,
      goalConfidenceThreshold: 0.6,
      enableSelfImprovement: true,
      watchPlanFiles: false
    });

    // Set up dependencies - only set up what's available
    bootstrapAgent.setupDependencies(
      system.core.lm || null,
      system.core.planProcessor || null,
      system.core.htnPlanner || null,
      system
    );

    // Add some goals to work with
    bootstrapAgent.addBootstrapGoal('Improve system performance', 0.9, 0.85);
    bootstrapAgent.addBootstrapGoal('Enhance cognitive capabilities', 0.8, 0.8);
    bootstrapAgent.addBootstrapGoal('Optimize memory usage', 0.75, 0.75);
    bootstrapAgent.addBootstrapGoal('Add new features', 0.7, 0.7);

    // Start the bootstrap agent
    await bootstrapAgent.start();

    // Execute several cycles to allow for self-directed improvement (fewer in tests)
    const executionResults = [];
    const maxCycles = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 1 : 3;
    for (let i = 0; i < maxCycles; i++) {
      const result = await bootstrapAgent.executeSingleCycle();
      if (result) {
        executionResults.push(result);
      }
      // Short delay between cycles (shorter in tests)
      const delay = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 10 : 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Stop the bootstrap agent
    await bootstrapAgent.stop();

    // Get final status and stats
    const finalStats = bootstrapAgent.getStats();
    const finalStatus = bootstrapAgent.getStatus();

    return {
      executionResults,
      finalStats,
      finalStatus,
      totalGoals: bootstrapAgent.bootstrapGoals.length,
      completedGoals: bootstrapAgent.completedGoals.length,
      selfImprovementEnabled: bootstrapAgent.config.enableSelfImprovement
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing improvement loop iteration
export async function testImprovementLoopIteration() {
  const system = new System({});

  try {
    await system.start();

    const bootstrapAgent = new BootstrapSystem();
    await bootstrapAgent.initialize({
      maxBootstrapIterations: 5,
      goalConfidenceThreshold: 0.6,
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

    // Add initial goals
    bootstrapAgent.addBootstrapGoal('Initialize bootstrap process', 0.9, 0.9);
    bootstrapAgent.addBootstrapGoal('Process initial goals', 0.8, 0.85);

    // Start the bootstrap agent
    await bootstrapAgent.start();

    // Execute multiple cycles to trigger improvement loops (fewer in tests)
    const iterationResults = [];
    const maxCycles = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 1 : 4;
    for (let i = 0; i < maxCycles; i++) {
      const result = await bootstrapAgent.executeSingleCycle();
      if (result) {
        iterationResults.push(result);
      }
      const delay = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 10 : 40;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Stop the bootstrap agent
    await bootstrapAgent.stop();

    // Get final metrics
    const finalStats = bootstrapAgent.getStats();

    return {
      iterationResults,
      finalStats,
      bootstrapIterations: finalStats.bootstrapIterations,
      selfImprovements: finalStats.selfImprovements,
      goalsProcessed: finalStats.goalsProcessed,
      goalsCompleted: finalStats.goalsCompleted,
      improvementLoopEnabled: bootstrapAgent.config.enableSelfImprovement
    };
  } finally {
    await system.stop();
  }
}