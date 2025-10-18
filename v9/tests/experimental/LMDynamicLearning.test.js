
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates dynamic knowledge acquisition from text.
 * The system is tasked with learning from a piece of natural language text.
 * It uses the LM to parse the text and extract key facts, which are then
 * translated into Narsese beliefs and integrated into the reasoner's memory.
 */
describe('Experimental: LM-driven Knowledge Extraction and Integration', () => {

  it('should read a text, extract facts with the LM, and add them to NARS memory', async () => {
    const core = createCore();

    // 1. A source of unstructured information.
    const textToLearn = "The Sun is a star and the center of our solar system. Jupiter is the largest planet in the solar system, and it is a gas giant.";

    // 2. A high-level goal to learn from the text.
    await core.addInput('learn(solar_system_facts)!');

    // 3. A hypothetical function that uses the LM to extract facts.
    //    LM Prompt (using a 'extractFacts' function):
    //    "Extract the key facts from the following text. Present them as simple
    //    'Subject, Predicate, Object' triplets.
    //    Text: The Sun is a star and the center of our solar system. Jupiter is the largest planet in the solar system, and it is a gas giant."
    const extractedFacts = await core.lm.extractFacts(textToLearn);

    // The LM should return a structured representation of the knowledge.
    expect(extractedFacts).toEqual([
      { subject: 'Sun', predicate: 'is a', object: 'star' },
      { subject: 'Sun', predicate: 'is center of', object: 'solar system' },
      { subject: 'Jupiter', predicate: 'is the largest', object: 'planet' },
      { subject: 'Jupiter', predicate: 'is a', object: 'gas giant' }
    ]);

    // 4. The system iterates through the extracted facts and translates them to Narsese.
    //    (This translation logic would be a core part of the neuro-symbolic interface).
    const newBeliefs = [
      '(Sun --> star).',
      '((solar_system, center) --> Sun).', // Using a more relational representation
      '(Jupiter --> planet).',
      '(Jupiter --> gas_giant).'
    ];
    for (const belief of newBeliefs) {
      await core.addInput(belief);
    }

    // 5. Verify that the new knowledge is now present in the NARS memory.
    expect(core.memory.getBelief('(Sun --> star)')).toBeDefined();
    expect(core.memory.getBelief('(Jupiter --> gas_giant)')).toBeDefined();
  });
});
