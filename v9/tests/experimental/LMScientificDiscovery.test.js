
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite simulates a scientific discovery process. The system
 * is given a set of observations, uses the LM to abduce a general hypothesis
 * that explains them, uses NARS to derive a testable prediction from the
 * hypothesis, and finally proposes an experiment to verify the prediction.
 */
describe('Experimental: LM-driven Scientific Hypothesis and Experiment Generation', () => {

  it('should form a hypothesis from data, make a prediction, and propose an experiment', async () => {
    const core = createCore();

    // 1. The system is given a set of observations (the data).
    const observations = [
      "Observation: Metal object 'A' was heated and it expanded.",
      "Observation: Metal object 'B' was heated and it expanded.",
      "Observation: Wooden object 'C' was heated and it did not expand."
    ];

    // 2. The system uses the LM to generate a plausible hypothesis (a general law).
    //    LM Prompt (using 'generateHypothesis' function):
    //    "Based on these observations, what is a simple scientific hypothesis that
    //     explains them? State it as a general rule."
    const hypothesisNL = await core.lm.generateHypothesis(observations);

    expect(hypothesisNL).toBe("Heating a metal object causes it to expand.");

    // 3. The system translates the natural language hypothesis into a Narsese implication.
    const hypothesisNarsese = '((<#x> --> metal) ==> (heat(#x) ==> expand(#x))).';
    await core.addInput(hypothesisNarsese);

    // 4. The system is now told about a new object.
    await core.addInput('(D --> metal).');

    // 5. NARS uses the new hypothesis to make a prediction: If D is heated, it will expand.
    await core.cycle();
    const prediction = core.memory.getBelief('(heat(D) ==> expand(D))');
    expect(prediction).toBeDefined();

    // 6. The system now formulates an experiment to test this prediction.
    //    LM Prompt (using 'designExperiment' function):
    //    "How would you design a simple experiment to test the prediction that
    //     'if metal object D is heated, it will expand'?"
    const experimentNL = await core.lm.designExperiment("If metal object D is heated, it will expand.");

    expect(experimentNL).toContain("1. Measure the initial size of object D. 2. Apply heat to object D. 3. Measure the final size of object D and compare.");

    // 7. The system translates this experiment into an actionable Narsese plan (a goal).
    const experimentPlan = '(&/, measure(D, initial_size), heat(D), measure(D, final_size), compare(initial_size, final_size))!';
    await core.addInput(experimentPlan);

    // Verify the experimental plan is now a goal in memory.
    expect(core.memory.getTask(experimentPlan)).toBeDefined();
  });
});
