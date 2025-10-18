import { Term, TermType } from '../../core/Term.js';

describe('Term', () => {
  test('newAtom should create atomic terms with correct properties', () => {
    const atomA = Term.newAtom('A');
    const atomB = Term.newAtom('B');

    expect(atomA.name).toBe('A');
    expect(atomA.termType).toBe(TermType.ATOM);
    expect(atomA.complexity).toBe(1);
    expect(atomA.hash).toBeDefined();

    expect(atomB.name).toBe('B');
    expect(atomB.termType).toBe(TermType.ATOM);
    expect(atomB.complexity).toBe(1);
    expect(atomB.hash).toBeDefined();

    expect(atomA.hash).not.toBe(atomB.hash);
  });

  test('newAtom should create terms with consistent hashing', () => {
    const atomA1 = Term.newAtom('A');
    const atomA2 = Term.newAtom('A');

    expect(atomA1.hash).toBe(atomA2.hash);
    expect(atomA1.name).toBe(atomA2.name);
  });

  test('createCompound should create inheritance terms', () => {
    const atomA = Term.newAtom('A');
    const atomB = Term.newAtom('B');

    const inheritanceTerm = Term.createCompound(TermType.INHERITANCE, [atomA, atomB]);

    expect(inheritanceTerm.name).toBe('(A --> B)');
    expect(inheritanceTerm.termType).toBe(TermType.INHERITANCE);
    expect(inheritanceTerm.subject).toBe(atomA);
    expect(inheritanceTerm.predicate).toBe(atomB);
    expect(inheritanceTerm.components).toEqual([atomA, atomB]);
    expect(inheritanceTerm.complexity).toBe(3); // 1 + 1 + 1
    expect(inheritanceTerm.hash).toBeDefined();
  });

  test.each([
    [TermType.CONJUNCTION, '(&, ', 'conjunction'],
    [TermType.DISJUNCTION, '(|, ', 'disjunction'],
    [TermType.IMPLICATION, '(A ==> B)', 'implication'],
    [TermType.EQUIVALENCE, '<=>', 'equivalence']
  ])('createCompound should create %s terms', (termType, expectedPattern, typeName) => {
    const atomA = Term.newAtom('A');
    const atomB = Term.newAtom('B');

    const compoundTerm = Term.createCompound(termType, [atomA, atomB]);

    expect(compoundTerm.termType).toBe(termType);

    if (typeName === 'implication') {
      expect(compoundTerm.name).toBe(expectedPattern);
    } else if (typeName === 'equivalence') {
      expect(compoundTerm.name).toContain(expectedPattern);
      expect(compoundTerm.name).toContain('A');
      expect(compoundTerm.name).toContain('B');
    } else {
      expect(compoundTerm.name).toContain(expectedPattern);
      expect(compoundTerm.name).toContain('A');
      expect(compoundTerm.name).toContain('B');
    }
  });

  test('createCompound should handle complex nesting', () => {
    const atomA = Term.newAtom('A');
    const atomB = Term.newAtom('B');
    const atomC = Term.newAtom('C');

    // Create (A --> B)
    const innerTerm = Term.createCompound(TermType.INHERITANCE, [atomA, atomB]);
    // Then create ((A --> B) --> C)
    const outerTerm = Term.createCompound(TermType.INHERITANCE, [innerTerm, atomC]);

    expect(outerTerm.name).toBe('((A --> B) --> C)');
    expect(outerTerm.complexity).toBe(5); // 1 + (1 + 1 + 1) + 1 = 5
  });

  test('createCompound should simplify components for associative operators', () => {
    const atomA = Term.newAtom('A');
    const atomB = Term.newAtom('B');
    const atomC = Term.newAtom('C');

    // Create (A & B)
    const innerConjunction = Term.createCompound(TermType.CONJUNCTION, [atomA, atomB]);
    // Then create ((A & B) & C) which should flatten to (A & B & C)
    const outerConjunction = Term.createCompound(TermType.CONJUNCTION, [innerConjunction, atomC]);

    expect(outerConjunction.name).toContain('(&,'); // Components might be sorted by hash
    expect(outerConjunction.name).toContain('A');
    expect(outerConjunction.name).toContain('B');
    expect(outerConjunction.name).toContain('C');
    expect(outerConjunction.components).toHaveLength(3); // Flattened
  });

  test('createCompound should handle commutative operators with deduplication', () => {
    const atomA = Term.newAtom('A');
    const atomB = Term.newAtom('B');

    // Create A & B and B & A - they should have same canonical form
    const conjunction1 = Term.createCompound(TermType.CONJUNCTION, [atomA, atomB]);
    const conjunction2 = Term.createCompound(TermType.CONJUNCTION, [atomB, atomA]);

    // Both should have the same name due to sorting by hash
    expect(conjunction1.name).toBe(conjunction2.name);

    // Test with duplicate components
    const conjunction3 = Term.createCompound(TermType.CONJUNCTION, [atomA, atomB, atomA]);
    // Should have deduplicated components
    expect(conjunction3.components).toHaveLength(2); // A and B, not A, B, A
  });

  test('toString should return the term name', () => {
    const atom = Term.newAtom('TestAtom');
    expect(atom.toString()).toBe('TestAtom');

    const compound = Term.createCompound(TermType.INHERITANCE, [Term.newAtom('A'), Term.newAtom('B')]);
    expect(compound.toString()).toBe('(A --> B)');
  });

  test('newAtom should handle multi-word terms with spaces', () => {
    const multiWordAtom = Term.newAtom('"Hello world"');
    expect(multiWordAtom.name).toBe('"Hello world"');
  });

  test('equals should correctly compare terms', () => {
    const atomA1 = Term.newAtom('A');
    const atomA2 = Term.newAtom('A'); // Same content, different instance
    const atomB = Term.newAtom('B');

    expect(atomA1.equals(atomA2)).toBe(true);
    expect(atomA1.equals(atomB)).toBe(false);
    expect(atomA1.equals(null)).toBe(false);
    expect(atomA1.equals({})).toBe(false);
  });

  test('hash should be consistent for same content', () => {
    const atomA1 = Term.newAtom('A');
    const atomA2 = Term.newAtom('A');
    const compound1 = Term.createCompound(TermType.INHERITANCE, [Term.newAtom('X'), Term.newAtom('Y')]);
    const compound2 = Term.createCompound(TermType.INHERITANCE, [Term.newAtom('X'), Term.newAtom('Y')]);

    expect(atomA1.hash).toBe(atomA2.hash);
    expect(compound1.hash).toBe(compound2.hash);
  });

  test('complexity should correctly calculate nested term complexity', () => {
    const atomA = Term.newAtom('A'); // complexity = 1
    const atomB = Term.newAtom('B'); // complexity = 1
    const atomC = Term.newAtom('C'); // complexity = 1

    // Simple compound: complexity = 1 + 1 + 1 = 3
    const simpleCompound = Term.createCompound(TermType.INHERITANCE, [atomA, atomB]);
    expect(simpleCompound.complexity).toBe(3);

    // Nested compound: complexity = 1 + 3 + 1 = 5
    const nestedCompound = Term.createCompound(TermType.INHERITANCE, [simpleCompound, atomC]);
    expect(nestedCompound.complexity).toBe(5);
  });

  test('all TermType values should be defined', () => {
    expect(TermType.NEGATION).toBe('negation');
    expect(TermType.PRODUCT).toBe('product');
    expect(TermType.INHERITANCE).toBe('inheritance');
    expect(TermType.SIMILARITY).toBe('similarity');
    expect(TermType.IMPLICATION).toBe('implication');
    expect(TermType.EQUIVALENCE).toBe('equivalence');
    expect(TermType.CONJUNCTION).toBe('conjunction');
    expect(TermType.DISJUNCTION).toBe('disjunction');
    expect(TermType.SEQUENTIAL_CONJUNCTION).toBe('sequential_conjunction');
    expect(TermType.OPERATION).toBe('operation');
    expect(TermType.INSTANCE).toBe('instance');
    expect(TermType.PROPERTY).toBe('property');
    expect(TermType.EXTENSIONAL_SET).toBe('extensional_set');
    expect(TermType.INTENSIONAL_SET).toBe('intensional_set');
    expect(TermType.ATOM).toBe('atom');
  });

  test('should handle edge cases and error conditions', () => {
    // Test computeHash with null components
    const hash1 = Term.computeHash('test', 'atom', null);
    const hash2 = Term.computeHash('test', 'atom', null);
    expect(hash1).toBe(hash2); // Same inputs should produce same hash

    // Test equals with various types
    const term = Term.newAtom('A');
    expect(term.equals(null)).toBe(false);
    expect(term.equals({})).toBe(false);
    expect(term.equals('not a term')).toBe(false);
    expect(term.equals(Term.newAtom('B'))).toBe(false);
    expect(term.equals(Term.newAtom('A'))).toBe(true);
  });
});