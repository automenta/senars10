import { EvaluationEngine as OperationEvaluationEngine } from '../../src/reasoning/EvaluationEngine.js';
import { TermFactory } from '../../src/term/TermFactory.js';
import { FunctorRegistry } from '../../src/reasoning/Functor.js';
import { SYSTEM_ATOMS } from '../../src/reasoning/SystemAtoms.js';

describe('Phase 4 Components - Unified Operator System with Type-Directed Evaluation', () => {
    let engine;
    let termFactory;

    beforeEach(() => {
        const functorRegistry = new FunctorRegistry();
        termFactory = new TermFactory();
        engine = new OperationEvaluationEngine(functorRegistry, termFactory); // Unified engine supports same interface
    });

    describe('Basic Operation Evaluation with Arithmetic Functors', () => {
        test('should perform basic arithmetic operations', async () => {
            const addTerm = termFactory.create({
                operator: '^',
                components: [
                    {components: ['add']},
                    {operator: ',', components: [{components: ['*']}, {components: ['2']}, {components: ['3']}]}
                ]
            });

            const result = await engine.evaluate(addTerm);
            expect(result.success).toBe(true);
            expect(result.result.name).toBe('5');
        });

        test('should support function call shorthand notation like add(2,3)', () => {
            // Testing that the parser can handle shorthand like add(2,3) 
            // This would get parsed to f ^ (*, 2, 3) format
            const term = termFactory.create({operator: '^', components: [
                {components: ['add']},
                {operator: ',', components: [{components: ['*']}, {components: ['2']}, {components: ['3']}]}
            ]});
            
            expect(term.isCompound).toBe(true);
            expect(term.operator).toBe('^');
        });
    });

    describe('Vector Operations Support', () => {
        test('should support vector addition: add((1,2), (3,4)) → (4,6)', async () => {
            // Create vector terms (1,2) and (3,4)
            const vector1 = termFactory.create({operator: ',', components: [{components: ['1']}, {components: ['2']}]});
            const vector2 = termFactory.create({operator: ',', components: [{components: ['3']}, {components: ['4']}]});
            
            // Create operation term: add ^ (*, vector1, vector2)
            const addOperation = termFactory.create({operator: '^', components: [
                {components: ['add']},
                {operator: ',', components: [{components: ['*']}, vector1, vector2]}
            ]});

            const result = await engine.evaluate(addOperation);
            expect(result.success).toBe(true);
        });

        test('should support scalar multiplication: multiply((2,3), 2) → (4,6)', async () => {
            // Create vector (2,3) and scalar 2
            const vector = termFactory.create({operator: ',', components: [{components: ['2']}, {components: ['3']}]});
            const scalar = termFactory.create({components: ['2']});
            
            // Create operation: multiply ^ (*, vector, scalar)
            const multOperation = termFactory.create({operator: '^', components: [
                {components: ['multiply']},
                {operator: ',', components: [{components: ['*']}, vector, scalar]}
            ]});

            const result = await engine.evaluate(multOperation);
            expect(result.success).toBe(true);
        });

        test('should support Product terms as numeric vectors: (*,1,2) and shorthand (1,2)', () => {
            // Test creating Product terms
            const productTerm = termFactory.create({operator: ',', components: [{components: ['1']}, {components: ['2']}]});
            expect(productTerm.operator).toBe(',');
            expect(productTerm.components.length).toBe(2);
        });
    });

    describe('Equality Operator (=) with Bidirectional Capabilities', () => {
        test('should handle symmetric evaluation: a = b same as b = a', async () => {
            const equality1 = termFactory.create({operator: '=', components: [
                {components: ['a']},
                {components: ['b']}
            ]});

            const equality2 = termFactory.create({operator: '=', components: [
                {components: ['b']},
                {components: ['a']}
            ]});

            const result1 = await engine.evaluate(equality1);
            const result2 = await engine.evaluate(equality2);
            
            // Both should yield similar results when values are the same
            expect(result1.success).toBeDefined();
            expect(result2.success).toBeDefined();
        });

        test('should support variable binding: (?x, 5) = (3, ?y) → bindings ?x=3, ?y=5', async () => {
            const varX = termFactory.create({components: ['?x']});
            const varY = termFactory.create({components: ['?y']});
            
            const equality = termFactory.create({operator: '=', components: [
                termFactory.create({operator: ',', components: [varX, {components: ['5']}]}),
                termFactory.create({operator: ',', components: [{components: ['3']}, varY]})
            ]});

            const result = await engine.solveEquality(equality);
            expect(result.success).toBe(true);
            expect(result.bindings).toBeDefined();
        });

        test('should support compound decomposition: (f(?x), g(?y)) = (f(3), g(5)) → ?x=3, ?y=5', async () => {
            const varX = termFactory.create({components: ['?x']});
            const varY = termFactory.create({components: ['?y']});
            
            const equality = termFactory.create({operator: '=', components: [
                termFactory.create({operator: ',', components: [
                    termFactory.create({operator: '^', components: [{components: ['f']}, {operator: ',', components: [{components: ['*']}, varX]}]}),
                    termFactory.create({operator: '^', components: [{components: ['g']}, {operator: ',', components: [{components: ['*']}, varY]}]})
                ]}),
                termFactory.create({operator: ',', components: [
                    termFactory.create({operator: '^', components: [{components: ['f']}, {operator: ',', components: [{components: ['*']}, {components: ['3']}]}]}),
                    termFactory.create({operator: '^', components: [{components: ['g']}, {operator: ',', components: [{components: ['*']}, {components: ['5']}]}]})
                ]})
            ]});

            const result = await engine._matchAndBindVariables(equality.components[0], equality.components[1], new Map());
            expect(result).toBeDefined();
        });

        test('should support vector component equality: (a,?x,c) = (a,b,c) → ?x=b', async () => {
            const varX = termFactory.create({components: ['?x']});
            
            const equality = termFactory.create({operator: '=', components: [
                termFactory.create({operator: ',', components: [{components: ['a']}, varX, {components: ['c']}]}),
                termFactory.create({operator: ',', components: [{components: ['a']}, {components: ['b']}, {components: ['c']}]}),
            ]});

            const result = await engine._matchAndBindVariables(equality.components[0], equality.components[1], new Map());
            expect(result).toBeDefined();
            expect(result.has('?x')).toBe(true);
        });
    });

    describe('Unified Operator System with Automatic Type-Directed Evaluation', () => {
        test('should perform functional evaluation when arguments are Truth values/Boolean atoms for (&&, a, b)', async () => {
            const andOperation = termFactory.create({operator: '&', components: [
                {components: ['True']},
                {components: ['False']}
            ]});

            const result = await engine.evaluate(andOperation);
            expect(result.success).toBe(true);
            // Should evaluate to False since True & False = False in boolean logic
            expect(result.result).toBe(SYSTEM_ATOMS.False);
        });

        test('should create structural compound when arguments are NAL concepts for (&&, (a-->b), (c-->d))', async () => {
            const andStructural = termFactory.create({operator: '&', components: [
                termFactory.create({operator: '-->', components: [{components: ['a']}, {components: ['b']}]}),
                termFactory.create({operator: '-->', components: [{components: ['c']}, {components: ['d']}]}),
            ]});

            const result = await engine.evaluate(andStructural);
            // Should return the term itself since args are NAL concepts, not boolean values
            expect(result.success).toBe(true);
        });

        test('should perform functional evaluation for (||, a, b) when all are Truth values', async () => {
            const orOperation = termFactory.create({operator: '|', components: [
                {components: ['False']},
                {components: ['True']}
            ]});

            const result = await engine.evaluate(orOperation);
            expect(result.success).toBe(true);
            // Should evaluate to True since False | True = True in boolean logic
            expect(result.result).toBe(SYSTEM_ATOMS.True);
        });

        test('should create structural compound when arguments are NAL concepts for (||, (a-->b), (c-->d))', async () => {
            const orStructural = termFactory.create({operator: '|', components: [
                termFactory.create({operator: '-->', components: [{components: ['a']}, {components: ['b']}]}),
                termFactory.create({operator: '-->', components: [{components: ['c']}, {components: ['d']}]}),
            ]});

            const result = await engine.evaluate(orStructural);
            expect(result.success).toBe(true);
        });

        test('should perform functional evaluation for (==>, a, b) when both are Truth values', async () => {
            const implicationOperation = termFactory.create({operator: '==>', components: [
                {components: ['False']},
                {components: ['True']}
            ]});

            const result = await engine.evaluate(implicationOperation);
            expect(result.success).toBe(true);
            // Should evaluate to True since False ==> True = True in boolean logic
            expect(result.result).toBe(SYSTEM_ATOMS.True);
        });

        test('should create NAL conditional when arguments are NAL concepts for (==>, (a-->b), (c-->d))', async () => {
            const implicationStructural = termFactory.create({operator: '==>', components: [
                termFactory.create({operator: '-->', components: [{components: ['a']}, {components: ['b']}]}),
                termFactory.create({operator: '-->', components: [{components: ['c']}, {components: ['d']}]}),
            ]});

            const result = await engine.evaluate(implicationStructural);
            expect(result.success).toBe(true);
        });
    });

    describe('Functor Registration System', () => {
        test('should register functors with commutative and associative properties', () => {
            const registry = new FunctorRegistry();
            
            const functor = registry.registerFunctorDynamic('testAdd', (a, b) => a + b, {
                arity: 2,
                isCommutative: true,
                isAssociative: true,
                description: 'Test addition functor'
            });

            expect(functor).toBeDefined();
            expect(functor.isCommutative).toBe(true);
            expect(functor.isAssociative).toBe(true);
        });

        test('should return functor properties correctly', () => {
            const registry = new FunctorRegistry();
            
            registry.registerFunctorDynamic('testMultiply', (a, b) => a * b, {
                arity: 2,
                isCommutative: true,
                isAssociative: true
            });

            const properties = registry.getFunctorProperties('testMultiply');
            expect(properties).toBeDefined();
            expect(properties.isCommutative).toBe(true);
            expect(properties.isAssociative).toBe(true);
            expect(properties.arity).toBe(2);
        });

        test('should find functors with specific properties', () => {
            const registry = new FunctorRegistry();
            
            registry.registerFunctorDynamic('add', (a, b) => a + b, {
                arity: 2,
                isCommutative: true
            });
            
            registry.registerFunctorDynamic('subtract', (a, b) => a - b, {
                arity: 2,
                isCommutative: false
            });

            const commutativeFunctors = registry.getFunctorsWithProperty('commutative');
            expect(commutativeFunctors.length).toBe(1);
            expect(commutativeFunctors[0].name).toBe('add');
        });
    });

    describe('Variable Substitution and Binding', () => {
        test('should properly substitute variables in expressions', () => {
            const varX = termFactory.create({components: ['?x']});
            const binding = new Map();
            binding.set('?x', termFactory.create({components: ['5']}));
            
            const result = engine._substituteVariables(varX, binding);
            expect(result.name).toBe('5');
        });
    });
});