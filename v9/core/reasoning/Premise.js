export class Premise {
  constructor(type) {
    Object.assign(this, { type, createdAt: Date.now() });
  }

  toString() { return `Premise(type=${this.type})`; }
  isValid() { return true; }
}

export class TaskPremise extends Premise {
  constructor(task) {
    super('Task');
    this.task = task;
  }

  toString() { return `TaskPremise(task=${this.task ? this.task.toString() : 'null'})`; }
  isValid() { return this.task != null; }
}

export class TaskTaskPremise extends Premise {
  constructor(task1, task2) {
    super('TaskTask');
    Object.assign(this, { task1, task2 });
  }

  toString() { return `TaskTaskPremise(task1=${this.task1 ? this.task1.toString() : 'null'}, task2=${this.task2 ? this.task2.toString() : 'null'})`; }
  isValid() { return this.task1 != null && this.task2 != null; }
}

export class TaskTermPremise extends Premise {
  constructor(task, term) {
    super('TaskTerm');
    Object.assign(this, { task, term });
  }

  toString() { return `TaskTermPremise(task=${this.task ? this.task.toString() : 'null'}, term=${this.term ? this.term.toString() : 'null'})`; }
  isValid() { return this.task != null && this.term != null; }
}