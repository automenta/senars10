import {Truth} from '../../src/Truth.js';
import {createNARIntegrationTestSuite} from '../support/narTestSetup.js';
import {flexibleAssertions, runPerformanceTest} from '../support/baseTestUtils.js';

describe('NAR Parser Integration', () => {
    // Using the new NAR test setup utilities
    const {nar, testSetup, patterns} = createNARIntegrationTestSuite();

    describe('Parser Integration with NAR.input()', () => {
        test('accepts atomic belief statements', async () => {
            await patterns.testInputProcessing(nar(), 'cat.', 'BELIEF');
        });

        test('accepts atomic goal statements', async () => {
            await patterns.testInputProcessing(nar(), 'achieve_goal!', 'GOAL');
        });

        test('accepts atomic question statements', async () => {
            await patterns.testInputProcessing(nar(), 'is_cat?', 'QUESTION');
        });

        test('accepts statements with truth values', async () => {
            await nar().input('cat. %1.00;0.90%');
            const beliefs = nar().getBeliefs();
            expect(beliefs[0].truth).toEqual(new Truth(1.00, 0.90));
        });

        test('accepts compound inheritance statements', async () => {
            await patterns.testCompoundTerm(nar(), '(cat --> animal).');
            const beliefs = nar().getBeliefs();
            expect(beliefs.length).toBeGreaterThan(0);
            if (beliefs.length > 0) {
                const belief = beliefs[0];
                expect(belief.term.toString()).toContain('-->');
                expect(belief.term.toString()).toContain('cat');
                expect(belief.term.toString()).toContain('animal');
                flexibleAssertions.expectAtLeast(belief.term.components || [], 2, 'term components');
            }
        });

        test('accepts complex nested statements', async () => {
            await nar().input('((cat --> animal) ==> (animal --> mammal)).');
            const beliefs = nar().getBeliefs();
            expect(beliefs.length).toBeGreaterThan(0);
            if (beliefs.length > 0) {
                const belief = beliefs[0];
                expect(belief.term.toString()).toContain('==>');
                expect(belief.term.toString()).toContain('cat');
                expect(belief.term.toString()).toContain('mammal');
                flexibleAssertions.expectAtLeast(belief.term.components || [], 2, 'nested term components');
            }
        });

        test('accepts set operations', async () => {
            await nar().input('{cat, dog, bird}.');
            const beliefs = nar().getBeliefs();
            expect(beliefs.length).toBeGreaterThan(0);
            if (beliefs.length > 0) {
                const belief = beliefs[0];
                expect(belief.term.toString()).toContain('cat');
                expect(belief.term.toString()).toContain('dog');
                expect(belief.term.toString()).toContain('bird');
                flexibleAssertions.expectAtLeast(belief.term.components || [], 3, 'set operation components');
            }
        });

        test('accepts conjunction statements', async () => {
            await nar().input('(&, red, green, blue).');
            const beliefs = nar().getBeliefs();
            expect(beliefs.length).toBeGreaterThan(0);
            if (beliefs.length > 0) {
                const belief = beliefs[0];
                expect(belief.term.toString()).toContain('&');
                expect(belief.term.toString()).toContain('red');
                expect(belief.term.toString()).toContain('green');
                expect(belief.term.toString()).toContain('blue');
                flexibleAssertions.expectAtLeast(belief.term.components || [], 3, 'conjunction components');
            }
        });

        test('handles multiple inputs correctly', async () => {
            await nar().input('cat.');
            await nar().input('dog.');
            await nar().input('(cat --> animal).');

            const beliefs = nar().getBeliefs();
            expect(beliefs.length).toBe(3);

            const terms = beliefs.map(b => b.term.name);
            expect(terms).toContain('cat');
            expect(terms).toContain('dog');
            expect(terms).toContain('(-->, cat, animal)');
        });

        test('emits correct events during input processing', async () => {
            const events = [];
            nar().on('task.input', (data) => events.push(data));

            await nar().input('test.');

            expect(events.length).toBe(1);
            expect(events[0].source).toBe('user');
            expect(events[0].originalInput).toBe('test.');
            expect(events[0].parsed.taskType).toBe('BELIEF');
        });

        test('handles input errors gracefully', async () => {
            const events = [];
            nar().on('input.error', (data) => events.push(data));

            await expect(nar().input('')).rejects.toThrow();
            expect(events.length).toBe(1);
        });

        test('maintains task properties correctly', async () => {
            const currentTime = Date.now();
            await nar().input('test.');

            const beliefs = nar().getBeliefs();
            expect(beliefs[0]).toHaveProperty('term');
            expect(beliefs[0]).toHaveProperty('type');
            expect(beliefs[0]).toHaveProperty('truth');
            expect(beliefs[0]).toHaveProperty('stamp');
            expect(beliefs[0].stamp).toHaveProperty('creationTime');
        });

        test('processes tasks through reasoning cycle', async () => {
            await nar().input('cat.');
            await nar().input('(cat --> animal).');

            // Run a few cycles
            await nar().runCycles(3);

            const stats = nar().getStats();
            expect(stats.cycleCount).toBeGreaterThan(0);
        });
    });

    describe('Parser Error Handling Integration', () => {
        test('rejects malformed input', async () => {
            const invalidInputs = [
                'unclosed(',
                'missing_punct',
                'invalid%truth%value.',
            ];
            await patterns.testErrorHandling(nar(), invalidInputs);
        });

        test('handles edge cases', async () => {
            await expect(nar().input('   .')).rejects.toThrow(); // Empty term
            await expect(nar().input('term. %2.00;0.50%')).rejects.toThrow(); // Invalid frequency
            await expect(nar().input('term. %1.00;2.00%')).rejects.toThrow(); // Invalid confidence
        });
    });

    describe('Performance Integration', () => {
        test('handles multiple rapid inputs', async () => {
            const inputs = Array.from({length: 100}, (_, i) => `term${i}.`);

            await runPerformanceTest(async () => {
                for (const input of inputs) {
                    await nar().input(input);
                }
            }, 5000, 'Multiple rapid inputs test');

            const beliefs = nar().getBeliefs();
            expect(beliefs.length).toBe(100);
        });

        test('maintains performance with complex terms', async () => {
            const complexInputs = [
                '(((&, a, b, c) --> d) ==> ((|, e, f, g) --> h)).',
                '{i, j, {k, l, {m, n, o}}}.',
                '((p --> q) ==> (r --> s)).'
            ];

            await runPerformanceTest(async () => {
                for (const input of complexInputs) {
                    await nar().input(input);
                }
            }, 1000, 'Complex terms performance test');

            const beliefs = nar().getBeliefs();
            expect(beliefs.length).toBe(3);
        });
    });
});
