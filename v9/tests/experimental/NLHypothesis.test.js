import { createCore } from '../../core/createCore';

/**
 * This experimental test suite outlines the desired functionality for
 * LM-driven hypothesis generation and subsequent verification by the NARS reasoner.
 * The LM would propose a plausible statement in natural language, which the system
 * translates into NAL for the reasoner to evaluate against its current knowledge base.
 */
describe('Experimental: LM-driven Hypothesis Generation and Verification', () => {

  it('should use the LM to hypothesize a causal link and use NARS to verify it', async () => {
    const core = createCore();

    // Initial knowledge: If the sky is dark and cloudy, it will likely rain.
    await core.addInput('((&, sky_is_dark, sky_is_cloudy) ==> will_rain).');

    // Observe that the sky is dark and cloudy.
    await core.addInput('sky_is_dark.');
    await core.addInput('sky_is_cloudy.');

    // Let the system run a few cycles to derive the prediction.
    await core.cycle();
    await core.cycle();

    // A hypothetical function where the LM observes the NARS state (predicting rain)
    // and generates a plausible, related hypothesis.
    const hypothesisFromLM = "Because it is going to rain, the ground will be wet.";

    // A hypothetical function that translates the NL hypothesis to NAL and adds it
    // to NARS for reasoning. The system should be able to parse this into:
    // (will_rain ==> ground_is_wet).
    const result = await core.reasonAboutHypothesis(hypothesisFromLM);

    // The system should successfully translate and integrate the hypothesis.
    expect(result.success).toBe(true);
    expect(result.nal).toBe('(will_rain ==> ground_is_wet).');

    // After more cycles, NARS should form a new prediction based on the hypothesis.
    await core.cycle();
    const conclusion = core.memory.getBelief('ground_is_wet');

    // The system should now believe that the ground will be wet.
    expect(conclusion).toBeDefined();
    expect(conclusion.truth.confidence).toBeGreaterThan(0.5);
  });
});