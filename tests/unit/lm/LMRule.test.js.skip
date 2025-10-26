import {LMRule} from '../../../src/reasoning/LMRule.js';
import {LM} from '../../../src/lm/LM.js';
import {DummyProvider} from '../../../src/lm/DummyProvider.js';

describe('LMRule', () => {
    let lm;
    let rule;

    beforeEach(async () => {
        lm = new LM();
        await lm.initialize();

        const provider = new DummyProvider({
            id: 'test-provider',
            responseTemplate: 'Processed: {prompt}'
        });
        lm.registerProvider('test-provider', provider);

        const promptTemplate = 'Analyze this task: {{taskTerm}} of type {{taskType}} with truth {{taskTruth}}';
        const responseProcessor = async (response, task) => {
            return []; // For now, just return empty array
        };

        rule = new LMRule('test-lm-rule', lm, promptTemplate, responseProcessor, 0.8);
    });

    test('should initialize with proper properties', () => {
        expect(rule.id).toBe('test-lm-rule');
        expect(rule.type).toBe('lm');
        expect(rule.priority).toBe(0.8);
        expect(rule.lm).toBe(lm);
        expect(rule._promptTemplate).toBe('Analyze this task: {{taskTerm}} of type {{taskType}} with truth {{taskTruth}}');
        expect(rule._enabled).toBe(true);
    });

    test('should return LM config', () => {
        const config = rule.lmConfig;
        expect(config).toBeDefined();
        expect(config.temperature).toBe(0.7); // default
        expect(config.maxTokens).toBe(1000); // default
    });

    test('should match when enabled and LM available', () => {
        const mockTask = {
            term: {toString: () => 'test-term'},
            type: 'BELIEF'
        };

        const result = rule._matches(mockTask);
        expect(result).toBe(true);
    });

    test('should not match when disabled', () => {
        const mockTask = {
            term: {toString: () => 'test-term'},
            type: 'BELIEF'
        };

        const disabledRule = rule.disable();
        const result = disabledRule._matches(mockTask);
        expect(result).toBe(false);
    });

    test('should build prompt correctly', () => {
        const mockTask = {
            term: {toString: () => 'test-term'},
            type: 'BELIEF',
            truth: {f: 0.8, c: 0.9} // Using f for frequency, c for confidence
        };

        const prompt = rule._buildPrompt(mockTask);
        expect(prompt).toContain('test-term');
        expect(prompt).toContain('BELIEF');
        expect(prompt).toContain('(0.80, 0.90)');
    });

    test('should build prompt with undefined truth gracefully', () => {
        const mockTask = {
            term: {toString: () => 'test-term'},
            type: 'BELIEF',
            // no truth property
        };

        const prompt = rule._buildPrompt(mockTask);
        expect(prompt).toContain('test-term');
        expect(prompt).toContain('BELIEF');
        expect(prompt).toContain('no truth');
    });

    test('should handle response processor', async () => {
        const mockTask = {
            term: {toString: () => 'test-term'},
            type: 'BELIEF',
            truth: {f: 0.8, c: 0.9}
        };

        // Check that prompt building works
        const prompt = rule._buildPrompt(mockTask);
        expect(prompt).toContain('test-term');
        expect(prompt).toContain('BELIEF');
        expect(prompt).toContain('(0.80, 0.90)');

        const result = await rule._apply(mockTask);
        expect(Array.isArray(result)).toBe(true);
    });

    test('should get LM stats', () => {
        const stats = rule.getLMStats();
        expect(stats.calls).toBe(0);
        expect(stats.tokens).toBe(0);
        expect(stats.avgTime).toBe(0);
    });

    test('should create updated rule with temperature', () => {
        const updatedRule = rule.withTemperature(0.9);
        expect(updatedRule.priority).toBe(rule.priority); // Should remain the same
        expect(updatedRule.lmConfig.temperature).toBe(0.9);
    });

    test('should create updated rule with maxTokens', () => {
        const updatedRule = rule.withMaxTokens(2000);
        expect(updatedRule.lmConfig.maxTokens).toBe(2000);
    });

    test('should create updated rule with model', () => {
        const updatedRule = rule.withModel('gpt-4');
        expect(updatedRule.lmConfig.model).toBe('gpt-4');
    });
});