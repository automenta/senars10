/**
 * @file core/reasoning/lm/rules/TemporalCausalModelingRule.js
 * @description Temporal and causal modeling rule that uses an LM to infer time order and causal relationships from text.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from '../../RuleHelpers.js';

// Helper functions

const temporalCausalKeywords = [
  'before', 'after', 'when', 'then', 'while', 'during', 'causes', 'leads to', 'results in',
  'because', 'since', 'due to', 'therefore', 'consequently', 'if', 'precedes', 'follows'
];

const hasTemporalCausalTerms = (text) => {
  const lowerText = text.toLowerCase();
  return temporalCausalKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Creates a temporal/causal modeling rule using the LMRule.create method.
 * This rule identifies statements with temporal or causal language and uses an LM to model them formally.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @returns {LMRule} A new LMRule instance for temporal/causal modeling.
 */
export const createTemporalCausalModelingRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'temporal-causal-modeling',
    lm,
    name: 'Temporal/Causal Modeling Rule',
    description: 'Infers time order and causal relationships from text.',
    priority: 0.75,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, punctuation, priority } = task;
      const termStr = term.toString();
      const isBelief = punctuation === Punctuation.JUDGMENT;

      return isBelief && priority > 0.7 && hasTemporalCausalTerms(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `Analyze the temporal and causal relationships in the following statement:
"${termStr}"

Identify the cause and the effect. Express their relationship as a formal implication (e.g., "cause --> effect").
If there is a time sequence, describe it.`;
    },

    process: (lmResponse) => {
      // Extract the formal implication from the response
      const match = lmResponse.match(/(\w+\s*-->\s*\w+)/);
      return match ? match[1] : lmResponse.trim();
    },

    generate: (processedOutput, context) => {
      if (!processedOutput) return [];
      
      const newTerm = Term.newAtom(processedOutput);
      const newTask = new Task(
        newTerm,
        Punctuation.JUDGMENT,
        { frequency: 0.9, confidence: 0.8 }
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.4,
      max_tokens: 300,
    },
  });
};