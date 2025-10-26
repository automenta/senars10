import {LMRuleFactory} from '../../../src/lm/LMRuleFactory.js';
import {LM} from '../../../src/lm/LM.js';
import {DummyProvider} from '../../../src/lm/DummyProvider.js';

describe('LMRuleFactory', () => {
    let lm;

    beforeEach(async () => {
        lm = new LM();
        await lm.initialize();

        const provider = new DummyProvider({id: 'test-provider'});
        lm.registerProvider('test-provider', provider);
    });

    test('should create a basic LM rule', () => {
        const promptTemplate = 'Process: {{taskTerm}}';
        const responseProcessor = async (response, task) => [];

        const rule = LMRuleFactory.create('test-rule', lm, promptTemplate, responseProcessor, 0.7);

        expect(rule.id).toBe('test-rule');
        expect(rule.lm).toBe(lm);
        expect(rule.priority).toBe(0.7);
        expect(rule._promptTemplate).toBe('Process: {{taskTerm}}');
    });

    test('should throw error when required parameters are missing', () => {
        expect(() => {
            LMRuleFactory.create();
        }).toThrow();

        expect(() => {
            LMRuleFactory.create('test-rule');
        }).toThrow();

        expect(() => {
            LMRuleFactory.create('test-rule', lm);
        }).toThrow();
    });

    test('should create simple rule', () => {
        const rule = LMRuleFactory.createSimple('simple-rule', lm, 'Template: {{taskTerm}}', 0.6);

        expect(rule.id).toBe('simple-rule');
        expect(rule.lm).toBe(lm);
        expect(rule.priority).toBe(0.6);
        expect(rule._promptTemplate).toBe('Template: {{taskTerm}}');
    });

    test('should create inference rule', () => {
        const rule = LMRuleFactory.createInferenceRule('inference-rule', lm, 0.5);

        expect(rule.id).toBe('inference-rule');
        expect(rule.lm).toBe(lm);
        expect(rule.priority).toBe(0.5);
        expect(rule._promptTemplate).toContain('Given the task');
    });

    test('should create hypothesis rule', () => {
        const rule = LMRuleFactory.createHypothesisRule('hypothesis-rule', lm, 0.4);

        expect(rule.id).toBe('hypothesis-rule');
        expect(rule.lm).toBe(lm);
        expect(rule.priority).toBe(0.4);
        expect(rule._promptTemplate).toContain('generate a plausible hypothesis');
    });
});