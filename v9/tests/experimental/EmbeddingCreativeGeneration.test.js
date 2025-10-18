
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite showcases creative content generation.
 * The system is given a high-level creative goal. It uses embeddings to find
 * related concepts in its memory and then uses the LM to generate a piece of
 * creative writing that incorporates those concepts.
 */
describe('Experimental: Embedding-driven Creative Content Generation', () => {

  it('should generate a short story based on a NARS goal and related concepts', async () => {
    const core = createCore();

    // 1. Populate memory with concepts and their embeddings.
    await core.memory.addTermEmbedding('dragon', [0.9, 0.1, 0.8]);
    await core.memory.addTermEmbedding('castle', [0.8, 0.2, 0.9]);
    await core.memory.addTermEmbedding('knight', [0.7, 0.3, 0.7]);
    await core.memory.addTermEmbedding('magic', [0.8, 0.1, 0.7]);
    await core.memory.addTermEmbedding('forest', [0.2, 0.9, 0.3]); // Unrelated concept

    // 2. Define a creative goal.
    await core.addInput('write(story, fantasy)!');

    // 3. The system generates an embedding for the core concept of the goal, 'fantasy'.
    const goalConceptEmbedding = await core.lm.generateEmbedding('fantasy'); // e.g., [0.85, 0.15, 0.85]

    // 4. The system finds the most semantically similar concepts in its memory.
    const relatedConcepts = await core.memory.findSimilarConcepts(goalConceptEmbedding, { top_k: 4 });

    // Should find fantasy-related terms.
    expect(relatedConcepts).toEqual(expect.arrayContaining(['dragon', 'castle', 'knight', 'magic']));
    expect(relatedConcepts).not.toContain('forest');

    // 5. The system uses these concepts to construct a rich prompt for the LM.
    //    LM Prompt (using a 'generateCreative' function):
    //    "Write a short, one-paragraph fantasy story that involves the following elements:
    //    dragon, castle, knight, magic."
    const story = await core.lm.generateCreative({
      topic: 'fantasy',
      elements: relatedConcepts
    });

    // 6. Verify the generated story contains the key elements.
    expect(story).toBeDefined();
    expect(typeof story).toBe('string');
    expect(story.toLowerCase()).toContain('dragon');
    expect(story.toLowerCase()).toContain('castle');
    expect(story.toLowerCase()).toContain('knight');
    expect(story.toLowerCase()).toContain('magic');
  });
});
