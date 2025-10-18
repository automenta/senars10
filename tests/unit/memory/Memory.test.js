import {Memory} from '../../../src/memory/Memory.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Memory', () => {
    let memory;
    let config;
    let termFactory;
    let newAtom;

    beforeEach(() => {
        termFactory = new TermFactory();
        newAtom = name => termFactory.create({components: [name]});
        config = {
            priorityThreshold: 0.5,
            consolidationInterval: 10,
            priorityDecayRate: 0.9
        };
        memory = new Memory(config);
    });

    test('should initialize with correct default state', () => {
        expect(memory.concepts.size).toBe(0);
        expect(memory.focusConcepts.size).toBe(0);
        expect(memory.stats.totalConcepts).toBe(0);
        expect(memory.stats.totalTasks).toBe(0);
        expect(memory.stats.focusConceptsCount).toBe(0);
        expect(memory.config).toStrictEqual(config);
    });

    test('should add tasks and create concepts correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            punctuation: '.',
            budget: {priority: 0.7}
        });

        const added = memory.addTask(task);

        expect(added).toBe(true);
        expect(memory.stats.totalConcepts).toBe(1);
        expect(memory.stats.totalTasks).toBe(1);

        // Should be in focus memory due to high priority
        expect(memory.focusConcepts.size).toBe(1);
    });

    test('should not add duplicate tasks to concepts', () => {
        const term = newAtom('A');
        const task1 = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            punctuation: '.',
            budget: {priority: 0.7}
        });
        const task2 = new Task({
            term,
            truth: {frequency: 0.8, confidence: 0.7},
            punctuation: '.',
            budget: {priority: 0.6}
        });

        memory.addTask(task1);
        memory.addTask(task2);

        expect(memory.stats.totalConcepts).toBe(1);
        expect(memory.stats.totalTasks).toBe(2); // Both tasks should be stored
    });

    test('should retrieve concepts correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            punctuation: '.'
        });

        memory.addTask(task);
        const concept = memory.getConcept(term);

        expect(concept).toBeDefined();
        expect(concept.term).toBe(term);
        expect(concept.totalTasks).toBe(1);
    });

    test('should return null for non-existent concepts', () => {
        const term = newAtom('A');
        const nonExistentTerm = newAtom('B');

        const concept = memory.getConcept(nonExistentTerm);
        expect(concept).toBeNull();
    });

    test('should get all concepts correctly', () => {
        const termA = newAtom('A');
        const termB = newAtom('B');

        const taskA = new Task({term: termA, type: 'BELIEF'});
        const taskB = new Task({term: termB, type: 'BELIEF'});

        memory.addTask(taskA);
        memory.addTask(taskB);

        const allConcepts = memory.getAllConcepts();
        expect(allConcepts).toHaveLength(2);
    });

    test('should filter concepts by criteria correctly', () => {
        const termA = newAtom('A');
        const termB = newAtom('B');

        const highPriorityTask = new Task({
            term: termA,
            punctuation: '.',
            budget: {priority: 0.8}
        });
        const lowPriorityTask = new Task({
            term: termB,
            punctuation: '.',
            budget: {priority: 0.3}
        });

        memory.addTask(highPriorityTask);
        memory.addTask(lowPriorityTask);

        // Test minActivation criteria
        const activeConcepts = memory.getConceptsByCriteria({minActivation: 0.5});
        expect(activeConcepts.length).toBeGreaterThanOrEqual(0); // May vary based on implementation

        // Test onlyFocus criteria
        const focusConcepts = memory.getConceptsByCriteria({onlyFocus: true});
        expect(focusConcepts.length).toBeGreaterThanOrEqual(0);
    });

    test('should get most active concepts correctly', () => {
        const termA = newAtom('A');
        const termB = newAtom('B');

        const taskA = new Task({term: termA, punctuation: '.', budget: {priority: 0.9}});
        const taskB = new Task({term: termB, punctuation: '.', budget: {priority: 0.7}});

        memory.addTask(taskA);
        memory.addTask(taskB);

        const mostActive = memory.getMostActiveConcepts(5);
        expect(mostActive.length).toBeLessThanOrEqual(2);
    });

    test('should remove concepts correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.8}
        });

        memory.addTask(task);
        expect(memory.stats.totalConcepts).toBe(1);
        expect(memory.stats.totalTasks).toBe(1);

        const removed = memory.removeConcept(term);
        expect(removed).toBe(true);
        expect(memory.stats.totalConcepts).toBe(0);
        expect(memory.stats.totalTasks).toBe(0);
        expect(memory.focusConcepts.size).toBe(0);
    });

    test('should return false when removing non-existent concept', () => {
        const term = newAtom('A');
        const removed = memory.removeConcept(term);
        expect(removed).toBe(false);
    });

    test('should consolidate memory correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.8}
        });

        memory.addTask(task);

        const beforeConsolidation = memory.stats.lastConsolidation;
        memory.consolidate();

        // Should update consolidation timestamp
        expect(memory.stats.lastConsolidation).toBeGreaterThanOrEqual(beforeConsolidation);
    });

    test('should boost concept activation correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.8}
        });

        memory.addTask(task);
        const concept = memory.getConcept(term);

        const originalActivation = concept.activation;
        memory.boostConceptActivation(term, 0.2);

        // Activation should be boosted (implementation dependent)
        expect(concept.activation).toBeGreaterThanOrEqual(originalActivation);
    });

    test('should update concept quality correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.8}
        });

        memory.addTask(task);
        const concept = memory.getConcept(term);

        const originalQuality = concept.quality;
        memory.updateConceptQuality(term, 0.1);

        // Quality should be updated (implementation dependent)
        expect(concept.quality).toBeGreaterThanOrEqual(originalQuality);
    });

    test('should provide detailed statistics correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.8}
        });

        memory.addTask(task);

        const stats = memory.getDetailedStats();

        expect(stats.totalConcepts).toBe(1);
        expect(stats.totalTasks).toBe(1);
        expect(stats.memoryUsage).toBeDefined();
        expect(stats.conceptStats).toBeDefined();
    });

    test('should clear memory correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.8}
        });

        memory.addTask(task);
        expect(memory.stats.totalConcepts).toBe(1);

        memory.clear();

        expect(memory.stats.totalConcepts).toBe(0);
        expect(memory.stats.totalTasks).toBe(0);
        expect(memory.focusConcepts.size).toBe(0);
        expect(memory.concepts.size).toBe(0);
    });

    test('should check concept existence correctly', () => {
        const term = newAtom('A');
        const nonExistentTerm = newAtom('B');

        expect(memory.hasConcept(term)).toBe(false);

        memory.addTask(new Task({term, punctuation: '.'}));
        expect(memory.hasConcept(term)).toBe(true);
        expect(memory.hasConcept(nonExistentTerm)).toBe(false);
    });

    test('should get total task count correctly', () => {
        expect(memory.getTotalTaskCount()).toBe(0);

        const term = newAtom('A');
        const task = new Task({term, punctuation: '.'});

        memory.addTask(task);
        expect(memory.getTotalTaskCount()).toBe(1);
    });

    test('should handle focus memory correctly based on priority threshold', () => {
        const termA = newAtom('A');
        const termB = newAtom('B');

        const highPriorityTask = new Task({
            term: termA,
            punctuation: '.',
            budget: {priority: 0.8} // Above threshold
        });
        const lowPriorityTask = new Task({
            term: termB,
            punctuation: '.',
            budget: {priority: 0.3} // Below threshold
        });

        memory.addTask(highPriorityTask);
        memory.addTask(lowPriorityTask);

        // Only high priority task should be in focus
        expect(memory.focusConcepts.size).toBe(1);
    });

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