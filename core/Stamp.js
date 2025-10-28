import {v4 as uuidv4} from 'uuid';

export class Stamp {
    constructor() {
        if (this.constructor === Stamp) throw new Error("Abstract classes can't be instantiated.");
    }

    static createInput = () => new ArrayStamp({source: 'INPUT'});
    static derive = (parentStamps = []) => {
        const allDerivations = parentStamps.flatMap(s => s.derivations ? [s.id, ...s.derivations] : [s.id]);
        return new ArrayStamp({derivations: [...new Set(allDerivations)]});
    };
}

export class ArrayStamp extends Stamp {
    constructor({id = uuidv4(), creationTime = Date.now(), source = 'DERIVED', derivations = []} = {}) {
        super();
        Object.assign(this, {id, creationTime, source, derivations: Object.freeze([...new Set(derivations)])});
        Object.freeze(this);
    }

    get occurrenceTime() {
        return this.creationTime;
    }

    equals = other => other instanceof ArrayStamp && this.id === other.id;
    toString = () => `Stamp(${this.id},${this.creationTime},${this.source})`;
}

export class BloomStamp extends Stamp {
    constructor() {
        super();
        throw new Error("BloomStamp is not yet implemented.");
    }
}