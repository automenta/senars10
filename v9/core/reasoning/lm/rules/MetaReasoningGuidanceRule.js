/**
 * @file core/reasoning/lm/rules/MetaReasoningGuidanceRule.js
 * @description Meta-reasoning guidance rule that uses an LM to recommend reasoning strategies for complex problems.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from '../../RuleHelpers.js';

// Helper functions

const complexityKeywords = [
  'solve', 'achieve', 'optimize', 'balance', 'maximize', 'minimize', 'understand', 'analyze',
  'investigate', 'discover', 'resolve', 'plan', 'design', 'create', 'develop', 'implement'
];

const hasComplexityTerms = (text) => {
  const lowerText = text.toLowerCase();
  return complexityKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Creates a meta-reasoning guidance rule using the LMRule.create method.
 * This rule identifies complex problems and uses an LM to recommend a reasoning strategy.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @returns {LMRule} A new LMRule instance for meta-reasoning guidance.
 */
export const createMetaReasoningGuidanceRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'meta-reasoning-guidance',
    lm,
    name: 'Meta-Reasoning Guidance Rule',
    description: 'Provides reasoning strategy recommendations for complex problems.',
    priority: 0.85,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, punctuation, priority } = task;
      const termStr = term.toString();
      const isGoalOrQuestion = punctuation === Punctuation.GOAL || punctuation === Punctuation.QUESTION;

      return isGoalOrQuestion && priority > 0.8 && hasComplexityTerms(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `For the complex goal/question: "${termStr}", what is the most effective reasoning strategy?

Consider these options:
- **Decomposition**: Breaking it down into smaller sub-problems.
- **Analogical Reasoning**: Finding a similar, solved problem.
- **Causal Reasoning**: Analyzing cause-and-effect relationships.
- **Hypothesis Testing**: Formulating and testing hypotheses.

Recommend the best primary strategy and briefly explain why.`;
    },

    process: (lmResponse) => {
      return lmResponse.trim();
    },

    generate: (processedOutput, context) => {
      if (!processedOutput) return [];
      
      const originalTask = extractTaskFromContext(context);
      const newTerm = Term.newAtom(`strategy_for_(${originalTask.term.toString()})`);
      const newTask = new Task(
        newTerm,
        Punctuation.JUDGMENT,
        { frequency: 1.0, confidence: 0.9 },
        null,
        null,
        null,
        null,
        processedOutput // Attach the strategy as metadata
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.6,
      max_tokens: 400,
    },
  });
};