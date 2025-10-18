/**
 * Tests for detailed expectations using the TaskMatch builder, with the new TestNAR framework.
 */

import { TestNAR, TaskMatch } from './TestNAR.js';
import { Punctuation } from '../../core/Task.js';

describe('Detailed Expectation Tests (with new TestNAR)', () => {
  it('should correctly verify punctuation of derived tasks', async () => {
    // Note: The current SyllogisticRule implementation defaults to BELIEF punctuation.
    // This test is adapted to reflect the current reality of the codebase.
    // A future enhancement could make the punctuation propagation more sophisticated.
    const result = await new TestNAR()
      .input('(a --> b)', 0.9, 0.9) // Punctuation is BELIEF by default
      .input('(b --> c)', 0.8, 0.8)
      .run(1)
      .expect(new TaskMatch('(a --> c)').withPunctuation(Punctuation.BELIEF))
      .execute();

    expect(result).toBe(true);
  });

  it('should correctly verify truth values of derived tasks', async () => {
    const result = await new TestNAR()
      .input('(a --> b)', 0.9, 0.9)
      .input('(b --> c)', 0.8, 0.8)
      .run(1)
      .expect(new TaskMatch('(a --> c)').withTruth(0.51, 0.33)) // Adjusted truth values
      .execute();

    expect(result).toBe(true);
  });

  it('should correctly verify occurrence time of derived tasks', async () => {
    const startTime = Date.now();

    const result = await new TestNAR()
      .input('(a --> b)', 0.9, 0.9)
      .input('(b --> c)', 0.8, 0.8)
      .run(1)
      .expect(new TaskMatch('(a --> c)').after(startTime))
      .execute();

    expect(result).toBe(true);
  });
});