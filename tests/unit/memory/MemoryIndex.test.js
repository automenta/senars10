import {MemoryIndex} from '../../../src/memory/MemoryIndex.js';
import {Concept} from '../../../src/memory/Concept.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('MemoryIndex', () => {
    let index;
    let termFactory;
    let config;

    beforeEach(() => {
        index = new MemoryIndex();
        termFactory = new TermFactory();
        config = Concept.DEFAULT_CONFIG;
    });

    test('should initialize with empty indexes', () => {
        const stats = index.getStats();
        expect(stats.totalConcepts).toBe(0);
        expect(stats.inheritanceEntries).toBe(0);
        expect(stats.implicationEntries).toBe(0);
        expect(stats.similarityEntries).toBe(0);
        expect(stats.operatorEntries).toBe(0);
    });

    test('should add atomic term concepts correctly', () => {
        const term = termFactory.create({components: ['A']});
        const concept = new Concept(term, config);

        index.addConcept(concept);

        expect(index.getStats().totalConcepts).toBe(1);
        expect(index.getConcept(term.id)).toBe(concept);
    });

    test('should add inheritance concepts correctly', () => {
        const subject = termFactory.create({components: ['dog']});
        const predicate = termFactory.create({components: ['animal']});
        const term = termFactory.create({
            components: [subject, predicate],
            operator: '-->'
        });
        const concept = new Concept(term, config);

        index.addConcept(concept);

        const stats = index.getStats();
        expect(stats.totalConcepts).toBe(1);
        expect(stats.inheritanceEntries).toBe(1);
        expect(stats.operatorEntries).toBe(1);

        // Test inheritance lookup
        const inheritanceConcepts = index.findInheritanceConcepts(predicate);
        expect(inheritanceConcepts).toHaveLength(1);
        expect(inheritanceConcepts[0]).toBe(concept);
    });

    test('should add implication concepts correctly', () => {
        const premise = termFactory.create({components: ['rain']});
        const conclusion = termFactory.create({components: ['wet']});
        const term = termFactory.create({
            components: [premise, conclusion],
            operator: '==>'
        });
        const concept = new Concept(term, config);

        index.addConcept(concept);

        const stats = index.getStats();
        expect(stats.totalConcepts).toBe(1);
        expect(stats.implicationEntries).toBe(1);

        // Test implication lookup
        const implicationConcepts = index.findImplicationConcepts(premise);
        expect(implicationConcepts).toHaveLength(1);
        expect(implicationConcepts[0]).toBe(concept);
    });

    test('should add similarity concepts correctly', () => {
        const term1 = termFactory.create({components: ['dog']});
        const term2 = termFactory.create({components: ['cat']});
        const term = termFactory.create({
            components: [term1, term2],
            operator: '<->'
        });
        const concept = new Concept(term, config);

        index.addConcept(concept);

        const stats = index.getStats();
        expect(stats.totalConcepts).toBe(1);
        expect(stats.similarityEntries).toBe(2); // Both directions

        // Test similarity lookup
        const similarConcepts1 = index.findSimilarityConcepts(term1);
        const similarConcepts2 = index.findSimilarityConcepts(term2);

        expect(similarConcepts1).toHaveLength(1);
        expect(similarConcepts2).toHaveLength(1);
        expect(similarConcepts1[0]).toBe(concept);
        expect(similarConcepts2[0]).toBe(concept);
    });

    test('should find concepts by operator correctly', () => {
        const term1 = termFactory.create({
            components: [termFactory.create({components: ['A']}), termFactory.create({components: ['B']})],
            operator: '-->'
        });
        const term2 = termFactory.create({
            components: [termFactory.create({components: ['C']}), termFactory.create({components: ['D']})],
            operator: '-->'
        });

        const concept1 = new Concept(term1, config);
        const concept2 = new Concept(term2, config);

        index.addConcept(concept1);
        index.addConcept(concept2);

        const inheritanceConcepts = index.findConceptsByOperator('-->');
        expect(inheritanceConcepts).toHaveLength(2);
    });

    test('should remove concepts correctly', () => {
        const term = termFactory.create({
            components: [termFactory.create({components: ['A']}), termFactory.create({components: ['B']})],
            operator: '-->'
        });
        const concept = new Concept(term, config);

        index.addConcept(concept);
        expect(index.getStats().totalConcepts).toBe(1);

        index.removeConcept(concept);
        expect(index.getStats().totalConcepts).toBe(0);
        expect(index.getConcept(term.id)).toBeUndefined();
    });

    test('should handle complex compound terms', () => {
        const term1 = termFactory.create({components: ['A']});
        const term2 = termFactory.create({components: ['B']});
        const term3 = termFactory.create({components: ['C']});

        const innerTerm = termFactory.create({
            components: [term1, term2],
            operator: '&'
        });
        const complexTerm = termFactory.create({
            components: [innerTerm, term3],
            operator: '-->'
        });

        const concept = new Concept(complexTerm, config);
        index.addConcept(concept);

        expect(index.getStats().totalConcepts).toBe(1);
        expect(index.getStats().operatorEntries).toBe(2); // '&' and '-->'
    });

    test('should provide comprehensive statistics', () => {
        // Add various types of concepts
        const atomicTerm = termFactory.create({components: ['A']});
        const atomicConcept = new Concept(atomicTerm, config);

        const inheritanceTerm = termFactory.create({
            components: [termFactory.create({components: ['dog']}), termFactory.create({components: ['animal']})],
            operator: '-->'
        });
        const inheritanceConcept = new Concept(inheritanceTerm, config);

        const similarityTerm = termFactory.create({
            components: [termFactory.create({components: ['dog']}), termFactory.create({components: ['wolf']})],
            operator: '<->'
        });
        const similarityConcept = new Concept(similarityTerm, config);

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

    test('should clear all indexes correctly', () => {
        const term = termFactory.create({
            components: [termFactory.create({components: ['A']}), termFactory.create({components: ['B']})],
            operator: '-->'
        });
        const concept = new Concept(term, config);

        index.addConcept(concept);
        expect(index.getStats().totalConcepts).toBe(1);

        index.clear();
        expect(index.getStats().totalConcepts).toBe(0);
        expect(index.getStats().inheritanceEntries).toBe(0);
    });

    test('should handle edge cases gracefully', () => {
        const term = termFactory.create({components: ['A']});
        const concept = new Concept(term, config);

        // Test removing non-existent concept
        expect(() => {
            index.removeConcept(concept);
        }).not.toThrow();

        // Test finding with non-existent terms
        const nonExistentTerm = termFactory.create({components: ['Z']});
        expect(index.findInheritanceConcepts(nonExistentTerm)).toEqual([]);
        expect(index.findImplicationConcepts(nonExistentTerm)).toEqual([]);
        expect(index.findSimilarityConcepts(nonExistentTerm)).toEqual([]);
    });

    test('should handle multiple concepts with same terms', () => {
        const term = termFactory.create({
            components: [termFactory.create({components: ['A']}), termFactory.create({components: ['B']})],
            operator: '-->'
        });

        const concept1 = new Concept(term, config);
        const concept2 = new Concept(term, config);

        index.addConcept(concept1);
        index.addConcept(concept2);

        expect(index.getStats().totalConcepts).toBe(2);
        expect(index.getConcept(term.id)).toBe(concept2); // Should return last added

        index.removeConcept(concept1);
        expect(index.getStats().totalConcepts).toBe(1);
        expect(index.getConcept(term.id)).toBe(concept2);
    });
});