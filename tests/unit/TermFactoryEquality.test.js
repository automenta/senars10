import { TermFactory } from '../../src/term/TermFactory.js';

describe('TermFactory Commutative Operator Test', () => {
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
    });

    test('equality operator should preserve both components even if identical', () => {
        const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
        const anotherFiveTerm = termFactory.create({ name: '5', type: 'atomic' });
        
        console.log('Five term:', fiveTerm.name);
        console.log('Another five term:', anotherFiveTerm.name);
        console.log('Are they equal?', fiveTerm.name === anotherFiveTerm.name);
        
        // Create equality term with two identical components
        const equalityTerm = termFactory.create({ operator: '=', components: [fiveTerm, anotherFiveTerm] });
        
        console.log('Equality term name:', equalityTerm.name);
        console.log('Equality term operator:', equalityTerm.operator);
        console.log('Equality term components:', equalityTerm.components);
        console.log('Number of components:', equalityTerm.components.length);
        
        // For an equality operation, we should have 2 components even if they're the same
        expect(equalityTerm.components.length).toBe(2);
        expect(equalityTerm.operator).toBe('=');
    });
    
    test('equality operator with different components', () => {
        const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
        const threeTerm = termFactory.create({ name: '3', type: 'atomic' });
        
        const equalityTerm = termFactory.create({ operator: '=', components: [fiveTerm, threeTerm] });
        
        console.log('Different equality term components:', equalityTerm.components);
        console.log('Number of different components:', equalityTerm.components.length);
        
        expect(equalityTerm.components.length).toBe(2);
    });
});