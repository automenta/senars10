/**
 * Abstract Functor interface for atomic operations in the SeNARS system.
 * Provides the foundation for registering and executing operations.
 */
export class Functor {
  constructor(name, execute, config = {}) {
    if (this.constructor === Functor) {
      throw new TypeError('Cannot instantiate abstract class Functor directly');
    }
    
    this.name = name;
    this.execute = execute;
    this.config = config;
    this.arity = config.arity ?? 0; // Number of arguments the functor takes
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
 * FunctorRegistry - A system for registering and managing Functors
 */
export class FunctorRegistry {
  constructor() {
    this.functors = new Map(); // name -> Functor
    this.aliases = new Map();  // alias -> name
  }

  register(name, functor, aliases = []) {
    if (typeof functor === 'function') {
      // If a function is passed instead of a functor object, wrap it
      functor = new Functor(name, functor, { arity: aliases.length > 0 && Array.isArray(aliases[aliases.length - 1]) ? aliases.pop() : 0 });
    }
    
    if (this.functors.has(name)) {
      console.warn(`Functor ${name} is already registered, replacing it.`);
    }
    
    this.functors.set(name, functor);
    aliases.forEach(alias => this.aliases.set(alias, name));
    
    return true;
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

    // Remove aliases that point to this functor
    for (const [alias, functorName] of this.aliases.entries()) {
      if (functorName === actualName) this.aliases.delete(alias);
    }
    
    return this.functors.delete(actualName);
  }

  getFunctorNames() { return Array.from(this.functors.keys()); }
  getAliases() { return Array.from(this.aliases.keys()); }

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
}