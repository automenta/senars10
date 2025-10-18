/**
 * NAR Integration Tests
 * Tests the complete input → processing → memory storage cycle
 */

import {NAR} from '../../src/nar/NAR.js';
import {TermFactory} from '../../src/term/TermFactory.js';

describe('NAR Integration Tests', () => {
    let nar;
    let termFactory;

    beforeEach(() => {
        nar = new NAR({
            debug: {enabled: false},
            cycle: {delay: 10, maxTasksPerCycle: 5}
        });
        termFactory = new TermFactory();
    });

    afterEach(() => {
        if (nar && nar.isRunning) {
            nar.stop();
        }
    });

    describe('Basic Input Processing', () => {
        test('should accept and store a simple belief', async () => {
            const input = '(cat --> animal).';

            const result = await nar.input(input);

            expect(result).toBe(true);

            // Check that task was stored in memory
            const beliefs = nar.getBeliefs();
            expect(beliefs.length).toBeGreaterThan(0);

            const catBelief = beliefs.find(b => b.term.toString().includes('cat'));
            expect(catBelief).toBeDefined();
            expect(catBelief.type).toBe('BELIEF');
        });

        test('should handle belief with truth value', async () => {
            const input = '(bird --> animal)%0.9;0.8%.';

            await nar.input(input);

            const beliefs = nar.getBeliefs();
            const birdBelief = beliefs.find(b => b.term.toString().includes('bird'));

            expect(birdBelief).toBeDefined();
            expect(birdBelief.truth).toEqual({frequency: 0.9, confidence: 0.8});
        });

        test('should handle goal input', async () => {
            const input = '(want_food --> goal)!';

            await nar.input(input);

            const goals = nar.getGoals();
            expect(goals.length).toBeGreaterThan(0);

            const wantFoodGoal = goals.find(g => g.term.toString().includes('want_food'));
            expect(wantFoodGoal).toBeDefined();
            expect(wantFoodGoal.type).toBe('GOAL');
        });

        test('should handle question input', async () => {
            const input = '(cat --> ?x)?';

            await nar.input(input);

            const questions = nar.getQuestions();
            expect(questions.length).toBeGreaterThan(0);

            const catQuestion = questions.find(q => q.term.toString().includes('cat'));
            expect(catQuestion).toBeDefined();
            expect(catQuestion.type).toBe('QUESTION');
        });
    });

    describe('Memory Storage and Retrieval', () => {
        test.skip('should store tasks in appropriate concepts', async () => {
            await nar.input('(cat --> animal).');
            await nar.input('(dog --> animal).');
            await nar.input('(cat --> pet).');

            // Check that concepts were created
            const concepts = nar.memory.getAllConcepts();
            expect(concepts.length).toBeGreaterThanOrEqual(3);

            // Check specific concepts
            const catConcept = nar.memory.getConcept(termFactory.create('cat'));
            const dogConcept = nar.memory.getConcept(termFactory.create('dog'));
            const animalConcept = nar.memory.getConcept(termFactory.create('animal'));

            expect(catConcept).toBeDefined();
            expect(dogConcept).toBeDefined();
            expect(animalConcept).toBeDefined();

            // Cat concept should have multiple tasks
            expect(catConcept.totalTasks).toBeGreaterThanOrEqual(2);
        });

        test.skip('should retrieve beliefs by query term', async () => {
            await nar.input('(cat --> animal).');
            await nar.input('(dog --> animal).');
            await nar.input('(bird --> animal).');

            const catTerm = termFactory.create('cat');
            const catBeliefs = nar.query(catTerm);

            expect(catBeliefs.length).toBeGreaterThan(0);
            expect(catBeliefs[0].term.toString()).toContain('cat');
        });

        test('should handle compound terms correctly', async () => {
            await nar.input('(&, cat, pet, animal).');

            const beliefs = nar.getBeliefs();
            const compoundBelief = beliefs.find(b =>
                b.term.toString().includes('cat') && b.term.toString().includes('pet')
            );

            expect(compoundBelief).toBeDefined();
            expect(compoundBelief.term.operator).toBe('&');
        });
    });

    describe('System Lifecycle', () => {
        test('should start and stop correctly', async () => {
            expect(nar.isRunning).toBe(false);

            const started = nar.start();
            expect(started).toBe(true);
            expect(nar.isRunning).toBe(true);

            const stopped = nar.stop();
            expect(stopped).toBe(true);
            expect(nar.isRunning).toBe(false);
        });

        test.skip('should execute single cycle', async () => {
            await nar.input('(cat --> animal).');

            const result = await nar.step();

            expect(result).toBeDefined();
            expect(result.cycleNumber).toBe(1);
            expect(result.processedTasks).toBeGreaterThan(0);
        });

        test('should execute multiple cycles', async () => {
            await nar.input('(cat --> animal).');
            await nar.input('(dog --> animal).');

            const results = await nar.runCycles(3);

            expect(results.length).toBe(3);
            results.forEach((result, index) => {
                expect(result.cycleNumber).toBe(index + 1);
            });
        });

        test('should reset system state', async () => {
            await nar.input('(cat --> animal).');
            await nar.input('(dog --> animal).');

            expect(nar.getBeliefs().length).toBeGreaterThan(0);
            expect(nar.cycleCount).toBe(0);

            nar.reset();

            expect(nar.getBeliefs().length).toBe(0);
            expect(nar.cycleCount).toBe(0);
        });
    });

    describe('Event System', () => {
        test('should emit events for input processing', async () => {
            const inputEvents = [];
            const taskAddedEvents = [];

            nar.on('task.input', (data) => inputEvents.push(data));
            nar.on('task.added', (data) => taskAddedEvents.push(data));

            await nar.input('(test --> example).');

            expect(inputEvents.length).toBe(1);
            expect(inputEvents[0].source).toBe('user');
            expect(inputEvents[0].originalInput).toBe('(test --> example).');

            expect(taskAddedEvents.length).toBe(1);
            expect(taskAddedEvents[0].task.type).toBe('BELIEF');
        });

        test.skip('should handle input errors gracefully', async () => {
            const errorEvents = [];

            nar.on('input.error', (data) => errorEvents.push(data));

            // This should cause a parsing error
            await expect(nar.input('invalid narsese string!!!')).rejects.toThrow();

            expect(errorEvents.length).toBe(1);
            expect(errorEvents[0].type).toBe('SYNTAX_ERROR');
        });
    });

    describe('System Statistics', () => {
        test('should provide comprehensive statistics', async () => {
            await nar.input('(cat --> animal).');
            await nar.input('(dog --> animal).');
            await nar.step();

            const stats = nar.getStats();

            expect(stats).toBeDefined();
            expect(stats.isRunning).toBe(false);
            expect(stats.memoryStats).toBeDefined();
            expect(stats.taskManagerStats).toBeDefined();
            expect(stats.cycleStats).toBeDefined();
        });

        test('should track memory usage correctly', async () => {
            await nar.input('(cat --> animal).');
            await nar.input('(dog --> animal).');
            await nar.input('(bird --> animal).');

            const stats = nar.getStats();
            const memoryStats = stats.memoryStats;

            expect(memoryStats.totalConcepts).toBeGreaterThanOrEqual(3);
            expect(memoryStats.totalTasks).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed input gracefully', async () => {
            const invalidInputs = [
                'incomplete statement',
                '(unclosed parenthesis',
                'missing punctuation)',
                '(term)%invalid truth%',
                ''
            ];

            for (const invalidInput of invalidInputs) {
                await expect(nar.input(invalidInput)).rejects.toThrow();
            }
        });

        describe('Performance and Scalability', () => {
            test('should handle multiple inputs efficiently', async () => {
                const startTime = Date.now();

                // Add many beliefs
                for (let i = 0; i < 100; i++) {
                    await nar.input(`(item${i} --> category).`);
                }

                const endTime = Date.now();
                const duration = endTime - startTime;

                // Should complete in reasonable time (less than 5 seconds for 100 inputs)
                expect(duration).toBeLessThan(5000);

                const beliefs = nar.getBeliefs();
                expect(beliefs.length).toBe(100);
            });

            test('should handle large compound terms', async () => {
                // Create a complex compound term
                const complexTerm = '(&, A, B, C, D, E).';
                await nar.input(complexTerm);

                const beliefs = nar.getBeliefs();
                const complexBelief = beliefs.find(b =>
                    b.term.toString().includes('A') && b.term.toString().includes('E')
                );

                expect(complexBelief).toBeDefined();
                expect(complexBelief.term.components.length).toBe(5);
            });
        });
    });
});