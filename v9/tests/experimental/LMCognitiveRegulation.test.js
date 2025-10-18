
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates cognitive state monitoring and regulation.
 * The system monitors its own internal reasoning state. If it detects a problematic
 * pattern (e.g., a high number of unresolved contradictions in a specific domain),
 * it uses the LM to generate a meta-level strategy to address the issue, such as
 * creating a new goal to actively seek clarifying information.
 */
describe('Experimental: LM-driven Cognitive State Regulation', () => {

  it('should generate a goal to resolve a high number of contradictions', async () => {
    const core = createCore();

    // 1. The system has several contradictory beliefs about a topic, e.g., Pluto.
    await core.addInput('(Pluto --> planet).');
    await core.addInput('(Pluto --> (--, planet)).');
    await core.addInput('(Pluto --> dwarf_planet).');
    await core.addInput('(dwarf_planet --> (--, planet)).');

    // 2. A hypothetical "meta-cognition" module analyzes the memory.
    //    It detects a high concentration of contradictions related to the term 'Pluto'.
    const cognitiveState = await core.self.analyzeCognitiveState();

    expect(cognitiveState.contradictionHotspots).toContain('Pluto');

    // 3. The system uses the LM to generate a strategy to resolve this confusion.
    //    LM Prompt (using 'suggestCognitiveStrategy' function):
    //    "My knowledge about 'Pluto' is full of contradictions. I have beliefs that
    //     it is a planet, not a planet, and a dwarf planet. What should I do to
    //     resolve this confusion?"
    const strategyNL = await core.lm.suggestCognitiveStrategy("High contradictions about 'Pluto'");

    // 4. The LM should suggest a plan to seek a definitive, modern source of information.
    expect(strategyNL).toContain("Find the current official classification of Pluto from a reliable astronomical source.");

    // 5. The system translates this strategy into a high-priority Narsese goal.
    //    This goal involves using a tool (like a web search) to find the answer.
    const newGoal = 'find(classification, Pluto, source(astronomical))!';
    await core.addInput(newGoal, { priority: 0.9 }); // High priority to resolve confusion

    // 6. Verify that the new meta-cognitive goal has been created.
    const metaGoal = core.memory.getTask(newGoal);
    expect(metaGoal).toBeDefined();
    expect(metaGoal.priority).toBeGreaterThan(0.8);

    // The system will now prioritize this goal, leading it to resolve the internal conflict.
  });
});
