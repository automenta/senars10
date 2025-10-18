/**
 * @file core/reasoning/lm/rules/InteractiveClarificationRule.js
 * @description Interactive clarification rule that uses an LM to generate clarifying questions for ambiguous input.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from '../../RuleHelpers.js';

// Helper functions

function parseSubGoals(lmResponse) {
  return lmResponse
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^\s*\d+[\.\)]\s*|^\s*[-*]\s*/, '').trim());
}

const ambiguousKeywords = [
  'it', 'this', 'that', 'they', 'them', 'which', 'what', 'how', 'some', 'few', 'many', 'most', 'thing', 'stuff', 'deal with'
];

const hasAmbiguousTerms = (text) => {
  const lowerText = text.toLowerCase();
  // Check for keywords or if the text is very short and likely incomplete
  return ambiguousKeywords.some(keyword => lowerText.includes(keyword)) || text.length < 15;
};

/**
 * Creates an interactive clarification rule using the LMRule.create method.
 * This rule identifies ambiguous goals or questions and uses an LM to ask for clarification.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @returns {LMRule} A new LMRule instance for interactive clarification.
 */
export const createInteractiveClarificationRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'interactive-clarification',
    lm,
    name: 'Interactive Clarification Rule',
    description: 'Generates clarifying questions when input is ambiguous.',
    priority: 0.8,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, punctuation, priority } = task;
      const termStr = term.toString();
      const isGoalOrQuestion = punctuation === Punctuation.GOAL || punctuation === Punctuation.QUESTION;

      return isGoalOrQuestion && priority > 0.7 && hasAmbiguousTerms(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `The following statement is ambiguous or lacks detail:
"${termStr}"

To clarify, ask 1-2 specific questions that would help resolve the ambiguity.
Frame the questions to elicit concrete information. Provide only the questions.`;
    },

    process: (lmResponse) => {
      if (!lmResponse) return [];
      return parseSubGoals(lmResponse).filter(q => q.endsWith('?'));
    },

    generate: (processedOutput, context) => {
      if (!processedOutput || processedOutput.length === 0) return [];

      return processedOutput.map(question => {
        const newTerm = Term.newAtom(question);
        return new Task(
          newTerm,
          Punctuation.QUESTION,
          { frequency: 1.0, confidence: 0.9 }
        );
      });
    },

    lm_options: {
      temperature: 0.6,
      max_tokens: 150,
    },
  });
};