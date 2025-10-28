/**
 * Abstract Functor interface for atomic operations in the SeNARS system.
 */
export class Functor {
    constructor(name, execute, config = {}) {
        if (this.constructor === Functor) {
            throw new TypeError('Cannot instantiate abstract class Functor directly');
        }

        this.name = name;
        this.execute = execute;
        this.config = config;
        this.arity = config.arity ?? 0;
        this.isCommutative = config.isCommutative || false;
        this.isAssociative = config.isAssociative || false;
    }

    call(...args) {
        if (args.length !== this.arity && this.arity !== -1) {
            throw new Error(`Functor ${this.name} expected ${this.arity} arguments, got ${args.length}`);
        }
        return this.execute(...args);
    }

    validate(...args) {
        return this.arity === -1 || args.length === this.arity;
    }
}

/**
 * Concrete implementation of Functor to wrap simple functions
 */
export class ConcreteFunctor extends Functor {
    constructor(name, execute, config = {}) {
        super(name, execute, config);
    }
}

/**
 * FunctorRegistry - A system for registering and managing Functors
 */
export class FunctorRegistry {
    constructor() {
        this.functors = new Map();
        this.aliases = new Map();
    }

    register(name, functor, aliases = []) {
        // Make sure aliases is an array and make a copy so we can safely modify it
        const aliasesArray = Array.isArray(aliases) ? aliases : [];
        const aliasesCopy = [...aliasesArray];

        if (typeof functor === 'function') {
            functor = new ConcreteFunctor(name, functor, {arity: this._extractArity(aliasesCopy)});
        }

        if (this.functors.has(name)) {
            // Check if the functors are functionally equivalent to avoid unnecessary warnings
            const existingFunctor = this.functors.get(name);
            if (existingFunctor && 
                existingFunctor.execute.toString() === functor.execute.toString() &&
                existingFunctor.arity === functor.arity &&
                existingFunctor.isCommutative === functor.isCommutative &&
                existingFunctor.isAssociative === functor.isAssociative) {
                // Same functor, no need to replace or warn
                return true;
            }
            this.logger?.warn(`Functor ${name} is already registered, replacing it.`);
        }

        this.functors.set(name, functor);
        this._addAliases(aliasesCopy, name);

        return true;
    }

    _extractArity(aliases) {
        return aliases.length > 0 && Array.isArray(aliases[aliases.length - 1]) ? aliases.pop() : 0;
    }

    _addAliases(aliases, functorName) {
        aliases.forEach(alias => this.aliases.set(alias, functorName));
    }

    get(name) {
        const actualName = this.aliases.get(name) || name;
        return this.functors.get(actualName) || null;
    }

    execute(name, ...args) {
        const functor = this.get(name);
        if (!functor) throw new Error(`Functor ${name} is not registered`);
        if (!functor.validate(...args)) throw new Error(`Invalid arguments for functor ${name}`);
        return functor.call(...args);
    }

    has(name) {
        const actualName = this.aliases.get(name) || name;
        return this.functors.has(actualName);
    }

    unregister(name) {
        const actualName = this.aliases.get(name) || name;
        if (!this.functors.has(actualName)) return false;

        this._removeAliases(actualName);
        return this.functors.delete(actualName);
    }

    _removeAliases(functorName) {
        for (const [alias, name] of this.aliases.entries()) {
            if (name === functorName) this.aliases.delete(alias);
        }
    }

    getFunctorNames() {
        return Array.from(this.functors.keys());
    }

    getAliases() {
        return Array.from(this.aliases.keys());
    }

    getStats() {
        return {
            functorCount: this.functors.size,
            aliasCount: this.aliases.size,
            functors: this.getFunctorNames(),
            aliases: this.getAliases()
        };
    }

    clear() {
        this.functors.clear();
        this.aliases.clear();
    }

    // Enhanced registration method with configuration options
    registerFunctor(name, execute, config = {}) {
        const functor = new ConcreteFunctor(name, execute, config);
        
        if (this.functors.has(name)) {
            this.logger?.warn(`Functor ${name} is already registered, replacing it.`);
        }
        
        this.functors.set(name, functor);
        
        return functor;
    }

    // Dynamic registration method for use at runtime
    registerFunctorDynamic(name, execute, config = {}) {
        return this.registerFunctor(name, execute, {
            arity: config.arity || 2,
            isCommutative: config.isCommutative || false,
            isAssociative: config.isAssociative || false,
            description: config.description || 'Dynamic functor',
            ...config
        });
    }

    // Get functor properties
    getFunctorProperties(name) {
        const functor = this.get(name);
        if (!functor) return null;
        
        return {
            name: functor.name,
            arity: functor.arity,
            isCommutative: functor.isCommutative,
            isAssociative: functor.isAssociative,
            config: functor.config
        };
    }

    // Check if a functor has specific properties
    hasProperty(name, property) {
        const functor = this.get(name);
        if (!functor) return false;
        
        switch(property) {
            case 'commutative':
                return functor.isCommutative;
            case 'associative':
                return functor.isAssociative;
            default:
                return functor.config[property] === true;
        }
    }

    // Get all functors with a specific property
    getFunctorsWithProperty(property) {
        const result = [];
        
        for (const [name, functor] of this.functors.entries()) {
            let hasProp = false;
            switch(property) {
                case 'commutative':
                    hasProp = functor.isCommutative;
                    break;
                case 'associative':
                    hasProp = functor.isAssociative;
                    break;
                default:
                    hasProp = functor.config[property] === true;
                    break;
            }
            
            if (hasProp) {
                result.push({name, functor});
            }
        }
        
        return result;
    }
}