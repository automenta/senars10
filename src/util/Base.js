/**
 * Base class for objects that should be frozen after construction
 */
export class FrozenBase {
    constructor() {
        if (this.constructor === FrozenBase) {
            throw new Error("FrozenBase is an abstract class and cannot be instantiated directly");
        }
        // Freeze the object after construction
        Object.freeze(this);
    }
}

/**
 * Base class for objects that should be frozen and have properties validated
 */
export class ValidatedFrozenBase {
    constructor() {
        if (this.constructor === ValidatedFrozenBase) {
            throw new Error("ValidatedFrozenBase is an abstract class and cannot be instantiated directly");
        }
        // Additional validation can be added here if needed
        Object.freeze(this);
    }
}