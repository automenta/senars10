
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates strategic information seeking. Given a
 * complex question and a limited budget of actions (e.g., web searches), the
 * system uses the LM to formulate a high-level research plan. It then executes
 * this plan step-by-step, integrating the findings using NARS to dynamically
 * inform the next query, optimizing its search strategy.
 */
describe('Experimental: LM-driven Strategic Research and Information Seeking', () => {

  it('should create and execute a research plan to answer a complex question', async () => {
    const core = createCore();

    // 1. The system is given a complex question that requires multiple steps to answer.
    const complexQuestion = "What is the impact of the Mediterranean diet on the lifespan of people in Japan?";

    // 2. The system uses the LM to generate a high-level research plan.
    //    LM Prompt (using 'createResearchPlan' function):
    //    "To answer 'What is the impact of the Mediterranean diet on the lifespan of people in Japan?',
    //     what are the key sub-questions I need to answer first? List them in a logical order."
    const researchPlan = await core.lm.createResearchPlan(complexQuestion);

    // 3. The LM should break the problem down into logical, sequential steps.
    expect(researchPlan).toEqual([
      "What are the components of the traditional Mediterranean diet?",
      "What is the traditional diet in Japan?",
      "Are there studies on the adoption of the Mediterranean diet in Japan?",
      "What do these studies say about lifespan and health outcomes?"
    ]);

    // 4. The system adopts this plan, turning the first step into an actionable goal.
    const firstStepGoal = `web_search("${researchPlan[0]}")!`;
    await core.addInput(firstStepGoal);

    // 5. (Simulated) The system executes the search. The tool returns a result.
    const searchResult1 = "The Mediterranean diet is rich in olive oil, fruits, vegetables, and fish.";
    // The system uses the LM to extract the key fact and adds it to NARS.
    await core.addInput('((Mediterranean_diet --} has_component(olive_oil)) &| (Mediterranean_diet --} has_component(fish))).');

    // 6. The system then proceeds to the next step, now with the context from the first.
    //    This process would continue until all sub-questions are answered and the
    //    final synthesis can be performed.
    const secondStepGoal = `web_search("${researchPlan[1]}")!`;
    await core.addInput(secondStepGoal);
    const secondStepTask = core.memory.getTask(secondStepGoal);

    // Verify the system is proceeding through the plan.
    expect(secondStepTask).toBeDefined();
    expect(secondStepTask.priority).toBeGreaterThan(0.5);
  });
});
