/**
 * Basic syllogism tests using the new TestNAR framework.
 * Adapted from v9 implementation.
 */

import { TestNAR, TaskMatch } from '../../src/testing/TestNAR.js';

describe('Syllogistic Reasoning Tests', () => {
  it('should derive (a --> c) from (a --> b) and (b --> c) with correct truth value', async () => {
    const result = await new TestNAR()
      .input('(a --> b)', 0.9, 0.9)
      .input('(b --> c)', 0.8, 0.8)
      .run(2)
      .expect(new TaskMatch('(a --> c)').withTruth(0.71, 0.51))
      .expectNot('(c --> a)')
      .execute();

    expect(result).toBe(true);
  });
});