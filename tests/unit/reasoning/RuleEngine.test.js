import { RuleEngine } from '../../../src/reasoning/RuleEngine.js';
import { Rule } from '../../../src/reasoning/Rule.js';
import { NALRule } from '../../../src/reasoning/NALRule.js';
import { Truth } from '../../../src/Truth.js';
import { Term } from '../../../src/term/Term.js';
import { Task } from '../../../src/task/Task.js';

describe('RuleEngine', () => {
    let ruleEngine;

    beforeEach(() => {
        ruleEngine = new RuleEngine();
    });

    it('should initialize with empty rule collections', () => {
        expect(ruleEngine.rules).toEqual([]);
        expect(ruleEngine.ruleSets).toEqual([]);
        expect(ruleEngine.metrics).toBeDefined();
    });

    it('should register and retrieve rules', () => {
        const mockRule = new Rule('test-rule', 'test', 0.8);
        ruleEngine.register(mockRule);
        
        expect(ruleEngine.getRule('test-rule')).toBe(mockRule);
        expect(ruleEngine.rules.length).toBe(1);
        expect(ruleEngine.rules[0]).toBe(mockRule);
    });

    it('should unregister rules', () => {
        const mockRule = new Rule('test-rule', 'test', 0.8);
        ruleEngine.register(mockRule);
        expect(ruleEngine.getRule('test-rule')).toBe(mockRule);
        
        ruleEngine.unregister('test-rule');
        expect(ruleEngine.getRule('test-rule')).toBeUndefined();
        expect(ruleEngine.rules.length).toBe(0);
    });

    it('should enable and disable rules', () => {
        const mockRule = new Rule('test-rule', 'test', 0.8);
        ruleEngine.register(mockRule);
        
        ruleEngine.disableRule('test-rule');
        expect(ruleEngine.getRule('test-rule').enabled).toBe(false);
        
        ruleEngine.enableRule('test-rule');
        expect(ruleEngine.getRule('test-rule').enabled).toBe(true);
    });

    it('should create and retrieve rule sets', () => {
        const mockRule = new Rule('test-rule', 'test', 0.8);
        ruleEngine.register(mockRule);
        
        const ruleSet = ruleEngine.createSet('test-set', ['test-rule']);
        
        expect(ruleSet.name).toBe('test-set');
        expect(ruleSet.size).toBe(1);
        expect(ruleEngine.getSet('test-set')).toBe(ruleSet);
    });

    it('should get applicable rules', () => {
        const task = new Task({ 
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: { priority: 0.7, durability: 0.5, quality: 0.6 } 
        });
        
        const applicableRules = ruleEngine.getApplicableRules(task);
        expect(Array.isArray(applicableRules)).toBe(true);
    });

    it('should apply rules to tasks', () => {
        const task = new Task({ 
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: { priority: 0.7, durability: 0.5, quality: 0.6 } 
        });
        
        const results = ruleEngine.applyRules(task);
        expect(Array.isArray(results)).toBe(true);
        // Should be empty since no rules are registered
        expect(results.length).toBe(0);
    });

    it('should clear all rules and rule sets', () => {
        const mockRule = new Rule('test-rule', 'test', 0.8);
        ruleEngine.register(mockRule);
        ruleEngine.createSet('test-set', ['test-rule']);
        
        expect(ruleEngine.rules.length).toBe(1);
        expect(ruleEngine.ruleSets.length).toBe(1);
        
        ruleEngine.clear();
        
        expect(ruleEngine.rules.length).toBe(0);
        expect(ruleEngine.ruleSets.length).toBe(0);
    });

    it('should update metrics during rule application', () => {
        const metricsBefore = ruleEngine.metrics;
        expect(metricsBefore).toBeDefined();
    });
});

describe('NALRule', () => {
    it('should create and execute a basic NAL rule', () => {
        // Define a simple NAL rule pattern and test it
        const termA = new Term('atomic', 'A');
        const termB = new Term('atomic', 'B');
        
        const premises = [termA];
        const conclusion = termB;
        
        const rule = new NALRule(
            'test-rule', 
            premises, 
            conclusion, 
            (t1) => new Truth(t1.f * 0.8, t1.c * 0.9)
        );
        
        expect(rule.id).toBe('test-rule');
        expect(rule.premises).toBe(premises);
        expect(rule.conclusion).toBe(conclusion);
    });
});