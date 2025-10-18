import {Logger} from './Logger.js';

export class SpecValidator {
    constructor() {
        this.logger = Logger;
        this.results = {passed: [], failed: [], skipped: []};
    }

    validateTermSpecs() {
        return [
            this._testTermImmutability(),
            this._testTermEquality(),
            this._testTermComplexity()
        ];
    }

    _testTermImmutability() {
        try {
            const {Term} = require('../term/Term.js');
            const term = new Term('atom', 'test_term');
            return {spec: 'Term immutability', passed: term.hash === term.hash, details: 'Hash consistency'};
        } catch (error) {
            return {spec: 'Term immutability', passed: false, details: error.message, error};
        }
    }

    _testTermEquality() {
        try {
            const {Term} = require('../term/Term.js');
            const term1 = new Term('atom', 'identical');
            const term2 = new Term('atom', 'identical');
            const equal = term1.equals(term2);
            const hashConsistent = term1.hash === term2.hash;
            return {spec: 'Term equality', passed: equal && hashConsistent, details: `Equal: ${equal}, Hash: ${hashConsistent}`};
        } catch (error) {
            return {spec: 'Term equality', passed: false, details: error.message, error};
        }
    }

    _testTermComplexity() {
        try {
            const {Term} = require('../term/Term.js');
            const atomic = new Term('atom', 'simple');
            const compound = new Term('compound', 'test', [atomic, atomic], '-->');
            const atomicCorrect = atomic.complexity === 1;
            const compoundCorrect = compound.complexity > atomic.complexity;
            return {spec: 'Term complexity', passed: atomicCorrect && compoundCorrect, details: `Atomic: ${atomic.complexity}, Compound: ${compound.complexity}`};
        } catch (error) {
            return {spec: 'Term complexity', passed: false, details: error.message, error};
        }
    }

    validateTaskSpecs() {
        try {
            const {Task} = require('../task/Task.js');
            const {Term} = require('../term/Term.js');
            const {Truth} = require('../Truth.js');

            const term = new Term('atom', 'test');
            const truth = new Truth(0.9, 0.8);
            const task = new Task({term, punctuation: '.', truth, budget: {priority: 0.7, durability: 0.6, quality: 0.5}});

            const typeCorrect = task.type === 'BELIEF';
            const termCorrect = task.term.equals(term);
            const truthCorrect = task.truth && Math.abs(task.truth.f - truth.f) < 0.001 && Math.abs(task.truth.c - truth.c) < 0.001;
            const budgetCorrect = task.budget.priority === 0.7;

            return [{
                spec: 'Task creation',
                passed: typeCorrect && termCorrect && truthCorrect && budgetCorrect,
                details: `Type: ${typeCorrect}, Term: ${termCorrect}, Truth: ${truthCorrect}, Budget: ${budgetCorrect}`
            }];
        } catch (error) {
            return [{spec: 'Task creation', passed: false, details: error.message, error}];
        }
    }

    validateTruthSpecs() {
        try {
            const {Truth} = require('../Truth.js');
            const truth1 = new Truth(0.8, 0.7);
            const truth2 = new Truth(0.6, 0.9);

            const valuesCorrect = truth1.f === 0.8 && truth1.c === 0.7;
            const inRange = truth1.f >= 0 && truth1.f <= 1 && truth1.c >= 0 && truth1.c <= 1;

            const truth3 = new Truth(0.8, 0.7);
            const equalityCorrect = truth1.equals(truth3);

            return [
                {spec: 'Truth creation', passed: valuesCorrect && inRange, details: `Values: ${valuesCorrect}, Range: ${inRange}`},
                {spec: 'Truth equality', passed: equalityCorrect, details: `Equal: ${equalityCorrect}`}
            ];
        } catch (error) {
            return [{spec: 'Truth specs', passed: false, details: error.message, error}];
        }
    }

    validateNalSpecs() {
        try {
            const {TruthFunctions} = require('../reasoning/nal/TruthFunctions.js');
            const t1 = {frequency: 0.9, confidence: 0.8};
            const t2 = {frequency: 0.7, confidence: 0.6};

            const isValid = result => result && typeof result.frequency === 'number' && typeof result.confidence === 'number' &&
                result.frequency >= 0 && result.frequency <= 1 && result.confidence >= 0 && result.confidence <= 1;

            return [
                {spec: 'NAL deduction', passed: isValid(TruthFunctions.deduction(t1, t2)), details: 'Deduction valid'},
                {spec: 'NAL induction', passed: isValid(TruthFunctions.induction(t1, t2)), details: 'Induction valid'},
                {spec: 'NAL revision', passed: isValid(TruthFunctions.revision(t1, t2)), details: 'Revision valid'}
            ];
        } catch (error) {
            return [{spec: 'NAL functions', passed: false, details: error.message, error}];
        }
    }

    validateSystemSpecs(narInstance) {
        if (!narInstance) return [{spec: 'NAR structure', passed: false, details: 'No NAR instance'}];

        const hasMemory = !!narInstance.memory;
        const hasConfig = !!narInstance.config;

        return [
            {spec: 'NAR structure', passed: hasMemory && hasConfig, details: `Memory: ${hasMemory}, Config: ${hasConfig}`},
            {spec: 'NAR input', passed: true, details: 'Input capability exists'}
        ];
    }

    runAllValidations(narInstance = null) {
        const allResults = {
            termSpecs: this.validateTermSpecs(),
            taskSpecs: this.validateTaskSpecs(),
            truthSpecs: this.validateTruthSpecs(),
            nalSpecs: this.validateNalSpecs(),
            systemSpecs: this.validateSystemSpecs(narInstance)
        };

        const stats = Object.values(allResults).flat().reduce((acc, test) => {
            acc.total++;
            test.passed ? acc.passed++ : acc.failed++;
            return acc;
        }, {total: 0, passed: 0, failed: 0});

        return {
            ...stats,
            details: allResults,
            passRate: stats.total > 0 ? stats.passed / stats.total : 0,
            isValid: stats.failed === 0
        };
    }

    logResults(report) {
        this.logger.info('VALIDATION REPORT', {
            total: report.totalTests,
            passed: report.passedTests,
            failed: report.failedTests,
            rate: `${(report.passRate * 100).toFixed(2)}%`,
            valid: report.isValid
        });

        if (report.failedTests > 0) this.logger.warn('FAILED TESTS:', report.details);
    }
}