import {v4 as uuidv4} from 'uuid';

/**
 * Abstract base class for Stamps.
 * A Stamp provides a unique identity for a Task.
 */
export class Stamp {
    constructor() {
        if (this.constructor === Stamp) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    static createInput() { return new ArrayStamp({source: 'INPUT'}); }

    static derive(parentStamps = []) {
        const allDerivations = parentStamps.flatMap(s => s.derivations ? [s.id, ...s.derivations] : [s.id]);
        return new ArrayStamp({derivations: [...new Set(allDerivations)]});
    }
}

/**
 * A concrete implementation of Stamp using an array to track derivations.
 */
export class ArrayStamp extends Stamp {
    constructor({id, creationTime, source, derivations = []} = {}) {
        super();
        this.id = id || uuidv4();
        this.creationTime = creationTime || Date.now();
        this.source = source || 'DERIVED';
        this.derivations = Object.freeze([...new Set(derivations)]);
        Object.freeze(this);
    }

    get occurrenceTime() {
        return this.creationTime;
    }

    equals(other) {
        return other instanceof ArrayStamp && this.id === other.id;
    }

    toString() {
        return `Stamp(${this.id}, ${this.creationTime}, ${this.source})`;
    }
}

/**
 * A placeholder for a future Stamp implementation using Bloom filters.
 */
export class BloomStamp extends Stamp {
    constructor() {
        super();
        throw new Error("BloomStamp is not yet implemented.");
    }
}