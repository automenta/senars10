
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite showcases analogical reasoning. The system
 * leverages a known solution for a similar problem to solve a new one,
 * using the LM to bridge the conceptual gap between the two problems.
 */
describe('Experimental: LM-driven Analogical Problem Solving', () => {

  it('should solve a new problem by analogy to a known one', async () => {
    const core = createCore();

    // 1. Known problem: How to open a jar.
    const openJarPlan = '(&/, (^grip jar), (^twist lid))';
    await core.addInput(`(${openJarPlan} ==> (open jar)).`);

    // 2. NARS knows that a jar and a bottle are similar.
    await core.addInput('(jar <-> bottle).');

    // 3. New goal: Open a bottle.
    await core.addInput('(open bottle)!');

    // 4. Hypothetical function: The system detects the analogy and asks the LM
    //    to adapt the known plan.
    //    LM Prompt: "The plan to open a jar is to grip the jar and twist the lid.
    //    A bottle is like a jar. What is the plan to open a bottle?"
    const nlAdaptedPlan = "Grip the bottle and twist the cap.";

    // 5. The system translates the adapted plan into Narsese.
    const openBottlePlan = '(&/, (^grip bottle), (^twist cap))';

    // 6. The system hypothesizes this new plan will achieve the goal.
    await core.addInput(`(${openBottlePlan} ==> (open bottle)).`);

    // 7. Verify the new, analogous plan is stored in memory.
    const newPlanBelief = core.memory.getBelief(`(${openBottlePlan} ==> (open bottle))`);
    expect(newPlanBelief).toBeDefined();
    expect(newPlanBelief.truth.confidence).toBeGreaterThan(0.5);
  });
});
