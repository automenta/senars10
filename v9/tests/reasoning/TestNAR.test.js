import { test, expect } from '@jest/globals';
import { TestNAR, TaskMatch } from './TestNAR.js';
import { ModusPonensRule } from '../../core/reasoning/nal/ModusPonensRule.js';

describe('TestNAR Framework Tests', () => {
  test('TestNAR should be constructable', () => {
    const testNAR = new TestNAR();
    expect(testNAR).toBeInstanceOf(TestNAR);
  });

  test('A simple chain without expectations should execute successfully', async () => {
    const result = await new TestNAR()
      .input('An input task')
      .run(1)
      .execute();
    expect(result).toBe(true);
  });

  test('A correct positive expectation (expect) should pass', async () => {
    const result = await new TestNAR()
      .using(ModusPonensRule)
      .input('(a ==> b)')
      .input('a')
      .run(2)
      .expect('b')
      .execute();
    expect(result).toBe(true);
  });

  test('A correct negative expectation (expectNot) should pass', async () => {
    const result = await new TestNAR()
      .using(ModusPonensRule)
      .input('(a ==> b)')
      // 'a' is missing
      .run(2)
      .expectNot('b')
      .execute();
    expect(result).toBe(true);
  });

  test('A failed positive expectation (expect) should throw an error', async () => {
    const testCase = new TestNAR()
      .using(ModusPonensRule)
      .input('(a ==> b)')
      // 'a' is missing
      .run(2)
      .expect('b'); // This should not be derived

    await expect(testCase.execute()).rejects.toThrow('TEST FAILED');
  });

  test('A failed negative expectation (expectNot) should throw an error', async () => {
    const testCase = new TestNAR()
      .using(ModusPonensRule)
      .input('(a ==> b)')
      .input('a')
      .run(2)
      .expectNot('b'); // This SHOULD be derived, so the expectation is wrong

    await expect(testCase.execute()).rejects.toThrow('TEST FAILED');
  });

  test('TaskMatch builder should work correctly with withTruth', async () => {
    const result = await new TestNAR()
      .using(ModusPonensRule)
      .input('(a ==> b)', 0.9, 0.9)
      .input('a', 0.8, 0.8)
      .run(2)
      .expect(new TaskMatch('b').withTruth(0.72, 0.58))
      .execute();
    expect(result).toBe(true);
  });
});