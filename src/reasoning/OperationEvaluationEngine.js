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
        
        // Register basic arithmetic functors for back-solving
        this._initializeArithmeticFunctors();
    }
    
    _initializeArithmeticFunctors() {
        // Register arithmetic functors
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

    /**
     * Solve equations by back-solving for variables in operation terms
     * For example: solve for ?x in add(1, ?x) = 3
     */
    async solveEquation(leftTerm, rightTerm, variableName, context, variableBindings = new Map()) {
        // Check if leftTerm is an operation we can back-solve
        if (leftTerm.isCompound && leftTerm.operator === '^') {
            return this._solveOperationEquation(leftTerm, rightTerm, variableName, variableBindings);
        }
        
        // If leftTerm is a variable and matches the target variable, return the right term
        if (leftTerm.name && leftTerm.name.startsWith('?') && leftTerm.name === variableName) {
            return this._createResult(rightTerm, true, 'Direct variable assignment', { solvedVariable: variableName });
        }
        
        // For other cases, return null indicating no solution found
        return this._createResult(SYSTEM_ATOMS.Null, false, 'No back-solving pattern matched');
    }
    
    /**
     * Solve equations where the left side is an operation containing a variable
     */
    _solveOperationEquation(operationTerm, targetTerm, variableName, variableBindings) {
        if (!operationTerm.isCompound || operationTerm.operator !== '^' || operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid operation format for equation solving');
        }
        
        const [functionTerm, argsTerm] = operationTerm.components;
        const functionName = this._resolveFunctionName(functionTerm, variableBindings);
        if (!functionName) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Unbound variable in function position');
        }
        
        // Get the target value from the right side of the equation
        const targetValue = this._termToValue(targetTerm);
        if (targetValue === null) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target value cannot be determined');
        }
        
        // Extract arguments, which may contain the variable we're solving for
        const args = this._extractArguments(argsTerm, variableBindings);
        
        // Check if the variable appears in the arguments and solve accordingly
        const variableIndex = args.findIndex(arg => 
            arg.name && arg.name.startsWith('?') && arg.name === variableName
        );
        
        if (variableIndex === -1) {
            // Variable not in this operation, no solution possible here
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target variable not found in operation arguments');
        }
        
        // For now, implement basic arithmetic back-solving
        return this._solveArithmeticEquation(functionName, args, variableIndex, targetValue);
    }
    
    /**
     * Solve simple arithmetic equations for a variable
     */
    _solveArithmeticEquation(functionName, args, variableIndex, targetValue) {
        // Convert argument values, keeping track of which is the unknown variable
        const argValues = args.map(arg => this._termToValue(arg));
        
        // Calculate the value of the unknown variable based on the operation
        let solvedValue = null;
        let success = false;
        let message = null;
        
        if (functionName === 'add') {
            // If we have add(a, x) = target, then x = target - a
            // If we have add(x, b) = target, then x = target - b
            const otherValue = argValues[1 - variableIndex]; // The other argument (not the variable)
            if (typeof otherValue === 'number') {
                solvedValue = targetValue - otherValue;
                success = true;
            } else {
                message = 'Other argument is not a number, cannot solve';
            }
        } 
        else if (functionName === 'subtract') {
            if (variableIndex === 0) {
                // If we have subtract(x, b) = target, then x = target + b
                const otherValue = argValues[1]; // The second argument (b)
                if (typeof otherValue === 'number') {
                    solvedValue = targetValue + otherValue;
                    success = true;
                } else {
                    message = 'Second argument is not a number, cannot solve';
                }
            } else {
                // If we have subtract(a, x) = target, then x = a - target
                const otherValue = argValues[0]; // The first argument (a)
                if (typeof otherValue === 'number') {
                    solvedValue = otherValue - targetValue;
                    success = true;
                } else {
                    message = 'First argument is not a number, cannot solve';
                }
            }
        }
        else if (functionName === 'multiply') {
            // If we have multiply(a, x) = target, then x = target / a
            // If we have multiply(x, b) = target, then x = target / b
            const otherValue = argValues[1 - variableIndex]; // The other argument (not the variable)
            if (typeof otherValue === 'number' && otherValue !== 0) {
                solvedValue = targetValue / otherValue;
                success = true;
            } else if (otherValue === 0) {
                message = 'Cannot divide by zero';
            } else {
                message = 'Other argument is not a number, cannot solve';
            }
        }
        else if (functionName === 'divide') {
            if (variableIndex === 0) {
                // If we have divide(x, b) = target, then x = target * b
                const otherValue = argValues[1]; // The second argument (b)
                if (typeof otherValue === 'number') {
                    solvedValue = targetValue * otherValue;
                    success = true;
                } else {
                    message = 'Second argument is not a number, cannot solve';
                }
            } else {
                // If we have divide(a, x) = target, then x = a / target
                if (targetValue !== 0) {
                    const otherValue = argValues[0]; // The first argument (a)
                    if (typeof otherValue === 'number') {
                        solvedValue = otherValue / targetValue;
                        success = true;
                    } else {
                        message = 'First argument is not a number, cannot solve';
                    }
                } else {
                    message = 'Cannot divide by target value of zero';
                }
            }
        }
        else {
            message = `Back-solving not implemented for functor: ${functionName}`;
        }
        
        if (success && solvedValue !== null) {
            const resultTerm = this._valueToTerm(solvedValue);
            return this._createResult(resultTerm, true, null, { 
                solvedVariable: args[variableIndex].name,
                solvedValue: solvedValue
            });
        } else {
            return this._createResult(SYSTEM_ATOMS.Null, false, message || 'Could not solve equation');
        }
    }

    /**
     * Check if a term is a variable (starts with ?)
     */
    _isVariable(term) {
        return term && term.name && typeof term.name === 'string' && term.name.startsWith('?');
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
}