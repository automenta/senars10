import { NALRule } from '../NALRule.js';
import { TermType } from '../../Term.js';
import { Task, Punctuation, TruthValue } from '../../Task.js';

/**
 * Implements the modus ponens inference rule.
 * This rule derives B from (A ==> B) and A.
 */
export class ModusPonensRule extends NALRule {
  constructor(options = {}) {
    super('modus_ponens', options);
  }

  /**
   * Determines if the rule can be applied to the given context
   * @param {object} context - The reasoning context containing premises, memory, etc.
   * @returns {boolean} Whether the rule can be applied
   */
  canApply(context) {
    return context.premise && context.premise.term;
  }

  /**
   * Applies the modus ponens rule.
   *
   * Given a premise (A ==> B). (an implication), it looks for a second premise A.
   * (the antecedent as a belief) in memory to derive the conclusion B.
   *
   * @param {object} context - The reasoning context
   * @returns {Promise<any>} Results from rule application
   */
  async apply(context) {
    const derived = [];
    const implicationTask = context.premise;
    const memory = context.memory;
    const currentTime = context.context?.currentTime;

    if (!implicationTask || !implicationTask.term || !memory || !currentTime) {
        return derived;
    }

    if (implicationTask.term.termType === TermType.IMPLICATION) {
      const antecedentTerm = implicationTask.term.subject;
      const consequentTerm = implicationTask.term.predicate;
      const implicationTruth = implicationTask.truth;

      const antecedentTask = memory.getTask(antecedentTerm.hash);

      if (antecedentTask && antecedentTask.punctuation === Punctuation.BELIEF) {
        const newTruth = TruthValue.detachment(implicationTruth, antecedentTask.truth);

        const newTask = new Task(
          consequentTerm,
          Punctuation.BELIEF,
          newTruth,
          currentTime,
          currentTime
        );
        derived.push(newTask);
      }
    }
    return derived;
  }
}