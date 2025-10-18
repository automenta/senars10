
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates dynamic tool synthesis. The system is
 * given a complex goal that requires multiple tools to achieve. It uses the LM
 to generate a novel sequence of tool operations (a plan) that can accomplish
 * the goal. This plan is then represented as a sequential conjunction in Narsese.
 */
describe('Experimental: LM-driven Tool Use Synthesis', () => {

  it('should create a multi-step tool plan to achieve a complex goal', async () => {
    const core = createCore();

    // 1. The system has a list of available tools.
    const availableTools = [
      "web_search(query): Searches the web and returns text content.",
      "summarize(text): Summarizes a long piece of text.",
      "email(recipient, subject, body): Sends an email."
    ];
    core.tools.register(availableTools);

    // 2. The system is given a complex goal.
    const complexGoal = "Find out about the latest developments in AI and email a summary to 'user@example.com'.";

    // 3. The system uses the LM to generate a plan by synthesizing its available tools.
    //    LM Prompt (using 'synthesizeToolPlan' function):
    //    "Goal: Find out about the latest developments in AI and email a summary to 'user@example.com'.
    //     Available Tools: web_search(query), summarize(text), email(recipient, subject, body).
    //     Provide a sequence of tool calls to achieve this goal."
    const toolPlan = await core.lm.synthesizeToolPlan(complexGoal, availableTools);

    // 4. The LM should return a structured plan of operations.
    expect(toolPlan).toEqual([
      { tool: 'web_search', params: { query: 'latest developments in AI' } },
      { tool: 'summarize', params: { text: '$output_of_step_1' } }, // Using a placeholder for the output
      { tool: 'email', params: { recipient: 'user@example.com', subject: 'AI Development Summary', body: '$output_of_step_2' } }
    ]);

    // 5. The system translates this plan into a Narsese sequential conjunction goal.
    //    (Note: Handling the data flow between steps is a key implementation challenge).
    const narsesePlan = '(&/, web_search("latest developments in AI"), summarize($1), email("user@example.com", "AI Development Summary", $2))!';
    await core.addInput(narsesePlan);

    // 6. Verify that the synthesized plan is now a high-priority goal in memory.
    const planGoal = core.memory.getTask(narsesePlan);
    expect(planGoal).toBeDefined();
    expect(planGoal.punctuation).toBe('!');
  });
});
