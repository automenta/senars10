import {Term} from '../term/Term.js';
import {FunctorRegistry} from './Functor.js';
import {SYSTEM_ATOMS, isNull, isTrue, isFalse} from './SystemAtoms.js';

export class OperationEvaluationEngine {
    constructor(functorRegistry = null) {
        this.functorRegistry = functorRegistry || new FunctorRegistry();
        this._initializeDefaultFunctors();
    }

    _initializeDefaultFunctors() {
        ['True', 'False', 'Null'].forEach(name => {
            this.functorRegistry.register(name, () => SYSTEM_ATOMS[name], { arity: 0 });
        });
    }

    async evaluate(operationTerm, context, variableBindings = new Map()) {
        if (!operationTerm.isCompound || operationTerm.operator !== '^') {
            return this._evaluateNonOperation(operationTerm, context, variableBindings);
        }

        if (operationTerm.components.length !== 2) {
            return { result: SYSTEM_ATOMS.Null, success: false, message: 'Invalid operation format' };
        }

        const [functionTerm, argsTerm] = operationTerm.components;
        
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

        let args = this._extractArguments(argsTerm, variableBindings);

        try {
            const functor = this.functorRegistry.get(functionName);
            if (!functor) {
                return { result: SYSTEM_ATOMS.Null, success: false, message: `Functor '${functionName}' not found` };
            }

            const argValues = args.map(arg => this._termToValue(arg));
            const result = functor.call(...argValues);
            const resultTerm = this._valueToTerm(result);

            if (isNull(resultTerm)) {
                return { result: resultTerm, success: false, message: 'Operation resulted in Null (poison pill)' };
            }

            return { result: resultTerm, success: true, functorName: functionName };
        } catch (error) {
            console.error(`Error evaluating operation: ${error.message}`);
            return { result: SYSTEM_ATOMS.Null, success: false, message: error.message };
        }
    }

    _extractArguments(argsTerm, variableBindings) {
        let args = [];
        if (argsTerm.isCompound && argsTerm.operator === ',') {
            let startIndex = 0;
            if (argsTerm.components.length > 0 && 
                (argsTerm.components[0].name === '*' || argsTerm.components[0].name === '?*')) {
                startIndex = 1;
            }
            
            for (let i = startIndex; i < argsTerm.components.length; i++) {
                args.push(this._substituteVariables(argsTerm.components[i], variableBindings));
            }
        } else if (argsTerm.name === '*' || argsTerm.name === '?*') {
            args = []; // No arguments
        } else {
            args = [this._substituteVariables(argsTerm, variableBindings)];
        }
        return args;
    }

    _evaluateNonOperation(term, context, variableBindings) {
        const substitutedTerm = this._substituteVariables(term, variableBindings);

        return {
            result: substitutedTerm,
            success: true,
            message: substitutedTerm.isCompound ? 'Non-operation compound term, no evaluation performed' : undefined
        };
    }

    _substituteVariables(term, bindings) {
        if (!term) return term;

        if (term.name && typeof term.name === 'string' && term.name.startsWith('?')) {
            return bindings.has(term.name) ? bindings.get(term.name) : term;
        }

        if (term.isCompound) {
            let hasChanges = false;
            const newComponents = [];
            
            for (const component of term.components) {
                const substitutedComponent = this._substituteVariables(component, bindings);
                newComponents.push(substitutedComponent);
                
                if (substitutedComponent !== component) hasChanges = true;
            }
            
            return hasChanges ? new Term(term.type, term.name, newComponents, term.operator) : term;
        }

        return term;
    }

    _termToValue(term) {
        if (!term) return null;

        const termName = term.name;
        if (termName === 'True') return true;
        if (termName === 'False') return false;
        if (termName === 'Null') return null;

        if (term.isAtomic) {
            const numValue = Number(termName);
            return isNaN(numValue) ? termName : numValue;
        }

        return term; // For compound terms, return as-is
    }

    _valueToTerm(value) {
        if (value === null) return SYSTEM_ATOMS.Null;
        
        if (typeof value === 'boolean') return value ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False;
        
        if (typeof value === 'number') {
            if (isNaN(value)) return SYSTEM_ATOMS.Null;
            try {
                return new Term('atom', value.toString(), [value.toString()]);
            } catch (error) {
                console.error(`Error creating number term: ${error.message}`);
                return SYSTEM_ATOMS.Null;
            }
        }
        
        if (typeof value === 'string') {
            if (['True', 'False', 'Null'].includes(value)) return SYSTEM_ATOMS[value];
            try {
                return new Term('atom', value, [value]);
            } catch (error) {
                console.error(`Error creating string term: ${error.message}`);
                return SYSTEM_ATOMS.Null;
            }
        }
        
        if (value instanceof Term) return value;

        try {
            return new Term('atom', String(value), [String(value)]);
        } catch (error) {
            console.error(`Error creating term from value: ${error.message}`);
            return SYSTEM_ATOMS.Null;
        }
    }

    addFunctor(name, execute, config = {}) {
        return this.functorRegistry.register(name, execute, config);
    }

    getFunctorRegistry() {
        return this.functorRegistry;
    }
}