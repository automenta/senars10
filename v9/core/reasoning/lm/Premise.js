/**
 * @file core/reasoning/lm/Premise.js
 * @description Abstract base class for premises used in the LM Reasoning API
 */

/**
 * Base Premise class - represents input to the rule engine
 */
export class Premise {
  constructor(type) {
    this.type = type;
    this.createdAt = Date.now();
  }

  /**
   * @returns {string} String representation of the premise
   */
  toString() {
    return `Premise(type=${this.type})`;
  }

  /**
   * @returns {boolean} Whether this premise is valid for processing
   */
  isValid() {
    return true;
  }
}

/**
 * Single task premise - represents a single task for reasoning
 */
export class TaskPremise extends Premise {
  constructor(task) {
    super('Task');
    this.task = task;
  }

  toString() {
    return `TaskPremise(task=${this.task ? this.task.toString() : 'null'})`;
  }

  isValid() {
    return this.task != null;
  }
}

/**
 * Double task premise - represents two tasks, where the second is typically a belief
 */
export class TaskTaskPremise extends Premise {
  constructor(task1, task2) {
    super('TaskTask');
    this.task1 = task1;
    this.task2 = task2;
  }

  toString() {
    return `TaskTaskPremise(task1=${this.task1 ? this.task1.toString() : 'null'}, task2=${this.task2 ? this.task2.toString() : 'null'})`;
  }

  isValid() {
    return this.task1 != null && this.task2 != null;
  }
}

/**
 * Task-term premise - represents a task and a term
 */
export class TaskTermPremise extends Premise {
  constructor(task, term) {
    super('TaskTerm');
    this.task = task;
    this.term = term;
  }

  toString() {
    return `TaskTermPremise(task=${this.task ? this.task.toString() : 'null'}, term=${this.term ? this.term.toString() : 'null'})`;
  }

  isValid() {
    return this.task != null && this.term != null;
  }
}