import {MemoryConsolidation} from '../../../src/memory/MemoryConsolidation.js';
import {Memory} from '../../../src/memory/Memory.js';
import {Concept} from '../../../src/memory/Concept.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('MemoryConsolidation', () => {
    let consolidation;
    let memory;
    let termFactory;
    let config;

    beforeEach(() => {
        consolidation = new MemoryConsolidation({
            activationThreshold: 0.1,
            decayRate: 0.05,
            propagationFactor: 0.3
        });
        termFactory = new TermFactory();
        config = {
            priorityThreshold: 0.5,
            consolidationInterval: 10,
            priorityDecayRate: 0.1
        };
        memory = new Memory(config);
    });

    test('should initialize with correct configuration', () => {
        expect(consolidation.config.activationThreshold).toBe(0.1);
        expect(consolidation.config.decayRate).toBe(0.05);
        expect(consolidation.config.propagationFactor).toBe(0.3);
    });

    test('should consolidate memory with all phases', () => {
        // Add some concepts and tasks
        const term1 = termFactory.create({components: ['A']});
        const term2 = termFactory.create({components: ['B']});

        const task1 = new Task({term: term1, type: 'BELIEF', priority: 0.8});
        const task2 = new Task({term: term2, type: 'BELIEF', priority: 0.6});

        memory.addTask(task1);
        memory.addTask(task2);

        const results = consolidation.consolidate(memory);

        expect(results).toHaveProperty('conceptsRemoved');
        expect(results).toHaveProperty('activationPropagated');
        expect(results).toHaveProperty('conceptsDecayed');
        expect(results).toHaveProperty('timestamp');
        expect(typeof results.conceptsRemoved).toBe('number');
        expect(typeof results.activationPropagated).toBe('number');
        expect(typeof results.conceptsDecayed).toBe('number');
    });

    test('should propagate activation between related concepts', () => {
        const term1 = termFactory.create({components: ['dog']});
        const term2 = termFactory.create({components: ['animal']});
        const term3 = termFactory.create({components: ['cat']});

        const concept1 = new Concept(term1, Concept.DEFAULT_CONFIG);
        const concept2 = new Concept(term2, Concept.DEFAULT_CONFIG);
        const concept3 = new Concept(term3, Concept.DEFAULT_CONFIG);

        // Manually set high activation for concept1
        concept1._activation = 0.8;

        memory._concepts.set(term1, concept1);
        memory._concepts.set(term2, concept2);
        memory._concepts.set(term3, concept3);

        const propagated = consolidation._propagateActivation(memory);

        // Should propagate to related concepts (concept2 - animal)
        expect(propagated).toBeGreaterThan(0);
    });

    test('should calculate term similarity correctly', () => {
        const term1 = termFactory.create({components: ['dog']});
        const term2 = termFactory.create({components: ['dog']});
        const term3 = termFactory.create({components: ['cat']});

        const similarity1 = consolidation._calculateTermSimilarity(term1, term2);
        const similarity2 = consolidation._calculateTermSimilarity(term1, term3);

        expect(similarity1).toBe(1.0); // Same terms
        expect(similarity2).toBe(0.0); // Different terms
    });

    test('should calculate compound term similarity correctly', () => {
        const term1 = termFactory.create({
            components: [termFactory.create({components: ['A']}), termFactory.create({components: ['B']})],
            operator: '-->'
        });
        const term2 = termFactory.create({
            components: [termFactory.create({components: ['A']}), termFactory.create({components: ['B']})],
            operator: '-->'
        });
        const term3 = termFactory.create({
            components: [termFactory.create({components: ['C']}), termFactory.create({components: ['D']})],
            operator: '-->'
        });

        const similarity1 = consolidation._calculateTermSimilarity(term1, term2);
        const similarity2 = consolidation._calculateTermSimilarity(term1, term3);

        expect(similarity1).toBe(1.0); // Same structure
        expect(similarity2).toBe(0.0); // Different components
    });

    test('should apply decay to all concepts', () => {
        const term1 = termFactory.create({components: ['A']});
        const term2 = termFactory.create({components: ['B']});

        const concept1 = new Concept(term1, Concept.DEFAULT_CONFIG);
        const concept2 = new Concept(term2, Concept.DEFAULT_CONFIG);

        concept1._activation = 0.5;
        concept2._activation = 0.8;

        memory._concepts.set(term1, concept1);
        memory._concepts.set(term2, concept2);

        const decayed = consolidation._applyDecay(memory);

        expect(decayed).toBe(2);
        expect(concept1.activation).toBeLessThan(0.5);
        expect(concept2.activation).toBeLessThan(0.8);
    });

    test('should remove decayed concepts', () => {
        const term1 = termFactory.create({components: ['A']});
        const term2 = termFactory.create({components: ['B']});

        const concept1 = new Concept(term1, Concept.DEFAULT_CONFIG);
        const concept2 = new Concept(term2, Concept.DEFAULT_CONFIG);

        concept1._activation = 0.05; // Below threshold
        concept1._totalTasks = 1; // Below min tasks
        concept2._activation = 0.5; // Above threshold

        memory._concepts.set(term1, concept1);
        memory._concepts.set(term2, concept2);
        memory._stats.totalConcepts = 2;

        const removed = consolidation._removeDecayedConcepts(memory);

        expect(removed).toBe(1);
        expect(memory._concepts.size).toBe(1);
        expect(memory._concepts.has(term2)).toBe(true);
        expect(memory._concepts.has(term1)).toBe(false);
    });

    test('should calculate health metrics correctly', () => {
        const term = termFactory.create({components: ['A']});
        const concept = new Concept(term, Concept.DEFAULT_CONFIG);
        concept._activation = 0.5;
        concept._quality = 0.7;

        memory._concepts.set(term, concept);

        const health = consolidation.calculateHealthMetrics(memory);

        expect(health.averageActivation).toBe(0.5);
        expect(health.averageQuality).toBe(0.7);
        expect(health.memoryEfficiency).toBe(0); // No tasks
        expect(health.consolidationNeeded).toBe(false);
    });

    test('should handle empty memory correctly', () => {
        const health = consolidation.calculateHealthMetrics(memory);

        expect(health.averageActivation).toBe(0);
        expect(health.averageQuality).toBe(0);
        expect(health.memoryEfficiency).toBe(1);
        expect(health.consolidationNeeded).toBe(false);
    });

    test('should update configuration correctly', () => {
        consolidation.configure({
            activationThreshold: 0.2,
            decayRate: 0.1,
            propagationFactor: 0.5
        });

        expect(consolidation.config.activationThreshold).toBe(0.2);
        expect(consolidation.config.decayRate).toBe(0.1);
        expect(consolidation.config.propagationFactor).toBe(0.5);
    });

    test('should handle edge cases in consolidation', () => {
        // Test with concepts having zero activation
        const term = termFactory.create({components: ['A']});
        const concept = new Concept(term, Concept.DEFAULT_CONFIG);
        concept._activation = 0;

        memory._concepts.set(term, concept);

        expect(() => {
            consolidation.consolidate(memory);
        }).not.toThrow();

        // Test with concepts having very high activation
        concept._activation = 1.0;
        expect(() => {
            consolidation.consolidate(memory);
        }).not.toThrow();
    });

    test('should handle similarity calculation edge cases', () => {
        // Test with different operators
        const term1 = termFactory.create({
            components: [termFactory.create({components: ['A']}), termFactory.create({components: ['B']})],
            operator: '-->'
        });
        const term2 = termFactory.create({
            components: [termFactory.create({components: ['A']}), termFactory.create({components: ['B']})],
            operator: '<->'
        });

        const similarity = consolidation._calculateTermSimilarity(term1, term2);
        expect(similarity).toBe(0.0); // Different operators
    });
});