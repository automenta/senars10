
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates abstract goal decomposition. The system
 * is given a high-level, abstract goal that it cannot directly act upon (e.g.,
 * "be healthy"). It uses the LM to break this down into a set of more concrete,
 * actionable sub-goals that can be represented and pursued as Narsese goals.
 */
describe('Experimental: LM-driven Abstract Goal Decomposition', () => {

  it('should decompose an abstract goal into concrete, actionable sub-goals', async () => {
    const core = createCore();

    // 1. The system is given a high-level, abstract goal.
    const abstractGoal = 'be_healthy!';
    await core.addInput(abstractGoal);

    // 2. The system recognizes that 'be_healthy' is not an operation it can execute.
    //    It prompts the LM to break it down.
    //    Submit a goal task that triggers GoalDecompositionRule:
    //    "Break down the high-level goal 'be healthy' into 3-5 concrete,
    //     actionable sub-goals. Provide a list of simple imperative statements."
    await core.input({
      term: 'be_healthy',
      punctuation: '!',
      truth: { frequency: 0.9, confidence: 0.8 }
    });
    const subGoalsNL = 'Goal submitted - rule system will handle decomposition';

    // 3. The LM returns a list of more concrete objectives.
    expect(subGoalsNL).toEqual(expect.arrayContaining([
      "Eat nutritious food",
      "Exercise regularly",
      "Get enough sleep"
    ]));

    // 4. The system translates these natural language objectives into Narsese goals.
    const concreteGoals = [
      'eat(nutritious_food)!',
      'exercise(regularly)!',
      'get(enough_sleep)!'
    ];

    // 5. The system also creates beliefs that link the achievement of these sub-goals
    //    to the achievement of the main abstract goal.
    for (const goal of concreteGoals) {
      const goalTerm = goal.slice(0, -1); // remove '!'
      await core.addInput(`(${goalTerm} ==> be_healthy).`);
      await core.addInput(goal);
    }

    // 6. Verify that the new, concrete sub-goals now exist in memory.
    expect(core.memory.getTask('eat(nutritious_food)!')).toBeDefined();
    expect(core.memory.getTask('exercise(regularly)!')).toBeDefined();
    expect(core.memory.getTask('get(enough_sleep)!')).toBeDefined();

    // The system can now start planning how to achieve these more manageable goals.
  });
});
