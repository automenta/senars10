/**
 * @file core/reasoning/lm/rules/BeliefRevisionRule.js
 * @description Belief revision rule that uses an LM to resolve contradictions and inconsistencies.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from '../../RuleHelpers.js';

// Helper functions

const conflictKeywords = ['contradict', 'conflict', 'inconsistent', 'opposite', 'versus', 'vs'];

const hasConflictTerms = (text) => {
  const lowerText = text.toLowerCase();
  return conflictKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Creates a belief revision rule using the LMRule.create method.
 * This rule identifies beliefs containing contradictions and uses an LM to suggest revisions.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @returns {LMRule} A new LMRule instance for belief revision.
 */
export const createBeliefRevisionRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'belief-revision',
    lm,
    name: 'Belief Revision Rule',
    description: 'Helps resolve contradictions by suggesting belief revisions.',
    priority: 0.95,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, punctuation, priority } = task;
      const termStr = term.toString();
      const isBelief = punctuation === Punctuation.JUDGMENT;

      return isBelief && priority > 0.8 && hasConflictTerms(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `The following belief appears to contain a contradiction or conflict:
"${termStr}"

Analyze this belief and the potential conflict. Propose a revised, more nuanced belief that resolves the inconsistency.
The revised belief should be a single, clear statement.`;
    },

    process: (lmResponse) => {
      return lmResponse.trim();
    },

    generate: (processedOutput, context) => {
      if (!processedOutput) return [];
      
      const originalTask = extractTaskFromContext(context);
      const newTerm = Term.newAtom(processedOutput);
      const newTask = new Task(
        newTerm,
        Punctuation.JUDGMENT,
        {
          frequency: originalTask.truth.frequency,
          confidence: originalTask.truth.confidence * 0.8, // Revised belief is slightly less confident
        },
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.5,
      max_tokens: 400,
    },
  });
};