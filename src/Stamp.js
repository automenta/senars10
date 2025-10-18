import {v4 as uuidv4} from 'uuid';

export class Stamp {
    constructor({id, creationTime, source, derivations = []} = {}) {
        this.id = id || Stamp.generateId();
        this.creationTime = creationTime || Date.now();
        this.source = source || 'DERIVED'; // INPUT, DERIVED, etc.
        this.derivations = Object.freeze([...new Set(derivations)]);
        Object.freeze(this);
    }

    static generateId() {
        return uuidv4();
    }

    static createInput() {
        const now = Date.now();
        return new Stamp({
            id: Stamp.generateId(),
            creationTime: now,
            source: 'INPUT',
        });
    }

    static derive(parentStamps = []) {
        const allDerivations = parentStamps.flatMap(s => [s.id, ...s.derivations]);
        return new Stamp({
            derivations: [...new Set(allDerivations)],
        });
    }

    equals(other) {
        return other instanceof Stamp && this.id === other.id;
    }

    toString() {
        return `Stamp(${this.id}, ${this.creationTime}, ${this.source})`;
    }
}