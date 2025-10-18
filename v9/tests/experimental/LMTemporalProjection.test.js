
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates temporal reasoning and future projection.
 * The system is given a sequence of events and uses the LM to extrapolate what
 * is likely to happen next. This NL prediction is then converted into a formal
 * Narsese predictive belief, which the reasoner can use for planning and inference.
 */
describe('Experimental: LM-driven Temporal Projection', () => {

  it('should predict the next event in a sequence and form a plan based on it', async () => {
    const core = createCore();

    // 1. The system observes a sequence of events.
    const eventSequence = [
      "The sky is getting dark.",
      "The wind is picking up.",
      "You hear a distant thunder."
    ];

    // 2. The system uses the LM to project the most likely next event.
    //    LM Prompt (using 'predictNextEvent' function):
    //    "Given the following sequence of events, what is most likely to happen next?
    //     1. The sky is getting dark.
    //     2. The wind is picking up.
    //     3. You hear a distant thunder."
    const nextEventPrediction = await core.lm.predictNextEvent(eventSequence);

    expect(nextEventPrediction).toBe("It is going to rain soon.");

    // 3. The system translates this natural language prediction into a Narsese implication.
    //    This captures the causal link between the observed premises and the predicted outcome.
    const temporalImplication = '((&, sky_is_dark, wind_is_strong, hear_thunder) ==> will_rain).';
    await core.addInput(temporalImplication);

    // 4. The system also has a goal to stay dry.
    await core.addInput('stay_dry!');
    // And it knows that getting an umbrella helps it stay dry if it rains.
    await core.addInput('((&, will_rain, get(umbrella)) ==> stay_dry).');

    // 5. Now, the system receives the premises from the event sequence as facts.
    await core.addInput('sky_is_dark.');
    await core.addInput('wind_is_strong.');
    await core.addInput('hear_thunder.');

    // 6. After a reasoning cycle, NARS should connect the premises to the prediction,
    //    and connect the prediction to the goal. This should result in a new subgoal.
    await core.cycle();
    const newSubgoal = core.memory.getTask('get(umbrella)!');

    // Verify that the system has proactively generated a plan (a subgoal) to deal with the predicted future.
    expect(newSubgoal).toBeDefined();
    expect(newSubgoal.priority).toBeGreaterThan(0.7);
  });
});
