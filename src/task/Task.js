import {Truth} from '../Truth.js';
import {ArrayStamp} from '../Stamp.js';
import {Term} from '../term/Term.js';

const PUNCTUATION_TO_TYPE = {'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'};

export class Task {
    constructor({
                    term,
                    punctuation = '.',
                    truth = null,
                    budget = {priority: 0.5, durability: 0.5, quality: 0.5},
                    stamp = null
                }) {
        if (!(term instanceof Term)) {
            throw new Error('Task must be initialized with a valid Term object.');
        }

        this.term = term;
        this.type = PUNCTUATION_TO_TYPE[punctuation] || 'BELIEF';
        this.truth = truth instanceof Truth ? truth : (truth ? new Truth(truth.f, truth.c) : null);
        this.budget = Object.freeze({...budget});
        this.stamp = stamp || ArrayStamp.createInput();

        Object.freeze(this);
    }

    get punctuation() {
        return Object.keys(PUNCTUATION_TO_TYPE).find(key => PUNCTUATION_TO_TYPE[key] === this.type);
    }

    clone(overrides) {
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
        const truthEquals = (!this.truth && !other.truth) || (this.truth && this.truth.equals(other.truth));
        return this.term.equals(other.term) &&
            this.type === other.type &&
            truthEquals;
    }

    toString() {
        const truthStr = this.truth ? ` ${this.truth.toString()}` : '';
        return `${this.term.toString()}${this.punctuation}${truthStr}`;
    }
}