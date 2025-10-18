import {NAR} from '../../src/core/nar/NAR.js';

describe('NAR Parser Integration', () => {
    let nar;

    beforeEach(() => {
        nar = new NAR();
    });

    afterEach(() => {
        if (nar.isRunning) {
            nar.stop();
        }
    });

    describe('Parser Integration with NAR.input()', () => {
        test('accepts atomic belief statements', async () => {
            const result = await nar.input('cat.');
            expect(result).toBe(true);

            const beliefs = nar.getBeliefs();
            expect(beliefs.length).toBe(1);
            expect(beliefs[0].term.name).toBe('cat');
            expect(beliefs[0].type).toBe('BELIEF');
        });

        test('accepts atomic goal statements', async () => {
            const result = await nar.input('achieve_goal!');
            expect(result).toBe(true);

            const goals = nar.getGoals();
            expect(goals.length).toBe(1);
            expect(goals[0].term.name).toBe('achieve_goal');
            expect(goals[0].type).toBe('GOAL');
        });

        test('accepts atomic question statements', async () => {
            const result = await nar.input('is_cat?');
            expect(result).toBe(true);

            const questions = nar.getQuestions();
            expect(questions.length).toBe(1);
            expect(questions[0].term.name).toBe('is_cat');
            expect(questions[0].type).toBe('QUESTION');
        });

        test('accepts statements with truth values', async () => {
            const result = await nar.input('cat. %1.00;0.90%');
            expect(result).toBe(true);

            const beliefs = nar.getBeliefs();
            expect(beliefs[0].truthValue).toEqual({frequency: 1.00, confidence: 0.90});
        });

        test('accepts compound inheritance statements', async () => {
            const result = await nar.input('(cat --> animal).');
            expect(result).toBe(true);

            const beliefs = nar.getBeliefs();
            expect(beliefs[0].term.name).toBe('(-->, cat, animal)');
            expect(beliefs[0].term.components.length).toBe(2);
            expect(beliefs[0].term.components[0].name).toBe('cat');
            expect(beliefs[0].term.components[1].name).toBe('animal');
        });

        test('accepts complex nested statements', async () => {
            const result = await nar.input('((cat --> animal) ==> (animal --> mammal)).');
            expect(result).toBe(true);

            const beliefs = nar.getBeliefs();
            expect(beliefs[0].term.name).toBe('(==>, (-->, cat, animal), (-->, animal, mammal))');
            expect(beliefs[0].term.components.length).toBe(2);
        });

        test('accepts set operations', async () => {
            const result = await nar.input('{cat, dog, bird}.');
            expect(result).toBe(true);

            const beliefs = nar.getBeliefs();
            expect(beliefs[0].term.name).toBe('{cat, dog, bird}');
            expect(beliefs[0].term.components.length).toBe(3);
        });

        test('accepts conjunction statements', async () => {
            const result = await nar.input('(&, red, green, blue).');
            expect(result).toBe(true);

            const beliefs = nar.getBeliefs();
            expect(beliefs[0].term.name).toBe('(&, blue, green, red)');
            expect(beliefs[0].term.components.length).toBe(3);
        });

        test('handles multiple inputs correctly', async () => {
            await nar.input('cat.');
            await nar.input('dog.');
            await nar.input('(cat --> animal).');

            const beliefs = nar.getBeliefs();
            expect(beliefs.length).toBe(3);

            const terms = beliefs.map(b => b.term.name);
            expect(terms).toContain('cat');
            expect(terms).toContain('dog');
            expect(terms).toContain('(-->, cat, animal)');
        });

        test('emits correct events during input processing', async () => {
            const events = [];
            nar.on('task.input', (data) => events.push(data));

            await nar.input('test.');

            expect(events.length).toBe(1);
            expect(events[0].source).toBe('user');
            expect(events[0].originalInput).toBe('test.');
            expect(events[0].parsed.taskType).toBe('BELIEF');
        });

        test('handles input errors gracefully', async () => {
            const events = [];
            nar.on('input.error', (data) => events.push(data));

            await expect(nar.input('')).rejects.toThrow();
            expect(events.length).toBe(1);
        });

        test('maintains task properties correctly', async () => {
            const currentTime = Date.now();
            await nar.input('test.');

            const beliefs = nar.getBeliefs();
            expect(beliefs[0]).toHaveProperty('term');
            expect(beliefs[0]).toHaveProperty('type');
            expect(beliefs[0]).toHaveProperty('truthValue');
            expect(beliefs[0]).toHaveProperty('stamp');
            expect(beliefs[0]).toHaveProperty('creationTime');
        });

        test('processes tasks through reasoning cycle', async () => {
            await nar.input('cat.');
            await nar.input('(cat --> animal).');

            // Run a few cycles
            await nar.runCycles(3);

            const stats = nar.getStats();
            expect(stats.cycleCount).toBeGreaterThan(0);
        });
    });

    describe('Parser Error Handling Integration', () => {
        test('rejects malformed input', async () => {
            await expect(nar.input('unclosed(')).rejects.toThrow();
            await expect(nar.input('missing_punct')).rejects.toThrow();
            await expect(nar.input('invalid%truth%value.')).rejects.toThrow();
        });

        test('handles edge cases', async () => {
            await expect(nar.input('   .')).rejects.toThrow(); // Empty term
            await expect(nar.input('term. %2.00;0.50%')).rejects.toThrow(); // Invalid frequency
            await expect(nar.input('term. %1.00;2.00%')).rejects.toThrow(); // Invalid confidence
        });
    });

    describe('Performance Integration', () => {
        test('handles multiple rapid inputs', async () => {
            const inputs = Array.from({length: 100}, (_, i) => `term${i}.`);

            for (const input of inputs) {
                await nar.input(input);
            }

            const beliefs = nar.getBeliefs();
            expect(beliefs.length).toBe(100);
        });

        test('maintains performance with complex terms', async () => {
            const complexInputs = [
                '(((&, a, b, c) --> d) ==> ((|, e, f, g) --> h)).',
                '{i, j, {k, l, {m, n, o}}}.',
                '((p --> q) ==> (r --> s)).'
            ];

            const startTime = Date.now();

            for (const input of complexInputs) {
                await nar.input(input);
            }

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

            const beliefs = nar.getBeliefs();
            expect(beliefs.length).toBe(3);
        });
    });
});
