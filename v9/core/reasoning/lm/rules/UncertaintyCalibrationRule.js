/**
 * @file core/reasoning/lm/rules/UncertaintyCalibrationRule.js
 * @description Uncertainty calibration rule that uses an LM to map qualitative uncertainty to quantitative truth values.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from '../../RuleHelpers.js';

// Helper functions

const uncertaintyKeywords = [
  'maybe', 'perhaps', 'likely', 'unlikely', 'uncertain', 'probably', 'possibly', 'might',
  'tend to', 'often', 'sometimes', 'generally', 'usually', 'could be', 'seems'
];

const hasUncertaintyTerms = (text) => {
  const lowerText = text.toLowerCase();
  return uncertaintyKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Creates an uncertainty calibration rule using the LMRule.create method.
 * This rule identifies beliefs with uncertain language and uses an LM to assign a quantitative confidence value.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @returns {LMRule} A new LMRule instance for uncertainty calibration.
 */
export const createUncertaintyCalibrationRule = (dependencies) => {
  const { lm } = dependencies;
  return LMRule.create({
    id: 'uncertainty-calibration',
    lm,
    name: 'Uncertainty Calibration Rule',
    description: 'Maps qualitative uncertainty expressions to NARS truth values.',
    priority: 0.7,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, punctuation, priority, truth } = task;
      const termStr = term.toString();
      const isBelief = punctuation === Punctuation.JUDGMENT;

      // Apply if the belief has uncertainty terms and default confidence
      return isBelief && priority > 0.6 && truth.confidence >= 0.9 && hasUncertaintyTerms(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `On a scale from 0.0 (completely uncertain) to 1.0 (completely certain), how confident should one be in the following statement?
Provide only a single number as your answer.

Statement: "${termStr}"`;
    },

    process: (lmResponse) => {
      const match = lmResponse.match(/(\d\.\d+)/);
      if (match) {
        const confidence = parseFloat(match[1]);
        if (!isNaN(confidence) && confidence >= 0 && confidence <= 1) {
          return confidence;
        }
      }
      return null; // Return null if parsing fails
    },

    generate: (processedOutput, context) => {
      if (processedOutput === null) return [];
      
      const originalTask = extractTaskFromContext(context);
      const newTruth = {
        ...originalTask.truth,
        confidence: processedOutput, // Update confidence with the LM's calibration
      };

      const newTask = new Task(
        originalTask.term,
        originalTask.punctuation,
        newTruth
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.2,
      max_tokens: 10,
    },
  });
};