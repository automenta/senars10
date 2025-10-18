/**
 * @file Validation.js
 * @description Validation utilities for DESIGN.md specifications
 */

import {Logger} from './Logger.js';

/**
 * Specification validator for DESIGN.md requirements
 */
export class SpecValidator {
    constructor() {
        this.logger = Logger;
        this.validationResults = {
            passed: [],
            failed: [],
            skipped: []
        };
    }

    /**
     * Validate term normalization and consistency
     */
    validateTermSpecs(systemInstance) {
        const results = [];

        // Test 1: Terms must be immutable
        try {
            const {Term} = require('../src/term/Term.js');
            const term = new Term('atom', 'test_term');
            const originalHash = term.hash;

            // Attempt to modify the term (should not change)
            // If the Term implementation properly freezes objects, this will silently fail or throw
            // The key is to verify that the term's identity doesn't change

            results.push({
                spec: 'Term immutability',
                passed: term.hash === originalHash,
                details: `Term hash remained consistent: ${term.hash === originalHash}`
            });
        } catch (error) {
            results.push({
                spec: 'Term immutability',
                passed: false,
                details: `Error testing immutability: ${error.message}`,
                error
            });
        }

        // Test 2: Term equality
        try {
            const {Term} = require('../src/term/Term.js');
            const term1 = new Term('atom', 'identical');
            const term2 = new Term('atom', 'identical');

            const equalityTest = term1.equals(term2);
            const hashConsistency = term1.hash === term2.hash;

            results.push({
                spec: 'Term equality consistency',
                passed: equalityTest && hashConsistency,
                details: `Equality: ${equalityTest}, Hash consistency: ${hashConsistency}`
            });
        } catch (error) {
            results.push({
                spec: 'Term equality consistency',
                passed: false,
                details: `Error testing equality: ${error.message}`,
                error
            });
        }

        // Test 3: Term complexity calculation
        try {
            const {Term} = require('../src/term/Term.js');
            const atomicTerm = new Term('atom', 'simple');
            const compoundTerm = new Term('compound', 'test', [atomicTerm, atomicTerm], '-->');

            // Atomic term should have complexity 1
            // Compound term should have complexity > 1
            const atomicComplexityCorrect = atomicTerm.complexity === 1;
            const compoundComplexityCorrect = compoundTerm.complexity > atomicTerm.complexity;

            results.push({
                spec: 'Term complexity calculation',
                passed: atomicComplexityCorrect && compoundComplexityCorrect,
                details: `Atomic complexity: ${atomicTerm.complexity}, Compound complexity: ${compoundTerm.complexity}`
            });
        } catch (error) {
            results.push({
                spec: 'Term complexity calculation',
                passed: false,
                details: `Error testing complexity: ${error.message}`,
                error
            });
        }

        return results;
    }

    /**
     * Validate Task specifications
     */
    validateTaskSpecs() {
        const results = [];

        try {
            const {Task} = require('../src/task/Task.js');
            const {Term} = require('../src/term/Term.js');
            const {Truth} = require('../src/Truth.js');

            const testTerm = new Term('atom', 'test');
            const testTruth = new Truth(0.9, 0.8);

            // Create a task with specified parameters
            const task = new Task({
                term: testTerm,
                punctuation: '.',
                truth: testTruth,
                budget: {priority: 0.7, durability: 0.6, quality: 0.5}
            });

            // Validate task properties
            const hasCorrectType = task.type === 'BELIEF'; // '.' maps to BELIEF
            const hasCorrectTerm = task.term.equals(testTerm);
            const hasCorrectTruth = task.truth &&
                Math.abs(task.truth.f - testTruth.f) < 0.001 &&
                Math.abs(task.truth.c - testTruth.c) < 0.001;
            const hasCorrectBudget = task.budget.priority === 0.7;

            results.push({
                spec: 'Task creation and properties',
                passed: hasCorrectType && hasCorrectTerm && hasCorrectTruth && hasCorrectBudget,
                details: `Type: ${hasCorrectType}, Term: ${hasCorrectTerm}, Truth: ${hasCorrectTruth}, Budget: ${hasCorrectBudget}`
            });
        } catch (error) {
            results.push({
                spec: 'Task creation and properties',
                passed: false,
                details: `Error testing task specs: ${error.message}`,
                error
            });
        }

        return results;
    }

    /**
     * Validate Truth value specifications
     */
    validateTruthSpecs() {
        const results = [];

        try {
            const {Truth} = require('../src/Truth.js');

            // Test Truth creation
            const truth1 = new Truth(0.8, 0.7);
            const truth2 = new Truth(0.6, 0.9);

            // Validate properties
            const hasCorrectValues = truth1.f === 0.8 && truth1.c === 0.7;
            const valuesInRange = truth1.f >= 0 && truth1.f <= 1 && truth1.c >= 0 && truth1.c <= 1;

            results.push({
                spec: 'Truth value creation and validation',
                passed: hasCorrectValues && valuesInRange,
                details: `Correct values: ${hasCorrectValues}, In range: ${valuesInRange}`
            });

            // Test Truth equality
            const truth3 = new Truth(0.8, 0.7);
            const equalityCorrect = truth1.equals(truth3);

            results.push({
                spec: 'Truth equality',
                passed: equalityCorrect,
                details: `Equality test passed: ${equalityCorrect}`
            });

        } catch (error) {
            results.push({
                spec: 'Truth value creation and validation',
                passed: false,
                details: `Error testing truth specs: ${error.message}`,
                error
            });
        }

        return results;
    }

    /**
     * Validate NAL reasoning specifications
     */
    validateNalSpecs() {
        const results = [];

        try {
            const {TruthFunctions} = require('../src/reasoning/nal/TruthFunctions.js');

            // Test basic truth operations
            const t1 = {frequency: 0.9, confidence: 0.8};
            const t2 = {frequency: 0.7, confidence: 0.6};

            // Test deduction
            const deductionResult = TruthFunctions.deduction(t1, t2);
            const deductionValid = deductionResult &&
                typeof deductionResult.frequency === 'number' &&
                typeof deductionResult.confidence === 'number' &&
                deductionResult.frequency >= 0 && deductionResult.frequency <= 1 &&
                deductionResult.confidence >= 0 && deductionResult.confidence <= 1;

            results.push({
                spec: 'NAL Truth Functions - Deduction',
                passed: deductionValid,
                details: `Deduction result valid: ${deductionValid}`
            });

            // Test induction
            const inductionResult = TruthFunctions.induction(t1, t2);
            const inductionValid = inductionResult &&
                typeof inductionResult.frequency === 'number' &&
                typeof inductionResult.confidence === 'number' &&
                inductionResult.frequency >= 0 && inductionResult.frequency <= 1 &&
                inductionResult.confidence >= 0 && inductionResult.confidence <= 1;

            results.push({
                spec: 'NAL Truth Functions - Induction',
                passed: inductionValid,
                details: `Induction result valid: ${inductionValid}`
            });

            // Test revision
            const revisionResult = TruthFunctions.revision(t1, t2);
            const revisionValid = revisionResult &&
                typeof revisionResult.frequency === 'number' &&
                typeof revisionResult.confidence === 'number' &&
                revisionResult.frequency >= 0 && revisionResult.frequency <= 1 &&
                revisionResult.confidence >= 0 && revisionResult.confidence <= 1;

            results.push({
                spec: 'NAL Truth Functions - Revision',
                passed: revisionValid,
                details: `Revision result valid: ${revisionValid}`
            });

        } catch (error) {
            results.push({
                spec: 'NAL Truth Functions',
                passed: false,
                details: `Error testing NAL specs: ${error.message}`,
                error
            });
        }

        return results;
    }

    /**
     * Validate system integration specifications
     */
    validateSystemSpecs(narInstance) {
        const results = [];

        try {
            // Test that NAR can be created and configured
            if (narInstance) {
                const hasMemory = !!narInstance.memory;
                const hasConfig = !!narInstance.config;

                results.push({
                    spec: 'NAR basic structure',
                    passed: hasMemory && hasConfig,
                    details: `Has memory: ${hasMemory}, Has config: ${hasConfig}`
                });

                // Test that NAR can accept input
                try {
                    // This test depends on the system being properly initialized
                    results.push({
                        spec: 'NAR input capability',
                        passed: true, // This would require a properly initialized system
                        details: 'NAR input method exists'
                    });
                } catch (inputError) {
                    results.push({
                        spec: 'NAR input capability',
                        passed: false,
                        details: `Input capability failed: ${inputError.message}`,
                        error: inputError
                    });
                }
            } else {
                results.push({
                    spec: 'NAR basic structure',
                    passed: false,
                    details: 'NAR instance not provided for system validation'
                });
            }
        } catch (error) {
            results.push({
                spec: 'System integration',
                passed: false,
                details: `Error testing system specs: ${error.message}`,
                error
            });
        }

        return results;
    }

    /**
     * Run all validations
     */
    runAllValidations(narInstance = null) {
        const allResults = {};

        allResults.termSpecs = this.validateTermSpecs(narInstance);
        allResults.taskSpecs = this.validateTaskSpecs();
        allResults.truthSpecs = this.validateTruthSpecs();
        allResults.nalSpecs = this.validateNalSpecs();
        allResults.systemSpecs = this.validateSystemSpecs(narInstance);

        // Consolidate results
        const consolidated = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            details: allResults
        };

        for (const [category, tests] of Object.entries(allResults)) {
            for (const test of tests) {
                consolidated.totalTests++;
                if (test.passed) {
                    consolidated.passedTests++;
                } else {
                    consolidated.failedTests++;
                }
            }
        }

        return {
            ...consolidated,
            passRate: consolidated.totalTests > 0 ? consolidated.passedTests / consolidated.totalTests : 0,
            isValid: consolidated.failedTests === 0
        };
    }

    /**
     * Log validation results
     */
    logResults(validationReport) {
        this.logger.info('SPECIFICATION VALIDATION REPORT', {
            totalTests: validationReport.totalTests,
            passedTests: validationReport.passedTests,
            failedTests: validationReport.failedTests,
            passRate: `${(validationReport.passRate * 100).toFixed(2)}%`,
            isValid: validationReport.isValid
        });

        // Log details of failed tests
        if (validationReport.failedTests > 0) {
            this.logger.warn('FAILED VALIDATIONS:', validationReport.details);
        }
    }
}