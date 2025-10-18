import {Stamp} from '../Stamp.js';
import {Term} from '../term/Term.js';
import {clamp} from '../util/common.js';

const PUNCTUATION_TYPE_MAP = {'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'};

export class Task {
    constructor(arg1, punctuation, truth, priority) {
        const config = this._parseConstructorArgs(arg1, punctuation, truth, priority);

        if (!(config.term instanceof Term)) {
            throw new Error(`Task must be initialized with a valid Term object. Received: ${typeof config.term}.`);
        }

        this._term = config.term;
        this._type = config.type;
        this._truth = config.truth ?? null;
        this._stamp = config.stamp || Stamp.createInput();
        this._priority = clamp(config.priority ?? Task.DEFAULTS.priority, Task.DEFAULTS.minPriority, Task.DEFAULTS.maxPriority);
        this._budget = config.budget ?? Task.DEFAULTS.budget;
        this._createdAt = this._stamp.occurrenceTime;
        this._accessedAt = config.accessedAt || this._createdAt;

        Object.freeze(this);
    }

    static DEFAULTS = {
        priority: 0.5,
        budget: 1.0,
        minPriority: 0,
        maxPriority: 1
    };

    // Getters
    get term() {
        return this._term;
    }

    get type() {
        return this._type;
    }

    get truth() {
        return this._truth;
    }

    get stamp() {
        return this._stamp;
    }

    get priority() {
        return this._priority;
    }

    get budget() {
        return this._budget;
    }

    get createdAt() {
        return this._createdAt;
    }

    get accessedAt() {
        return this._accessedAt;
    }

    get truthValue() {
        return this._truth;
    }

    get creationTime() {
        return this._createdAt;
    }

    _parseConstructorArgs(arg1, punctuation, truth, priority) {
        if (this._isTaskDataObject(arg1)) {
            // Object constructor: ({term, type, truth, stamp, priority, budget, accessedAt})
            const {term, type, truth: truthVal, stamp, priority: prio, budget, accessedAt} = arg1;
            return {term, type, truth: truthVal, stamp, priority: prio, budget, accessedAt};
        } else {
            // Convenience constructor: (term, punctuation, truth, priority)
            if (typeof punctuation !== 'string') {
                throw new Error(`Punctuation must be a string. Received: ${typeof punctuation}.`);
            }

            const type = PUNCTUATION_TYPE_MAP[punctuation];
            if (!type) {
                throw new Error(`Invalid punctuation: ${punctuation}. Must be one of '.', '!', '?'`);
            }

            return {term: arg1, type, truth, priority};
        }
    }

    _isTaskDataObject(obj) {
        return typeof obj === 'object' && obj !== null && obj.hasOwnProperty('term');
    }

    // Immutable operations
    withTruth(newTruth) {
        return new Task({
            term: this._term,
            type: this._type,
            truth: newTruth,
            stamp: this._stamp,
            priority: this._priority,
            budget: this._budget,
            accessedAt: this._accessedAt
        });
    }

    withPriority(newPriority) {
        return new Task({
            term: this._term,
            type: this._type,
            truth: this._truth,
            stamp: this._stamp,
            priority: newPriority,
            budget: this._budget,
            accessedAt: this._accessedAt
        });
    }

    withAccessedAt(newAccessedAt) {
        return new Task({
            term: this._term,
            type: this._type,
            truth: this._truth,
            stamp: this._stamp,
            priority: this._priority,
            budget: this._budget,
            accessedAt: newAccessedAt
        });
    }

    // Type checking
    isBelief() { return this.type === 'BELIEF'; }
    isGoal() { return this.type === 'GOAL'; }
    isQuestion() { return this.type === 'QUESTION'; }

    // Equality
    equals(other) {
        return other instanceof Task && 
               this.term.equals(other.term) && 
               this.type === other.type && 
               ((!this.truth && !other.truth) || this.truth?.equals(other.truth));
    }

    // String representation
    toString() {
        const typeStr = this.type === 'BELIEF' ? '.' : this.type === 'GOAL' ? '!' : '?';
        return this.truth ? `${this.term}${typeStr} ${this.truth.f.toFixed(2)};${this.truth.c.toFixed(2)}` : `${this.term}${typeStr}`;
    }
}