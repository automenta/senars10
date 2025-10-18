/**
 * @file: examples/shared/planningDemo.js
 * @description: Shared functionality for planning system demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Export the main functionality for both tests and examples to use
export async function demonstratePlanningSystem() {
  // Create and start the system
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Access the HTN planner component
    const planner = system.core.htnPlanner;
    if (!planner) {
      console.log('⚠️  HTN Planner not available in this configuration');
      return null;
    }

    console.log('\\n📋 Planning System Initial Stats:');
    const initialStats = planner.getStats();
    console.log('   Registered Methods:', initialStats.registeredMethods);
    console.log('   Registered Operators:', initialStats.registeredOperators);
    console.log('   Methods Applied:', initialStats.methodsApplied);
    console.log('   Backtracks:', initialStats.backtracks);

    // 1. Define a complex goal and create tasks to achieve it
    console.log('\\n🎯 Creating a complex goal for planning:');
    const goal = {
      name: 'complex-task',
      parameters: { target: 'assemble-robot-arm' }
    };

    // 2. Register some methods to decompose complex tasks
    console.log('\\n⚙️  Registering planning methods and operators:');

    // Register a method to decompose the complex task
    planner.registerMethod('complex-task', async (task, context) => {
      console.log(`   Decomposing task: ${task.name}`);
      return [
        { name: 'move', to: 'assembly-station-1' },
        { name: 'pickup', object: 'robot-arm-parts' },
        { name: 'move', to: 'assembly-station-2' },
        { name: 'assemble', object: 'robot-arm' }
      ];
    }, {}, 1.0);

    // Register an additional assembly operator
    planner.registerOperator('assemble', async (task, context) => {
      const object = task.object;
      if (!object) {
        throw new Error('Assemble task requires "object" parameter');
      }

      return {
        success: true,
        message: `Assembled ${object}`,
        effects: { assembled: true, [`${object}-status`]: 'complete' }
      };
    }, { 'robot-arm-parts': true }, { 'robot-arm-status': 'complete' });

    // 3. Generate a plan for the goal
    console.log('\\n🧠 Generating plan for goal...');
    const startState = {
      location: 'start-position',
      inventory: ['tools']
    };

    const plan = await planner.createGoalPlan(goal, startState);

    if (plan) {
      console.log(`\\n📋 Generated plan with ${plan.length} steps:`);
      plan.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.name}${task.to ? ` to ${task.to}` : ''}${task.object ? ` object: ${task.object}` : ''}`);
      });
    } else {
      console.log('   ❌ Could not generate a plan for the goal');
    }

    // 4. Execute the plan if it exists
    if (plan) {
      console.log('\\n🏃 Executing the generated plan...');
      const executionContext = {
        ...startState,
        startTime: Date.now()
      };

      const executionResult = await planner.executePlan(plan, executionContext);

      console.log('\\n📊 Plan execution result:');
      console.log('   Success:', executionResult.success);
      console.log('   Executed tasks:', executionResult.executedTasks.length);
      console.log('   Failed tasks:', executionResult.failedTasks.length);
      console.log('   State changes:', executionResult.stateChanges.length);
    }

    // 5. Show updated stats
    console.log('\\n📈 Updated Planning Stats:');
    const finalStats = planner.getStats();
    console.log('   Registered Methods:', finalStats.registeredMethods);
    console.log('   Registered Operators:', finalStats.registeredOperators);
    console.log('   Methods Applied:', finalStats.methodsApplied);
    console.log('   Backtracks:', finalStats.backtracks);

    // Return results for verification
    return {
      initialStats,
      finalStats,
      plan,
      hasPlanner: !!planner,
      system
    };

  } catch (error) {
    console.error('❌ Error during planning example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Export a function specifically for testing planning functionality
export async function testPlanningFunctionality() {
  const system = new System({});

  try {
    await system.start();

    const planner = system.core.htnPlanner;
    if (!planner) {
      throw new Error('HTN Planner not available');
    }

    // Test planning components exist
    const componentsAvailable = {
      hasPlanner: !!planner,
      hasRegisterMethod: typeof planner.registerMethod === 'function',
      hasRegisterOperator: typeof planner.registerOperator === 'function',
      hasPlan: typeof planner.plan === 'function',
      hasExecutePlan: typeof planner.executePlan === 'function',
      hasCreateGoalPlan: typeof planner.createGoalPlan === 'function',
      hasGetStats: typeof planner.getStats === 'function'
    };

    // Test basic planning functionality
    // Register a simple method and operator for testing
    planner.registerMethod('simple-goal', async (task, context) => {
      return [
        { name: 'simple-action' }
      ];
    });

    planner.registerOperator('simple-action', async (task, context) => {
      return {
        success: true,
        message: 'Simple action completed',
        effects: { actionCompleted: true }
      };
    });

    // Test plan generation
    const testGoal = { name: 'simple-goal' };
    const testStartState = { location: 'start' };

    const plan = await planner.createGoalPlan(testGoal, testStartState);

    // Test plan execution
    let executionResult = null;
    if (plan) {
      executionResult = await planner.executePlan(plan, { startTime: Date.now() });
    }

    // Get stats
    const stats = planner.getStats();

    return {
      componentsAvailable,
      plan,
      executionResult,
      stats
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing task dependency resolution
export async function testTaskDependencyResolution() {
  const system = new System({});

  try {
    await system.start();

    const planner = system.core.htnPlanner;
    if (!planner) {
      throw new Error('HTN Planner not available');
    }

    // Register methods with dependencies
    planner.registerMethod('assembly-task', async (task, context) => {
      return [
        { name: 'get-components', location: 'warehouse' },
        { name: 'transport-components', destination: 'assembly-area' },
        { name: 'assemble-product', product: task.product }
      ];
    });

    // Register corresponding operators
    planner.registerOperator('get-components', async (task, context) => {
      return {
        success: true,
        message: `Got components from ${task.location}`,
        effects: { hasComponents: true }
      };
    });

    planner.registerOperator('transport-components', async (task, context) => {
      if (!context.hasComponents) {
        return {
          success: false,
          error: 'Cannot transport without components',
          effects: {}
        };
      }

      return {
        success: true,
        message: `Transported components to ${task.destination}`,
        effects: { componentsAt: task.destination }
      };
    });

    planner.registerOperator('assemble-product', async (task, context) => {
      if (!context.componentsAt) {
        return {
          success: false,
          error: 'Cannot assemble without components at location',
          effects: {}
        };
      }

      return {
        success: true,
        message: `Assembled product: ${task.product}`,
        effects: { [`${task.product}-status`]: 'assembled' }
      };
    });

    // Test planning with dependencies
    const goal = { name: 'assembly-task', product: 'gadget' };
    const startState = { location: 'start-area' };

    const plan = await planner.createGoalPlan(goal, startState);

    // Execute the plan
    let executionResult = null;
    if (plan) {
      executionResult = await planner.executePlan(plan, {
        ...startState,
        startTime: Date.now()
      });
    }

    return {
      plan,
      executionResult,
      dependenciesResolved: executionResult?.success || false
    };
  } finally {
    await system.stop();
  }
}