
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite focuses on anomaly detection and explanation.
 * NARS identifies a contradiction in its beliefs, and the LM is prompted
 * to generate plausible hypotheses that could resolve the anomaly.
 */
describe('Experimental: LM-driven Anomaly Detection and Explanation', () => {

  it('should generate hypotheses to explain a detected contradiction', async () => {
    const core = createCore();

    // 1. General knowledge: Birds can fly.
    await core.addInput('(bird --> flyer).');

    // 2. Specific knowledge: A penguin is a bird.
    await core.addInput('(penguin --> bird).');

    // Let the system derive that a penguin can fly.
    await core.cycle();
    const derivedBelief = core.memory.getBelief('(penguin --> flyer)');
    expect(derivedBelief).toBeDefined();

    // 3. Contradictory observation: Penguins cannot fly.
    await core.addInput('(penguin --> (--, flyer)).');

    // 4. Hypothetical function: The system detects the contradiction and asks the LM
    //    to explain it.
    //    LM Prompt: "I believe birds can fly, and a penguin is a bird, so a penguin
    //    should be able to fly. However, I have also been told that penguins cannot
    //    fly. How can both be true?"
    const nlExplanation = "While most birds can fly, some specific types, like penguins, are flightless birds. The general rule has exceptions.";

    // 5. The system translates the explanation into a more specific Narsese statement,
    //    creating a more nuanced belief. This new knowledge has higher specificity
    //    and thus would be preferred by NARS in future reasoning about penguins.
    const refinedKnowledge = '((&, bird, flightless) --> (--, flyer))';
    await core.addInput(refinedKnowledge);
    await core.addInput('(penguin --> flightless).');

    // 6. Verify the refined, explanatory knowledge is now in memory.
    const refinedBelief = core.memory.getBelief(refinedKnowledge);
    expect(refinedBelief).toBeDefined();
    expect(refinedBelief.truth.confidence).toBeGreaterThan(0.8);
  });
});
