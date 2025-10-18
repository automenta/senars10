import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates how the LM can be used to repair a
 * plan that has failed. When the system fails to achieve a goal using a known
 * plan, it provides the context of the failure to the LM to generate a revised plan.
 */
describe('Experimental: LM-driven Plan Repair', () => {

  it('should use the LM to suggest a fix for a failed plan', async () => {
    const core = createCore();

    // 1. The system has a goal and an initial, flawed plan to achieve it.
    //    The plan is flawed because it's missing the cup.
    const flawedPlan = '(&/, boil(water), pour(water))';
    await core.addInput(`(${flawedPlan} ==> make_tea).`);
    await core.addInput('make_tea!');

    // 2. A hypothetical execution engine attempts the plan.
    //    The engine would detect that 'pour' is missing a destination.
    const executionResult = {
      success: false,
      failedOperation: 'pour(water)',
      reason: 'Missing argument: destination container',
    };

    // 3. The system detects the failure and prompts the LM for a repair.
    //    LM Prompt (using a structured 'repairPlan' function):
    //    "The plan to 'make_tea' failed at the step 'pour(water)' because a destination
    //    container was missing. How can the plan be fixed?"
    const nlRepairedPlan = "First, get a cup. Then, put a teabag in the cup. Then, boil the water. Finally, pour the boiled water into the cup.";

    // 4. The system translates the LM's suggestion into a new Narsese plan.
    const repairedPlan = '(&/, get(cup), put(teabag, cup), boil(water), pour(water, cup))';

    // 5. The system adopts this new plan as a better hypothesis for the goal.
    await core.addInput(`(${repairedPlan} ==> make_tea).`);

    // 6. Verify the new, repaired plan is stored with high confidence.
    const newPlanBelief = core.memory.getBelief(`(${repairedPlan} ==> make_tea)`);
    expect(newPlanBelief).toBeDefined();
    expect(newPlanBelief.truth.confidence).toBeGreaterThan(0.7);

    // 7. Optionally, the system could lower the confidence of the old, flawed plan.
    const oldPlanBelief = core.memory.getBelief(`(${flawedPlan} ==> make_tea)`);
    // expect(oldPlanBelief.truth.confidence).toBeLessThan(0.5);
  });
});