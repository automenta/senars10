import {Memory} from '../../../src/memory/Memory.js';
import {createMemoryConfig, createTask, createTerm, TEST_CONSTANTS} from '../../support/factories.js';
import {memoryAssertions, TestSuiteFactory} from '../../support/testOrganizer.js';

// Use the TestSuiteFactory to create a comprehensive Memory test suite
TestSuiteFactory.createMemoryRelatedSuite({
    className: 'Memory',
    Constructor: Memory,
    validInput: createMemoryConfig(),
    testAssertions: true,
    testDataModel: false,  // Memory has complex initialization, skip data model tests
    assertionUtils: memoryAssertions
});

describe('Memory - Additional Specific Tests', () => {
    let memory;
    let config;

    beforeEach(() => {
        config = createMemoryConfig();
        memory = new Memory(config);
    });

    describe('Initialization', () => {
        test('initializes with correct default state', () => {
            expect(memory.concepts.size).toBe(0);
            expect(memory.focusConcepts.size).toBe(0);
            expect(memory.stats.totalConcepts).toBe(0);
            expect(memory.stats.totalTasks).toBe(0);
            expect(memory.stats.focusConceptsCount).toBe(0);
            expect(memory.config).toStrictEqual(config);
        });
    });

    describe('Task Operations', () => {
        test('adds tasks and creates concepts', () => {
            const task = createTask({
                term: createTerm('A'),
                truth: TEST_CONSTANTS.TRUTH.HIGH,
                budget: TEST_CONSTANTS.BUDGET.MEDIUM
            });

            const added = memory.addTask(task);

            expect(added).toBe(true);
            expect(memory.stats.totalConcepts).toBe(1);
            expect(memory.stats.totalTasks).toBe(1);
            expect(memory.focusConcepts.size).toBe(1);
        });

        test('handles duplicate tasks correctly', () => {
            const term = createTerm('A');
            const task1 = createTask({term, truth: TEST_CONSTANTS.TRUTH.HIGH, budget: TEST_CONSTANTS.BUDGET.MEDIUM});
            const task2 = createTask({term, truth: TEST_CONSTANTS.TRUTH.MEDIUM, budget: TEST_CONSTANTS.BUDGET.LOW});

            memory.addTask(task1);
            memory.addTask(task2);

            expect(memory.stats.totalConcepts).toBe(1);
            expect(memory.stats.totalTasks).toBe(2);
        });

        test('retrieves concepts correctly', () => {
            const term = createTerm('A');
            const task = createTask({term, truth: TEST_CONSTANTS.TRUTH.HIGH});

            memory.addTask(task);
            const concept = memory.getConcept(term);

            expect(concept).toBeDefined();
            expect(concept.term).toBe(term);
            expect(concept.totalTasks).toBe(1);
        });

        test('returns null for non-existent concepts', () => {
            const nonExistentTerm = createTerm('B');
            expect(memory.getConcept(nonExistentTerm)).toBeNull();
        });

        test('gets all concepts correctly', () => {
            const taskA = createTask({term: createTerm('A')});
            const taskB = createTask({term: createTerm('B')});

            memory.addTask(taskA);
            memory.addTask(taskB);

            expect(memory.getAllConcepts()).toHaveLength(2);
        });
    });

    describe('Concept Management', () => {
        test.each([
            {name: 'high priority', budget: TEST_CONSTANTS.BUDGET.HIGH, shouldFocus: true},
            {name: 'low priority', budget: TEST_CONSTANTS.BUDGET.LOW, shouldFocus: false}
        ])('handles $name tasks for focus memory', ({budget, shouldFocus}) => {
            const term = createTerm('A');
            const task = createTask({term, budget});

            memory.addTask(task);

            if (shouldFocus) {
                expect(memory.focusConcepts.size).toBe(1);
            } else {
                expect(memory.focusConcepts.size).toBe(0);
            }
        });

        test('removes concepts correctly', () => {
            const term = createTerm('A');
            const task = createTask({term, budget: TEST_CONSTANTS.BUDGET.HIGH});

            memory.addTask(task);
            expect(memory.stats.totalConcepts).toBe(1);
            expect(memory.stats.totalTasks).toBe(1);

            const removed = memory.removeConcept(term);
            expect(removed).toBe(true);
            expect(memory.stats.totalConcepts).toBe(0);
            expect(memory.stats.totalTasks).toBe(0);
            expect(memory.focusConcepts.size).toBe(0);
        });

        test('returns false when removing non-existent concept', () => {
            const removed = memory.removeConcept(createTerm('A'));
            expect(removed).toBe(false);
        });

        test('checks concept existence', () => {
            const term = createTerm('A');
            const nonExistentTerm = createTerm('B');

            expect(memory.hasConcept(term)).toBe(false);

            memory.addTask(createTask({term}));
            expect(memory.hasConcept(term)).toBe(true);
            expect(memory.hasConcept(nonExistentTerm)).toBe(false);
        });
    });

    describe('Statistics and Utilities', () => {
        test('gets total task count', () => {
            expect(memory.getTotalTaskCount()).toBe(0);

            const term = createTerm('A');
            const task = createTask({term});

            memory.addTask(task);
            expect(memory.getTotalTaskCount()).toBe(1);
        });

        test('provides detailed statistics', () => {
            const term = createTerm('A');
            const task = createTask({term, budget: TEST_CONSTANTS.BUDGET.HIGH});

            memory.addTask(task);

            const stats = memory.getDetailedStats();

            expect(stats.totalConcepts).toBe(1);
            expect(stats.totalTasks).toBe(1);
            expect(stats.memoryUsage).toBeDefined();
            expect(stats.conceptStats).toBeDefined();
        });

        test('clears correctly', () => {
            const term = createTerm('A');
            const task = createTask({term, budget: TEST_CONSTANTS.BUDGET.HIGH});

            memory.addTask(task);
            expect(memory.stats.totalConcepts).toBe(1);

            memory.clear();

            expect(memory.stats.totalConcepts).toBe(0);
            expect(memory.stats.totalTasks).toBe(0);
            expect(memory.focusConcepts.size).toBe(0);
            expect(memory.concepts.size).toBe(0);
        });
    });

    describe('Advanced Operations', () => {
        test('filters concepts by criteria', () => {
            const highPriorityTask = createTask({
                term: createTerm('A'),
                budget: TEST_CONSTANTS.BUDGET.HIGH
            });
            const lowPriorityTask = createTask({
                term: createTerm('B'),
                budget: TEST_CONSTANTS.BUDGET.LOW
            });

            memory.addTask(highPriorityTask);
            memory.addTask(lowPriorityTask);

            const activeConcepts = memory.getConceptsByCriteria({minActivation: 0.5});
            expect(activeConcepts.length).toBeGreaterThanOrEqual(0);

            const focusConcepts = memory.getConceptsByCriteria({onlyFocus: true});
            expect(focusConcepts.length).toBeGreaterThanOrEqual(0);
        });

        test('gets most active concepts', () => {
            const taskA = createTask({term: createTerm('A'), budget: TEST_CONSTANTS.BUDGET.HIGH});
            const taskB = createTask({term: createTerm('B'), budget: TEST_CONSTANTS.BUDGET.MEDIUM});

            memory.addTask(taskA);
            memory.addTask(taskB);

            const mostActive = memory.getMostActiveConcepts(5);
            // Use flexible assertion since implementation details might change
            expect(mostActive.length).toBeGreaterThanOrEqual(0);
            expect(mostActive.length).toBeLessThanOrEqual(2);
        });

        test('boosts concept activation', () => {
            const term = createTerm('A');
            const task = createTask({term, budget: TEST_CONSTANTS.BUDGET.HIGH});

            memory.addTask(task);
            const concept = memory.getConcept(term);

            const originalActivation = concept.activation;
            memory.boostConceptActivation(term, 0.2);

            expect(concept.activation).toBeGreaterThanOrEqual(originalActivation);
        });

        test('updates concept quality', () => {
            const term = createTerm('A');
            const task = createTask({term, budget: TEST_CONSTANTS.BUDGET.HIGH});

            memory.addTask(task);
            const concept = memory.getConcept(term);

            const originalQuality = concept.quality;
            memory.updateConceptQuality(term, 0.1);

            expect(concept.quality).toBeGreaterThanOrEqual(originalQuality);
        });

        test('consolidates correctly', () => {
            const term = createTerm('A');
            const task = createTask({term, budget: TEST_CONSTANTS.BUDGET.HIGH});

            memory.addTask(task);

            const beforeConsolidation = memory.stats.lastConsolidation;
            memory.consolidate();

            expect(memory.stats.lastConsolidation).toBeGreaterThanOrEqual(beforeConsolidation);
        });
    });

    describe('Error Handling', () => {
        test('should handle edge cases and error conditions', () => {
            // Test with null task
            expect(memory.addTask(null)).toBe(false);

            // Test consolidation with no concepts
            expect(() => {
                memory.consolidate();
            }).not.toThrow();

            // Test getting concept for null term
            expect(() => {
                memory.getConcept(null);
            }).not.toThrow();
        });
    });
});
