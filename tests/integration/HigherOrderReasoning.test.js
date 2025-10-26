import { TestNAR } from '../../src/testing/TestNAR.js';
import { TermFactory } from '../../src/term/TermFactory.js';

describe('Higher-Order Reasoning', () => {
    it('should correctly create and cache a higher-order term', () => {
        const termFactory = new TermFactory();
        const a = termFactory.create('a');
        const b = termFactory.create('b');
        const c = termFactory.create('c');
        const implication = termFactory.create({ operator: '==>', components: [a, b] });
        const higherOrderTerm = termFactory.create({ operator: '-->', components: [implication, c] });

        expect(higherOrderTerm.toString()).toBe('(-->, (==>, a, b), c)');

        const cachedTerm = termFactory.create({ operator: '-->', components: [implication, c] });
        expect(cachedTerm).toBe(higherOrderTerm);
    });
});
