/**
 * NAR Integration Tests
 * Tests the complete input → processing → memory storage cycle
 */

import {NAR} from '../../src/nar/NAR.js';
import {TermFactory} from '../../src/term/TermFactory.js';
import {Truth} from '../../src/Truth.js';
import {completeNARIntegrationSuite, narTestSetup} from '../support/commonTestSuites.js';

// Using the common test setup to avoid duplication
const narProvider = narTestSetup({
    debug: {enabled: false},
    cycle: {delay: 10, maxTasksPerCycle: 5}
});

describe('NAR Integration Tests', () => {
    // Run the complete NAR integration test suite
    completeNARIntegrationSuite(narProvider);

    // Additional specific tests that are not part of the common suite
    describe('Memory Storage and Retrieval', () => {
        let termFactory;

        beforeEach(() => {
            termFactory = new TermFactory();
        });

        test.skip('should store tasks in appropriate concepts', async () => {
            await narProvider().input('(cat --> animal).');
            await narProvider().input('(dog --> animal).');
            await narProvider().input('(cat --> pet).');

            // Check that concepts were created
            const concepts = narProvider().memory.getAllConcepts();
            expect(concepts.length).toBeGreaterThanOrEqual(3);

            // Check specific concepts
            const catConcept = narProvider().memory.getConcept(termFactory.create({name: 'cat'}));
            const dogConcept = narProvider().memory.getConcept(termFactory.create({name: 'dog'}));
            const animalConcept = narProvider().memory.getConcept(termFactory.create({name: 'animal'}));

            expect(catConcept).toBeDefined();
            expect(dogConcept).toBeDefined();
            expect(animalConcept).toBeDefined();

            // Cat concept should have multiple tasks
            expect(catConcept.totalTasks).toBeGreaterThanOrEqual(2);
        });

        test.skip('should retrieve beliefs by query term', async () => {
            await narProvider().input('(cat --> animal).');
            await narProvider().input('(dog --> animal).');
            await narProvider().input('(bird --> animal).');

            const catTerm = termFactory.create({name: 'cat'});
            const catBeliefs = narProvider().query(catTerm);

            expect(catBeliefs.length).toBeGreaterThan(0);
            expect(catBeliefs[0].term.toString()).toContain('cat');
        });

        test('should handle compound terms correctly', async () => {
            await narProvider().input('(&, cat, pet, animal).');

            const beliefs = narProvider().getBeliefs();
            const compoundBelief = beliefs.find(b =>
                b.term.toString().includes('cat') && b.term.toString().includes('pet')
            );

            expect(compoundBelief).toBeDefined();
        });
    });

    describe('System Statistics', () => {
        test('should provide comprehensive statistics', async () => {
            await narProvider().input('(cat --> animal).');
            await narProvider().input('(dog --> animal).');
            await narProvider().step();

            const stats = narProvider().getStats();

            expect(stats).toBeDefined();
            expect(stats.isRunning).toBe(false);
            expect(stats.memoryStats).toBeDefined();
            expect(stats.taskManagerStats).toBeDefined();
            expect(stats.cycleStats).toBeDefined();
        });

        test('should track memory usage correctly', async () => {
            await narProvider().input('(cat --> animal).');
            await narProvider().input('(dog --> animal).');
            await narProvider().input('(bird --> animal).');

            const stats = narProvider().getStats();
            const memoryStats = stats.memoryStats;

            expect(memoryStats.totalConcepts).toBeGreaterThanOrEqual(3);
            expect(memoryStats.totalTasks).toBeGreaterThanOrEqual(3);
        });
    });
});