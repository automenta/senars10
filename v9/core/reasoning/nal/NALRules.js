import { NALRule } from '../NALRule.js';
import { TruthValue } from '../../Task.js';

export class DeductionRule extends NALRule {
  constructor(options = {}) {
    super('nal-deduction', {
      name: 'NAL Deduction Rule',
      description: 'Performs deduction: If <A --> B> and <A> then <B>',
      priority: 0.9,
      ...options
    });
  }

  extractImplication(term) {
    return term.match(/\(([^)]+)\) --> \(([^)]+)\)/);
  }

  findAntecedentTasks(tasks, antecedent) {
    return tasks.filter(t => t.term === antecedent && t.punctuation === '.');
  }

  canApply(context) {
    const tasks = context.tasks || [];
    return tasks.some(task =>
      task.punctuation === '.' &&
      task.term &&
      (task.term.includes(' --> ') || task.term.includes(' ==> '))
    );
  }

  async performInference(context) {
    const tasks = context.tasks || [];
    const results = [];

    for (const task of tasks) {
      if (task.punctuation === '.' && task.term?.includes(' --> ')) {
        const match = this.extractImplication(task.term);
        if (match) {
          const [, antecedent, consequent] = match;

          const antecedentExists = this.findAntecedentTasks(tasks, antecedent).length > 0;

          if (antecedentExists) {
            results.push({
              term: `(${consequent}).`,
              punctuation: '.',
              truth: TruthValue.deduction(task.truth, { frequency: 0.9, confidence: 0.9 }),
              derivationPath: ['nal:deduction', this.id],
              parent: [task]
            });
          }
        }
      }
    }

    return results;
  }
}

export class InductionRule extends NALRule {
  constructor(options = {}) {
    super('nal-induction', {
      name: 'NAL Induction Rule',
      description: 'Performs induction: If <A --> B> and <B --> A> then <A <-> B>',
      priority: 0.7,
      ...options
    });
  }

  extractPattern(term) {
    return term.replace(/[()]/g, '').split(' ')[0];
  }

  canApply(context) {
    const tasks = context.tasks || [];
    return tasks.length >= 2;
  }

  async performInference(context) {
    const tasks = context.tasks || [];
    const results = [];
    const patternMap = new Map();

    for (const task of tasks) {
      if (task.punctuation === '.' && task.term) {
        const pattern = this.extractPattern(task.term);
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, []);
        }
        patternMap.get(pattern).push(task);
      }
    }

    for (const [pattern, similarTasks] of patternMap) {
      if (similarTasks.length >= 2) {
        const avgFreq = similarTasks.reduce((sum, t) => sum + (t.truth?.frequency || 0.9), 0) / similarTasks.length;
        const avgConf = similarTasks.reduce((sum, t) => sum + (t.truth?.confidence || 0.8), 0) / similarTasks.length;

        results.push({
          term: `(${pattern} <-> ${pattern}).`,
          punctuation: '.',
          truth: new TruthValue(avgFreq, avgConf),
          derivationPath: ['nal:induction', this.id],
          parent: similarTasks
        });
      }
    }

    return results;
  }
}

export class AbductionRule extends NALRule {
  constructor(options = {}) {
    super('nal-abduction', {
      name: 'NAL Abduction Rule',
      description: 'Performs abduction: If <A --> B> and <B> then <A>',
      priority: 0.6,
      ...options
    });
  }

  canApply(context) {
    const tasks = context.tasks || [];
    return tasks.some(task => task.punctuation === '?' ||
                           (task.punctuation === '.' && task.term?.includes(' --> ')));
  }

  async performInference(context) {
    const tasks = context.tasks || [];
    const questionTasks = tasks.filter(task => task.punctuation === '?');
    const results = [];

    for (const questionTask of questionTasks) {
      results.push({
        term: `(${questionTask.term.replace('?', '')} ? hypothesis).`,
        punctuation: '.',
        truth: TruthValue.abduction({ frequency: 0.9, confidence: 0.9 }, questionTask.truth),
        derivationPath: ['nal:abduction', this.id],
        parent: [questionTask]
      });
    }

    return results;
  }
}