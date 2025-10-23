import {TermLayer} from '../../../src/memory/TermLayer.js';
import {Term} from '../../../src/term/Term.js';

describe('TermLayer', () => {
    let termLayer;

    beforeEach(() => {
        termLayer = new TermLayer({capacity: 10});
    });

    test('initializes correctly with capacity', () => {
        expect(termLayer.capacity).toBe(10);
        expect(termLayer.count).toBe(0);
    });

    test('adds and retrieves links', () => {
        const source = new Term('atom', 'A');
        const target = new Term('atom', 'B');

        const result = termLayer.add(source, target, {priority: 5});
        expect(result).toBe(true);
        expect(termLayer.count).toBe(1);

        const links = termLayer.get(source);
        expect(links).toHaveLength(1);
        expect(links[0].target.name).toBe('B');
    });

    test('removes links', () => {
        const source = new Term('atom', 'A');
        const target = new Term('atom', 'B');

        termLayer.add(source, target);
        expect(termLayer.has(source, target)).toBe(true);

        const result = termLayer.remove(source, target);
        expect(result).toBe(true);
        expect(termLayer.has(source, target)).toBe(false);
        expect(termLayer.count).toBe(0);
    });

    test('updates link data', () => {
        const source = new Term('atom', 'A');
        const target = new Term('atom', 'B');

        termLayer.add(source, target, {priority: 3, confidence: 0.8});
        expect(termLayer.has(source, target)).toBe(true);

        const updateResult = termLayer.update(source, target, {priority: 7, confidence: 0.9});
        expect(updateResult).toBe(true);

        const links = termLayer.get(source);
        expect(links[0].data.priority).toBe(7);
        expect(links[0].data.confidence).toBe(0.9);
    });

    test('respects capacity limits', () => {
        const layer = new TermLayer({capacity: 2});

        const source1 = new Term('atom', 'A');
        const target1 = new Term('atom', 'B');
        const source2 = new Term('atom', 'C');
        const target2 = new Term('atom', 'D');
        const source3 = new Term('atom', 'E');
        const target3 = new Term('atom', 'F');

        layer.add(source1, target1, {priority: 1});
        layer.add(source2, target2, {priority: 2});
        layer.add(source3, target3, {priority: 3}); // Should evict lowest priority

        expect(layer.count).toBe(2);
        expect(layer.has(source1, target1)).toBe(false); // Lowest priority removed
        expect(layer.has(source2, target2)).toBe(true);
        expect(layer.has(source3, target3)).toBe(true);
    });

    test('clears all links', () => {
        const source = new Term('atom', 'A');
        const target = new Term('atom', 'B');

        termLayer.add(source, target);
        expect(termLayer.count).toBe(1);

        termLayer.clear();
        expect(termLayer.count).toBe(0);
        expect(termLayer.get(source)).toHaveLength(0);
    });

    test('gets statistics', () => {
        const stats = termLayer.getStats();
        expect(stats.linkCount).toBe(0);
        expect(stats.capacity).toBe(10);
        expect(stats.utilization).toBe(0);
    });
});