
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite explores "Theory of Mind," the ability to attribute
 * mental states—beliefs, intents, desires—to other agents. The system observes
 * an agent's actions and uses the LM to infer the beliefs that likely motivated
 * those actions. These inferred beliefs are then stored in NARS under a specific
 * context for that agent.
 */
describe('Experimental: LM-driven Theory of Mind Simulation', () => {

  it("should infer another agent's beliefs from their actions", async () => {
    const core = createCore();

    // 1. The system observes another agent, "Bob," performing an action.
    const observation = "Bob is looking for his keys under the streetlight.";

    // 2. The system also knows a relevant piece of context.
    const context = "Bob actually lost his keys in the park.";
    await core.addInput('(keys --> (--, at_streetlight)).');
    await core.addInput('(keys --> at_park).');

    // 3. The system uses the LM to infer Bob's belief state.
    //    LM Prompt (using 'inferBelief' function):
    //    "Observation: Bob is looking for his keys under the streetlight.
    //     Fact: Bob's keys are actually in the park.
    //     What does Bob likely believe about where his keys are?"
    const inferredBeliefNL = await core.lm.inferBelief(observation, context);

    expect(inferredBeliefNL).toBe("Bob believes his keys are under the streetlight.");

    // 4. The system translates this inferred belief into Narsese, but scopes it
    //    to the agent "Bob." This is a critical step: it's not the system's belief,
    //    it's the system's belief *about Bob's belief*.
    const narseseBelief = '( (Bob, believes) ==> (keys --> at_streetlight) ).';
    await core.addInput(narseseBelief);

    // 5. Verify that the system now has a belief about Bob's mental state.
    const beliefAboutBob = core.memory.getBelief(narseseBelief);
    expect(beliefAboutBob).toBeDefined();
    expect(beliefAboutBob.truth.confidence).toBeGreaterThan(0.7);

    // This allows the system to reason about Bob's actions, e.g., predicting he won't find his keys.
    // It can also reason about the discrepancy between its own beliefs and Bob's.
  });
});
