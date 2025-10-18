/**
 * @file core/reasoning/RuleHelpers.js
 * @description Shared helper functions for reasoning rules.
 */

/**
 * Extracts the task from the reasoning context.
 * @param {object} context - The context object passed to the rule.
 * @returns {Task|null} The task from the premise, or null if not found.
 */
export function extractTaskFromContext(context) {
  if (context.premise?.task) {
    return context.premise.task;
  }
  return null;
}

/**
 * Parses sub-goals from LM response
 * @param {string} lmResponse - The response from the language model
 * @returns {Array<string>} Array of parsed sub-goals
 */
export function parseSubGoals(lmResponse) {
  return lmResponse
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^\s*\d+[\.)]\s*|^[-*]\s*/, '').trim());
}

/**
 * Cleans a sub-goal string by removing quotes and punctuation
 * @param {string} goal - The sub-goal string to clean
 * @returns {string} The cleaned sub-goal
 */
export function cleanSubGoal(goal) {
  if (!goal) return '';
  goal = goal.replace(/^["']|["']$/g, '');
  goal = goal.replace(/[.,;!?]+$/, '');
  return goal.trim();
}

/**
 * Validates if a sub-goal meets length and content criteria
 * @param {string} goal - The sub-goal to validate
 * @param {number} minLength - Minimum length requirement
 * @param {number} maxLength - Maximum length requirement
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidSubGoal(goal, minLength, maxLength) {
  if (!goal || goal.length < minLength || goal.length > maxLength) {
    return false;
  }
  const lowerGoal = goal.toLowerCase();
  if (lowerGoal.includes('sorry') || lowerGoal.includes('cannot') || lowerGoal.includes('unable')) {
    return false;
  }
  return true;
}