import {FunctorRegistry} from './Functor.js';

export class CoreFunctorLibrary {
    constructor(registry = null) {
        this.registry = registry || new FunctorRegistry();
        this._initializeCoreFunctors();
    }

    _initializeCoreFunctors() {
        this._registerArithmeticFunctors();
        this._registerBooleanFunctors();
        this._registerUtilityFunctors();
    }

    _registerArithmeticFunctors() {
        // Basic arithmetic operations
        this._registerSafeFunctor('add', (a, b) => Number(a) + Number(b), 'Addition', 2);
        this._registerSafeFunctor('subtract', (a, b) => Number(a) - Number(b), 'Subtraction', 2);
        this._registerSafeFunctor('multiply', (a, b) => Number(a) * Number(b), 'Multiplication', 2);

        // Division with special handling for zero
        this.registry.register('divide', (a, b) => {
            if (this._isNullish(a) || this._isNullish(b)) return null;
            if (Number(b) === 0) return null; // Division by zero returns null
            const result = Number(a) / Number(b);
            return isNaN(result) ? null : result;
        }, {
            arity: 2,
            name: 'Division',
            description: 'Division: divide(a, b) = a / b'
        });

        // Comparison operations
        this._registerSafeFunctor('equals', (a, b) => Number(a) === Number(b), 'Equals', 2);
        this._registerSafeFunctor('greaterThan', (a, b) => Number(a) > Number(b), 'Greater Than', 2);
        this._registerSafeFunctor('lessThan', (a, b) => Number(a) < Number(b), 'Less Than', 2);
    }

    _registerBooleanFunctors() {
        // Basic boolean operations
        this._registerSafeFunctor('and', (a, b) => Boolean(a) && Boolean(b), 'Boolean AND', 2);
        this._registerSafeFunctor('or', (a, b) => Boolean(a) || Boolean(b), 'Boolean OR', 2);

        this.registry.register('not', (a) => {
            if (this._isNullish(a)) return null;
            return !Boolean(a);
        }, {
            arity: 1,
            name: 'Boolean NOT',
            description: 'Boolean NOT: not(a) = !a'
        });

        // Additional boolean operations
        this._registerSafeFunctor('xor', (a, b) => Boolean(a) !== Boolean(b), 'Boolean XOR', 2);
        this._registerSafeFunctor('implies', (a, b) => !Boolean(a) || Boolean(b), 'Boolean Implication', 2);
    }

    _registerUtilityFunctors() {
        this.registry.register('identity', (a) => a, {
            arity: 1,
            name: 'Identity',
            description: 'Returns the input unchanged: identity(a) = a'
        });

        this.registry.register('constant', (value) => value, {
            arity: 1,
            name: 'Constant',
            description: 'Returns the input value: constant(x) = x'
        });

        this.registry.register('if', (condition, thenValue, elseValue) => {
            if (this._isNullish(condition)) return null;
            return Boolean(condition) ? thenValue : elseValue;
        }, {
            arity: 3,
            name: 'Conditional',
            description: 'Conditional selection: if(condition, thenValue, elseValue)'
        });
    }

    // Helper to register a function that handles null inputs safely
    _registerSafeFunctor(name, fn, description, arity = 2) {
        this.registry.register(name, (...args) => {
            if (args.some(arg => this._isNullish(arg))) return null;

            try {
                const result = fn(...args);
                return result;
            } catch (error) {
                console.error(`Error executing functor ${name}: ${error.message}`);
                return null;
            }
        }, {
            arity,
            name: description,
            description: `${description}: ${name}(${Array(arity).fill('x').join(', ')})`
        });
    }

    // Check if a value is null or equivalent to null
    _isNullish(value) {
        return value == null || (typeof value === 'number' && isNaN(value));
    }

    getRegistry() {
        return this.registry;
    }

    addFunctor(name, execute, config = {}) {
        return this.registry.register(name, execute, config.aliases || []);
    }

    executeFunctor(name, ...args) {
        try {
            return this.registry.execute(name, ...args);
        } catch (error) {
            console.error(`Error executing functor ${name}: ${error.message}`);
            return null;
        }
    }

    getStats() {
        return this.registry.getStats();
    }
}