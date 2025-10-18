/**
 * @file core/reasoning/lm/rules/VariableGroundingRule.js
 * @description Variable grounding rule that uses an LM to suggest possible values for variables in statements.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext, parseSubGoals } from '../../RuleHelpers.js';

const hasVariable = (text) => {
  return /[\$\?]\w+/.test(text);
};

/**
 * Creates a variable grounding rule using the LMRule.create method.
 * This rule identifies statements with variables and uses an LM to propose concrete values.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @returns {LMRule} A new LMRule instance for variable grounding.
 */
export const createVariableGroundingRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'variable-grounding',
    lm,
    name: 'Variable Grounding Rule',
    description: 'Suggests possible concrete values for variables in tasks.',
    priority: 0.7,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, priority } = task;
      const termStr = term.toString();

      return priority > 0.7 && hasVariable(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `The following statement contains a variable.
Statement: "${termStr}"

Based on the context, what are 1-3 plausible, concrete values for the variable?
Provide only the values, one per line.`;
    },

    process: (lmResponse) => {
      if (!lmResponse) return [];
      return parseSubGoals(lmResponse);
    },

    generate: (processedOutput, context) => {
      if (!processedOutput || processedOutput.length === 0) return [];

      const originalTask = extractTaskFromContext(context);
      const originalTermStr = originalTask.term.toString();

      return processedOutput.map(value => {
        // Replace the first variable found with the proposed value
        const newTermStr = originalTermStr.replace(/[\$\?]\w+/, value);
        const newTerm = Term.newAtom(newTermStr);

        return new Task(
          newTerm,
          originalTask.punctuation,
          { frequency: 0.6, confidence: 0.5 } // Grounded statements have moderate uncertainty
        );
      });
    },

    lm_options: {
      temperature: 0.7,
      max_tokens: 100,
    },
  });
};