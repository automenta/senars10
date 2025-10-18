import { createCore } from '../../core/createCore';

/**
 * This experimental test suite explores the ability of the LM to translate a
 * formal NARS derivation (a chain of reasoning) into a coherent, human-readable
 * natural language explanation.
 */
describe('Experimental: LM-driven Explanation of NARS Reasoning', () => {

  it('should provide a natural language explanation for a simple deduction', async () => {
    const core = createCore();

    // Initial knowledge
    await core.addInput('(Socrates --> human).');
    await core.addInput('(human --> mortal).');

    // Let the system reason
    await core.cycle();
    await core.cycle();

    // NARS should deduce that Socrates is mortal.
    const conclusion = core.memory.getBelief('(Socrates --> mortal)');
    expect(conclusion).toBeDefined();

    // A hypothetical function that takes a NARS belief and uses the LM to explain
    // how it was derived by inspecting its derivation path.
    const explanation = await core.explainBelief('(Socrates --> mortal)');

    // The expected explanation should be a clear, natural language sentence.
    const expectedExplanation = "The system concluded that Socrates is mortal because it knows that Socrates is a human and that all humans are mortal.";

    // We can use an embedding model to check for semantic similarity,
    // as the exact wording may vary.
    const similarity = await core.semanticSimilarity(explanation, expectedExplanation);

    expect(explanation).toBeDefined();
    expect(typeof explanation).toBe('string');
    expect(similarity).toBeGreaterThan(0.9);
  });
});