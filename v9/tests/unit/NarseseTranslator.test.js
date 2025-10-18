import NarseseTranslator from '../../core/lm/NarseseTranslator.js';

describe('NarseseTranslator', () => {
  let translator;

  beforeEach(() => {
    translator = new NarseseTranslator();
  });

  test('convertToNarsese should convert text to Narsese format', () => {
    const result = translator.convertToNarsese('Hello world');

    expect(result).toHaveProperty('original', 'Hello world');
    expect(result).toHaveProperty('narsese');
    expect(result).toHaveProperty('type', 'default');
    expect(result.narsese).toMatch(/^<.*>$/);
  });

  test('convertFromNarsese should convert Narsese back to text', () => {
    const narseseResult = translator.convertToNarsese('Hello world');
    const backToText = translator.convertFromNarsese(narseseResult.narsese);

    expect(backToText).toBe('Hello world');
  });

  test.each([
    ['<Hello --> world>', 'Hello world', 'inheritance'],
    ['<Hello =/> world>', 'Hello world', 'implication'],
    ['<Hello <=> world>', 'Hello world', 'equivalence']
  ])('convertFromNarsese should handle %s (%s format)', (narsese, expected, type) => {
    const result = translator.convertFromNarsese(narsese);

    expect(result).toBe(expected);
  });

  test('convertToNarsese and convertFromNarsese should be inverses', () => {
    const originalText = 'cat animal';
    const narseseResult = translator.convertToNarsese(originalText);
    const backToText = translator.convertFromNarsese(narseseResult.narsese);

    expect(backToText).toBe(originalText);
  });

  test('convertToNarsese should handle various inputs', () => {
    const testCases = [
      { input: 'cat animal', expectedPattern: /^<.*>$/ },
      { input: 'dog bark', expectedPattern: /^<.*>$/ },
      { input: 'A B C', expectedPattern: /^<.*>$/ }
    ];

    testCases.forEach(({ input, expectedPattern }) => {
      const result = translator.convertToNarsese(input);
      expect(result.original).toBe(input);
      expect(result.narsese).toMatch(expectedPattern);
      expect(result.type).toBe('default');
    });
  });

  test('convertFromNarsese should handle various Narsese forms', () => {
    const testCases = [
      { narsese: '<cat --> animal>', expected: 'cat animal' },
      { narsese: '<dog --> bark>', expected: 'dog bark' },
      { narsese: '(A * B)', expected: 'A B' }  // Product form
    ];

    testCases.forEach(({ narsese, expected }) => {
      const result = translator.convertFromNarsese(narsese);
      expect(result).toBe(expected);
    });
  });

  test('narseseToJs should parse simple Narsese', () => {
    const result = translator.narseseToJs('Hello');

    expect(result).toHaveProperty('type', 'simple_term');
    expect(result).toHaveProperty('value', 'Hello');
    expect(result).toHaveProperty('term', 'Hello');
  });

  test('narseseToJs should parse inheritance statements', () => {
    const result = translator.narseseToJs('<Hello --> world>');

    expect(result).toHaveProperty('type', 'inheritance');
    expect(result).toHaveProperty('subject', 'Hello');
    expect(result).toHaveProperty('predicate', 'world');
  });

  test('narseseToJs should parse inheritance statements with multi-word atoms', () => {
    const result = translator.narseseToJs('<"Hello world" --> "my predicate">');

    expect(result).toHaveProperty('type', 'inheritance');
    expect(result).toHaveProperty('subject', '"Hello world"');
    expect(result).toHaveProperty('predicate', '"my predicate"');
  });

  test('jsToNarsese should convert JS objects to Narsese', () => {
    const jsObj = {
      type: 'inheritance',
      subject: 'Hello',
      predicate: 'world'
    };
    const result = translator.jsToNarsese(jsObj);

    expect(result).toBe('<Hello --> world>');
  });

  test('jsToNarsese should convert JS objects with multi-word atoms to Narsese', () => {
    const jsObj = {
      type: 'inheritance',
      subject: '"Hello world"',
      predicate: '"my predicate"'
    };
    const result = translator.jsToNarsese(jsObj);

    expect(result).toBe('<"Hello world" --> "my predicate">');
  });

  test('getStats should return statistics about conversions', () => {
    const initialStats = translator.getStats();

    translator.convertToNarsese('test');
    translator.narseseToJs('test');

    const finalStats = translator.getStats();

    expect(finalStats.conversionsAttempted).toBeGreaterThan(initialStats.conversionsAttempted);
    expect(finalStats.jsToNarsese).toBe(initialStats.jsToNarsese); // No jsToNarsese call yet
  });

  test('batch conversion methods should work', () => {
    const inputs = ['Hello world', 'cat animal', 'dog bark'];
    const narseseBatch = translator.batchConvertToNarsese(inputs);

    expect(narseseBatch).toHaveLength(inputs.length);

    const narseseList = narseseBatch.map(r => r.narsese);
    const textBatch = translator.batchConvertFromNarsese(narseseList);

    expect(textBatch).toHaveLength(inputs.length);
    expect(textBatch).toEqual(inputs);
  });

  test('should handle error cases', () => {
    // Test narseseToJs with invalid input
    expect(() => translator.narseseToJs(null)).toThrow();
    expect(() => translator.narseseToJs(123)).toThrow();
    expect(() => translator.narseseToJs({})).toThrow();

    // Test jsToNarsese with invalid input
    expect(() => translator.jsToNarsese(null)).toThrow();
    expect(() => translator.jsToNarsese('not an object')).toThrow();

    // Test validateNarsese with invalid input
    expect(translator.validateNarsese(null)).toBe(false);
    expect(translator.validateNarsese(123)).toBe(false);

    // Test batch methods with invalid input
    expect(() => translator.batchNarseseToJs(null)).toThrow();
    expect(() => translator.batchNarseseToJs('not array')).toThrow();
    expect(() => translator.batchJsToNarsese(null)).toThrow();
    expect(() => translator.batchJsToNarsese('not array')).toThrow();
  });
});