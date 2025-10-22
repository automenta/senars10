import {FunctorRegistry} from './Functor.js';
import {SYSTEM_ATOMS, isNull, isTrue, isFalse} from './SystemAtoms.js';

/**
 * Core Functor Library
 * Implements essential functors for arithmetic and boolean logic
 */
export class CoreFunctorLibrary {
    constructor(registry = null) {
        this.registry = registry || new FunctorRegistry();
        this._initializeCoreFunctors();
    }

    /**
     * Initialize the core set of functors
     */
    _initializeCoreFunctors() {
        // Arithmetic functors
        this._registerArithmeticFunctors();
        
        // Boolean logic functors
        this._registerBooleanFunctors();
        
        // Utility functors
        this._registerUtilityFunctors();
    }

    /**
     * Get the functor registry
     */
    getRegistry() {
        return this.registry;
    }

    /**
     * Add a custom functor
     */
    addFunctor(name, execute, config = {}) {
        return this.registry.register(name, execute, config.aliases || []);
    }

    /**
     * Execute a functor by name
     */
    executeFunctor(name, ...args) {
        return this.registry.execute(name, ...args);
    }

    /**
     * Get registry statistics
     */
    getStats() {
        return this.registry.getStats();
    }

    /**
     * Register arithmetic functors
     */
    _registerArithmeticFunctors() {
        // Addition
        this.registry.register('add', (a, b) => {
            if (a == null || b == null) return null;  // Return Null if any argument is Null
            return Number(a) + Number(b);
        }, { 
            arity: 2, 
            name: 'Addition',
            description: 'Adds two numbers: add(a, b) = a + b'
        });

        // Subtraction
        this.registry.register('subtract', (a, b) => {
            if (a == null || b == null) return null;  // Return Null if any argument is Null
            return Number(a) - Number(b);
        }, { 
            arity: 2, 
            name: 'Subtraction',
            description: 'Subtracts second number from first: subtract(a, b) = a - b'
        });

        // Multiplication
        this.registry.register('multiply', (a, b) => {
            if (a == null || b == null) return null;  // Return Null if any argument is Null
            return Number(a) * Number(b);
        }, { 
            arity: 2, 
            name: 'Multiplication',
            description: 'Multiplies two numbers: multiply(a, b) = a * b'
        });

        // Division
        this.registry.register('divide', (a, b) => {
            if (a == null || b == null || Number(b) === 0) return null;  // Return Null if division by zero or invalid args
            return Number(a) / Number(b);
        }, { 
            arity: 2, 
            name: 'Division',
            description: 'Divides first number by second: divide(a, b) = a / b'
        });

        // Equals (for numbers)
        this.registry.register('equals', (a, b) => {
            if (a == null || b == null) return null;  // Return Null if any argument is Null
            return Number(a) === Number(b);
        }, { 
            arity: 2, 
            name: 'Equals',
            description: 'Checks equality: equals(a, b) = true if a === b, false otherwise'
        });

        // Greater than
        this.registry.register('greaterThan', (a, b) => {
            if (a == null || b == null) return null;  // Return Null if any argument is Null
            return Number(a) > Number(b);
        }, { 
            arity: 2, 
            name: 'Greater Than',
            description: 'Checks if first number is greater than second: greaterThan(a, b) = a > b'
        });

        // Less than
        this.registry.register('lessThan', (a, b) => {
            if (a == null || b == null) return null;  // Return Null if any argument is Null
            return Number(a) < Number(b);
        }, { 
            arity: 2, 
            name: 'Less Than',
            description: 'Checks if first number is less than second: lessThan(a, b) = a < b'
        });
    }

    /**
     * Register boolean logic functors
     */
    _registerBooleanFunctors() {
        // Boolean AND
        this.registry.register('and', (a, b) => {
            if (a == null || b == null) return null;  // Null propagates
            return Boolean(a) && Boolean(b);
        }, { 
            arity: 2, 
            name: 'Boolean AND',
            description: 'Logical AND: and(a, b) = a && b'
        });

        // Boolean OR
        this.registry.register('or', (a, b) => {
            if (a == null || b == null) return null;  // Null propagates
            return Boolean(a) || Boolean(b);
        }, { 
            arity: 2, 
            name: 'Boolean OR',
            description: 'Logical OR: or(a, b) = a || b'
        });

        // Boolean NOT
        this.registry.register('not', (a) => {
            if (a == null) return null;  // Null propagates
            return !Boolean(a);
        }, { 
            arity: 1, 
            name: 'Boolean NOT',
            description: 'Logical NOT: not(a) = !a'
        });

        // Boolean XOR
        this.registry.register('xor', (a, b) => {
            if (a == null || b == null) return null;  // Null propagates
            return Boolean(a) !== Boolean(b);
        }, { 
            arity: 2, 
            name: 'Boolean XOR',
            description: 'Logical XOR: xor(a, b) = a !== b (exclusive or)'
        });

        // Implication (a -> b is equivalent to (!a || b))
        this.registry.register('implies', (a, b) => {
            if (a == null || b == null) return null;  // Null propagates
            return !Boolean(a) || Boolean(b);
        }, { 
            arity: 2, 
            name: 'Boolean Implication',
            description: 'Logical implication: implies(a, b) = !a || b'
        });
    }

    /**
     * Register utility functors
     */
    _registerUtilityFunctors() {
        // Identity function
        this.registry.register('identity', (a) => a, { 
            arity: 1, 
            name: 'Identity',
            description: 'Returns the input unchanged: identity(a) = a'
        });

        // Constant function
        this.registry.register('constant', (value) => value, { 
            arity: 1, 
            name: 'Constant',
            description: 'Returns the input value: constant(x) = x'
        });

        // Conditional (if-then-else)
        this.registry.register('if', (condition, thenValue, elseValue) => {
            if (condition == null) return null;  // Null propagates
            return Boolean(condition) ? thenValue : elseValue;
        }, { 
            arity: 3, 
            name: 'Conditional',
            description: 'Conditional selection: if(condition, thenValue, elseValue)'
        });
    }

    /**
     * Get the functor registry
     */
    getRegistry() {
        return this.registry;
    }

    /**
     * Add a custom functor
     */
    addFunctor(name, execute, config = {}) {
        return this.registry.register(name, execute, config.aliases || []);
    }

    /**
     * Execute a functor by name
     */
    executeFunctor(name, ...args) {
        return this.registry.execute(name, ...args);
    }

    /**
     * Get registry statistics
     */
    getStats() {
        return this.registry.getStats();
    }
}