import {LMRule} from '../LMRule.js';
import {Task} from '../../task/Task.js';
import {Truth} from '../../Truth.js';
import {NarseseParser} from '../../parser/NarseseParser.js';

/**
 * Hypothesis Generation LM Rule that creates plausible hypotheses based on LLM reasoning
 */
export class HypothesisLMRule extends LMRule {
    constructor(lm) {
        super(
            'hypothesis-lm',
            lm,
            `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a plausible hypothesis that could explain or relate to this information. 
            Your response should be a valid Narsese statement that represents a hypothesis based on the given information.
            Only respond with the Narsese statement, nothing else.`,
            async (lmResponse, task) => {
                if (!lmResponse) return [];

                try {
                    // Parse the LM response as Narsese
                    const parser = new NarseseParser();
                    const parsed = parser.parse(lmResponse.trim());

                    if (parsed && parsed.term) {
                        // Create a new task based on the LM's hypothesis
                        const hypothesisTask = new Task({
                            term: parsed.term,
                            punctuation: '?', // Hypotheses are typically questions
                            truth: parsed.truthValue ?
                                new Truth(parsed.truthValue.frequency, parsed.truthValue.confidence) :
                                new Truth(0.5, 0.1), // Lower confidence for hypotheses
                            budget: {
                                priority: task.budget.priority * 0.5, // Lower priority for hypotheses
                                durability: task.budget.durability * 0.4,
                                quality: task.budget.quality * 0.4
                            }
                        });

                        return [hypothesisTask];
                    }
                } catch (error) {
                    this.logger?.warn('Error parsing LM response:', error);
                }

                return [];
            },
            0.7, // Priority
            {
                lm: {
                    temperature: 0.8,
                    maxTokens: 150,
                    model: 'default'
                }
            }
        );
    }
}