import { NALRule } from '../NALRule.js';
import { Term, TermType } from '../../Term.js';
import { Task, Punctuation } from '../../Task.js';

export class Analogy extends NALRule {
  constructor(options = {}) {
    super('analogy', options);
  }

  canApply(context) {
    const task = context.premise?.task;
    return task?.term?.termType === TermType.SIMILARITY;
  }

  apply(context) {
    const derived = [];
    const { premise, memory } = context;

    if (!this._validateContext(premise, memory)) return derived;

    const premiseTask = premise.task;
    const { s, p } = this._extractSubjects(premiseTask);
    const predicates = this._findCommonPredicates(s, p, memory);

    for (const { sp, pp } of predicates) {
      const analogyTask = this._createAnalogyTask(premiseTask, sp, pp, context);
      if (analogyTask) derived.push(analogyTask);
    }

    return derived;
  }

  _validateContext(premise, memory) {
    return premise?.task?.term?.subject && premise.task.term.predicate && premise.task.truth && memory;
  }

  _extractSubjects(premiseTask) {
    return {
      s: premiseTask.term.subject,
      p: premiseTask.term.predicate
    };
  }

  _findCommonPredicates(s, p, memory) {
    const predicates = [];

    if (memory.getInheritanceBySubject) {
      const sPredicates = memory.getInheritanceBySubject(s) || [];
      const pPredicates = memory.getInheritanceBySubject(p) || [];

      for (const sp of sPredicates) {
        for (const pp of pPredicates) {
          if (sp.term.predicate.hash === pp.term.predicate.hash) {
            predicates.push({ sp, pp });
          }
        }
      }
    } else {
      const allTasks = Array.from(memory.getAllTasks?.().values() || []);
      const sPredicates = this._filterInheritanceTasks(allTasks, s);
      const pPredicates = this._filterInheritanceTasks(allTasks, p);

      for (const sp of sPredicates) {
        for (const pp of pPredicates) {
          if (sp.term.predicate.hash === pp.term.predicate.hash) {
            predicates.push({ sp, pp });
          }
        }
      }
    }

    return predicates;
  }

  _filterInheritanceTasks(tasks, subject) {
    return tasks.filter(t =>
      t.term?.termType === TermType.INHERITANCE &&
      t.term.subject?.hash === subject.hash
    );
  }

  _createAnalogyTask(premiseTask, sp, pp, context) {
    const { s, p } = this._extractSubjects(premiseTask);
    const m = sp.term.predicate;

    const newTerm = Term.createCompound(TermType.IMPLICATION, [
      Term.createCompound(TermType.INHERITANCE, [s, m]),
      Term.createCompound(TermType.IMPLICATION, [p, m])
    ]);

    const newTruth = this._calculateAnalogyTruth(premiseTask.truth, sp.truth, pp.truth);
    const currentTime = context.context?.currentTime;

    if (currentTime === undefined) {
      throw new Error('Context must provide currentTime for proper time tracking');
    }

    return Task.createDerived(
      [premiseTask, sp, pp],
      newTerm,
      Punctuation.BELIEF,
      newTruth,
      currentTime,
      currentTime
    );
  }

  _calculateAnalogyTruth(truth1, truth2, truth3) {
    return new TruthValue(
      Math.min(truth1.frequency, truth2.frequency, truth3.frequency),
      truth1.confidence * truth2.confidence * truth3.confidence
    );
  }
}