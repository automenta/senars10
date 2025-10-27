import { TermFactory } from '../../src/term/TermFactory.js';

describe('TermFactory Commutative Operator Test', () => {
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
    });

    test('equality operator should preserve both components even if identical', () => {
        const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
        const anotherFiveTerm = termFactory.create({ name: '5', type: 'atomic' });
        
        // Create equality term with two identical components
        const equalityTerm = termFactory.create({ operator: '=', components: [fiveTerm, anotherFiveTerm] });
        
        // For an equality operation, we should have 2 components even if they're the same
        expect(equalityTerm.components.length).toBe(2);
        expect(equalityTerm.operator).toBe('=');
    });
    
    test('equality operator with different components', () => {
        const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
        const threeTerm = termFactory.create({ name: '3', type: 'atomic' });
        
        const equalityTerm = termFactory.create({ operator: '=', components: [fiveTerm, threeTerm] });
        
        expect(equalityTerm.components.length).toBe(2);
    });
});