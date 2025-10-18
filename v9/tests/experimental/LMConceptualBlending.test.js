
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates conceptual blending for creative ideation.
 * The system takes two disparate concepts, uses the LM to generate a novel idea
 * that combines key attributes of both, and then formalizes this new blended
 * concept into a set of Narsese beliefs that can be reasoned about.
 */
describe('Experimental: LM-driven Conceptual Blending and Ideation', () => {

  it('should generate a novel concept by blending two existing concepts', async () => {
    const core = createCore();

    // 1. The system is given two concepts to blend.
    const conceptA = "a spider web";
    const conceptB = "a data network";

    // 2. The system uses the LM to generate a creative blend of these concepts.
    //    LM Prompt (using 'blendConcepts' function):
    //    "Creatively combine the core ideas of 'a spider web' and 'a data network'.
    //     Describe the new concept and list its key features."
    const blendResult = await core.lm.blendConcepts(conceptA, conceptB);

    // 3. The LM should return a description of a new, hybrid concept.
    expect(blendResult.name).toBe("ArachneNet");
    expect(blendResult.description).toContain("A self-healing, decentralized data network that mimics the structure of a spider web.");
    expect(blendResult.features).toEqual(expect.arrayContaining([
      "Decentralized nodes (like anchor points)",
      "Data pathways that are resilient and can be rerouted (like silk strands)",
      "Automatically detects and repairs broken connections (self-healing)"
    ]));

    // 4. The system formalizes the new concept and its features into Narsese.
    const newConcept = 'ArachneNet';
    await core.addInput(`(${newConcept} --> data_network).`);
    await core.addInput(`(${newConcept} --} has_property(decentralized)).`);
    await core.addInput(`(${newConcept} --} has_property(resilient_pathways)).`);
    await core.addInput(`(${newConcept} --} has_property(self_healing)).`);

    // 5. Verify that the new blended concept is now part of the system's knowledge base.
    const conceptBelief = core.memory.getBelief(`(${newConcept} --> data_network)`);
    expect(conceptBelief).toBeDefined();
    const propertyBelief = core.memory.getBelief(`(${newConcept} --} has_property(self_healing))`);
    expect(propertyBelief).toBeDefined();
  });
});
