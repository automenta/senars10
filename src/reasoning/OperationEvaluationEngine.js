import {Term} from '../term/Term.js';
import {FunctorRegistry} from './Functor.js';
import {SYSTEM_ATOMS, isNull, isTrue, isFalse} from './SystemAtoms.js';

/**
 * Operation Evaluation Engine
 * Evaluates ^ (Operation) terms with variable substitution and functor execution
 */
export class OperationEvaluationEngine {
    constructor(functorRegistry = null) {
        this.functorRegistry = functorRegistry || new FunctorRegistry();
        this._initializeDefaultFunctors();
    }

    /**
     * Initialize default functors for basic operations
     */
    _initializeDefaultFunctors() {
        // Add system atoms as constants that always evaluate to themselves
        this.functorRegistry.register('True', () => SYSTEM_ATOMS['True'], { arity: 0 });
        this.functorRegistry.register('False', () => SYSTEM_ATOMS['False'], { arity: 0 });
        this.functorRegistry.register('Null', () => SYSTEM_ATOMS['Null'], { arity: 0 });
    }

    /**
     * Evaluate an Operation term within a given context
     * @param {Term} operationTerm - The operation term to evaluate (should have operator '^')
     * @param {Object} context - The reasoning context
     * @param {Map} variableBindings - Variable bindings for substitution
     * @returns {Object} - Result of the evaluation
     */
    async evaluate(operationTerm, context, variableBindings = new Map()) {
        // Check if it's an operation term
        if (!operationTerm.isCompound || operationTerm.operator !== '^') {
            // If not an operation, try to evaluate recursively
            return this._evaluateNonOperation(operationTerm, context, variableBindings);
        }

        // Extract function name and arguments
        if (operationTerm.components.length !== 2) {
            return { result: SYSTEM_ATOMS.Null, success: false, message: 'Invalid operation format' };
        }

        const [functionTerm, argsTerm] = operationTerm.components;
        
        // If functionTerm is a variable, try to resolve it from bindings
        let functionName;
        if (functionTerm.name && functionTerm.name.startsWith('?')) {
            if (variableBindings.has(functionTerm.name)) {
                const boundTerm = variableBindings.get(functionTerm.name);
                functionName = boundTerm.name;
            } else {
                return { result: SYSTEM_ATOMS.Null, success: false, message: 'Unbound variable in function position' };
            }
        } else {
            functionName = functionTerm.name || functionTerm.toString();
        }

        // Get arguments and substitute variables
        let args = [];
        if (argsTerm.isCompound && argsTerm.operator === ',') { // Tuple of arguments
            // Skip the first element (*) which is just a placeholder
            for (let i = 1; i < argsTerm.components.length; i++) {
                const arg = argsTerm.components[i];
                const substitutedArg = this._substituteVariables(arg, variableBindings);
                args.push(substitutedArg);
            }
        } else if (argsTerm.name === '*') {
            // No arguments case (function with no args)
            args = [];
        } else {
            // Single argument case
            const substitutedArg = this._substituteVariables(argsTerm, variableBindings);
            args = [substitutedArg];
        }

        // Try to execute the functor
        try {
            const functor = this.functorRegistry.get(functionName);
            if (!functor) {
                return { result: SYSTEM_ATOMS.Null, success: false, message: `Functor '${functionName}' not found` };
            }

            // Prepare arguments for functor execution
            const argValues = args.map(arg => this._termToValue(arg));

            // Execute the functor
            const result = functor.call(...argValues);

            // Convert result back to term if needed
            const resultTerm = this._valueToTerm(result);

            // Handle special cases like Null as poison pill
            if (isNull(resultTerm)) {
                return { result: resultTerm, success: false, message: 'Operation resulted in Null (poison pill)' };
            }

            return { result: resultTerm, success: true, functorName: functionName };
        } catch (error) {
            console.error(`Error evaluating operation: ${error.message}`);
            return { result: SYSTEM_ATOMS.Null, success: false, message: error.message };
        }
    }

    /**
     * Evaluate a non-operation term (for recursive evaluation)
     */
    _evaluateNonOperation(term, context, variableBindings) {
        // First, substitute variables in the term
        const substitutedTerm = this._substituteVariables(term, variableBindings);

        // If it's a compound term, recursively evaluate its components
        if (substitutedTerm.isCompound) {
            // This is a more complex case that might require specific logic based on the operator
            return { result: substitutedTerm, success: true, message: 'Non-operation compound term, no evaluation performed' };
        }

        // If it's a simple atomic term, return as is
        return { result: substitutedTerm, success: true };
    }

    /**
     * Perform variable substitution in a term
     */
    _substituteVariables(term, bindings) {
        if (!term) return term;

        // If it's a variable, try to replace with binding
        if (term.name && typeof term.name === 'string' && term.name.startsWith('?')) {
            if (bindings.has(term.name)) {
                return bindings.get(term.name);
            }
            return term; // Return as-is if not bound
        }

        // If it's a compound term, recursively process components
        if (term.isCompound) {
            const newComponents = term.components.map(component => 
                this._substituteVariables(component, bindings)
            );
            return new Term(term.type, term.name, newComponents, term.operator);
        }

        return term;
    }

    /**
     * Convert a term to a JavaScript value for functor execution
     */
    _termToValue(term) {
        if (!term) return null;

        // Check for system atoms
        if (isTrue(term)) return true;
        if (isFalse(term)) return false;
        if (isNull(term)) return null;

        // If it's a number-like atom, try to convert to number
        if (term.isAtomic) {
            const name = term.name;
            // Check if it looks like a number
            const numValue = Number(name);
            if (!isNaN(numValue)) {
                return numValue;
            }
            return name; // Return as string
        }

        // For compound terms, return the term itself for now
        return term;
    }

    /**
     * Convert a JavaScript value back to a term
     */
    _valueToTerm(value) {
        if (value === null) {
            return SYSTEM_ATOMS.Null;
        }

        if (typeof value === 'boolean') {
            return value ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False;
        }

        if (typeof value === 'number') {
            return new Term('atom', value.toString(), [value.toString()]);
        }

        if (typeof value === 'string') {
            // Check if it matches a system atom name
            if (value === 'True') return SYSTEM_ATOMS.True;
            if (value === 'False') return SYSTEM_ATOMS.False;
            if (value === 'Null') return SYSTEM_ATOMS.Null;
            
            return new Term('atom', value, [value]);
        }

        if (value instanceof Term) {
            return value; // Already a term
        }

        // Default case: convert to string representation
        return new Term('atom', String(value), [String(value)]);
    }

    /**
     * Add a functor to the registry
     */
    addFunctor(name, execute, config = {}) {
        return this.functorRegistry.register(name, execute, config);
    }

    /**
     * Get the functor registry
     */
    getFunctorRegistry() {
        return this.functorRegistry;
    }
}