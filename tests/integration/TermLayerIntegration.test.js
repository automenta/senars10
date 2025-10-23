import {NAR} from '../../src/nar/NAR.js';
import {TermFactory} from '../../src/term/TermFactory.js';

describe('TermLayer Integration', () => {
    let nar;
    let termFactory;

    beforeEach(() => {
        nar = new NAR();
        termFactory = new TermFactory();
    });

    afterEach(() => {
        if (nar.metricsMonitor) {
            nar.metricsMonitor.shutdown();
        }
    });

    test('TermLayer should be accessible through NAR', () => {
        expect(nar.termLayer).toBeDefined();
        expect(nar.termLayer.add).toBeDefined();
        expect(nar.termLayer.get).toBeDefined();
        expect(nar.termLayer.remove).toBeDefined();
    });

    test('TermLayer should be used in reasoning cycle to enhance tasks', async () => {
        // Add some associations to the TermLayer
        const source = termFactory.create('animal');
        const target = termFactory.create('cat');
        nar.termLayer.add(source, target, {priority: 0.8});

        // Add a task that matches the source term using the input method with narsese string
        await nar.input('animal. %1.0;0.9%');

        // Execute a reasoning cycle
        await nar.step();

        // Verify that the cycle ran without errors
        expect(nar.cycleCount).toBeGreaterThan(0);
    });

    test('Associative reasoning with TermLayer should work correctly', async () => {
        // Create and add associations to TermLayer
        const catTerm = termFactory.create('cat');
        const animalTerm = termFactory.create('animal');
        const mammalTerm = termFactory.create('mammal');

        // Add associations: cat -> animal, cat -> mammal
        nar.termLayer.add(catTerm, animalTerm, {priority: 0.9});
        nar.termLayer.add(catTerm, mammalTerm, {priority: 0.8});

        // Add belief about cat using narsese string
        await nar.input('cat. %1.0;0.9%');

        // Simple reasoning cycle to test that TermLayer doesn't break the process
        await nar.step();

        // Verify TermLayer statistics are available
        const stats = nar.termLayer.getStats();
        expect(typeof stats).toBe('object');
        expect(stats.linkCount).toBeGreaterThanOrEqual(2);
    });

    test('TermLayer capacity limits are enforced', () => {
        const layer = nar.termLayer;
        const originalCapacity = layer.capacity;

        // Temporarily set a small capacity for testing
        Object.defineProperty(layer, 'capacity', {value: 2, writable: true});

        const source1 = termFactory.create('source1');
        const source2 = termFactory.create('source2');
        const source3 = termFactory.create('source3');
        const target1 = termFactory.create('target1');
        const target2 = termFactory.create('target2');
        const target3 = termFactory.create('target3');

        // Add three links with increasing priorities (so lowest priority gets removed)
        layer.add(source1, target1, {priority: 1}); // Should be removed when capacity exceeded
        layer.add(source2, target2, {priority: 2});
        layer.add(source3, target3, {priority: 3});

        // Should only have 2 links due to capacity limit
        expect(layer.count).toBe(2);
        expect(layer.has(source1, target1)).toBe(false); // Lowest priority removed
        expect(layer.has(source2, target2)).toBe(true);
        expect(layer.has(source3, target3)).toBe(true);

        // Reset capacity to original
        Object.defineProperty(layer, 'capacity', {value: originalCapacity, writable: true});
    });
});