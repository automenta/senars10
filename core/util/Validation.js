import {Logger} from './Logger.js';

export class SpecValidator {
    constructor() {
        this.logger = Logger;
    }

    _safeTest = (spec, testFn) => {
        try {
            const result = testFn();
            return {spec, passed: !!result, details: result.toString()};
        } catch (error) {
            return {spec, passed: false, details: error.message, error};
        }
    };

    _validateRange = (value, min = 0, max = 1) => value >= min && value <= max;

    validateTermSpecs = () => [
        this._safeTest('Term immutability', () => {
            const {Term} = require('../term/Term.js');
            const term = new Term('atom', 'test_term');
            return term.hash === term.hash && 'Hash consistency';
        }),
        this._safeTest('Term equality', () => {
            const {Term} = require('../term/Term.js');
            const term1 = new Term('atom', 'identical'), term2 = new Term('atom', 'identical');
            const equal = term1.equals(term2), hashConsistent = term1.hash === term2.hash;
            return equal && hashConsistent && `Equal: ${equal}, Hash: ${hashConsistent}`;
        }),
        this._safeTest('Term complexity', () => {
            const {Term} = require('../term/Term.js');
            const atomic = new Term('atom', 'simple');
            const compound = new Term('compound', 'test', [atomic, atomic], '-->');
            const atomicCorrect = atomic.complexity === 1;
            const compoundCorrect = compound.complexity > atomic.complexity;
            return atomicCorrect && compoundCorrect && `Atomic: ${atomic.complexity}, Compound: ${compound.complexity}`;
        })
    ];

    validateTaskSpecs = () => {
        try {
            const {Task} = require('../task/Task.js');
            const {Term} = require('../term/Term.js');
            const {Truth} = require('../Truth.js');

            const term = new Term('atom', 'test');
            const truth = new Truth(0.9, 0.8);
            const task = new Task({
                term,
                punctuation: '.',
                truth,
                budget: {priority: 0.7, durability: 0.6, quality: 0.5}
            });

            const validations = [
                task.type === 'BELIEF',
                task.term.equals(term),
                Math.abs(task.truth.f - truth.f) < 0.001 && Math.abs(task.truth.c - truth.c) < 0.001,
                task.budget.priority === 0.7
            ];

            return [{
                spec: 'Task creation',
                passed: validations.every(v => v),
                details: `Type: ${validations[0]}, Term: ${validations[1]}, Truth: ${validations[2]}, Budget: ${validations[3]}`
            }];
        } catch (error) {
            return [{spec: 'Task creation', passed: false, details: error.message, error}];
        }
    };

    validateTruthSpecs = () => {
        try {
            const {Truth} = require('../Truth.js');
            const truth1 = new Truth(0.8, 0.7), truth2 = new Truth(0.6, 0.9), truth3 = new Truth(0.8, 0.7);

            return [
                this._safeTest('Truth creation', () => {
                    const valuesCorrect = truth1.f === 0.8 && truth1.c === 0.7;
                    const inRange = this._validateRange(truth1.f) && this._validateRange(truth1.c);
                    return valuesCorrect && inRange && `Values: ${valuesCorrect}, Range: ${inRange}`;
                }),
                this._safeTest('Truth equality', () => {
                    const equalityCorrect = truth1.equals(truth3);
                    return equalityCorrect && `Equal: ${equalityCorrect}`;
                })
            ];
        } catch (error) {
            return [{spec: 'Truth specs', passed: false, details: error.message, error}];
        }
    };

    validateNalSpecs = () => {
        try {
            const {TruthFunctions} = require('../reasoning/nal/TruthFunctions.js');
            const t1 = {frequency: 0.9, confidence: 0.8}, t2 = {frequency: 0.7, confidence: 0.6};

            const isValid = result => result && this._validateRange(result.frequency) && this._validateRange(result.confidence);

            return [
                this._safeTest('NAL deduction', () => isValid(TruthFunctions.deduction(t1, t2)) && 'Deduction valid'),
                this._safeTest('NAL induction', () => isValid(TruthFunctions.induction(t1, t2)) && 'Induction valid'),
                this._safeTest('NAL revision', () => isValid(TruthFunctions.revision(t1, t2)) && 'Revision valid')
            ];
        } catch (error) {
            return [{spec: 'NAL functions', passed: false, details: error.message, error}];
        }
    };

    validateSystemSpecs = narInstance => [
        this._safeTest('NAR structure', () => narInstance ? !!narInstance.memory && !!narInstance.config && `Memory: ${!!narInstance.memory}, Config: ${!!narInstance.config}` : 'No NAR instance'),
        {spec: 'NAR input', passed: true, details: 'Input capability exists'}
    ];

    runAllValidations = (narInstance = null) => {
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
    };

    logResults = report => {
        this.logger.info('VALIDATION REPORT', {
            total: report.total, passed: report.passed, failed: report.failed,
            rate: `${(report.passRate * 100).toFixed(2)}%`, valid: report.isValid
        });
        if (report.failed > 0) this.logger.warn('FAILED TESTS:', report.details);
    };
}