/**
 * @file core/reasoning/lm/rules/AnalogicalReasoningRule.js
 * @description Analogical reasoning rule that uses an LM to solve new problems by drawing analogies to known situations.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from '../../RuleHelpers.js';

// Helper functions

const problemSolvingKeywords = [
  'solve', 'fix', 'repair', 'improve', 'handle', 'address', 'resolve', 'overcome', 'manage', 'operate',
  'apply', 'adapt', 'implement', 'execute', 'create', 'build', 'design', 'plan', 'organize', 'find a way to'
];

const hasProblemSolvingTerms = (text) => {
  const lowerText = text.toLowerCase();
  return problemSolvingKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Creates an analogical reasoning rule using the LMRule.create method.
 * This rule identifies problem-solving goals and uses an LM to find analogous solutions.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @returns {LMRule} A new LMRule instance for analogical reasoning.
 */
export const createAnalogicalReasoningRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'analogical-reasoning',
    lm,
    name: 'Analogical Reasoning Rule',
    description: 'Solves new problems by drawing analogies to known situations.',
    priority: 0.7,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, punctuation, priority } = task;
      const termStr = term.toString();
      const isGoalOrQuestion = punctuation === Punctuation.GOAL || punctuation === Punctuation.QUESTION;

      return isGoalOrQuestion && priority > 0.6 && hasProblemSolvingTerms(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `Here is a problem: "${termStr}".

Think of a similar, well-understood problem. What is the analogy?
Based on that analogy, describe a step-by-step solution for the original problem.`;
    },

    process: (lmResponse) => {
      return lmResponse.trim();
    },

    generate: (processedOutput, context) => {
      if (!processedOutput) return [];

      const originalTask = extractTaskFromContext(context);
      const newTerm = Term.newAtom(`solution_proposal_for_(${originalTask.term.toString()})`);
      const newTask = new Task(
        newTerm,
        Punctuation.JUDGMENT,
        { frequency: 0.8, confidence: 0.7 },
        null,
        null,
        null,
        null,
        processedOutput // Attach the detailed solution as metadata
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.7,
      max_tokens: 600,
    },
  });
};