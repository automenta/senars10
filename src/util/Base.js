/**
 * Base class for objects that should be frozen after construction.
 * Provides an optional validation hook.
 */
export class FrozenBase {
    /**
     * @param {Object} [props] - Properties to assign to the instance.
     * @param {Function} [validator] - An optional function to validate the instance before freezing.
     */
    constructor(props = {}, validator = null) {
        if (this.constructor === FrozenBase) {
            throw new Error("FrozenBase is an abstract class and cannot be instantiated directly");
        }

        Object.assign(this, props);

        if (validator) {
            validator(this);
        }

        Object.freeze(this);
    }
}
