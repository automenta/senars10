
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates argumentation and persuasion. The system
 * is given a goal to convince someone of a particular belief. It first uses NARS
 * to find a chain of logically supporting beliefs in its knowledge base. It then
 * feeds this logical chain to the LM to construct a coherent, persuasive natural
 * language argument.
 */
describe('Experimental: LM-driven Argument Generation', () => {

  it('should generate a persuasive argument to support a conclusion', async () => {
    const core = createCore();

    // 1. The system has a set of beliefs that form a logical chain.
    await core.addInput('(Socrates --> human).');
    await core.addInput('(human --> mortal).');
    await core.addInput('(Socrates --> mortal).'); // This is the conclusion.

    // 2. The system is given a goal to convince an agent (e.g., "Bob") of the conclusion.
    const goal = 'convince(Bob, (Socrates --> mortal))!';
    await core.addInput(goal);

    // 3. A hypothetical "persuasion" module is triggered by this goal.
    //    It first uses NARS to find the derivation path for the belief to be argued.
    const derivationPath = await core.reasoner.findDerivation('Socrates --> mortal');

    // The derivation path would contain the premises.
    expect(derivationPath).toEqual([
      '(Socrates --> human).',
      '(human --> mortal).'
    ]);

    // 4. The module then sends the logical structure to the LM to be "dressed" in natural language.
    //    LM Prompt (using 'generateArgument' function):
    //    "Construct a short, persuasive argument for the conclusion 'Socrates is mortal'
    //     using the following premises:
    //     1. Socrates is a human.
    //     2. All humans are mortal."
    const argument = await core.lm.generateArgument({
      conclusion: 'Socrates is mortal',
      premises: [
        'Socrates is a human',
        'All humans are mortal'
      ]
    });

    // 5. The LM should generate a well-structured, persuasive text.
    expect(argument).toBeDefined();
    expect(argument.toLowerCase()).toContain('socrates is a human');
    expect(argument.toLowerCase()).toContain('all humans are mortal');
    expect(argument.toLowerCase()).toContain('therefore');
    expect(argument.toLowerCase()).toContain('socrates is mortal');

    // The system could then "speak" this argument to Bob.
  });
});
