export class Stamp {
    constructor() {
        if (this.constructor === Stamp) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    get fromConcept() {
        return null;
    }

    static createInput(creationTime = Date.now(), occurrenceTime = creationTime) {
        return new ArrayStamp(Stamp.generateId(creationTime), occurrenceTime, 'INPUT', []);
    }

    static createDerived(parentStamps = [], fromConcept = null) {
        const creationTime = Date.now();
        const id = Stamp.generateId(creationTime, parentStamps.map(s => s.id));
        return new ArrayStamp(id, creationTime, 'DERIVED', parentStamps.map(s => s.id));
    }

    static generateId(timestamp, parentIds = []) {
        const randomPart = Math.random().toString(36).substring(2, 9);
        const parentPart = parentIds.join('-').substring(0, 10);
        return `${timestamp}-${parentPart}-${randomPart}`;
    }

    derive(parentStamps) {
        throw new Error("Method derive must be implemented.");
    }

    equals(other) {
        throw new Error("Method equals must be implemented.");
    }

    toString() {
        throw new Error("Method toString must be implemented.");
    }
}

export class ArrayStamp extends Stamp {
    constructor(id, occurrenceTime, source, derivations = []) {
        super();
        this._id = id;
        this._occurrenceTime = occurrenceTime;
        this._source = source;
        this._derivations = Object.freeze(derivations);
        Object.freeze(this);
    }

    get id() {
        return this._id;
    }

    get occurrenceTime() {
        return this._occurrenceTime;
    }

    get creationTime() {
        return this._occurrenceTime;
    }

    get source() {
        return this._source;
    }

    get derivations() {
        return this._derivations;
    }

    static derive(parentStamps) {
        const newId = Math.random().toString(36).substring(2);
        const newDerivations = [...new Set(parentStamps.flatMap(p => [p.id, ...p.derivations]))];
        return new ArrayStamp(newId, Date.now(), 'INFERENCE', newDerivations);
    }

    equals(other) {
        return other instanceof ArrayStamp && this.id === other.id;
    }

    toString() {
        return `Stamp(${this.id},${this.occurrenceTime},${this.source})`;
    }
}

export class BloomStamp extends Stamp {
    constructor() {
        super();
        throw new Error("BloomStamp is not yet implemented.");
    }
}