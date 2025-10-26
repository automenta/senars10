import { TermFactory } from '../../src/term/TermFactory.js';

describe('Trace TermFactory Process', () => {
    test('trace the creation of equality term', () => {
        const factory = new TermFactory();
        
        // Create terms separately first
        const fiveTerm = factory.create({ name: '5', type: 'atomic' });
        const anotherFiveTerm = factory.create({ name: '5', type: 'atomic' });
        
        console.log('Created individual terms:');
        console.log('- Five term:', fiveTerm.name, fiveTerm);
        console.log('- Another five term:', anotherFiveTerm.name, anotherFiveTerm);
        
        // Create the equality term step by step
        console.log('Creating equality term with components:', [fiveTerm, anotherFiveTerm]);
        console.log('Component names:', [fiveTerm.name, anotherFiveTerm.name]);
        
        const data = { operator: '=', components: [fiveTerm, anotherFiveTerm] };
        const {operator, components} = factory._normalizeTermData(data);
        console.log('After normalizeTermData - operator:', operator, 'components length:', components.length);
        
        // Advanced canonicalization with proper commutativity and normalization
        const normalizedComponents = factory._canonicalizeComponents(operator, components);
        console.log('After canonicalizeComponents - components length:', normalizedComponents.length);
        
        const name = factory._buildCanonicalName(operator, normalizedComponents);
        console.log('Built canonical name:', name);
        
        // Check if term is already cached
        const term = factory._createAndCache(operator, normalizedComponents, name);
        console.log('Final term components:', term.components, 'length:', term.components.length);
    });
});