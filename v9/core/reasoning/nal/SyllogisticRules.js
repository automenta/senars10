import { NALRule } from '../NALRule.js';
import { Term, TermType } from '../../Term.js';
import { Task, Punctuation, TruthValue } from '../../Task.js';

/**
 * A generic helper function to apply syllogistic inference rules.
 */
export function applySyllogisticRule(
  premise1,
  memory,
  context,
  queryPremises2,
  constructNewTermComponents,
  calculateNewTruth,
  excludeSelf
) {
  const derived = [];

  if (premise1.term.subject && premise1.term.predicate && premise1.truth) {
    const s1 = premise1.term.subject;
    const p1 = premise1.term.predicate;
    const truth1 = premise1.truth;

    const premise2Candidates = queryPremises2(memory, s1, p1);
    if (!premise2Candidates) return derived;

    for (const premise2 of premise2Candidates) {
      if (excludeSelf && premise1.term.hash === premise2.term.hash) {
        continue;
      }

      if (premise2.term.subject && premise2.term.predicate && premise2.truth) {
        const s2 = premise2.term.subject;
        const p2 = premise2.term.predicate;
        const truth2 = premise2.truth;

        const [newSubject, newPredicate] = constructNewTermComponents(s1, p1, s2, p2);
        const newTerm = Term.createCompound(TermType.INHERITANCE, [newSubject, newPredicate]);
        const newTruth = calculateNewTruth(truth1, truth2);
        const currentTime = context.context?.currentTime;

        if (currentTime === undefined) {
          throw new Error('Context must provide currentTime for proper time tracking');
        }

        const newPunctuation = (premise1.punctuation === Punctuation.GOAL && premise2.punctuation === Punctuation.GOAL)
          ? Punctuation.GOAL
          : Punctuation.BELIEF;

        const newTask = Task.createDerived(
          [premise1, premise2],
          newTerm,
          newPunctuation,
          newTruth,
          currentTime,
          currentTime
        );

        derived.push(newTask);
      }
    }
  }
  return derived;
}

/**
 * Base class for inheritance-based syllogistic rules.
 */
export class SyllogisticRule extends NALRule {
  constructor(id, queryFn, constructFn, truthFn, excludeSelf, options = {}) {
    super(id, options);
    this.queryFn = queryFn;
    this.constructFn = constructFn;
    this.truthFn = truthFn;
    this.excludeSelf = excludeSelf;
  }

  canApply(context) {
    const task = context.premise;
    return task && task.term && task.term.termType === TermType.INHERITANCE;
  }

  async apply(context) {
    const premiseTask = context.premise;
    const memory = context.memory;
    
    if (!premiseTask || !memory) return [];

    return applySyllogisticRule(
      premiseTask,
      memory,
      context,
      this.queryFn,
      this.constructFn,
      this.truthFn,
      this.excludeSelf
    );
  }
}

/**
 * Implements the deductive syllogism rule.
 * This rule derives (S --> P) from (S --> M) and (M --> P).
 */
export class DeductiveSyllogismRule extends SyllogisticRule {
  constructor(options = {}) {
    super('deductive_syllogism', 
      (memory, _s1, p1) => {
        if (memory.getInheritanceBySubject) {
          return memory.getInheritanceBySubject(p1) || [];
        } else {
          return Array.from(memory.getAllTasks ? (memory.getAllTasks().values() || []) : [])
            .filter(t => t.term && 
                        t.term.termType === TermType.INHERITANCE && 
                        t.term.subject && 
                        t.term.subject.hash === p1.hash);
        }
      },
      (s1, _p1, _s2, p2) => [s1, p2],
      (t1, t2) => TruthValue.deduction(t1, t2),
      false,
      options
    );
  }
}

/**
 * Implements the induction rule.
 * This rule derives (S --> P) from (M --> S) and (M --> P).
 */
export class InductionRule extends SyllogisticRule {
  constructor(options = {}) {
    super('induction',
      (memory, s1, _p1) => {
        if (memory.getInheritanceBySubject) {
          return memory.getInheritanceBySubject(s1) || [];
        } else {
          return Array.from(memory.getAllTasks ? (memory.getAllTasks().values() || []) : [])
            .filter(t => t.term && 
                        t.term.termType === TermType.INHERITANCE && 
                        t.term.subject && 
                        t.term.subject.hash === s1.hash);
        }
      },
      (_s1, p1, _s2, p2) => [p1, p2],
      (t1, t2) => TruthValue.deduction(t1, t2),
      true,
      options
    );
  }
}

/**
 * Implements the abduction rule.
 * This rule derives (S --> P) from (S --> M) and (P --> M).
 */
export class AbductionRule extends SyllogisticRule {
  constructor(options = {}) {
    super('abduction',
      (memory, _s1, p1) => {
        if (memory.getInheritanceByPredicate) {
          return memory.getInheritanceByPredicate(p1) || [];
        } else {
          return Array.from(memory.getAllTasks ? (memory.getAllTasks().values() || []) : [])
            .filter(t => t.term && 
                        t.term.termType === TermType.INHERITANCE && 
                        t.term.predicate && 
                        t.term.predicate.hash === p1.hash);
        }
      },
      (s1, _p1, s2, _p2) => [s1, s2],
      (t1, t2) => TruthValue.deduction(t1, t2),
      true,
      options
    );
  }
}