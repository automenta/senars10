import {FunctorRegistry} from './Functor.js';
import {SYSTEM_ATOMS, isNull, isTrue, isFalse} from './SystemAtoms.js';

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

    _nullCheck = (...args) => args.some(arg => arg == null);

    _registerArithmeticFunctors() {
        const registerFunc = (name, fn, desc, arity = 2) => {
            this.registry.register(name, (...args) => {
                if (this._nullCheck(...args)) return null;
                return fn(...args);
            }, { arity, name: desc, description: `${desc}: ${name}(${Array(arity).fill('x').join(', ')})` });
        };

        registerFunc('add', (a, b) => Number(a) + Number(b), 'Addition', 2);
        registerFunc('subtract', (a, b) => Number(a) - Number(b), 'Subtraction', 2);
        registerFunc('multiply', (a, b) => Number(a) * Number(b), 'Multiplication', 2);
        
        this.registry.register('divide', (a, b) => {
            if (a == null || b == null || Number(b) === 0) return null;
            return Number(a) / Number(b);
        }, { arity: 2, name: 'Division', description: 'Division: divide(a, b) = a / b' });

        registerFunc('equals', (a, b) => Number(a) === Number(b), 'Equals', 2);
        registerFunc('greaterThan', (a, b) => Number(a) > Number(b), 'Greater Than', 2);
        registerFunc('lessThan', (a, b) => Number(a) < Number(b), 'Less Than', 2);
    }

    _registerBooleanFunctors() {
        const registerBoolFunc = (name, fn, desc, arity = 2) => {
            this.registry.register(name, (...args) => {
                if (this._nullCheck(...args)) return null;
                return fn(...args);
            }, { arity, name: desc, description: `${desc}: ${name}(${Array(arity).fill('x').join(', ')})` });
        };

        registerBoolFunc('and', (a, b) => Boolean(a) && Boolean(b), 'Boolean AND', 2);
        registerBoolFunc('or', (a, b) => Boolean(a) || Boolean(b), 'Boolean OR', 2);
        
        this.registry.register('not', (a) => {
            if (a == null) return null;
            return !Boolean(a);
        }, { arity: 1, name: 'Boolean NOT', description: 'Boolean NOT: not(a) = !a' });
        
        registerBoolFunc('xor', (a, b) => Boolean(a) !== Boolean(b), 'Boolean XOR', 2);
        registerBoolFunc('implies', (a, b) => !Boolean(a) || Boolean(b), 'Boolean Implication', 2);
    }

    _registerUtilityFunctors() {
        this.registry.register('identity', (a) => a, { 
            arity: 1, name: 'Identity', description: 'Returns the input unchanged: identity(a) = a' });

        this.registry.register('constant', (value) => value, { 
            arity: 1, name: 'Constant', description: 'Returns the input value: constant(x) = x' });

        this.registry.register('if', (condition, thenValue, elseValue) => {
            if (condition == null) return null;
            return Boolean(condition) ? thenValue : elseValue;
        }, { arity: 3, name: 'Conditional', description: 'Conditional selection: if(condition, thenValue, elseValue)' });
    }

    getRegistry() {
        return this.registry;
    }

    addFunctor(name, execute, config = {}) {
        return this.registry.register(name, execute, config.aliases || []);
    }

    executeFunctor(name, ...args) {
        return this.registry.execute(name, ...args);
    }

    getStats() {
        return this.registry.getStats();
    }
}