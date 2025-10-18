/**
 * Comprehensive syllogistic reasoning tests using the new TestNAR framework.
 */

import { TestNAR, TaskMatch } from './TestNAR.js';
import { DeductiveSyllogismRule } from '../../core/reasoning/nal/SyllogisticRules.js';

describe('Deductive Syllogism Tests (with new TestNAR)', () => {
  it('should not derive invalid conclusion from unrelated premises', async () => {
    const result = await new TestNAR()
      .using(DeductiveSyllogismRule)
      .input('(a --> b)', 0.9, 0.9)
      .input('(c --> d)', 0.8, 0.8)
      .run(1)
      .expectNot('(a --> d)')
      .execute();

    expect(result).toBe(true);
  });

  it('should handle multiple inference cycles correctly', async () => {
    const result = await new TestNAR()
      .using(DeductiveSyllogismRule)
      .input('(a --> b)', 0.9, 0.9)
      .input('(b --> c)', 0.8, 0.8)
      .input('(c --> d)', 0.7, 0.7)
      .run(3) // Run for enough cycles to allow multi-step inference
      .expect(new TaskMatch('(a --> c)'))
      .expect(new TaskMatch('(b --> d)'))
      .expect(new TaskMatch('(a --> d)'))
      .expectNot('(d --> a)')
      .execute();

    expect(result).toBe(true);
  });

  it('should handle complex multi-output scenarios', async () => {
    const result = await new TestNAR()
      .using(DeductiveSyllogismRule)
      .input('(bird --> animal)', 0.9, 0.9)
      .input('(robin --> bird)', 0.95, 0.85)
      .input('(animal --> living_thing)', 0.8, 0.85)
      .run(3)
      .expect(new TaskMatch('(robin --> animal)'))
      .expect(new TaskMatch('(bird --> living_thing)'))
      .expect(new TaskMatch('(robin --> living_thing)'))
      .expectNot('(living_thing --> bird)')
      .execute();

    expect(result).toBe(true);
  });
});