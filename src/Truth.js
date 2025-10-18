import {TRUTH} from './config/constants.js';
import {clamp} from '../util/common.js';

export class Truth {
    constructor(f = TRUTH.DEFAULT_FREQUENCY, c = TRUTH.DEFAULT_CONFIDENCE) {
        this._f = clamp(f, 0, 1);
        this._c = clamp(c, 0, 1);
        Object.freeze(this);
    }

    get f() {
        return this._f;
    }

    get c() {
        return this._c;
    }

    static _applyOperation(t1, t2, operation) {
        return t1 && t2 ? operation(t1, t2) : null;
    }

    static _applyUnaryOperation(truth, operation) {
        return truth ? operation(truth) : null;
    }

    static _applyBinaryTruthFunction(t1, t2, fFn, cFn) {
        if (!t1 || !t2) return null;
        return new Truth(fFn(t1, t2), cFn(t1, t2));
    }

    // Truth value operations
    static deduction(t1, t2) {
        return this._applyOperation(t1, t2, (t1, t2) => new Truth(t1.f * t2.f, t1.c * t2.c));
    }

    static induction(t1, t2) {
        return this._applyOperation(t1, t2, (t1, t2) => new Truth(t1.f, this._weak(t1.c * t2.c) * t2.f));
    }

    static abduction(t1, t2) {
        return this._applyOperation(t1, t2, (t1, t2) => new Truth(t2.f, this._weak(t1.c * t2.c) * t1.f));
    }

    static detachment(t1, t2) {
        return this._applyOperation(t1, t2, (t1, t2) => new Truth(t2.f, (t1.c * t2.c) * t1.f));
    }

    static revision(t1, t2) {
        if (!t1 || !t2) return t1 || t2;
        const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
        return new Truth((f1 * c1 + f2 * c2) / (c1 + c2), Math.min(1.0, c1 + c2));
    }

    static negation(truth) {
        return this._applyUnaryOperation(truth, t => new Truth(1 - t.f, t.c));
    }

    static expectation(truth) {
        return truth ? truth.f * truth.c : 0;
    }

    // Additional truth functions
    static exemplification(t1, t2) {
        return this._applyBinaryTruthFunction(t1, t2,
            (t1, t2) => this._averageFrequency(t1.f, t2.f),
            (t1, t2) => this._combineConfidence(t1.c, t2.c));
    }

    static comparison(t1, t2) {
        return this._applyOperation(t1, t2, (t1, t2) => {
            const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
            return new Truth(
                this._safeDivide(f1 * f2, f1 * f2 + (1 - f1) * (1 - f2)), 
                this._combineConfidence(c1, c2)
            );
        });
    }

    static contraposition(t1, t2) {
        return this._applyOperation(t1, t2, (t1, t2) => {
            const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
            return new Truth(
                this._safeDivide(f2 * (1 - f1), f2 * (1 - f1) + (1 - f2) * f1),
                this._combineConfidence(c1, c2)
            );
        });
    }

    static analogy(t1, t2) {
        return this._applyOperation(t1, t2, (t1, t2) => {
            const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
            const f = (f1 * f2 + (1 - f1) * (1 - f2)) / (f1 + f2);
            return new Truth(this._safeDivide(f, 1), this._combineConfidence(c1, c2));
        });
    }

    static resemblance(t1, t2) {
        return this._applyBinaryTruthFunction(t1, t2,
            (t1, t2) => this._averageFrequency(t1.f, t2.f),
            (t1, t2) => this._combineConfidence(t1.c, t2.c));
    }

    static isMoreConfident = (t1, t2) => t1 && t2 && t1.c > t2.c;

    static isStronger = (t1, t2) => Truth.expectation(t1) > Truth.expectation(t2);

    // Helper functions
    static _combineConfidence = (c1, c2) => Math.min(c1, c2);
    static _averageFrequency = (f1, f2) => clamp((f1 + f2) / 2, 0, 1);
    static _safeDivide = (numerator, denominator) =>
        denominator === 0 ? TRUTH.DEFAULT_FREQUENCY : clamp(numerator / denominator, 0, 1);
    static _weak = (c) => clamp(c / (c + 1.0), 0, 1);

    equals(other) {
        return other instanceof Truth &&
            Math.abs(this.f - other.f) < 1e-10 &&
            Math.abs(this.c - other.c) < 1e-10;
    }

    toString() {
        return `%${this.f.toFixed(2)};${this.c.toFixed(2)}%`;
    }
}