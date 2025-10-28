import {Truth} from '../Truth.js';
import {ArrayStamp} from '../Stamp.js';
import {Term} from '../term/Term.js';

const PUNCTUATION_TO_TYPE = Object.freeze({'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'});
const TYPE_TO_PUNCTUATION = Object.freeze({'BELIEF': '.', 'GOAL': '!', 'QUESTION': '?'});
const DEFAULT_BUDGET = Object.freeze({priority: 0.5, durability: 0.5, quality: 0.5, cycles: 100, depth: 10});

export class Task {
    constructor({
        term,
        punctuation = '.',
        truth = null,
        budget = DEFAULT_BUDGET,
        stamp = null
    }) {
        if (!(term instanceof Term)) throw new Error('Task must be initialized with a valid Term object.');

        this.term = term;
        this.type = PUNCTUATION_TO_TYPE[punctuation] || 'BELIEF';
        this.truth = this._createTruth(truth);
        this.budget = Object.freeze({...budget});
        this.stamp = stamp || ArrayStamp.createInput();
        Object.freeze(this);
    }

    get punctuation() {
        return TYPE_TO_PUNCTUATION[this.type];
    }

    _createTruth(truth) {
        return truth instanceof Truth ? truth : (truth ? new Truth(truth.f, truth.c) : null);
    }

    clone(overrides = {}) {
        return new Task({
            term: this.term,
            punctuation: this.punctuation,
            truth: this.truth,
            budget: this.budget,
            stamp: this.stamp,
            ...overrides,
        });
    }

    isBelief = () => this.type === 'BELIEF';
    isGoal = () => this.type === 'GOAL';
    isQuestion = () => this.type === 'QUESTION';

    equals(other) {
        if (!(other instanceof Task)) return false;
        const truthEquals = (!this.truth && !other.truth) || (this.truth?.equals(other.truth) ?? false);
        return this.term.equals(other.term) && this.type === other.type && truthEquals;
    }

    toString() {
        const truthStr = this.truth ? ` ${this.truth.toString()}` : '';
        return `${this.term.toString()}${this.punctuation}${truthStr}`;
    }

    serialize() {
        return {
            term: this.term.serialize ? this.term.serialize() : this.term.toString(),
            punctuation: this.punctuation,
            type: this.type,
            truth: this.truth ? this.truth.serialize ? this.truth.serialize() : { f: this.truth.f, c: this.truth.c } : null,
            budget: this.budget,
            stamp: this.stamp.serialize ? this.stamp.serialize() : null,
            version: '1.0.0'
        };
    }

    static fromJSON(data) {
        if (!data) {
            throw new Error('Task.fromJSON requires valid data object');
        }

        const reconstructedTerm = data.term ? 
            (typeof data.term === 'string' ? 
                { toString: () => data.term, equals: (other) => other.toString && other.toString() === data.term } :
                data.term) :
            null;

        return new Task({
            term: reconstructedTerm,
            punctuation: data.punctuation,
            truth: data.truth ? new Truth(data.truth.f, data.truth.c) : null,
            budget: data.budget || {priority: 0.5, durability: 0.5, quality: 0.5, cycles: 100, depth: 10}
        });
    }
}