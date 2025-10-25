import {Term} from '../term/Term.js';
import {TermFactory} from '../term/TermFactory.js';
import {ConcreteFunctor, FunctorRegistry} from './Functor.js';
import {isNull, isTrue, isFalse, SYSTEM_ATOMS} from './SystemAtoms.js';
import {VectorOperations} from './VectorOperations.js';
import {EqualitySolver} from './EqualitySolver.js';
import {VariableBindingUtils} from './VariableBindingUtils.js';

/**
 * Unified EvaluationEngine for SeNARS v10 - Phase 5
 * Consolidates OperationEvaluationEngine, UnifiedOperatorEvaluator, and BooleanReductionEngine
 */
export class EvaluationEngine {
    constructor(functorRegistry = null, termFactory = null) {
        this.functorRegistry = functorRegistry || new FunctorRegistry();
        this.termFactory = termFactory || new TermFactory();
        this.equalitySolver = new EqualitySolver(this.termFactory);
        
        // Rules for functional evaluation (when all arguments are boolean values)
        this.functionalRules = {
            '&': this._reduceAndFunctional.bind(this),
            '|': this._reduceOrFunctional.bind(this),
            '--': this._reduceNegationFunctional.bind(this),
            '==>': this._reduceImplicationFunctional.bind(this),
            '<=>': this._reduceEquivalenceFunctional.bind(this)
        };
        
        // Rules for structural reduction (traditional NAL logic)
        this.structuralRules = {
            '&': this._reduceAndStructural.bind(this),
            '|': this._reduceOrStructural.bind(this),
            '--': this._reduceNegationStructural.bind(this),
            '==>': this._reduceImplicationStructural.bind(this),
            '<=>': this._reduceEquivalenceStructural.bind(this)
        };
        
        this._initializeDefaultFunctors();
    }

    _initializeDefaultFunctors() {
        ['True', 'False', 'Null'].forEach(name => {
            this.functorRegistry.register(name, () => SYSTEM_ATOMS[name], {arity: 0});
        });

        this._initializeArithmeticFunctors();
    }

    _initializeArithmeticFunctors() {
        const ops = [['add', 2, true], ['subtract', 2, false], ['multiply', 2, true], ['divide', 2, false]];
        ops.forEach(([name, arity, isCommutative]) => {
            this.addFunctor(name, VectorOperations[name], {arity, isCommutative});
        });
        this.addFunctor('cmp', VectorOperations.compare, {arity: 2});
    }

    /**
     * Unified evaluation method that combines all evaluation capabilities
     */
    async evaluate(term, context, variableBindings = new Map()) {
        if (!term.isCompound) {
            return this._evaluateNonOperation(term, context, variableBindings);
        }

        switch (term.operator) {
            case '&':
            case '|':
            case '==>':
            case '<=>':
                return this._evaluateUnifiedOperator(term, context, variableBindings);
            case '^':
                return term.components.length !== 2 
                    ? this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid operation format')
                    : await this._evaluateOperation(term, variableBindings);
            case '=':
                return await this._evaluateEquality(term, context, variableBindings);
            case '--':
                return this.reduce(term);
            default:
                return this._evaluateNonOperation(term, context, variableBindings);
        }
    }

    /**
     * Evaluate unified operators that can serve both structural and functional purposes
     * This method combines logic from both OperationEvaluationEngine and UnifiedOperatorEvaluator
     */
    async _evaluateUnifiedOperator(term, context, variableBindings) {
        // Check if all arguments are Boolean atoms (True, False, Null) for functional evaluation
        const isFunctionalEvaluation = this._areAllBooleanValues(term.components, variableBindings);
        
        if (isFunctionalEvaluation) {
            // Perform functional evaluation
            const evaluatorMap = {
                '&': this._evaluateAndFunction.bind(this),
                '|': this._evaluateOrFunction.bind(this),
                '==>': this._evaluateImplicationFunction.bind(this),
                '<=>': this._evaluateEquivalenceFunction.bind(this)
            };
            
            return evaluatorMap[term.operator]?.(term, variableBindings) || 
                   this._evaluateNonOperation(term, context, variableBindings);
        } else {
            // Create structural compound (the traditional NAL behavior)
            // Also perform structural reduction
            return this._createResult(this.reduce(term), true, 'Structural compound with boolean reduction');
        }
    }

    /**
     * Check if all components are Boolean atoms (True, False, Null) 
     * This method combines logic from both OperationEvaluationEngine and UnifiedOperatorEvaluator
     */
    _areAllBooleanValues(components, variableBindings) {
        return components.every(comp => {
            const boundComp = this._substituteVariables(comp, variableBindings);
            return boundComp.isBoolean || isTrue(boundComp) || isFalse(boundComp) || isNull(boundComp);
        });
    }

    _evaluateAndFunction(term, variableBindings) {
        const values = term.components.map(comp => 
            this._valueFromSubstitutedTerm(comp, variableBindings)
        );

        // Boolean AND evaluation: if any component is False, return False; if all are True, return True; otherwise return null
        return this._createBooleanResult(
            values.some(val => val === false) ? SYSTEM_ATOMS.False :
            values.every(val => val === true) ? SYSTEM_ATOMS.True :
            SYSTEM_ATOMS.Null,
            values.some(val => val === false) 
                ? 'Boolean AND evaluation: contains False' 
                : values.every(val => val === true) 
                    ? 'Boolean AND evaluation: all True' 
                    : 'Boolean AND evaluation: cannot determine'
        );
    }

    _evaluateOrFunction(term, variableBindings) {
        const values = term.components.map(comp => 
            this._valueFromSubstitutedTerm(comp, variableBindings)
        );

        // Boolean OR evaluation: if any component is True, return True; if all are False, return False
        return this._createBooleanResult(
            values.some(val => val === true) ? SYSTEM_ATOMS.True :
            values.every(val => val === false) ? SYSTEM_ATOMS.False :
            SYSTEM_ATOMS.Null,
            values.some(val => val === true) 
                ? 'Boolean OR evaluation: contains True' 
                : values.every(val => val === false) 
                    ? 'Boolean OR evaluation: all False' 
                    : 'Boolean OR evaluation: cannot determine'
        );
    }

    _evaluateImplicationFunction(term, variableBindings) {
        if (term.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Implication requires exactly 2 arguments');
        }

        const [antVal, consVal] = term.components.map(comp => 
            this._valueFromSubstitutedTerm(comp, variableBindings)
        );

        // Boolean implication: not A OR B
        return this._createBooleanResult(
            (antVal === true && consVal === false) ? SYSTEM_ATOMS.False :
            (antVal === false || consVal === true) ? SYSTEM_ATOMS.True :
            SYSTEM_ATOMS.Null,
            (antVal === true && consVal === false) 
                ? 'Boolean implication: true => false = false' 
                : (antVal === false || consVal === true) 
                    ? 'Boolean implication: false => X or X => true = true' 
                    : 'Boolean implication: cannot determine with non-boolean values'
        );
    }

    _evaluateEquivalenceFunction(term, variableBindings) {
        if (term.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Equivalence requires exactly 2 arguments');
        }

        const [leftVal, rightVal] = term.components.map(comp => 
            this._valueFromSubstitutedTerm(comp, variableBindings)
        );

        // Boolean equivalence: A iff B
        return this._createBooleanResult(
            leftVal === rightVal ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False,
            leftVal === rightVal 
                ? 'Boolean equivalence: values are equal' 
                : 'Boolean equivalence: values are different'
        );
    }

    /**
     * Enhanced equality evaluation that supports bidirectional evaluation
     */
    async _evaluateEquality(term, context, variableBindings) {
        if (term.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Equality requires exactly 2 arguments');
        }

        const [left, right] = term.components;
        
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
        const bindings = VariableBindingUtils.matchAndBindVariables(leftBound, rightBound, variableBindings);
        if (bindings) {
            // If successful matching occurred, return True
            return this._createResult(SYSTEM_ATOMS.True, true, 'Equality: structures match', {bindings});
        }

        // If no match found, return False
        return this._createResult(SYSTEM_ATOMS.False, false, 'Equality: structures do not match');
    }

    /**
     * Main reduction method that handles both boolean evaluation and structural composition
     */
    reduce(term) {
        if (!term || !term.isCompound) return term;

        // Identify if this is a functional evaluation (all arguments are boolean values)
        if (this._isFunctionalEvaluation(term)) {
            return this._applyFunctionalRule(term.operator, term.components);
        } else {
            // Perform structural composition reduction (traditional NAL logic)
            return this._applyStructuralRule(term.operator, term.components);
        }
    }

    /**
     * Determines if this term should undergo functional evaluation (boolean logic)
     */
    _isFunctionalEvaluation(term) {
        if (!term.isCompound) return false;
        // For operators &, |, ==>, <=>, check if ALL components are boolean values
        if (['&', '|', '==>', '<=>'].includes(term.operator)) {
            return term.components && term.components.every(comp => this._isBooleanValue(comp));
        }
        // For negation, check if operand is boolean
        if (term.operator === '--') {
            return term.components && term.components.length > 0 && this._isBooleanValue(term.components[0]);
        }
        return false;
    }

    // Helper method to determine if term is a boolean value using constant properties
    _isBooleanValue(term) {
        // Check if the term is a system atom (True, False, Null) or has boolean semantic type
        return isTrue(term) || isFalse(term) || isNull(term) || term.isBoolean;
    }

    _applyFunctionalRule(operator, components) {
        return this._applyReductionRule(operator, components, this.functionalRules, 
            (op, err) => {
                console.error(`Error during functional reduction for operator ${op}:`, err.message);
                console.error('Stack:', err.stack);
                return SYSTEM_ATOMS.Null;
            });
    }

    _applyStructuralRule(operator, components) {
        return this._applyReductionRule(operator, components, this.structuralRules,
            (op, err) => {
                console.error(`Error during structural reduction for operator ${op}:`, err.message);
                console.error('Stack:', err.stack);
                // For structural operations, return the original form on error with proper canonical name
                const safeOperator = operator || 'UNKNOWN';
                const safeComponents = components || [];
                const componentNames = safeComponents.map(comp => comp.name || comp.toString());
                return new Term('compound', `(${safeOperator}, ${componentNames.join(', ')})`, safeComponents, safeOperator);
            });
    }
    
    _applyReductionRule(operator, components, rulesMap, errorHandler) {
        // Validate inputs to prevent undefined operators in normal processing
        const safeOperator = operator || 'UNKNOWN';
        const safeComponents = components || [];
        const componentNames = safeComponents.map(comp => comp.name || comp.toString());
        const termName = `(${safeOperator}, ${componentNames.join(', ')})`;
        
        if (!operator) {
            // This should not happen during normal operation - indicates a data flow issue
            return new Term('compound', termName, safeComponents, safeOperator);
        }
        
        const rule = rulesMap[operator];
        if (rule) {
            try {
                return rule(safeComponents);
            } catch (error) {
                // Report genuine errors that indicate bugs in rule implementations
                return errorHandler(operator, error);
            }
        }
        // If no rule, return original components as a compound term with proper canonical name
        // This is NORMAL operation, not an error
        return new Term('compound', termName, safeComponents, safeOperator);
    }

    // Functional evaluation rules
    _reduceAndFunctional(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.True;

        return this._naryBooleanOperation(components, 
            comp => isFalse(comp), SYSTEM_ATOMS.False,  // If any is False, return False
            comp => isNull(comp), SYSTEM_ATOMS.Null,   // If any is Null, return Null
            comp => isTrue(comp), SYSTEM_ATOMS.True,   // If all are True, return True
            () => new Term('compound', 'AND', components, '&'));  // Otherwise return compound
    }

    _reduceOrFunctional(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.False;

        return this._naryBooleanOperation(components, 
            comp => isTrue(comp), SYSTEM_ATOMS.True,   // If any is True, return True
            comp => isNull(comp), SYSTEM_ATOMS.Null,   // If any is Null, return Null
            comp => isFalse(comp), SYSTEM_ATOMS.False, // If all are False, return False
            () => new Term('compound', 'OR', components, '|'));   // Otherwise return compound
    }

    _reduceNegationFunctional(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.Null;

        const operand = components[0];
        return this._unaryBooleanOperation(operand, 
            val => isTrue(val) ? SYSTEM_ATOMS.False :
                   isFalse(val) ? SYSTEM_ATOMS.True :
                   isNull(val) ? SYSTEM_ATOMS.Null :
                   SYSTEM_ATOMS.Null);
    }

    _reduceImplicationFunctional(components) {
        if (!components || components.length !== 2) return SYSTEM_ATOMS.Null;

        const [antecedent, consequent] = components;
        // Boolean implication: ~A v B (not A OR B)
        if (isNull(antecedent) || isNull(consequent)) return SYSTEM_ATOMS.Null;
        
        return (isFalse(antecedent) || isTrue(consequent)) ? SYSTEM_ATOMS.True
            : (isTrue(antecedent) && isFalse(consequent)) ? SYSTEM_ATOMS.False
            : SYSTEM_ATOMS.Null;
    }

    _reduceEquivalenceFunctional(components) {
        if (!components || components.length !== 2) return SYSTEM_ATOMS.Null;

        const [left, right] = components;
        if (isNull(left) || isNull(right)) return SYSTEM_ATOMS.Null;
        
        return ((isTrue(left) && isTrue(right)) || (isFalse(left) && isFalse(right))) ? SYSTEM_ATOMS.True
            : ((isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right))) ? SYSTEM_ATOMS.False
            : SYSTEM_ATOMS.Null;
    }

    // Structural reduction rules (NAL logic)
    _reduceAndStructural(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.True;

        return this._naryStructuralOperation(
            components,
            comp => !isTrue(comp),  // filter condition - keep non-True for AND
            comp => isFalse(comp), SYSTEM_ATOMS.False,  // if any is False, return False
            comp => isNull(comp), SYSTEM_ATOMS.Null,    // if any is Null, return Null
            SYSTEM_ATOMS.True, '&', 'AND'               // all True case, operator, type
        );
    }

    _reduceOrStructural(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.False;

        return this._naryStructuralOperation(
            components,
            comp => !isFalse(comp),  // filter condition - keep non-False for OR
            comp => isTrue(comp), SYSTEM_ATOMS.True,   // if any is True, return True
            comp => isNull(comp), SYSTEM_ATOMS.Null,   // if any is Null, return Null
            SYSTEM_ATOMS.False, '|', 'OR'              // all False case, operator, type
        );
    }

    _reduceNegationStructural(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.Null;

        const operand = components[0];
        
        // Handle boolean values in negation
        return isTrue(operand) ? SYSTEM_ATOMS.False
            : isFalse(operand) ? SYSTEM_ATOMS.True
            : isNull(operand) ? SYSTEM_ATOMS.Null
            // Check for double negation elimination in structural context
            : (operand.isCompound && operand.operator === '--' && operand.components && operand.components.length > 0) 
                ? operand.components[0]
                // For non-boolean terms, return the negation structure
                : new Term('compound', 'NEGATION', [operand], '--');
    }

    _reduceImplicationStructural(components) {
        if (!components || components.length !== 2) {
            // If not proper implication, return a compound term with proper canonical name
            return components && components.length > 0
                ? new Term('compound', `(==>, ${components.map(comp => comp.name || comp.toString()).join(', ')})`, components, '==>')
                : SYSTEM_ATOMS.Null;
        }

        const [antecedent, consequent] = components;
        
        // Check for boolean values in implication (NAL logic)
        const isAntFalse = isFalse(antecedent);
        const isConsTrue = isTrue(consequent);
        const isAntTrue = isTrue(antecedent);
        const isConsFalse = isFalse(consequent);
        const isAntOrConsNull = isNull(antecedent) || isNull(consequent);
        
        return isAntFalse || isConsTrue ? SYSTEM_ATOMS.True      // False -> X is True, X -> True is True
            : (isAntTrue && isConsFalse) ? SYSTEM_ATOMS.False    // True -> False is False
            : isAntOrConsNull ? SYSTEM_ATOMS.Null                // Null in either position gives Null
            // For NAL concepts, return the implication structure with proper canonical name
            : new Term('compound', `(==>, ${antecedent.name}, ${consequent.name})`, [antecedent, consequent], '==>');
    }

    _reduceEquivalenceStructural(components) {
        if (!components || components.length !== 2) {
            // If not proper equivalence, return first component or compound term
            return components && components.length > 0 
                ? (components.length === 1 ? components[0] : new Term('compound', 'EQUIVALENCE', components, '<=>')) 
                : SYSTEM_ATOMS.Null;
        }

        const [left, right] = components;
        
        // Check for boolean values in equivalence (NAL logic)
        const bothTrue = isTrue(left) && isTrue(right);
        const bothFalse = isFalse(left) && isFalse(right);
        const trueFalse = (isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right));
        const isLeftOrRightNull = isNull(left) || isNull(right);
        
        return bothTrue || bothFalse ? SYSTEM_ATOMS.True         // Both True or both False
            : trueFalse ? SYSTEM_ATOMS.False                      // One True, one False
            : isLeftOrRightNull ? SYSTEM_ATOMS.Null              // Null in either position gives Null
            // For NAL concepts, return the equivalence structure
            : new Term('compound', 'EQUIVALENCE', [left, right], '<=>');
    }

    /**
     * Cascading reduction that processes entire term trees
     */
    cascadeReduce(term) {
        if (!term) return SYSTEM_ATOMS.Null;

        // First, recursively reduce all components
        if (term.isCompound && term.components) {
            const reducedComponents = term.components.map(comp => this.cascadeReduce(comp));
            // Create a new term with the reduced components
            const processedTerm = reducedComponents.some((comp, idx) => comp !== term.components[idx])
                ? new Term(term.type, term.name, reducedComponents, term.operator)
                : term;
            
            // Then apply the reduction to the processed term
            return this.reduce(processedTerm);
        }
        
        // For atomic terms, just return after possible processing
        return this.reduce(term);
    }

    async _evaluateOperation(term, variableBindings) {
        const [functionTerm, argsTerm] = term.components;

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
        const bindings = VariableBindingUtils.matchAndBindVariables(leftSide, rightSide, variableBindings);
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
        const bindings = VariableBindingUtils.matchAndBindVariables(leftSide, rightSide, variableBindings);
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

        // Define solver lookup table for arithmetic operations
        const solvers = {
            'add': () => this._solveAddEquation(otherValue, targetValue),
            'subtract': () => this._solveSubtractEquation(variableIndex, argValues, targetValue),
            'multiply': () => this._solveMultiplyEquation(otherValue, targetValue),
            'divide': () => this._solveDivideEquation(variableIndex, argValues, targetValue)
        };

        // Get the appropriate solver function
        const solver = solvers[functionName];
        if (!solver) {
            return this._createResult(SYSTEM_ATOMS.Null, false, `Back-solving not implemented for functor: ${functionName}`);
        }

        // Execute the solver
        const {solvedValue, success, message} = solver();

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

    _createBooleanResult(result, message) {
        return this._createResult(result, true, message); // Evaluation itself is successful regardless of result
    }
    
    _valueFromSubstitutedTerm(term, variableBindings) {
        return this._termToValue(this._substituteVariables(term, variableBindings));
    }
    
    _binaryBooleanOperation(left, right, operationFn) {
        // Check if both are null first
        if (isNull(left) || isNull(right)) return SYSTEM_ATOMS.Null;
        
        // Apply the operation function
        return operationFn(left, right);
    }
    
    /**
     * Public method to match and bind variables in compound structures
     * Exposes the shared variable binding functionality
     */
    matchAndBindVariables(leftTerm, rightTerm, variableBindings = new Map()) {
        return VariableBindingUtils.matchAndBindVariables(leftTerm, rightTerm, variableBindings);
    }
    
    // Backward compatibility for tests that access the private method directly
    _matchAndBindVariables(leftTerm, rightTerm, variableBindings) {
        return VariableBindingUtils.matchAndBindVariables(leftTerm, rightTerm, variableBindings);
    }
    
    _unaryBooleanOperation(operand, operationFn) {
        return operationFn(operand);
    }
    
    _naryBooleanOperation(components, someCheck1, result1, someCheck2, result2, everyCheck, result3, defaultFn) {
        if (components.some(comp => someCheck1(comp))) return result1;
        if (components.some(comp => someCheck2(comp))) return result2;
        if (components.every(comp => everyCheck(comp))) return result3;
        return defaultFn();
    }
    
    _naryStructuralOperation(components, filterCond, check1, result1, check2, result2, allCaseResult, operator, termType) {
        // Filter components based on condition
        const filteredComponents = components.filter(comp => filterCond(comp));
        
        // Check for first condition (False for AND, True for OR)
        if (components.some(comp => check1(comp))) return result1;
        // Check for Null condition
        if (components.some(comp => check2(comp))) return result2;
        
        // If all components were filtered out (e.g., all were True for AND)
        if (filteredComponents.length === 0) return allCaseResult;
        // If only one component remains after filtering
        if (filteredComponents.length === 1) return filteredComponents[0];
        // Otherwise return compound term
        return new Term('compound', termType, filteredComponents, operator);
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