/**
 * Abstract Functor interface for atomic operations in the SeNARS system.
 * Provides the foundation for registering and executing operations.
 */
export class Functor {
  /**
   * Constructor for Functor
   * @param {string} name - Name of the functor
   * @param {Function} execute - Execution function for the functor
   * @param {Object} config - Configuration options
   */
  constructor(name, execute, config = {}) {
    if (this.constructor === Functor) {
      throw new TypeError('Cannot instantiate abstract class Functor directly');
    }
    
    this.name = name;
    this.execute = execute;
    this.config = config;
    this.arity = config.arity || 0; // Number of arguments the functor takes
    this.isCommutative = config.isCommutative || false;
    this.isAssociative = config.isAssociative || false;
  }

  /**
   * Execute the functor with the given arguments
   * @param {...any} args - Arguments for the functor
   * @returns {any} - Result of the functor execution
   */
  call(...args) {
    if (args.length !== this.arity && this.arity !== -1) {
      throw new Error(`Functor ${this.name} expected ${this.arity} arguments, got ${args.length}`);
    }
    return this.execute(...args);
  }

  /**
   * Validate arguments before execution
   * @param {...any} args - Arguments to validate
   * @returns {boolean} - True if arguments are valid
   */
  validate(...args) {
    // Default validation: check arity
    return this.arity === -1 || args.length === this.arity;
  }
}

/**
 * Concrete implementation of a Functor for general use
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
    this.functors = new Map(); // name -> Functor
    this.aliases = new Map();  // alias -> name
  }

  /**
   * Register a new functor
   * @param {string} name - Name of the functor
   * @param {Functor} functor - Functor instance to register
   * @param {Array} aliases - Optional aliases for the functor
   * @returns {boolean} - True if registration was successful
   */
  register(name, functor, aliases = []) {
    if (this.functors.has(name)) {
      console.warn(`Functor ${name} is already registered, replacing it.`);
    }
    
    this.functors.set(name, functor);
    
    // Register aliases
    for (const alias of aliases) {
      this.aliases.set(alias, name);
    }
    
    return true;
  }

  /**
   * Get a functor by name
   * @param {string} name - Name of the functor to get
   * @returns {Functor|null} - The functor or null if not found
   */
  get(name) {
    // Check if it's an alias first
    const actualName = this.aliases.get(name) || name;
    return this.functors.get(actualName) || null;
  }

  /**
   * Execute a functor by name with arguments
   * @param {string} name - Name of the functor to execute
   * @param {...any} args - Arguments for the functor
   * @returns {any} - Result of the functor execution
   */
  execute(name, ...args) {
    const functor = this.get(name);
    if (!functor) {
      throw new Error(`Functor ${name} is not registered`);
    }
    
    if (!functor.validate(...args)) {
      throw new Error(`Invalid arguments for functor ${name}`);
    }
    
    return functor.call(...args);
  }

  /**
   * Check if a functor is registered
   * @param {string} name - Name of the functor
   * @returns {boolean} - True if functor is registered
   */
  has(name) {
    const actualName = this.aliases.get(name) || name;
    return this.functors.has(actualName);
  }

  /**
   * Remove a functor from the registry
   * @param {string} name - Name of the functor to remove
   * @returns {boolean} - True if removed successfully
   */
  unregister(name) {
    const actualName = this.aliases.get(name) || name;
    if (!this.functors.has(actualName)) {
      return false;
    }
    
    // Remove aliases that point to this functor
    for (const [alias, functorName] of this.aliases.entries()) {
      if (functorName === actualName) {
        this.aliases.delete(alias);
      }
    }
    
    return this.functors.delete(actualName);
  }

  /**
   * Get all registered functor names
   * @returns {Array} - Array of functor names
   */
  getFunctorNames() {
    return Array.from(this.functors.keys());
  }

  /**
   * Get all registered functor aliases
   * @returns {Array} - Array of functor names
   */
  getAliases() {
    return Array.from(this.aliases.keys());
  }

  /**
   * Get statistics about the registry
   * @returns {Object} - Statistics about the registry
   */
  getStats() {
    return {
      functorCount: this.functors.size,
      aliasCount: this.aliases.size,
      functors: this.getFunctorNames(),
      aliases: this.getAliases()
    };
  }

  /**
   * Clear all functors from the registry
   */
  clear() {
    this.functors.clear();
    this.aliases.clear();
  }
}