
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates narrative understanding. The system
 * reads a short story, uses the LM to extract higher-level narrative elements
 * like character motivations and plot causality, and then uses NARS to answer
 * inferential questions about the story.
 */
describe('Experimental: LM-driven Narrative and Story Understanding', () => {

  it('should answer a question about character motivation by reasoning over an extracted narrative', async () => {
    const core = createCore();

    // 1. The system is given a short story.
    const story = "The knight wanted to win the princess's favor. The dragon guarded the only bridge to the castle. The knight drew his sword and charged the dragon.";

    // 2. The system uses the LM to extract narrative elements (facts, goals, causes).
    //    LM Prompt (using 'extractNarrative' function):
    //    "From the story, extract character goals and causal links between events.
    //     Story: The knight wanted to win the princess's favor. The dragon guarded the only bridge to the castle. The knight drew his sword and charged the dragon."
    const narrativeElements = await core.lm.extractNarrative(story);

    // 3. The LM should return a structured representation of the narrative.
    expect(narrativeElements).toEqual({
      goals: [{ character: 'knight', goal: 'win_princess_favor' }],
      causality: [{ cause: 'dragon_guards_bridge', effect: 'knight_charges_dragon' }]
    });

    // 4. The system translates these elements into Narsese beliefs.
    //    - A belief about the knight's goal.
    await core.addInput('((knight --} has_goal(win_princess_favor))).');
    //    - A belief that winning favor requires reaching the castle.
    await core.addInput('(reach(castle) ==> win_princess_favor).');
    //    - A belief that charging the dragon is a plan to cross the bridge.
    await core.addInput('(charge(dragon) ==> cross(bridge)).');
    //    - A belief that crossing the bridge is required to reach the castle.
    await core.addInput('(cross(bridge) ==> reach(castle)).');

    // 5. The system is asked an inferential question that is not explicitly stated in the text.
    const question = "Why did the knight charge the dragon?";

    // 6. NARS reasons backward from the action 'charge(dragon)' through the causal chain
    //    to the root motivation 'win_princess_favor'.
    const answerDerivation = await core.reasoner.findDerivation('charge(dragon)', 'win_princess_favor');
    expect(answerDerivation.path).toBeDefined();

    // 7. The system uses the LM to format the logical derivation into a natural language answer.
    const finalAnswer = await core.lm.generateExplanation(answerDerivation.path);
    expect(finalAnswer).toBe("The knight charged the dragon to cross the bridge, so he could reach the castle and win the princess's favor.");
  });
});
