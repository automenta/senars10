/**
 * @file core/reasoning/lm/rules/GoalDecompositionRule.js
 * @description Goal decomposition rule that uses an LM to break down high-level goals into concrete sub-goals.
 */

import { LMRule } from '../../LMRule.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation, TruthValue } from '../../../Task.js';
import { extractTaskFromContext, parseSubGoals, cleanSubGoal, isValidSubGoal } from '../../RuleHelpers.js';

function createSubGoalTask(subGoal, originalTask) {
  const originalTruth = originalTask.truth || new TruthValue(1.0, 0.9);
  const inheritedTruth = new TruthValue(
    originalTruth.frequency,
    originalTruth.confidence * 0.9,
  );

  const newTerm = Term.newAtom(`Sub-goal: ${subGoal}`);
  return new Task(
    newTerm,
    Punctuation.GOAL,
    inheritedTruth,
    null,
    null,
    0.8
  );
}


/**
 * Creates a goal decomposition rule using the LMRule.create method.
 * This rule identifies high-priority goals and uses an LM to decompose them into smaller, actionable sub-goals.
 *
 * @param {object} dependencies - The dependencies for the rule, including the LM instance.
 * @param {object} config - Configuration options for the rule.
 * @returns {LMRule} A new LMRule instance for goal decomposition.
 */
export const createGoalDecompositionRule = (dependencies, config = {}) => {
  const { lm } = dependencies;
  const finalConfig = {
    minSubGoals: 2,
    maxSubGoals: 5,
    minGoalLength: 5,
    maxGoalLength: 150,
    ...config,
  };

  return LMRule.create({
    id: 'goal-decomposition',
    lm,
    name: 'Goal Decomposition Rule',
    description: 'Breaks down high-level goals into concrete, actionable sub-goals using an LM.',
    priority: 0.9,

    condition: (context) => {
      if (!lm) return false;
      const task = extractTaskFromContext(context);
      if (!task) return false;
      const isGoal = task.punctuation === Punctuation.GOAL;
      const priority = task.getPriority() || 0;
      return isGoal && priority > 0.7;
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `Decompose the following goal into ${finalConfig.minSubGoals} to ${finalConfig.maxSubGoals} smaller, actionable sub-goals.

Goal: "${termStr}"

Output: List of subgoals, one per line`;
    },

    process: (lmResponse) => {
      if (!lmResponse) return [];
      const subGoals = parseSubGoals(lmResponse);
      return subGoals
        .map(cleanSubGoal)
        .filter(goal => isValidSubGoal(goal, finalConfig.minGoalLength, finalConfig.maxGoalLength))
        .slice(0, finalConfig.maxSubGoals);
    },

    generate: (processedOutput, context) => {
      const originalTask = extractTaskFromContext(context);
      if (!originalTask || !processedOutput || processedOutput.length === 0) {
        return [];
      }

      const newTasks = processedOutput.map(subGoal =>
        createSubGoalTask(subGoal, originalTask)
      );

      return newTasks;
    },

    lm_options: {
      temperature: 0.6,
      max_tokens: 500,
      stop: ['\n\n'],
    },
  });
};