import HTNPlanner from '../../core/plan/HTNPlanner.js';

describe('HTNPlanner', () => {
  let planner;

  beforeEach(async () => {
    planner = new HTNPlanner();
    await planner.initialize();

    // Define some compound tasks with decomposition methods

    // Define a "travel" compound task that can be decomposed into move steps
    planner.registerMethod('travel', async (task, context) => {
      // Decompose travel into a sequence of move tasks
      return [
        { name: 'move', from: task.from, to: 'waypoint1' },
        { name: 'move', from: 'waypoint1', to: task.to }
      ];
    });

    // Define a "deliver" compound task that involves going somewhere and dropping off
    planner.registerMethod('deliver', async (task, context) => {
      // Decompose deliver into travel and putdown
      return [
        { name: 'travel', from: context.location, to: task.destination },
        { name: 'putdown', object: task.item }
      ];
    });

    // Define a "get_and_deliver" compound task
    planner.registerMethod('get_and_deliver', async (task, context) => {
      // Decompose into pickup, travel, and putdown
      return [
        { name: 'pickup', object: task.item },
        { name: 'travel', from: context.location, to: task.destination },
        { name: 'putdown', object: task.item }
      ];
    });
  });

  test('should initialize correctly', () => {
    expect(planner).toBeDefined();
    expect(planner.getStats().plansGenerated).toBe(0);
    expect(planner.getStats().registeredMethods).toBe(3);
  });

  test('should create a simple travel plan', async () => {
    const travelPlan = await planner.plan(
      { name: 'travel', from: 'A', to: 'B' },
      { location: 'A' }
    );

    expect(travelPlan).toHaveLength(2);
    expect(travelPlan[0].name).toBe('move');
    expect(travelPlan[1].name).toBe('move');
  });

  test('should create a deliver plan', async () => {
    const deliverPlan = await planner.plan(
      { name: 'deliver', item: 'package', destination: 'B' },
      { location: 'A', inventory: [] }
    );

    expect(deliverPlan).toBeDefined();
    expect(deliverPlan).toContainEqual(expect.objectContaining({ name: 'putdown', object: 'package' }));
  });

  test('should create a get_and_deliver plan', async () => {
    const getAndDeliverPlan = await planner.plan(
      { name: 'get_and_deliver', item: 'package', destination: 'C' },
      { location: 'A', inventory: [] }
    );

    expect(getAndDeliverPlan).toBeDefined();
    expect(getAndDeliverPlan).toContainEqual(expect.objectContaining({ name: 'pickup', object: 'package' }));
    expect(getAndDeliverPlan).toContainEqual(expect.objectContaining({ name: 'putdown', object: 'package' }));
  });

  test('should execute a simple plan successfully', async () => {
    const testContext = { location: 'A', inventory: [] };
    const planToExecute = [
      { name: 'move', from: 'A', to: 'B' },
      { name: 'pickup', object: 'item1' },
      { name: 'move', from: 'B', to: 'C' },
      { name: 'putdown', object: 'item1' }
    ];

    const executionResult = await planner.executePlan(planToExecute, testContext);

    expect(executionResult.success).toBe(true);
    expect(executionResult.executedTasks).toHaveLength(4);
    expect(executionResult.failedTasks).toHaveLength(0);
  });

  test('should create and execute a goal plan', async () => {
    const goalPlan = await planner.createGoalPlan(
      { name: 'deliver', item: 'document', destination: 'Office' },
      { location: 'Home', inventory: [] }
    );

    expect(goalPlan).toBeDefined();

    const goalExecutionResult = await planner.executePlan(goalPlan, { location: 'Home', inventory: [] });
    expect(goalExecutionResult.success).toBe(true);
  });

  test('should return statistics correctly', () => {
    const stats = planner.getStats();
    expect(stats).toHaveProperty('plansGenerated');
    expect(stats).toHaveProperty('plansExecuted');
    expect(stats).toHaveProperty('methodsApplied');
    expect(stats).toHaveProperty('registeredMethods');
    expect(stats).toHaveProperty('registeredOperators');
  });

  test('should handle plan execution failure gracefully', async () => {
    // Try to execute a plan with a non-existent task
    const badPlan = [{ name: 'nonexistent_task' }];
    const executionResult = await planner.executePlan(badPlan, {});

    expect(executionResult.success).toBe(false);
    expect(executionResult.failedTasks).toHaveLength(1);
  });

  test('should register and use custom operators', async () => {
    // Register a custom operator
    planner.registerOperator('test_op', async (task, context) => {
      return {
        success: true,
        message: 'Test operator executed',
        effects: { test_property: true }
      };
    }, {}, { test_property: true });

    const plan = [{ name: 'test_op' }];
    const result = await planner.executePlan(plan, {});

    expect(result.success).toBe(true);
    expect(result.executedTasks).toHaveLength(1);
    expect(result.executedTasks[0].result.success).toBe(true);
  });
});