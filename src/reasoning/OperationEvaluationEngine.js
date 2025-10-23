import {Term} from '../term/Term.js';
import {TermFactory} from '../term/TermFactory.js';
import {ConcreteFunctor, FunctorRegistry} from './Functor.js';
import {isNull, isTrue, isFalse, SYSTEM_ATOMS} from './SystemAtoms.js';
import {VectorOperations} from './VectorOperations.js';
import {EqualitySolver} from './EqualitySolver.js';
import {TermType} from './TermType.js';

export class OperationEvaluationEngine {
    constructor(functorRegistry = null, termFactory = null) {
        this.functorRegistry = functorRegistry || new FunctorRegistry();
        this.termFactory = termFactory || new TermFactory();
        this.equalitySolver = new EqualitySolver(this.termFactory);
        this._initializeDefaultFunctors();
    }

    _initializeDefaultFunctors() {
        ['True', 'False', 'Null'].forEach(name => {
            this.functorRegistry.register(name, () => SYSTEM_ATOMS[name], {arity: 0});
        });

        this._initializeArithmeticFunctors();
    }

    _initializeArithmeticFunctors() {
        this.addFunctor('add', VectorOperations.add, {arity: 2, isCommutative: true});
        this.addFunctor('subtract', VectorOperations.subtract, {arity: 2, isCommutative: false});
        this.addFunctor('multiply', VectorOperations.multiply, {arity: 2, isCommutative: true});
        this.addFunctor('divide', VectorOperations.divide, {arity: 2, isCommutative: false});
        this.addFunctor('cmp', VectorOperations.compare, {arity: 2});
    }

    _vectorAwareAdd(a, b) {
        // Check if either argument is a vector (array)
        // For non-numbers, return appropriate comparison or null
        return null;
    }

    async evaluate(operationTerm, context, variableBindings = new Map()) {
        if (!operationTerm.isCompound) {
            return this._evaluateNonOperation(operationTerm, context, variableBindings);
        }

        // Handle unified operators that can be both structural and functional based on argument types
        if (['&', '|', '==>', '<=>'].includes(operationTerm.operator)) {
            return this._evaluateUnifiedOperator(operationTerm, context, variableBindings);
        }

        // Handle operation operator (^) normally
        if (operationTerm.operator === '^') {
            if (operationTerm.components.length !== 2) {
                return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid operation format');
            }
            return this._evaluateOperation(operationTerm, variableBindings);
        }

        // Handle equality operator (=)
        if (operationTerm.operator === '=') {
            return this._evaluateEquality(operationTerm, context, variableBindings);
        }

        return this._evaluateNonOperation(operationTerm, context, variableBindings);
    }

    // Evaluate unified operators that can serve both structural and functional purposes
    async _evaluateUnifiedOperator(operationTerm, context, variableBindings) {
        // Check if all arguments are Boolean atoms (True, False, Null) for functional evaluation
        const isFunctionalEvaluation = this._areAllBooleanValues(operationTerm.components, variableBindings);
        
        if (isFunctionalEvaluation) {
            // Perform functional evaluation
            switch (operationTerm.operator) {
                case '&':
                    return this._evaluateAndFunction(operationTerm, variableBindings);
                case '|':
                    return this._evaluateOrFunction(operationTerm, variableBindings);
                case '==>':
                    return this._evaluateImplicationFunction(operationTerm, variableBindings);
                case '<=>':
                    return this._evaluateEquivalenceFunction(operationTerm, variableBindings);
                default:
                    return this._evaluateNonOperation(operationTerm, context, variableBindings);
            }
        } else {
            // Create structural compound (the traditional NAL behavior)
            return this._evaluateNonOperation(operationTerm, context, variableBindings);
        }
    }

    // Check if all components are Boolean atoms (True, False, Null) 
    _areAllBooleanValues(components, variableBindings) {
        for (const comp of components) {
            const boundComp = this._substituteVariables(comp, variableBindings);
            if (!TermType.isBooleanValue(boundComp)) {
                // It's not a boolean value, so we can't do functional evaluation
                return false;
            }
        }
        return true;
    }

    _evaluateAndFunction(operationTerm, variableBindings) {
        const components = operationTerm.components.map(comp => this._substituteVariables(comp, variableBindings));
        const values = components.map(comp => this._termToValue(comp));

        // Boolean AND evaluation: if any component is False, return False; if all are True, return True; otherwise return original term
        if (values.some(val => val === false)) {
            return this._createResult(SYSTEM_ATOMS.False, true, 'Boolean AND evaluation: contains False');
        }

        if (values.every(val => val === true)) {
            return this._createResult(SYSTEM_ATOMS.True, true, 'Boolean AND evaluation: all True');
        }

        // If we have mixed values or non-boolean values, return null
        return this._createResult(SYSTEM_ATOMS.Null, false, 'Boolean AND evaluation: cannot determine');
    }

    _evaluateOrFunction(operationTerm, variableBindings) {
        const components = operationTerm.components.map(comp => this._substituteVariables(comp, variableBindings));
        const values = components.map(comp => this._termToValue(comp));

        // Boolean OR evaluation: if any component is True, return True; if all are False, return False
        if (values.some(val => val === true)) {
            return this._createResult(SYSTEM_ATOMS.True, true, 'Boolean OR evaluation: contains True');
        }

        if (values.every(val => val === false)) {
            return this._createResult(SYSTEM_ATOMS.False, true, 'Boolean OR evaluation: all False');
        }

        // If we have mixed values or non-boolean values, return null
        return this._createResult(SYSTEM_ATOMS.Null, false, 'Boolean OR evaluation: cannot determine');
    }

    _evaluateImplicationFunction(operationTerm, variableBindings) {
        if (operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Implication requires exactly 2 arguments');
        }

        const [antecedent, consequent] = operationTerm.components.map(comp => this._substituteVariables(comp, variableBindings));
        const antVal = this._termToValue(antecedent);
        const consVal = this._termToValue(consequent);

        // Boolean implication: not A OR B
        if (antVal === true && consVal === false) {
            return this._createResult(SYSTEM_ATOMS.False, true, 'Boolean implication: true => false = false');
        }

        if (antVal === false || consVal === true) {
            return this._createResult(SYSTEM_ATOMS.True, true, 'Boolean implication: false => X or X => true = true');
        }

        // If we have non-boolean values, return null
        return this._createResult(SYSTEM_ATOMS.Null, false, 'Boolean implication: cannot determine with non-boolean values');
    }

    _evaluateEquivalenceFunction(operationTerm, variableBindings) {
        if (operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Equivalence requires exactly 2 arguments');
        }

        const [left, right] = operationTerm.components.map(comp => this._substituteVariables(comp, variableBindings));
        const leftVal = this._termToValue(left);
        const rightVal = this._termToValue(right);

        // Boolean equivalence: A iff B
        if (leftVal === rightVal) {
            return this._createResult(SYSTEM_ATOMS.True, true, 'Boolean equivalence: values are equal');
        }

        return this._createResult(SYSTEM_ATOMS.False, true, 'Boolean equivalence: values are different');
    }

    // Enhanced equality evaluation that supports bidirectional evaluation
    async _evaluateEquality(operationTerm, context, variableBindings) {
        if (operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Equality requires exactly 2 arguments');
        }

        const [left, right] = operationTerm.components;
        
        // Check for variable bindings in both directions
        const leftBound = this._substituteVariables(left, variableBindings);
        const rightBound = this._substituteVariables(right, variableBindings);

        // If both are atomic values, compare them directly
        if (leftBound.isAtomic && rightBound.isAtomic) {
            const leftVal = this._termToValue(leftBound);
            const rightVal = this._termToValue(rightBound);
            
            // For simple values, return True/False
            if (leftVal === rightVal) {
                return this._createResult(SYSTEM_ATOMS.True, true, 'Equality: atomic values match');
            } else {
                return this._createResult(SYSTEM_ATOMS.False, true, 'Equality: atomic values do not match');
            }
        }

        // For compound structures, do more complex matching
        const bindings = this._matchAndBindVariables(leftBound, rightBound, variableBindings);
        if (bindings) {
            // If successful matching occurred, return True
            return this._createResult(SYSTEM_ATOMS.True, true, 'Equality: structures match', {bindings});
        }

        // If no match found, return False
        return this._createResult(SYSTEM_ATOMS.False, false, 'Equality: structures do not match');
    }

    async _evaluateOperation(operationTerm, variableBindings) {
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
            // Convert arguments to values, but ensure all compound terms are evaluated first
            const argValues = [];
            for (const arg of args) {
                let processedArg = arg;

                // If argument is a compound operation term, try to evaluate it first
                if (processedArg.isCompound && processedArg.operator === '^') {
                    const evalResult = await this.evaluate(processedArg, null, variableBindings);
                    if (!evalResult.success || isNull(evalResult.result)) {
                        return this._createResult(SYSTEM_ATOMS.Null, false, `Failed to evaluate nested operation in argument: ${processedArg.toString()}`);
                    }
                    processedArg = evalResult.result;
                }

                argValues.push(this._termToValue(processedArg));
            }

            const result = functor.call(...argValues);
            const resultTerm = this._valueToTerm(result, this.termFactory);

            if (isNull(resultTerm)) {
                return this._createResult(resultTerm, false, 'Operation resulted in Null (poison pill)');
            }

            return this._createResult(resultTerm, true, null, {functorName: functionName});
        } catch (error) {
            // Log the error but only in non-test environments to avoid polluting test output
            if (typeof process === 'undefined' || !process.env.JEST_WORKER_ID) {
                console.error(`Error evaluating operation: ${error.message}`);
            }
            return this._createResult(SYSTEM_ATOMS.Null, false, error.message);
        }
    }

    _resolveFunctionName(functionTerm, variableBindings) {
        const boundTerm = variableBindings.get(functionTerm.name);
        return functionTerm.name?.startsWith('?')
            ? boundTerm?.name || null
            : functionTerm.name || functionTerm.toString();
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
        const message = substitutedTerm.isCompound
            ? 'Non-operation compound term, no evaluation performed'
            : undefined;
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

        const {name} = term;
        if (name === 'True') return true;
        if (name === 'False') return false;
        if (name === 'Null') return null;

        if (term.isAtomic) {
            const numValue = Number(name);
            return isNaN(numValue) ? name : numValue;
        }

        // Handle Product terms as numeric vectors: (*,1,2) and shorthand (1,2)
        if (term.operator === ',') {
            const vectorValues = [];
            for (const comp of term.components) {
                const compValue = this._termToValue(comp);
                if (typeof compValue !== 'number') {
                    // If any component is not a number, return as term
                    return term;
                }
                vectorValues.push(compValue);
            }
            // Return as an array (vector)
            return vectorValues;
        }

        return term;
    }

    _valueToTerm(value, termFactory = null) {
        if (value === null) return SYSTEM_ATOMS.Null;
        if (typeof value === 'boolean') return value ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False;

        if (typeof value === 'number') {
            if (isNaN(value)) return SYSTEM_ATOMS.Null;
            return this._createTermWithErrorHandling('atom', value.toString());
        }

        // Handle arrays (vectors) by creating Product terms: [1,2] becomes (1,2)
        if (Array.isArray(value)) {
            // Use the TermFactory to create a compound term with comma operator
            const factory = termFactory || new TermFactory();
            const components = value.map(v => this._valueToTerm(v, factory));
            return factory.create({operator: ',', components});
        }

        if (typeof value === 'string' && ['True', 'False', 'Null'].includes(value)) {
            return SYSTEM_ATOMS[value];
        }

        if (value instanceof Term) return value;
        return this._createTermWithErrorHandling('atom', String(value));
    }

    _createTermWithErrorHandling(type, name) {
        try {
            // Use the TermFactory to create the term properly
            return this.termFactory.create({name, components: [name]});
        } catch (error) {
            console.error(`Error creating term: ${error.message}`);
            return SYSTEM_ATOMS.Null;
        }
    }

    async solveEquation(leftTerm, rightTerm, variableName, context, variableBindings = new Map()) {
        // Handle equality operator (=) for back-solving
        if (leftTerm.isCompound && leftTerm.operator === '=') {
            // For equality, we pass the equality term as left, and null as right (since right is already part of the equality)
            return this._solveEqualityEquation(leftTerm, rightTerm, variableName, variableBindings);
        }

        // Handle operation operator (^) for back-solving
        if (leftTerm.isCompound && leftTerm.operator === '^') {
            return this._solveOperationEquation(leftTerm, rightTerm, variableName, variableBindings);
        }

        if (leftTerm.name?.startsWith('?') && leftTerm.name === variableName) {
            return this._createResult(rightTerm, true, 'Direct variable assignment', {solvedVariable: variableName});
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'No back-solving pattern matched');
    }

    // Enhanced method to solve equality equations and return all variable bindings
    async solveEquality(equalityTerm, variableBindings = new Map()) {
        if (!equalityTerm.isCompound || equalityTerm.operator !== '=' || equalityTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid equality format');
        }

        const [leftSide, rightSide] = equalityTerm.components;
        
        // Get all variable bindings from matching the two sides
        const bindings = this._matchAndBindVariables(leftSide, rightSide, variableBindings);
        if (bindings) {
            return this._createResult(null, true, 'Equality solved', {bindings});
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'Could not solve equality');
    }

    _solveEqualityEquation(equalityTerm, targetTerm, variableName, variableBindings) {
        if (!equalityTerm.isCompound || equalityTerm.operator !== '=' || equalityTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid equality format for equation solving');
        }

        const [leftSide, rightSide] = equalityTerm.components;
        
        // Check for direct variable assignment in left side
        if (leftSide.name?.startsWith('?') && leftSide.name === variableName) {
            // If left side is the variable being solved for, return the right side
            return this._createResult(rightSide, true, 'Variable found on left side of equality', {solvedVariable: variableName});
        }

        // Check for direct variable assignment in right side
        if (rightSide.name?.startsWith('?') && rightSide.name === variableName) {
            // If right side is the variable being solved for, return the left side
            return this._createResult(leftSide, true, 'Variable found on right side of equality', {solvedVariable: variableName});
        }

        // Perform bidirectional matching and variable binding
        const bindings = this._matchAndBindVariables(leftSide, rightSide, variableBindings);
        if (bindings && bindings.has(variableName)) {
            const boundValue = bindings.get(variableName);
            return this._createResult(boundValue, true, 'Variable found through bidirectional matching', {solvedVariable: variableName});
        }

        // Check if variable is within a compound term on either side and solve recursively
        if (this._containsVariable(leftSide, variableName)) {
            // If left side is an operation with the variable, move right side to the other side of equation
            if (leftSide.operator === '^') {
                return this._solveOperationEquation(leftSide, rightSide, variableName, variableBindings);
            }
        }

        if (this._containsVariable(rightSide, variableName)) {
            // If right side is an operation with the variable, move left side to the other side of equation
            if (rightSide.operator === '^') {
                return this._solveOperationEquation(rightSide, leftSide, variableName, variableBindings);
            }
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'Target variable not found in equality expression');
    }

    // Enhanced method to match and bind variables in compound structures
    _matchAndBindVariables(leftTerm, rightTerm, variableBindings) {
        // This handles cases like (?x, ?y) = (3, 4) → bindings ?x=3, ?y=4
        // or (f(?x), g(?y)) = (f(3), g(5)) → ?x=3, ?y=5
        // or (a, ?x, c) = (a, b, c) → ?x=b
        
        const newBindings = new Map(variableBindings);

        // If both terms are compound with same operator
        if (leftTerm.isCompound && rightTerm.isCompound && leftTerm.operator === rightTerm.operator) {
            if (leftTerm.components.length !== rightTerm.components.length) {
                // Cannot match terms with different numbers of components
                return null;
            }

            // Recursively match each component
            for (let i = 0; i < leftTerm.components.length; i++) {
                const leftComp = leftTerm.components[i];
                const rightComp = rightTerm.components[i];
                
                if (leftComp.name?.startsWith('?')) {
                    // Left component is a variable, bind it to the right component
                    newBindings.set(leftComp.name, rightComp);
                } else if (rightComp.name?.startsWith('?')) {
                    // Right component is a variable, bind it to the left component
                    newBindings.set(rightComp.name, leftComp);
                } else if (leftComp.isCompound && rightComp.isCompound) {
                    // Both components are compound, recursively match them
                    const subBindings = this._matchAndBindVariables(leftComp, rightComp, newBindings);
                    if (subBindings) {
                        // Merge the sub-bindings into our current bindings
                        for (const [varName, value] of subBindings) {
                            newBindings.set(varName, value);
                        }
                    } else {
                        // Sub-match failed, return null
                        return null;
                    }
                } else if (leftComp.name !== rightComp.name) {
                    // Atomic terms don't match, return null
                    return null;
                }
            }
            
            return newBindings;
        }
        
        // If one term is a variable and the other is not
        if (leftTerm.name?.startsWith('?') && !rightTerm.name?.startsWith('?')) {
            newBindings.set(leftTerm.name, rightTerm);
            return newBindings;
        }
        
        if (rightTerm.name?.startsWith('?') && !leftTerm.name?.startsWith('?')) {
            newBindings.set(rightTerm.name, leftTerm);
            return newBindings;
        }
        
        // If both are atomic and equal
        if (leftTerm.name === rightTerm.name) {
            return newBindings;
        }
        
        // No match found
        return null;
    }

    _containsVariable(term, variableName) {
        if (!term) return false;

        if (term.name?.startsWith('?') && term.name === variableName) {
            return true;
        }

        if (term.isCompound && term.components) {
            return term.components.some(comp => this._containsVariable(comp, variableName));
        }

        return false;
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

        // Check if target value is valid for equation solving
        if (targetValue === null || typeof targetValue !== 'number') {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target value must be a number for arithmetic equation solving');
        }

        // Check if the non-variable argument is a number
        const otherValue = argValues[1 - variableIndex];
        if (typeof otherValue !== 'number') {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Non-variable argument must be a number for arithmetic equation solving');
        }

        let solvedValue = null;
        let success = false;
        let message = null;

        switch (functionName) {
            case 'add':
                // If we have add(a, x) = target, then x = target - a
                // If we have add(x, b) = target, then x = target - b
                ({solvedValue, success, message} = this._solveAddEquation(otherValue, targetValue));
                break;

            case 'subtract':
                ({solvedValue, success, message} = this._solveSubtractEquation(variableIndex, argValues, targetValue));
                break;

            case 'multiply':
                ({solvedValue, success, message} = this._solveMultiplyEquation(otherValue, targetValue));
                break;

            case 'divide':
                ({solvedValue, success, message} = this._solveDivideEquation(variableIndex, argValues, targetValue));
                break;

            default:
                message = `Back-solving not implemented for functor: ${functionName}`;
        }

        if (success && solvedValue !== null) {
            const resultTerm = this._valueToTerm(solvedValue, this.termFactory);
            return this._createResult(resultTerm, true, null, {
                solvedVariable: args[variableIndex].name,
                solvedValue
            });
        } else {
            return this._createResult(SYSTEM_ATOMS.Null, false, message || 'Could not solve equation');
        }
    }

    _solveAddEquation(otherValue, targetValue) {
        if (typeof otherValue === 'number') {
            return {solvedValue: targetValue - otherValue, success: true, message: null};
        }
        return {solvedValue: null, success: false, message: 'Other argument is not a number, cannot solve'};
    }

    _solveSubtractEquation(variableIndex, argValues, targetValue) {
        const [firstValue, secondValue] = argValues;

        if (variableIndex === 0) {
            // If we have subtract(x, b) = target, then x = target + b
            return typeof secondValue === 'number'
                ? {solvedValue: targetValue + secondValue, success: true, message: null}
                : {solvedValue: null, success: false, message: 'Second argument is not a number, cannot solve'};
        } else {
            // If we have subtract(a, x) = target, then x = a - target
            return typeof firstValue === 'number'
                ? {solvedValue: firstValue - targetValue, success: true, message: null}
                : {solvedValue: null, success: false, message: 'First argument is not a number, cannot solve'};
        }
    }

    _solveMultiplyEquation(otherValue, targetValue) {
        if (typeof otherValue === 'number' && otherValue !== 0) {
            return {solvedValue: targetValue / otherValue, success: true, message: null};
        } else if (otherValue === 0) {
            return {solvedValue: null, success: false, message: 'Cannot divide by zero'};
        }
        return {solvedValue: null, success: false, message: 'Other argument is not a number, cannot solve'};
    }

    _solveDivideEquation(variableIndex, argValues, targetValue) {
        const [firstValue, secondValue] = argValues;

        if (variableIndex === 0) {
            // If we have divide(x, b) = target, then x = target * b
            return typeof secondValue === 'number'
                ? {solvedValue: targetValue * secondValue, success: true, message: null}
                : {solvedValue: null, success: false, message: 'Second argument is not a number, cannot solve'};
        } else {
            // If we have divide(a, x) = target, then x = a / target
            return targetValue !== 0
                ? (typeof firstValue === 'number'
                    ? {solvedValue: firstValue / targetValue, success: true, message: null}
                    : {solvedValue: null, success: false, message: 'First argument is not a number, cannot solve'})
                : {solvedValue: null, success: false, message: 'Cannot divide by target value of zero'};
        }
    }

    _createResult(result, success, message, additionalData = {}) {
        return {result, success, message, ...additionalData};
    }

    addFunctor(name, execute, config = {}) {
        const functor = new ConcreteFunctor(name, execute, config);
        // The third parameter to register is aliases
        return this.functorRegistry.register(name, functor, []);
    }

    getFunctorRegistry() {
        return this.functorRegistry;
    }
}
