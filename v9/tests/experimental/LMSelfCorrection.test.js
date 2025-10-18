
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates the system's ability to self-correct
 * based on natural language feedback. The system makes a mistake, receives a
 * correction from a user, and uses the LM to interpret the feedback and update
 * the underlying NARS belief that led to the error.
 */
describe('Experimental: LM-driven Self-Correction from NL Feedback', () => {

  it('should update its beliefs after receiving corrective feedback', async () => {
    const core = createCore();

    // 1. The system has an initial, incorrect belief.
    await core.addInput('((tomato --> vegetable) &| (tomato --> fruit)).'); // Believes it's one or the other

    // 2. Based on this, it answers a question.
    //    Let's assume the reasoner currently favors the 'vegetable' belief.
    const initialAnswer = await core.ask('Is a tomato a vegetable?');
    // expect(initialAnswer.answer).toBe('Yes');

    // 3. A user provides corrective feedback in natural language.
    const userFeedback = "That's not quite right. A tomato is botanically a fruit, but it's used in cooking as a vegetable.";

    // 4. The system processes this feedback with the LM to understand the nuance.
    //    LM Prompt (using a 'refineBelief' function):
    //    "My current belief is that a tomato is a vegetable. The feedback is: 'A tomato
    //    is botanically a fruit, but it's used in cooking as a vegetable.'
    //    How should I update my belief? Provide new Narsese statements."
    const refinedNarsese = await core.lm.refineBelief({
      currentBelief: '(tomato --> vegetable)',
      feedback: userFeedback
    });

    // 5. The LM should return more nuanced, context-dependent statements.
    expect(refinedNarsese).toEqual([
      '((tomato, {botany}) --> fruit).',
      '((tomato, {cooking}) --> vegetable).'
    ]);

    // 6. The system adds these new, more precise beliefs to its memory.
    for (const belief of refinedNarsese) {
      await core.addInput(belief);
    }

    // 7. The system might also reduce the confidence of the original, simplistic belief.
    await core.addInput('(tomato --> vegetable). %0.1;0.9%'); // Lower frequency, keep high confidence

    // 8. Verify the new, context-aware beliefs are now in memory.
    expect(core.memory.getBelief('((tomato, {botany}) --> fruit)')).toBeDefined();
    expect(core.memory.getBelief('((tomato, {cooking}) --> vegetable)')).toBeDefined();
  });
});
