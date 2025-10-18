
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates abductive reasoning, where the system
 * attempts to find the best explanation for an observation. When NARS has a
 * question containing a variable, it prompts the LM to generate a list of
 * plausible candidates for that variable, effectively brainstorming answers.
 */
describe('Experimental: LM-driven Abductive Reasoning (Variable Grounding)', () => {

  it('should use the LM to generate candidates for a variable in a question', async () => {
    const core = createCore();

    // 1. NARS has an observation and a general rule, leading to a question with a variable.
    await core.addInput('((person, ?X) ==> wet_clothes).'); // If a person is in X, their clothes get wet.
    await core.addInput('wet_clothes.'); // Observation: clothes are wet.

    // 2. This implies a question: What could be the cause? Where was the person?
    //    This is represented as a goal to find a value for ?X.
    await core.addInput('((person, ?X) ==> wet_clothes)?');

    // 3. A hypothetical "question answering" module detects the variable question.
    //    It formulates a prompt for the LM to brainstorm causes.
    //    LM Prompt (using a 'generateCandidates' function):
    //    "If a person's clothes are wet, what are 3 likely things they were in?
    //     Provide a list of nouns."
    const candidates = await core.lm.generateCandidates("What could make a person's clothes wet?");

    // 4. The LM returns a list of plausible values for the variable ?X.
    expect(candidates).toEqual(expect.arrayContaining(['rain', 'a swimming pool', 'a shower']));

    // 5. The system creates new, hypothetical beliefs based on the LM's suggestions.
    //    These are treated as hypotheses to be investigated further.
    for (const candidate of candidates) {
      const term = candidate.replace(/ /g, '_'); // Sanitize for Narsese
      await core.addInput(`((person, ${term}) ==> wet_clothes). %0.5;0.5%`); // Add as low-confidence beliefs
    }

    // 6. Verify that these new hypotheses are in memory, ready for further reasoning.
    expect(core.memory.getBelief('((person, rain) ==> wet_clothes)')).toBeDefined();
    expect(core.memory.getBelief('((person, a_swimming_pool) ==> wet_clothes)')).toBeDefined();
    expect(core.memory.getBelief('((person, a_shower) ==> wet_clothes)')).toBeDefined();
  });
});
