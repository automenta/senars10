/**
 * @file core/reasoning/lm/rules/SchemaInductionRule.js
 * @description Schema induction rule that uses an LM to extract action schemas from narrative or procedural text.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from '../../RuleHelpers.js';

// Helper functions

const narrativeKeywords = [
  'when', 'then', 'if', 'first', 'after', 'before', 'sequence', 'procedure', 'instruction', 'process', 'step', 'guide', 'how to'
];

const hasNarrativeTerms = (text) => {
  const lowerText = text.toLowerCase();
  return narrativeKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Creates a schema induction rule using the LMRule.create method.
 * This rule identifies procedural or narrative text and uses an LM to induce a formal schema.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @returns {LMRule} A new LMRule instance for schema induction.
 */
export const createSchemaInductionRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'schema-induction',
    lm,
    name: 'Schema Induction Rule',
    description: 'Extracts action schemas from narrative or instruction sequences.',
    priority: 0.65,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, punctuation, priority } = task;
      const termStr = term.toString();
      const isBelief = punctuation === Punctuation.JUDGMENT;

      return isBelief && priority > 0.6 && hasNarrativeTerms(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `From the following text, extract a generalizable procedure or schema.

Text: "${termStr}"

Describe the schema as a sequence of conditional steps (e.g., "IF condition THEN action").
The schema should be abstract enough to apply to similar situations.`;
    },

    process: (lmResponse) => {
      return lmResponse.trim();
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
      temperature: 0.5,
      max_tokens: 500,
    },
  });
};