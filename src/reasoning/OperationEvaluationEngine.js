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
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid operation format');
        }

        return this._evaluateOperation(operationTerm, variableBindings);
    }
    
    _evaluateOperation(operationTerm, variableBindings) {
        const [functionTerm, argsTerm] = operationTerm.components;
        
        const functionName = this._resolveFunctionName(functionTerm, variableBindings);
        if (!functionName) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Unbound variable in function position');
        }

        const args = this._extractArguments(argsTerm, variableBindings);
        const functor = this.functorRegistry.get(functionName);

        if (!functor) {
            return this._createResult(SYSTEM_ATOMS.Null, false, `Functor '${functionName}' not found`);
        }

        try {
            const argValues = args.map(arg => this._termToValue(arg));
            const result = functor.call(...argValues);
            const resultTerm = this._valueToTerm(result);

            if (isNull(resultTerm)) {
                return this._createResult(resultTerm, false, 'Operation resulted in Null (poison pill)');
            }

            return this._createResult(resultTerm, true, null, { functorName: functionName });
        } catch (error) {
            console.error(`Error evaluating operation: ${error.message}`);
            return this._createResult(SYSTEM_ATOMS.Null, false, error.message);
        }
    }

    _resolveFunctionName(functionTerm, variableBindings) {
        if (functionTerm.name && functionTerm.name.startsWith('?')) {
            return variableBindings.has(functionTerm.name) 
                ? variableBindings.get(functionTerm.name).name 
                : null;
        }
        return functionTerm.name || functionTerm.toString();
    }

    _extractArguments(argsTerm, variableBindings) {
        if (!argsTerm.isCompound || argsTerm.operator !== ',') {
            if (argsTerm.name === '*' || argsTerm.name === '?*') {
                return []; // No arguments
            }
            return [this._substituteVariables(argsTerm, variableBindings)];
        }

        return this._extractCompoundArguments(argsTerm, variableBindings);
    }
    
    _extractCompoundArguments(argsTerm, variableBindings) {
        let startIndex = (argsTerm.components[0] && 
                         (argsTerm.components[0].name === '*' || argsTerm.components[0].name === '?*')) ? 1 : 0;
        
        return argsTerm.components
            .slice(startIndex)
            .map(comp => this._substituteVariables(comp, variableBindings));
    }

    _evaluateNonOperation(term, context, variableBindings) {
        const substitutedTerm = this._substituteVariables(term, variableBindings);
        const message = substitutedTerm.isCompound 
            ? 'Non-operation compound term, no evaluation performed' 
            : undefined;

        return this._createResult(substitutedTerm, true, message);
    }

    _substituteVariables(term, bindings) {
        if (!term) return term;

        if (term.name && typeof term.name === 'string' && term.name.startsWith('?')) {
            return bindings.has(term.name) ? bindings.get(term.name) : term;
        }

        if (term.isCompound) {
            const newComponents = term.components.map(comp => this._substituteVariables(comp, bindings));
            const hasChanges = newComponents.some((comp, idx) => comp !== term.components[idx]);
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

        return term;
    }

    _valueToTerm(value) {
        if (value === null) return SYSTEM_ATOMS.Null;
        if (typeof value === 'boolean') return value ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False;
        
        if (typeof value === 'number') {
            if (isNaN(value)) return SYSTEM_ATOMS.Null;
            return this._createTermWithErrorHandling('atom', value.toString());
        }
        
        if (typeof value === 'string') {
            if (['True', 'False', 'Null'].includes(value)) return SYSTEM_ATOMS[value];
            return this._createTermWithErrorHandling('atom', value);
        }
        
        if (value instanceof Term) return value;
        return this._createTermWithErrorHandling('atom', String(value));
    }

    _createTermWithErrorHandling(type, name) {
        try {
            return new Term(type, name, [name]);
        } catch (error) {
            console.error(`Error creating term: ${error.message}`);
            return SYSTEM_ATOMS.Null;
        }
    }

    _createResult(result, success, message, additionalData = {}) {
        return { result, success, message, ...additionalData };
    }

    addFunctor(name, execute, config = {}) {
        return this.functorRegistry.register(name, execute, config);
    }

    getFunctorRegistry() {
        return this.functorRegistry;
    }
}