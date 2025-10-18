/**
 * Memory and Focus Management Integration Tests
 * Tests the complete memory architecture with focus sets, indexing, and consolidation
 */

import {Memory} from '../../src/memory/Memory.js';
import {Focus} from '../../src/memory/Focus.js';
import {FocusSetSelector} from '../../src/memory/FocusSetSelector.js';
import {MemoryIndex} from '../../src/memory/MemoryIndex.js';
import {MemoryConsolidation} from '../../src/memory/MemoryConsolidation.js';
import {Task} from '../../src/task/Task.js';
import {TermFactory} from '../../src/term/TermFactory.js';
import {ArrayStamp} from '../../src/Stamp.js';
import {Concept} from '../../src/memory/Concept.js';

describe('Memory and Focus Management Integration', () => {
    let memory;
    let focus;
    let selector;
    let index;
    let consolidation;
    let termFactory;
    let currentTime;

    beforeEach(() => {
        termFactory = new TermFactory();
        currentTime = Date.now();

        // Initialize all components
        memory = new Memory({
            priorityThreshold: 0.3,
            consolidationInterval: 5,
            priorityDecayRate: 0.1
        });

        focus = new Focus({
            maxFocusSets: 3,
            defaultFocusSetSize: 10,
            attentionDecayRate: 0.05
        });

        selector = new FocusSetSelector({
            maxSize: 5,
            priorityThreshold: 0.2,
            priorityWeight: 0.4,
            urgencyWeight: 0.3,
            diversityWeight: 0.3
        });

        index = new MemoryIndex();
        consolidation = new MemoryConsolidation({
            activationThreshold: 0.1,
            decayRate: 0.05,
            propagationFactor: 0.3
        });
    });


    describe('Focus Set Management', () => {
        test('should manage multiple focus sets with different attention levels', () => {
            // Create multiple focus sets
            focus.createFocusSet('primary', 5);
            focus.createFocusSet('secondary', 3);

            // Add tasks to different focus sets
            const term1 = termFactory.create({name: 'urgent'});
            const term2 = termFactory.create({name: 'normal'});

            const urgentTask = new Task({term: term1, punctuation: '.', budget: {priority: 0.9}});
            const normalTask = new Task({term: term2, punctuation: '.', budget: {priority: 0.5}});

            focus.setFocus('primary');
            focus.addTaskToFocus(urgentTask);

            focus.setFocus('secondary');
            focus.addTaskToFocus(normalTask);

            // Check focus set management
            const stats = focus.getStats();
            expect(stats.totalFocusSets).toBe(3); // default + primary + secondary
            expect(stats.focusSets.primary.size).toBe(1);
            expect(stats.focusSets.secondary.size).toBe(1);

            // Test focus switching
            focus.setFocus('primary');
            const primaryTasks = focus.getTasks(10);
            expect(primaryTasks[0]).toBe(urgentTask);
        });

        test('should apply attention decay and task priority decay', () => {
            focus.createFocusSet('test-set', 5);
            focus.setFocus('test-set');

            const term = termFactory.create({name: 'test'});
            const task = new Task({term, punctuation: '.', budget: {priority: 0.8}});

            focus.addTaskToFocus(task);

            // Check initial attention
            const initialStats = focus.getStats();
            const initialAttention = initialStats.focusSets['test-set'].attentionScore;

            // Apply decay
            focus.applyDecay();

            // Check that decay was applied
            const decayedStats = focus.getStats();
            expect(decayedStats.focusSets['test-set'].attentionScore).toBeLessThan(initialAttention);
        });
    });

    describe('Advanced Task Selection', () => {
        test('should select tasks using composite scoring algorithm', () => {
            // Create tasks with different characteristics
            const simpleTerm = termFactory.create({components: ['simple']});
            const complexTerm = termFactory.create({
                components: [
                    termFactory.create({components: ['A']}),
                    termFactory.create({components: ['B']})
                ],
                operator: '-->'
            });

            // Note: The convenience constructor doesn't support custom stamps, so keep original for these
            const recentTask = new Task({
                term: simpleTerm,
                punctuation: '.',
                budget: {priority: 0.7},
                stamp: new ArrayStamp({id: 'recent', creationTime: currentTime - 1000, source: 'INPUT'}),
            });
            const oldTask = new Task({
                term: complexTerm,
                punctuation: '.',
                budget: {priority: 0.5},
                stamp: new ArrayStamp({id: 'old', creationTime: currentTime - 10000, source: 'INPUT'}),
            });

            const tasks = [recentTask, oldTask];
            const selected = selector.select(tasks, currentTime);

            // Should select both tasks based on composite scoring
            expect(selected.length).toBe(2);

            // Task with higher composite score should be first
            const recentScore = selector._calculateCompositeScore(recentTask, currentTime, 9000, 2);
            const oldScore = selector._calculateCompositeScore(oldTask, currentTime, 9000, 2);

            if (recentScore > oldScore) {
                expect(selected[0]).toBe(recentTask);
            } else {
                expect(selected[0]).toBe(oldTask);
            }
        });

        test('should respect priority threshold in selection', () => {
            const highPriorityTask = new Task({
                term: termFactory.create({name: 'high'}),
                punctuation: '.',
                budget: {priority: 0.8}
            });
            const lowPriorityTask = new Task({
                term: termFactory.create({name: 'low'}),
                punctuation: '.',
                budget: {priority: 0.1}
            });

            const selected = selector.select([highPriorityTask, lowPriorityTask], currentTime);

            // Only high priority task should be selected
            expect(selected.length).toBe(1);
            expect(selected[0]).toBe(highPriorityTask);
        });
    });

    describe('Memory Indexing', () => {
        test('should index and retrieve inheritance relationships', () => {
            const subject = termFactory.create({components: ['dog']});
            const predicate = termFactory.create({components: ['animal']});
            const term = termFactory.create({components: [subject, predicate], operator: '-->'});

            const concept = memory.getConcept(term) || new Concept(term, {});
            index.addConcept(concept);

            // Test inheritance lookup
            const inheritanceConcepts = index.findInheritanceConcepts(predicate);
            expect(inheritanceConcepts.length).toBe(1);
            expect(inheritanceConcepts[0]).toBe(concept);
        });

        test('should index and retrieve similarity relationships', () => {
            const term1 = termFactory.create({components: ['dog']});
            const term2 = termFactory.create({components: ['wolf']});
            const term = termFactory.create({components: [term1, term2], operator: '<->'});

            const concept = memory.getConcept(term) || new Concept(term, {});
            index.addConcept(concept);

            // Test similarity lookup
            const similarConcepts1 = index.findSimilarityConcepts(term1);
            const similarConcepts2 = index.findSimilarityConcepts(term2);

            expect(similarConcepts1.length).toBe(1);
            expect(similarConcepts2.length).toBe(1);
        });

        test('should provide comprehensive index statistics', () => {
            // Add various types of concepts
            const atomicTerm = termFactory.create({components: ['atom']});
            const inheritanceTerm = termFactory.create({
                components: [
                    termFactory.create({components: ['cat']}),
                    termFactory.create({components: ['animal']})
                ],
                operator: '-->'
            });
            const similarityTerm = termFactory.create({
                components: [
                    termFactory.create({components: ['dog']}),
                    termFactory.create({components: ['wolf']})
                ],
                operator: '<->'
            });

            const atomicConcept = new Concept(atomicTerm, {});
            const inheritanceConcept = new Concept(inheritanceTerm, {});
            const similarityConcept = new Concept(similarityTerm, {});

            index.addConcept(atomicConcept);
            index.addConcept(inheritanceConcept);
            index.addConcept(similarityConcept);

            const stats = index.getStats();
            expect(stats.totalConcepts).toBe(3);
            expect(stats.inheritanceEntries).toBe(1);
            expect(stats.similarityEntries).toBe(2);
            expect(stats.compoundTermsByOperator['-->']).toBe(1);
            expect(stats.compoundTermsByOperator['<->']).toBe(1);
        });
    });


    describe('Complete System Integration', () => {
        test('should integrate all components in realistic scenario', () => {
            // Simulate a realistic reasoning scenario
            const terms = {
                cat: termFactory.create({components: ['cat']}),
                dog: termFactory.create({components: ['dog']}),
                animal: termFactory.create({components: ['animal']}),
                pet: termFactory.create({components: ['pet']}),
                mammal: termFactory.create({components: ['mammal']})
            };

            // Create inheritance relationships
            const catAnimalTerm = termFactory.create({components: [terms.cat, terms.animal], operator: '-->'});
            const dogAnimalTerm = termFactory.create({components: [terms.dog, terms.animal], operator: '-->'});
            const catPetTerm = termFactory.create({components: [terms.cat, terms.pet], operator: '-->'});
            const animalMammalTerm = termFactory.create({components: [terms.animal, terms.mammal], operator: '-->'});

            // Create tasks
            const tasks = [
                new Task({term: catAnimalTerm, punctuation: '.', budget: {priority: 0.9}}),
                new Task({term: dogAnimalTerm, punctuation: '.', budget: {priority: 0.8}}),
                new Task({term: catPetTerm, punctuation: '.', budget: {priority: 0.7}}),
                new Task({term: animalMammalTerm, punctuation: '.', budget: {priority: 0.6}})
            ];

            // Add some tasks to focus
            focus.setFocus('default');
            tasks.slice(0, 2).forEach(task => focus.addTaskToFocus(task));

            // Test task selection
            const focusTasks = focus.getTasks(10);
            const selectedTasks = selector.select(focusTasks, currentTime);

            expect(selectedTasks.length).toBe(2);

            // Verify system integrity
            const focusStats = focus.getStats();
            const indexStats = index.getStats();

            expect(focusStats.totalFocusSets).toBe(1);
            expect(indexStats.totalConcepts).toBe(0); // Index not populated in this test
        });

    });

    describe('Performance and Scalability', () => {
        test('should handle large numbers of concepts efficiently', () => {
            const startTime = Date.now();

            // Create many concepts
            for (let i = 0; i < 100; i++) {
                const term = termFactory.create({name: `concept${i}`});
                const task = new Task({term, punctuation: '.', budget: {priority: 0.5}});
                memory.addTask(task, currentTime);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete in reasonable time
            expect(duration).toBeLessThan(2000);

            // Verify all concepts were added
            expect(memory.getAllConcepts().length).toBe(100);
        });

        test('should handle focus set operations efficiently', () => {
            focus.createFocusSet('large-set', 50);
            focus.setFocus('large-set');

            const startTime = Date.now();

            // Add many tasks to focus
            for (let i = 0; i < 50; i++) {
                const term = termFactory.create({name: `focus_item${i}`});
                const task = new Task({term, punctuation: '.', budget: {priority: 0.5}});
                focus.addTaskToFocus(task);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete quickly
            expect(duration).toBeLessThan(1000);

            // Test task selection performance
            const focusTasks = focus.getTasks(50);
            const selectedTasks = selector.select(focusTasks, currentTime);

            expect(selectedTasks.length).toBeLessThanOrEqual(5); // maxSize limit
        });
    });

    describe('Error Handling and Edge Cases', () => {

        test('should handle focus set capacity limits', () => {
            focus.createFocusSet('small-set', 2);
            focus.setFocus('small-set');

            const term1 = termFactory.create({name: 'A'});
            const term2 = termFactory.create({name: 'B'});
            const term3 = termFactory.create({name: 'C'});

            const task1 = new Task({term: term1, punctuation: '.', budget: {priority: 0.8}});
            const task2 = new Task({term: term2, punctuation: '.', budget: {priority: 0.6}});
            const task3 = new Task({term: term3, punctuation: '.', budget: {priority: 0.9}});

            focus.addTaskToFocus(task1);
            focus.addTaskToFocus(task2);
            focus.addTaskToFocus(task3);

            const tasks = focus.getTasks(10);
            expect(tasks.length).toBe(2);
            // Should contain highest priority tasks
            expect(tasks.some(t => t.equals(task1) || t.equals(task3))).toBe(true);
        });

        test('should handle consolidation with no concepts', () => {
            expect(() => {
                consolidation.consolidate(memory, currentTime);
            }).not.toThrow();

            const results = consolidation.consolidate(memory, currentTime);
            expect(results.conceptsRemoved).toBe(0);
            expect(results.activationPropagated).toBe(0);
            expect(results.conceptsDecayed).toBe(0);
        });
    });
});