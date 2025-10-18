import { Term } from './Term.js';
import { Stamp, TaskHash } from './Stamp.js';

export const Punctuation = { BELIEF: '.', GOAL: '!', QUESTION: '?' };

export class TruthValue {
  constructor(frequency, confidence) {
    this.frequency = frequency;
    this.confidence = confidence;
  }

  toString() { return `%${this.frequency.toFixed(2)};${this.confidence.toFixed(2)}%`; }

  static deduction(t1, t2) {
    const f = t1.frequency * t2.frequency;
    const c = t1.frequency * t2.frequency * t1.confidence * t2.confidence;
    return new TruthValue(f, c);
  }

  static induction(t1, t2) {
    const f = t1.frequency;
    const c = TruthValue.#weak(t1.confidence * t2.confidence) * t2.frequency;
    return new TruthValue(f, c);
  }

  static abduction(t1, t2) {
    const f = t2.frequency;
    const c = TruthValue.#weak(t1.confidence * t2.confidence) * t1.frequency;
    return new TruthValue(f, c);
  }

  static detachment(t1, t2) {
    const f = t2.frequency;
    const c = (t1.confidence * t2.confidence) * t1.frequency;
    return new TruthValue(f, c);
  }

  static #weak(c) { return c / (c + 1.0); }
}

export class Task {
  constructor(term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5, stamp = null) {
    this.term = term;
    this.punctuation = punctuation;
    this.truth = truth;
    this._priority = priority;
    this._accessedAt = createdAt;
    this.createdAt = createdAt;
    this.occurrenceTime = occurrenceTime;
    this.expirationTime = null;
    this.derivationPath = null;
    this.stamp = stamp || Stamp.createInput();

    const immutableProps = ['term', 'punctuation', 'truth', 'createdAt', 'occurrenceTime', 'expirationTime', 'derivationPath', 'stamp'];
    for (const prop of immutableProps) {
      Object.defineProperty(this, prop, { writable: false });
    }
  }

  static create(term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5, stamp = null) {
    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority, stamp);
  }

  static createInput(term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5) {
    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority, Stamp.createInput());
  }

  static createDerived(parentTasks, term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5) {
    if (!Array.isArray(parentTasks) || parentTasks.length === 0) {
      return Task.createInput(term, punctuation, truth, createdAt, occurrenceTime, priority);
    }
    const mergedStamp = Task._mergeStamps(parentTasks, createdAt);
    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority, mergedStamp);
  }

  static _mergeStamps(parentTasks, createdAt) {
    if (parentTasks.length === 1) return parentTasks[0].stamp.clone();
    let mergedStamp = Stamp.zip(parentTasks[0], parentTasks[1]);
    for (let i = 2; i < parentTasks.length; i++) {
      mergedStamp = Stamp.zip(mergedStamp, parentTasks[i].stamp, createdAt);
    }
    return mergedStamp;
  }

  getPriority() { return this._priority; }
  setPriority(newPriority) { this._priority = Math.max(0.0, Math.min(1.0, newPriority)); }
  getAccessedAt() { return this._accessedAt; }
  setAccessedAt(newTime) { this._accessedAt = newTime; }

  isBelief() { return this.punctuation === Punctuation.BELIEF; }
  isGoal() { return this.punctuation === Punctuation.GOAL; }
  isQuestion() { return this.punctuation === Punctuation.QUESTION; }

  isExpired(currentTime) { return this.expirationTime !== null && currentTime > this.expirationTime; }

  setExpirationTime(expirationTime) { this.expirationTime = expirationTime; }
  setDerivationPath(path) { this.derivationPath = [...path]; }

  toString() {
    const termStr = this.term.toString();
    const puncStr = this.punctuation;
    return this.truth ? `${termStr}${puncStr} ${this.truth.toString()}` : `${termStr}${puncStr}`;
  }

  _createTaskWithProps(props) {
    return this._createModifiedTask({
      ...this._getImmutableProps(),
      ...this._getMutableProps(),
      _priority: props.priority ?? this._priority,
      _accessedAt: props.accessedAt ?? this._accessedAt
    });
  }

  _createModifiedTask(props) {
    const newTask = Object.create(Object.getPrototypeOf(this));
    Object.keys(props).forEach(prop => {
      newTask[prop] = props[prop];
    });
    return newTask;
  }

  _getImmutableProps() {
    return {
      term: this.term,
      punctuation: this.punctuation,
      truth: this.truth,
      createdAt: this.createdAt,
      occurrenceTime: this.occurrenceTime,
      stamp: this.stamp
    };
  }

  _getMutableProps() {
    return {
      expirationTime: this.expirationTime,
      derivationPath: this.derivationPath
    };
  }

  withPriority(newPriority) {
    return this._createTaskWithProps({ priority: Math.max(0.0, Math.min(1.0, newPriority)) });
  }

  getStamp() { return this.stamp; }
  getEvidence() { return this.stamp.stampArray; }
  hasOverlap(otherTask) { return Stamp.overlap(this, otherTask); }
  getOriginality() { return this.stamp.originality(); }

  equals(otherTask) { return TaskHash.tasksEqual(this, otherTask); }
  hashCode() { return TaskHash.hashTask(this); }
  isDuplicateOf(tasks) { return TaskHash.isDuplicate(this, tasks); }

  withStamp(newStamp) {
    return this._createModifiedTask({
      ...this._getImmutableProps(),
      stamp: newStamp,
      derivationPath: this.derivationPath,
      expirationTime: this.expirationTime,
      _priority: this._priority,
      _accessedAt: this._accessedAt
    });
  }
}