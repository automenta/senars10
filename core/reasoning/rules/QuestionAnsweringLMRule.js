import {LMRule} from '../LMRule.js';
import {Task} from '../../task/Task.js';
import {Truth} from '../../Truth.js';
import {NarseseParser} from '../../parser/NarseseParser.js';

/**
 * Question Answering LM Rule that attempts to answer questions using LLM reasoning
 */
export class QuestionAnsweringLMRule extends LMRule {
    constructor(lm) {
        super(
            'question-answering-lm',
            lm,
            `Given the question "{{taskTerm}}" with truth value "{{taskTruth}}", please provide a relevant answer.
            Your answer should be formatted as a valid Narsese statement that answers the question.
            Only respond with the Narsese statement, nothing else.`,
            async (lmResponse, task) => {
                if (!lmResponse) return [];

                // Only apply to questions
                if (task.type !== 'QUESTION') return [];

                try {
                    // Parse the LM response as Narsese
                    const parser = new NarseseParser();
                    const parsed = parser.parse(lmResponse.trim());

                    if (parsed && parsed.term) {
                        // Create a belief task as the answer to the question
                        const answerTask = new Task({
                            term: parsed.term,
                            punctuation: '.', // Answer is a belief
                            truth: parsed.truthValue ?
                                new Truth(parsed.truthValue.frequency, parsed.truthValue.confidence) :
                                new Truth(0.7, 0.6), // Moderate confidence for answers
                            budget: {
                                priority: task.budget.priority * 0.8, // Prioritize answers to questions
                                durability: task.budget.durability * 0.7,
                                quality: task.budget.quality * 0.7
                            }
                        });

                        return [answerTask];
                    }
                } catch (error) {
                    this.logger?.warn('Error parsing LM response:', error);
                }

                return [];
            },
            0.9, // Higher priority for question answering
            {
                lm: {
                    temperature: 0.6,
                    maxTokens: 200,
                    model: 'default'
                }
            }
        );
    }

    // Override _matches to only apply to questions
    _matches(task) {
        return super._matches(task) && task.type === 'QUESTION';
    }
}