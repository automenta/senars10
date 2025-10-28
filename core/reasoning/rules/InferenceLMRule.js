import {LMRule} from '../LMRule.js';
import {Task} from '../../task/Task.js';
import {Truth} from '../../Truth.js';
import {NarseseParser} from '../../parser/NarseseParser.js';

/**
 * Inference-generating LM Rule that creates new tasks based on LLM reasoning
 */
export class InferenceLMRule extends LMRule {
    constructor(lm) {
        super(
            'inference-lm',
            lm,
            `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a logical inference or conclusion based on this information. 
            Your response should be a valid Narsese statement that follows from the given information.
            Only respond with the Narsese statement, nothing else.`,
            async (lmResponse, task) => {
                if (!lmResponse) return [];

                try {
                    // Parse the LM response as Narsese
                    const parser = new NarseseParser();
                    const parsed = parser.parse(lmResponse.trim());

                    if (parsed && parsed.term) {
                        // Create a new task based on the LM's inference
                        const inferredTask = new Task({
                            term: parsed.term,
                            punctuation: parsed.punctuation || '.',
                            truth: parsed.truthValue ?
                                new Truth(parsed.truthValue.frequency, parsed.truthValue.confidence) :
                                new Truth(0.8, 0.7), // Default truth values for LM-generated inferences
                            budget: {
                                priority: task.budget.priority * 0.7, // Lower priority than original task
                                durability: task.budget.durability * 0.6,
                                quality: task.budget.quality * 0.6
                            }
                        });

                        return [inferredTask];
                    }
                } catch (error) {
                    this.logger?.warn('Error parsing LM response:', error);
                }

                return [];
            },
            0.8, // Priority
            {
                lm: {
                    temperature: 0.7,
                    maxTokens: 150,
                    model: 'default'
                }
            }
        );
    }
}