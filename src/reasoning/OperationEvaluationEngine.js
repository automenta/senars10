import {Term} from '../term/Term.js';
import {FunctorRegistry, ConcreteFunctor} from './Functor.js';
import {SYSTEM_ATOMS, isNull} from './SystemAtoms.js';

export class OperationEvaluationEngine {
    constructor(functorRegistry = null) {
        this.functorRegistry = functorRegistry || new FunctorRegistry();
        this._initializeDefaultFunctors();
    }

    _initializeDefaultFunctors() {
        ['True', 'False', 'Null'].forEach(name => {
            this.functorRegistry.register(name, () => SYSTEM_ATOMS[name], { arity: 0 });
        });
        
        this._initializeArithmeticFunctors();
    }
    
    _initializeArithmeticFunctors() {
        this.addFunctor('add', (a, b) => a + b, { arity: 2, isCommutative: true });
        this.addFunctor('subtract', (a, b) => a - b, { arity: 2, isCommutative: false });
        this.addFunctor('multiply', (a, b) => a * b, { arity: 2, isCommutative: true });
        this.addFunctor('divide', (a, b) => b !== 0 ? a / b : null, { arity: 2, isCommutative: false });
        this.addFunctor('equals', (a, b) => a === b ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False, { arity: 2 });
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
        if (functionTerm.name?.startsWith('?')) {
            return variableBindings.get(functionTerm.name)?.name || null;
        }
        return functionTerm.name || functionTerm.toString();
    }

    _extractArguments(argsTerm, variableBindings) {
        if (!argsTerm.isCompound || argsTerm.operator !== ',') {
            if (['*', '?*'].includes(argsTerm.name)) return [];
            return [this._substituteVariables(argsTerm, variableBindings)];
        }
        return this._extractCompoundArguments(argsTerm, variableBindings);
    }
    
    _extractCompoundArguments(argsTerm, variableBindings) {
        const startIndex = (argsTerm.components[0]?.name === '*' || argsTerm.components[0]?.name === '?*') ? 1 : 0;
        return argsTerm.components
            .slice(startIndex)
            .map(comp => this._substituteVariables(comp, variableBindings));
    }

    _evaluateNonOperation(term, context, variableBindings) {
        const substitutedTerm = this._substituteVariables(term, variableBindings);
        const message = substitutedTerm.isCompound ? 'Non-operation compound term, no evaluation performed' : undefined;
        return this._createResult(substitutedTerm, true, message);
    }

    _substituteVariables(term, bindings) {
        if (!term) return term;

        if (term.name?.startsWith('?')) {
            return bindings.get(term.name) ?? term;
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

        const { name } = term;
        if (name === 'True') return true;
        if (name === 'False') return false;
        if (name === 'Null') return null;

        if (term.isAtomic) {
            const numValue = Number(name);
            return isNaN(numValue) ? name : numValue;
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
        
        if (typeof value === 'string' && ['True', 'False', 'Null'].includes(value)) {
            return SYSTEM_ATOMS[value];
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

    async solveEquation(leftTerm, rightTerm, variableName, context, variableBindings = new Map()) {
        if (leftTerm.isCompound && leftTerm.operator === '^') {
            return this._solveOperationEquation(leftTerm, rightTerm, variableName, variableBindings);
        }
        
        if (leftTerm.name?.startsWith('?') && leftTerm.name === variableName) {
            return this._createResult(rightTerm, true, 'Direct variable assignment', { solvedVariable: variableName });
        }
        
        return this._createResult(SYSTEM_ATOMS.Null, false, 'No back-solving pattern matched');
    }
    
    _solveOperationEquation(operationTerm, targetTerm, variableName, variableBindings) {
        if (!operationTerm.isCompound || operationTerm.operator !== '^' || operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid operation format for equation solving');
        }
        
        const [functionTerm, argsTerm] = operationTerm.components;
        const functionName = this._resolveFunctionName(functionTerm, variableBindings);
        if (!functionName) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Unbound variable in function position');
        }
        
        const targetValue = this._termToValue(targetTerm);
        if (targetValue === null) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target value cannot be determined');
        }
        
        const args = this._extractArguments(argsTerm, variableBindings);
        const variableIndex = args.findIndex(arg => 
            arg.name?.startsWith('?') && arg.name === variableName
        );
        
        if (variableIndex === -1) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target variable not found in operation arguments');
        }
        
        return this._solveArithmeticEquation(functionName, args, variableIndex, targetValue);
    }
    
    _solveArithmeticEquation(functionName, args, variableIndex, targetValue) {
        const argValues = args.map(arg => this._termToValue(arg));
        let solvedValue = null;
        let success = false;
        let message = null;
        
        switch (functionName) {
            case 'add':
                // If we have add(a, x) = target, then x = target - a
                // If we have add(x, b) = target, then x = target - b
                const otherAddValue = argValues[1 - variableIndex];
                if (typeof otherAddValue === 'number') {
                    solvedValue = targetValue - otherAddValue;
                    success = true;
                } else {
                    message = 'Other argument is not a number, cannot solve';
                }
                break;
                
            case 'subtract':
                if (variableIndex === 0) {
                    // If we have subtract(x, b) = target, then x = target + b
                    const subSecondValue = argValues[1];
                    if (typeof subSecondValue === 'number') {
                        solvedValue = targetValue + subSecondValue;
                        success = true;
                    } else {
                        message = 'Second argument is not a number, cannot solve';
                    }
                } else {
                    // If we have subtract(a, x) = target, then x = a - target
                    const subFirstValue = argValues[0];
                    if (typeof subFirstValue === 'number') {
                        solvedValue = subFirstValue - targetValue;
                        success = true;
                    } else {
                        message = 'First argument is not a number, cannot solve';
                    }
                }
                break;
                
            case 'multiply':
                // If we have multiply(a, x) = target, then x = target / a
                // If we have multiply(x, b) = target, then x = target / b
                const otherMultValue = argValues[1 - variableIndex];
                if (typeof otherMultValue === 'number' && otherMultValue !== 0) {
                    solvedValue = targetValue / otherMultValue;
                    success = true;
                } else if (otherMultValue === 0) {
                    message = 'Cannot divide by zero';
                } else {
                    message = 'Other argument is not a number, cannot solve';
                }
                break;
                
            case 'divide':
                if (variableIndex === 0) {
                    // If we have divide(x, b) = target, then x = target * b
                    const divSecondValue = argValues[1];
                    if (typeof divSecondValue === 'number') {
                        solvedValue = targetValue * divSecondValue;
                        success = true;
                    } else {
                        message = 'Second argument is not a number, cannot solve';
                    }
                } else {
                    // If we have divide(a, x) = target, then x = a / target
                    if (targetValue !== 0) {
                        const divFirstValue = argValues[0];
                        if (typeof divFirstValue === 'number') {
                            solvedValue = divFirstValue / targetValue;
                            success = true;
                        } else {
                            message = 'First argument is not a number, cannot solve';
                        }
                    } else {
                        message = 'Cannot divide by target value of zero';
                    }
                }
                break;
                
            default:
                message = `Back-solving not implemented for functor: ${functionName}`;
        }
        
        if (success && solvedValue !== null) {
            const resultTerm = this._valueToTerm(solvedValue);
            return this._createResult(resultTerm, true, null, { 
                solvedVariable: args[variableIndex].name,
                solvedValue
            });
        } else {
            return this._createResult(SYSTEM_ATOMS.Null, false, message || 'Could not solve equation');
        }
    }

    _createResult(result, success, message, additionalData = {}) {
        return { result, success, message, ...additionalData };
    }

    addFunctor(name, execute, config = {}) {
        const functor = new ConcreteFunctor(name, execute, config);
        return this.functorRegistry.register(name, functor, []);
    }

    getFunctorRegistry() {
        return this.functorRegistry;
    }
}
