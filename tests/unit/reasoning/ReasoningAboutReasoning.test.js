import {ReasoningAboutReasoning} from '../../../src/reasoning/ReasoningAboutReasoning.js';
import {EventEmitter} from 'events';

describe('ReasoningAboutReasoning', () => {
    let reasoningAboutReasoning, nar, eventBus;

    beforeEach(() => {
        eventBus = new EventEmitter();
        nar = {
            _eventBus: eventBus,
            isRunning: true,
            cycleCount: 5,
            getBeliefs: function () {
                return [];
            },
            getGoals: function () {
                return [];
            },
            getQuestions: function () {
                return [];
            },
            memory: {
                getDetailedStats: function () {
                    return {};
                }
            },
            getStats: function () {
                return {};
            },
            termLayer: {
                getStats: function () {
                    return {};
                }
            },
            metricsMonitor: {
                getMetricsSnapshot: function () {
                    return {ruleMetrics: {}};
                }
            },
            _ruleEngine: {
                rules: [],
                getRule: function () {
                    return null;
                }
            }
        };

        reasoningAboutReasoning = new ReasoningAboutReasoning(nar);
    });

    test('should initialize with default configuration', () => {
        expect(reasoningAboutReasoning.reasoningTrace).toBeInstanceOf(Array);
        expect(reasoningAboutReasoning.enabled).toBe(true);
        expect(reasoningAboutReasoning.traceEnabled).toBe(true);
    });

    test('should add trace entry', () => {
        reasoningAboutReasoning._addToTrace('test_event', {data: 'test'});

        const trace = reasoningAboutReasoning.getReasoningTrace();
        expect(trace).toHaveLength(1);
        expect(trace[0].eventType).toBe('test_event');
    });

    test('should get reasoning state', async () => {
        const state = reasoningAboutReasoning.getReasoningState();
        expect(state).toHaveProperty('isRunning');
        expect(state).toHaveProperty('cycleCount');
        expect(state).toHaveProperty('taskCount');
    });

    test('should perform meta-cognitive reasoning', async () => {
        const result = await reasoningAboutReasoning.performMetaCognitiveReasoning();
        expect(result).toHaveProperty('state');
        expect(result).toHaveProperty('suggestions');
        expect(result).toHaveProperty('timestamp');
    });

    test('should analyze reasoning patterns', () => {
        const suggestions = reasoningAboutReasoning._analyzeReasoningPatterns();
        expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should analyze task distribution', () => {
        const suggestions = reasoningAboutReasoning._analyzeTaskDistribution({
            beliefs: 10,
            goals: 2,
            questions: 1
        });

        expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should query system state', () => {
        const taskInfo = reasoningAboutReasoning.querySystemState('task info');
        expect(taskInfo).toHaveProperty('tasks');

        const ruleInfo = reasoningAboutReasoning.querySystemState('rule info');
        expect(ruleInfo).toHaveProperty('ruleCount');
    });

    test('should perform self correction', async () => {
        const result = await reasoningAboutReasoning.performSelfCorrection();
        expect(result).toHaveProperty('analysis');
        expect(result).toHaveProperty('corrections');
        expect(result).toHaveProperty('timestamp');
    });

    test('should enable/disable tracing', () => {
        reasoningAboutReasoning.setTraceEnabled(false);
        expect(reasoningAboutReasoning.traceEnabled).toBe(false);

        reasoningAboutReasoning.setTraceEnabled(true);
        expect(reasoningAboutReasoning.traceEnabled).toBe(true);
    });
});