import { TermFactory } from '../../src/term/TermFactory.js';

describe('Trace TermFactory Process', () => {
    test('trace the creation of equality term', () => {
        const factory = new TermFactory();
        
        // Create terms separately first
        const fiveTerm = factory.create({ name: '5', type: 'atomic' });
        const anotherFiveTerm = factory.create({ name: '5', type: 'atomic' });
        
        // Create the equality term step by step
        const data = { operator: '=', components: [fiveTerm, anotherFiveTerm] };
        const {operator, components} = factory._normalizeTermData(data);
        
        // Advanced canonicalization with proper commutativity and normalization
        const normalizedComponents = factory._canonicalizeComponents(operator, components);
        
        const name = factory._buildCanonicalName(operator, normalizedComponents);
        
        // Check if term is already cached
        const term = factory._createAndCache(operator, normalizedComponents, name);
    });
});