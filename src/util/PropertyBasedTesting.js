/**
 * @file PropertyBasedTesting.js
 * @description Property-based testing utilities for term normalization and consistency
 */

/**
 * Property-based testing framework for validating system properties
 */
export class PropertyBasedTester {
    constructor(options = {}) {
        this.maxTests = options.maxTests || 100;
        this.seed = options.seed || Date.now();
        this.random = this._createRandomGenerator(this.seed);
        this.failures = [];
    }

    /**
     * Create a seeded random number generator
     */
    _createRandomGenerator(seed) {
        // Simple seeded random generator
        let state = seed;
        return () => {
            state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
            return state / Math.pow(2, 32);
        };
    }

    /**
     * Generate random terms for testing
     */
    generateTerm(depth = 0, maxDepth = 3) {
        const {Term} = require('../src/term/Term.js'); // Dynamically import to avoid circular deps
        const termTypes = ['atomic', 'compound'];
        const operators = ['-->', '<->', '==>', '<=>', '&', '|', '--'];

        if (depth >= maxDepth || (depth > 0 && this.random() < 0.3)) {
            // Generate atomic term
            const name = `term_${Math.floor(this.random() * 1000)}`;
            return new Term('atom', name);
        } else {
            // Generate compound term
            const operator = operators[Math.floor(this.random() * operators.length)];
            const componentCount = operator === '--' ? 1 : 2; // Negation has 1 component, others have 2
            const components = [];

            for (let i = 0; i < componentCount; i++) {
                components.push(this.generateTerm(depth + 1, maxDepth));
            }

            const name = `(${components.map(c => c.name).join(` ${operator} `)})`;
            return new Term('compound', name, components, operator);
        }
    }

    /**
     * Generate random truth values for testing
     */
    generateTruth() {
        return {
            f: this.random(), // frequency between 0 and 1
            c: this.random()  // confidence between 0 and 1
        };
    }

    /**
     * Run property test
     */
    check(property, generator, options = {}) {
        const maxTests = options.maxTests || this.maxTests;
        let successes = 0;

        for (let i = 0; i < maxTests; i++) {
            try {
                const input = generator(this.random);
                const result = property(input);

                if (!result) {
                    this.failures.push({
                        testNumber: i,
                        input: input,
                        property: property.name || 'anonymous'
                    });
                    return false;
                }
                successes++;
            } catch (error) {
                this.failures.push({
                    testNumber: i,
                    input: input,
                    error: error,
                    property: property.name || 'anonymous'
                });
                return false;
            }
        }

        return {
            passed: true,
            successes,
            total: maxTests,
            passRate: successes / maxTests
        };
    }

    /**
     * Property: Terms should be immutable after creation
     */
    checkImmutability(term) {
        const originalString = term.toString();
        const originalHash = term.hash;
        const originalComponents = term.components ? [...term.components] : null;

        // Try to modify properties (should not affect the original)
        try {
            // This should either fail (with proper immutability) or not change the original values
            if (term._name) term._name = 'modified';
            if (term.name !== originalString) return false;
            if (term.hash !== originalHash) return false;

            // For compound terms, verify components are also immutable
            if (originalComponents) {
                for (let i = 0; i < originalComponents.length; i++) {
                    if (term.components[i] !== originalComponents[i]) return false;
                }
            }

            return true;
        } catch (e) {
            // If modification throws an error, that's also a form of immutability
            return true;
        }
    }

    /**
     * Property: Term equality should be consistent
     */
    checkEqualityConsistency(terms) {
        const [t1, t2] = terms;
        if (!t1 || !t2) return false;

        const eq1 = t1.equals(t2);
        const eq2 = t2.equals(t1);

        // Equality should be symmetric
        if (eq1 !== eq2) return false;

        // If terms are equal, their hashes should be equal
        if (eq1 && t1.hash !== t2.hash) return false;

        return true;
    }

    /**
     * Property: Truth value operations should produce valid results
     */
    checkTruthOperations(truthPair) {
        const [t1, t2] = truthPair;
        const {TruthFunctions} = require('../src/reasoning/nal/TruthFunctions.js');

        try {
            // Test that operations produce valid truth values
            const deductionResult = TruthFunctions.deduction(t1, t2);
            const inductionResult = TruthFunctions.induction(t1, t2);
            const revisionResult = TruthFunctions.revision(t1, t2);

            // Check that results are valid truth values (f and c between 0 and 1)
            const isValidTruth = (t) => t && typeof t === 'object' &&
                typeof t.frequency === 'number' &&
                typeof t.confidence === 'number' &&
                t.frequency >= 0 && t.frequency <= 1 &&
                t.confidence >= 0 && t.confidence <= 1;

            return isValidTruth(deductionResult) &&
                isValidTruth(inductionResult) &&
                isValidTruth(revisionResult);
        } catch (e) {
            return false;
        }
    }

    /**
     * Run multiple property tests on terms
     */
    runTermPropertyTests() {
        const results = {
            immutability: null,
            equality: null,
            truthOperations: null
        };

        // Test immutability
        results.immutability = this.check(
            this.checkImmutability.bind(this),
            () => this.generateTerm(),
            {maxTests: 50}
        );

        // Test equality consistency
        results.equality = this.check(
            this.checkEqualityConsistency.bind(this),
            () => [this.generateTerm(), this.generateTerm()],
            {maxTests: 50}
        );

        // Test truth operations
        results.truthOperations = this.check(
            this.checkTruthOperations.bind(this),
            () => [this.generateTruth(), this.generateTruth()],
            {maxTests: 50}
        );

        return results;
    }

    /**
     * Get failure report
     */
    getFailureReport() {
        return {
            totalFailures: this.failures.length,
            failures: this.failures,
            hasFailures: this.failures.length > 0
        };
    }
}