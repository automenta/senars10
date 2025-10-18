
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates emergent goal generation and curiosity.
 * The system analyzes its existing knowledge base, uses an LM to identify a
 * "gap" or a logical next question, and then formulates this insight as a new,
 * internally-motivated goal to pursue.
 */
describe('Experimental: LM-driven Emergent Goal Generation (Curiosity)', () => {

  it('should generate a new goal to investigate a gap in its knowledge', async () => {
    const core = createCore();

    // 1. The system has some initial, related pieces of knowledge.
    await core.addInput('(cat --> mammal).');
    await core.addInput('(dog --> mammal).');
    await core.addInput('(cat --> pet).');
    await core.addInput('(dog --> pet).');

    // 2. A hypothetical "meta-cognition" process runs periodically.
    //    It summarizes the current state of a knowledge domain for the LM.
    const knowledgeSummary = "I know that cats and dogs are both mammals and pets.";

    // 3. The LM is prompted to act as a "research director," suggesting what to learn next.
    //    LM Prompt (using 'suggestNextQuestion' function):
    //    "Based on this knowledge: 'I know that cats and dogs are both mammals and pets,'
    //     what is a good question to explore next to expand this knowledge?"
    const nextQuestion = await core.lm.suggestNextQuestion(knowledgeSummary);

    // 4. The LM should suggest a question that looks for patterns, differences, or superclasses.
    //    e.g., "What are other types of mammals?" or "What is the difference between a cat and a dog?"
    expect(nextQuestion.toLowerCase()).toContain('what');

    // 5. The system translates this natural language question into a Narsese goal.
    //    This is a creative step. If the question is "What are other mammals?",
    //    it might become a goal to find an unknown (?X) that is a mammal.
    const newGoal = '(?X --> mammal)?';

    // 6. The system adopts this as a new, internal goal.
    await core.addInput(newGoal);

    // 7. Verify the new "curiosity" goal exists in memory with some priority.
    const curiosityGoal = core.memory.getTask(newGoal);
    expect(curiosityGoal).toBeDefined();
    expect(curiosityGoal.punctuation).toBe('?');
    expect(curiosityGoal.priority).toBeGreaterThan(0.1); // It's a background, non-urgent goal.
  });
});
