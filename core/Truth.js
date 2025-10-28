import {TRUTH} from './config/constants.js';
import {clamp} from './util/common.js';

export class Truth {
    constructor(f = TRUTH.DEFAULT_FREQUENCY, c = TRUTH.DEFAULT_CONFIDENCE) {
        this.f = clamp(isNaN(f) ? TRUTH.DEFAULT_FREQUENCY : f, 0, 1);
        this.c = clamp(isNaN(c) ? TRUTH.DEFAULT_CONFIDENCE : c, 0, 1);
        Object.freeze(this);
    }

    static op = (t1, t2, opFn) => t1 && t2 ? opFn(t1, t2) : null;
    static unaryOp = (truth, opFn) => truth ? opFn(truth) : null;

    static deduction = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(t.f * u.f, t.c * u.c));
    static induction = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(u.f, Truth.weak(t.c * u.c) * t.f));
    static abduction = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(t.f, Truth.weak(t.c * u.c) * u.f));
    static detachment = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(u.f, t.f * t.c * u.c));

    static revision = (t1, t2) => {
        if (!t1 || !t2) return t1 || t2;
        const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2, cSum = c1 + c2;
        return new Truth(cSum > 0 ? (f1 * c1 + f2 * c2) / cSum : 0, clamp(cSum, 0, 1));
    };

    static negation = t => Truth.unaryOp(t, t => new Truth(1 - t.f, t.c));
    static conversion = t => Truth.unaryOp(t, t => new Truth(t.f, t.f * t.c));
    static expectation = t => t ? t.f * t.c : 0;

    static comparison = (t1, t2) => Truth.op(t1, t2, (t, u) => {
        const fProd = t.f * u.f;
        return new Truth(Truth.safeDiv(fProd, fProd + (1 - t.f) * (1 - u.f)), t.c * u.c);
    });

    static analogy = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth(t.f * u.f, t.c * u.c * u.f));
    static resemblance = (t1, t2) => Truth.op(t1, t2, (t, u) => new Truth((t.f + u.f) / 2, t.c * u.c));

    static contraposition = (t1, t2) => Truth.op(t1, t2, (t, u) => {
        const fContra = u.f * (1 - t.f);
        return new Truth(Truth.safeDiv(fContra, fContra + (1 - u.f) * t.f), t.c * u.c);
    });

    static isStronger = (t1, t2) => Truth.expectation(t1) > Truth.expectation(t2);
    static weak = c => clamp(c / (c + TRUTH.WEAKENING_FACTOR), 0, 1);
    static safeDiv = (num, den) => den === 0 ? 0 : clamp(num / den, 0, 1);

    equals(other) {
        return other instanceof Truth &&
            Math.abs(this.f - other.f) < TRUTH.EPSILON &&
            Math.abs(this.c - other.c) < TRUTH.EPSILON;
    }

    toString() {
        return `%${this.f.toFixed(TRUTH.PRECISION)};${this.c.toFixed(TRUTH.PRECISION)}%`;
    }
}