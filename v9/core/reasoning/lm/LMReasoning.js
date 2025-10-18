/**
 * @file core/reasoning/lm/LMReasoning.js
 * @description LM-specific reasoning functionality
 */

import { LMRule } from '../Rule.js';
import { Task } from '../../Task.js';
import { TaskPremise, TaskTaskPremise, TaskTermPremise } from './Premise.js';

// Export the unified LMRule as the base for LM-specific rules
export { LMRule } from '../Rule.js';

/**
 * LM-specific reasoning utilities
 */
export class LMReasoningUtils {
  /**
   * Creates a premise from task data
   * @param {...any} args - Arguments to create the appropriate premise type
   * @returns {Premise} The created premise
   */
  static createPremise(...args) {
    // If only one task provided, create TaskPremise
    if (args.length === 1 && this._isTask(args[0])) {
      return new TaskPremise(args[0]);
    }
    // If two tasks provided, create TaskTaskPremise
    else if (args.length === 2 && this._isTask(args[0]) && this._isTask(args[1])) {
      return new TaskTaskPremise(args[0], args[1]);
    }
    // If task and term provided, create TaskTermPremise
    else if (args.length === 2 && this._isTask(args[0]) && args[1] && args[1].hasOwnProperty('name')) {
      return new TaskTermPremise(args[0], args[1]);
    }
    
    throw new Error('Invalid arguments for premise creation');
  }

  /**
   * Checks if an object is a task
   * @private
   */
  static _isTask(obj) {
    return obj instanceof Task || (obj && obj.hasOwnProperty('punctuation') && obj.hasOwnProperty('term'));
  }
}