import {
  createCore
} from '../../core/createCore';

/**
 * This experimental test suite demonstrates goal-oriented planning where the LM
 * generates a sequence of actions to satisfy a high-level goal defined in NARS.
 * The system then translates this natural language plan into a Narsese operation sequence.
 */
describe('Experimental: LM-driven Goal Decomposition and Planning', () => {

  it('should use the LM to generate a plan for a high-level goal', async () => {
    const core = createCore();

    // 1. Define a high-level goal.
    await core.addInput('make_tea!');

    // 2. System state (what NARS knows about the world).
    await core.addInput('(kettle --> object).');
    await core.addInput('(water --> substance).');
    await core.addInput('(teabag --> object).');

    // 3. A hypothetical function where the system, driven by the 'make_tea' goal,
    //    prompts the LM to generate a plan.
    //    LM Prompt: "How do I make tea? I have a kettle, water, and a teabag."
    const nlPlan = [
      "Boil water in the kettle.",
      "Put the teabag in a cup.",
      "Pour the boiling water into the cup."
    ].join('\n');

    // 4. A hypothetical function to parse the NL plan into Narsese operations.
    //    This would likely involve another LM call or sophisticated parsing.
    const narsesePlan = '(&/, (^boil water), (^put teabag), (^pour water)).';

    // 5. The system adopts this as a potential plan to achieve the goal.
    //    This creates an implication: if I execute this plan, I will make tea.
    await core.addInput(`(${narsesePlan} ==> make_tea).`);

    // 6. Verify the plan is stored in memory.
    const planBelief = core.memory.getBelief(`(${narsesePlan} ==> make_tea)`);
    expect(planBelief).toBeDefined();
    expect(planBelief.truth.confidence).toBeGreaterThan(0.5);
  });
});
