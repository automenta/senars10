import {TermFactory} from '../../../src/term/TermFactory.js';

describe('TermFactory', () => {
    let factory;

    beforeEach(() => {
        factory = new TermFactory();
    });

    describe('Caching and Uniqueness', () => {
        test.each([
            {
                name: 'identical atomic terms',
                create1: (f) => f.create('A'),
                create2: (f) => f.create('A'),
                expected: 'same'
            },
            {
                name: 'identical compound terms',
                create1: (f) => f.create('-->', [f.create('A'), f.create('B')]),
                create2: (f) => f.create('-->', [f.create('A'), f.create('B')]),
                expected: 'same'
            },
            {
                name: 'different atomic terms',
                create1: (f) => f.create('A'),
                create2: (f) => f.create('B'),
                expected: 'different'
            },
            {
                name: 'different compound terms (operator)',
                create1: (f) => f.create('-->', [f.create('A'), f.create('B')]),
                create2: (f) => f.create('<->', [f.create('A'), f.create('B')]),
                expected: 'different'
            },
        ])('should return $expected instance for $name', ({create1, create2, expected}) => {
            const term1 = create1(factory);
            const term2 = create2(factory);
            if (expected === 'same') {
                expect(term1).toBe(term2);
            } else {
                expect(term1).not.toBe(term2);
            }
        });
    });

    describe('Normalization', () => {
        test.each([
            {
                name: 'commutativity',
                term1: (f) => f.create('&', [f.create('A'), f.create('B')]),
                term2: (f) => f.create('&', [f.create('B'), f.create('A')])
            },
            {
                name: 'associativity',
                term1: (f) => f.create('&', [f.create('A'), f.create('&', [f.create('B'), f.create('C')])]),
                term2: (f) => f.create('&', [f.create('A'), f.create('B'), f.create('C')])
            },
            {
                name: 'redundancy',
                term1: (f) => f.create('&', [f.create('A'), f.create('A')]),
                term2: (f) => f.create('&', [f.create('A')])
            },
        ])('should handle $name correctly by returning the same instance', ({term1, term2}) => {
            expect(term1(factory)).toBe(term2(factory));
        });
    });
});
