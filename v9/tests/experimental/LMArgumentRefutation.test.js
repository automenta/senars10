
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates argument analysis and refutation.
 * The system deconstructs a natural language argument into its logical premises
 * using an LM. NARS then checks these premises against its own knowledge base to
 * find contradictions or weaknesses. Finally, the LM is used to construct a
 * coherent counter-argument based on the identified logical flaw.
 */
describe('Experimental: LM-driven Argument Analysis and Refutation', () => {

  it('should analyze an argument, find a flawed premise, and generate a counter-argument', async () => {
    const core = createCore();

    // 1. The system has a core belief that contradicts a common misconception.
    await core.addInput('(glass --> amorphous_solid).');
    await core.addInput('(amorphous_solid --> (--, liquid)).');

    // 2. The system receives a fallacious argument in natural language.
    const argument = "Old church windows are thicker at the bottom because glass is a slow-moving liquid that flows over centuries. Therefore, glass is a liquid.";

    // 3. The system uses the LM to deconstruct the argument into its logical components.
    //    LM Prompt (using 'deconstructArgument' function):
    //    "Extract the main premise and conclusion from the following argument: ..."
    const deconstructed = await core.lm.deconstructArgument(argument);

    expect(deconstructed.premise).toBe("Glass is a slow-moving liquid.");
    expect(deconstructed.conclusion).toBe("Glass is a liquid.");

    // 4. The system translates the premise into a Narsese belief to evaluate it.
    const premiseNarsese = '(glass --> liquid).';

    // 5. NARS checks this premise against its knowledge base and finds a direct contradiction.
    const contradiction = await core.reasoner.findContradiction(premiseNarsese);
    expect(contradiction).toBeDefined();
    expect(contradiction.conflictingBelief).toBe('(glass --> (--, liquid)).');

    // 6. The system uses this logical contradiction to generate a targeted refutation.
    //    LM Prompt (using 'generateCounterArgument' function):
    //    "Generate a counter-argument to the claim that 'glass is a liquid'.
    //     Your counter-argument should be based on the core fact that 'glass is an amorphous solid, not a liquid'."
    const counterArgument = await core.lm.generateCounterArgument({
      claim: "Glass is a liquid.",
      flaw: "The premise is incorrect.",
      evidence: "Glass is scientifically classified as an amorphous solid, not a liquid."
    });

    // 7. The generated counter-argument should be logical and address the specific flaw.
    expect(counterArgument).toContain("The idea that glass is a slow-moving liquid is a common myth.");
    expect(counterArgument).toContain("In reality, glass is an amorphous solid.");
    expect(counterArgument).toContain("The thickness in old windows is due to imperfections in the original manufacturing process.");
  });
});
