
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite illustrates how embedding vectors can be used for
 * semantic concept discovery. The system receives a natural language query,
 * converts it to an embedding, and finds the most semantically relevant concepts
 * in its NARS memory to answer the query, even without direct keyword matches.
 */
describe('Experimental: Embedding-driven Concept Discovery', () => {

  it('should find semantically related concepts to answer a query', async () => {
    const core = createCore();

    // 1. Populate memory with knowledge and pre-computed embeddings for each term.
    //    (In a real implementation, embeddings would be generated on-the-fly).
    await core.addInput('(apple --> fruit).');
    await core.memory.addTermEmbedding('apple', [0.1, 0.9, 0.2]);

    await core.addInput('(banana --> fruit).');
    await core.memory.addTermEmbedding('banana', [0.15, 0.85, 0.25]);

    await core.addInput('(carrot --> vegetable).');
    await core.memory.addTermEmbedding('carrot', [0.8, 0.2, 0.9]);

    // 2. User asks a natural language question.
    const userQuery = "What are some foods that grow on trees?";

    // 3. A hypothetical function to generate an embedding for the query.
    const queryEmbedding = await core.lm.generateEmbedding(userQuery); // e.g., [0.12, 0.88, 0.22]

    // 4. A hypothetical function to find the most similar terms in memory.
    //    This would use cosine similarity between the query vector and all term vectors.
    const similarConcepts = await core.memory.findSimilarConcepts(queryEmbedding, { top_k: 2 });

    // The system should identify 'apple' and 'banana' as most relevant.
    expect(similarConcepts).toContain('apple');
    expect(similarConcepts).toContain('banana');
    expect(similarConcepts).not.toContain('carrot');

    // 5. The system can then use these concepts to formulate an answer with the LM.
    //    LM Prompt: "Based on the concepts 'apple' and 'banana', answer the question:
    //    'What are some foods that grow on trees?'"
    const finalAnswer = await core.lm.generateText(`Context: apple, banana. Question: ${userQuery}`);

    // The final answer should be relevant and synthesized from the discovered concepts.
    expect(finalAnswer.toLowerCase()).toContain('apple');
    expect(finalAnswer.toLowerCase()).toContain('banana');
  });
});
