
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates metaphorical reasoning. The system
 * encounters a statement that is not literally true but contains a metaphorical
 * meaning. It uses the LM to "unpack" the metaphor into a set of literal,
 * relational beliefs that can be processed by the NARS reasoner.
 */
describe('Experimental: LM-driven Metaphor Interpretation', () => {

  it('should interpret a metaphor and add its literal meaning to memory', async () => {
    const core = createCore();

    // 1. The system receives a metaphorical statement.
    const metaphor = "Juliet is the sun.";

    // 2. The system's reasoner would recognize that this is a contradiction if
    //    taken literally (Juliet is a person, the sun is a star). This triggers
    //    a request to the LM for interpretation.

    // 3. The LM is prompted to explain the metaphor.
    //    LM Prompt (using 'interpretMetaphor' function):
    //    "What are the literal meanings or properties implied by the metaphor
    //     'Juliet is the sun'? Provide a list of simple 'Subject, Property' pairs."
    const literalMeanings = await core.lm.interpretMetaphor(metaphor);

    // 4. The LM should return the underlying attributes of the metaphor.
    expect(literalMeanings).toEqual(expect.arrayContaining([
      { subject: 'Juliet', property: 'is_beautiful' },
      { subject: 'Juliet', property: 'is_central_to_life' },
      { subject: 'Juliet', property: 'brings_warmth' },
      { subject: 'Juliet', property: 'brings_light' }
    ]));

    // 5. The system translates these literal properties into Narsese beliefs.
    //    This uses the property operator `(--})`.
    const newBeliefs = [
      '(Juliet --} beautiful).',
      '(Juliet --} central_to_life).',
      '(Juliet --} brings_warmth).',
      '(Juliet --} brings_light).'
    ];
    for (const belief of newBeliefs) {
      await core.addInput(belief);
    }

    // 6. Verify that the underlying meaning of the metaphor is now in memory.
    const beautyBelief = core.memory.getBelief('(Juliet --} beautiful)');
    expect(beautyBelief).toBeDefined();
    expect(beautyBelief.truth.confidence).toBeGreaterThan(0.8);
  });
});
