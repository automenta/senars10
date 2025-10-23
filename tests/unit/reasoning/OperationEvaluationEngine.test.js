import {OperationEvaluationEngine} from '../../../src/reasoning/OperationEvaluationEngine.js';
import {TermFactory} from '../../../src/term/TermFactory.js';
import {SYSTEM_ATOMS} from '../../../src/reasoning/SystemAtoms.js';

describe('OperationEvaluationEngine', () => {
  let engine, termFactory;

  beforeEach(() => {
    engine = new OperationEvaluationEngine();
    termFactory = new TermFactory();
  });

  test('should initialize with default functors', () => {
    expect(engine.functorRegistry.has('True')).toBe(true);
    expect(engine.functorRegistry.has('False')).toBe(true);
    expect(engine.functorRegistry.has('Null')).toBe(true);
    expect(engine.functorRegistry.has('add')).toBe(true);
    expect(engine.functorRegistry.has('subtract')).toBe(true);
    expect(engine.functorRegistry.has('multiply')).toBe(true);
    expect(engine.functorRegistry.has('divide')).toBe(true);
    expect(engine.functorRegistry.has('equals')).toBe(true);
  });

  test('should evaluate addition operation', async () => {
    const opTerm = termFactory.create({ operator: '^', components: [
      'add',
      { operator: ',', components: ['2', '3'] }
    ]});

    const result = await engine.evaluate(opTerm);
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('5');
  });

  test('should evaluate subtraction operation', async () => {
    const opTerm = termFactory.create({ operator: '^', components: [
      'subtract',
      { operator: ',', components: ['5', '2'] }
    ]});

    const result = await engine.evaluate(opTerm);
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('3');
  });

  test('should handle division by zero', async () => {
    const opTerm = termFactory.create({ operator: '^', components: [
      'divide',
      { operator: ',', components: ['5', '0'] }
    ]});

    const result = await engine.evaluate(opTerm);
    expect(result.success).toBe(false); // Division by zero results in failure
    expect(result.result.name).toBe('Null'); // Result is Null atom representing invalid operation
  });

  test('should solve simple addition equation', async () => {
    const leftTerm = termFactory.create({ operator: '^', components: [
      'add',
      { operator: ',', components: ['2', '?x'] }
    ]});
    const rightTerm = termFactory.create('5');
    
    const result = await engine.solveEquation(leftTerm, rightTerm, '?x');
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('3');
  });

  test('should solve simple subtraction equation', async () => {
    const leftTerm = termFactory.create({ operator: '^', components: [
      'subtract',
      { operator: ',', components: ['?x', '2'] }
    ]});
    const rightTerm = termFactory.create('3');
    
    const result = await engine.solveEquation(leftTerm, rightTerm, '?x');
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('5');
  });

  test('should solve equation with first argument as variable', async () => {
    const leftTerm = termFactory.create({ operator: '^', components: [
      'subtract',
      { operator: ',', components: ['?y', '4'] }
    ]});
    const rightTerm = termFactory.create('6');
    
    const result = await engine.solveEquation(leftTerm, rightTerm, '?y');
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('10');
  });

  test('should handle non-operation terms', async () => {
    const term = termFactory.create('simpleTerm');
    const result = await engine.evaluate(term);
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('simpleTerm');
  });

  test('should handle invalid operation format', async () => {
    const invalidTerm = termFactory.create({ operator: '^', components: ['func']}); // Only one component
    const result = await engine.evaluate(invalidTerm);
    expect(result.success).toBe(false);
    expect(result.result.name).toBe('Null');
  });

  test('should handle unknown functor', async () => {
    const opTerm = termFactory.create({ operator: '^', components: [
      'unknownFunctor',
      { operator: ',', components: ['1', '2'] }
    ]});

    const result = await engine.evaluate(opTerm);
    expect(result.success).toBe(false);
    expect(result.result.name).toBe('Null');
  });

  test('should convert values to terms and vice versa', () => {
    const trueTerm = engine._valueToTerm(true);
    expect(trueTerm.name).toBe('True');
    
    const falseTerm = engine._valueToTerm(false);
    expect(falseTerm.name).toBe('False');
    
    const nullTerm = engine._valueToTerm(null);
    expect(nullTerm.name).toBe('Null');
    
    const numberTerm = engine._valueToTerm(42);
    expect(numberTerm.name).toBe('42');
    
    const backToValue = engine._termToValue(trueTerm);
    expect(backToValue).toBe(true);
  });
});