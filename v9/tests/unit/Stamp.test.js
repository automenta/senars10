import { Stamp, TaskHash } from '../../core/Stamp.js';
import { Task, Punctuation } from '../../core/Task.js';
import { Term, TermType } from '../../core/Term.js';

describe('Stamp Implementation - Core Functionality', () => {
  test('should create stamp with single evidence', () => {
    const stamp = Stamp.create(12345);
    expect(stamp.stampArray.length).toBe(1);
    expect(stamp.stampArray[0]).toBe(12345);
  });

  test('should create input stamp with serial number', () => {
    Stamp.resetSerialCounter(); // Reset for predictable testing
    const stamp = Stamp.createInput();

    expect(stamp.stampArray.length).toBe(1);
    expect(stamp.stampArray[0]).toBe(1); // First serial number
  });

  test('should validate stamp arrays correctly', () => {
    expect(Stamp.validStamp([])).toBe(true);
    expect(Stamp.validStamp([1])).toBe(true);
    expect(Stamp.validStamp([1, 2, 3])).toBe(true);
    expect(Stamp.validStamp([1, 1])).toBe(false); // duplicate
    expect(Stamp.validStamp([3, 2])).toBe(false); // out of order
    expect(Stamp.validStamp([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(false); // too long
  });

  test('should deduplicate and sort arrays', () => {
    const result = Stamp.toSetArray([5, 2, 8, 2, 5, 1]);
    expect(result).toEqual([1, 2, 5, 8]);
  });

  test('should calculate originality correctly', () => {
    const stamp1 = new Stamp([1]);
    const stamp2 = new Stamp([1, 2, 3]);

    expect(stamp1.originality()).toBeGreaterThan(stamp2.originality());
    expect(stamp1.originality()).toBeLessThan(1.0);
    expect(stamp2.originality()).toBeLessThan(1.0);
  });
});

describe('Stamp Overlap Detection', () => {
  test('should detect no overlap', () => {
    const stamp1 = new Stamp([1, 2, 3]);
    const stamp2 = new Stamp([4, 5, 6]);

    expect(Stamp.overlapsAny(stamp1.stampArray, stamp2.stampArray)).toBe(false);
    expect(stamp1.overlaps(stamp2)).toBe(false);
    expect(Stamp.overlapCount(stamp1.stampArray, stamp2.stampArray)).toBe(0);
    expect(Stamp.overlapFraction(stamp1.stampArray, stamp2.stampArray)).toBe(0);
  });

  test('should detect complete overlap', () => {
    const stamp1 = new Stamp([1, 2, 3]);
    const stamp2 = new Stamp([1, 2, 3]);

    expect(Stamp.overlapsAny(stamp1.stampArray, stamp2.stampArray)).toBe(true);
    expect(stamp1.overlaps(stamp2)).toBe(true);
    expect(Stamp.overlapCount(stamp1.stampArray, stamp2.stampArray)).toBe(3);
    expect(Stamp.overlapFraction(stamp1.stampArray, stamp2.stampArray)).toBe(1);
  });

  test('should detect partial overlap', () => {
    const stamp1 = new Stamp([1, 2, 3]);
    const stamp2 = new Stamp([2, 3, 4]);

    expect(Stamp.overlapsAny(stamp1.stampArray, stamp2.stampArray)).toBe(true);
    expect(stamp1.overlaps(stamp2)).toBe(true);
    expect(Stamp.overlapCount(stamp1.stampArray, stamp2.stampArray)).toBe(2);
    expect(Stamp.overlapFraction(stamp1.stampArray, stamp2.stampArray)).toBe(2/3);
  });

  test('should handle single element overlap', () => {
    const stamp1 = new Stamp([1]);
    const stamp2 = new Stamp([1]);

    expect(Stamp.overlapsAny(stamp1.stampArray, stamp2.stampArray)).toBe(true);
    expect(Stamp.overlapFraction(stamp1.stampArray, stamp2.stampArray)).toBe(1);
  });
});

describe('Stamp Merging (Zip Operations)', () => {
  test('should merge non-overlapping stamps', () => {
    const stamp1 = new Stamp([1, 2]);
    const stamp2 = new Stamp([3, 4]);
    const merged = Stamp.zipArrays(stamp1.stampArray, stamp2.stampArray, 123);

    expect(merged).toEqual([1, 2, 3, 4]);
  });

  test('should merge overlapping stamps', () => {
    const stamp1 = new Stamp([1, 2, 3]);
    const stamp2 = new Stamp([2, 3, 4]);
    const merged = Stamp.zipArrays(stamp1.stampArray, stamp2.stampArray, 123);

    expect(merged).toEqual([1, 2, 3, 4]);
  });

  test('should handle capacity limits', () => {
    const stamp1 = new Stamp([1, 2, 3, 4, 5]);
    const stamp2 = new Stamp([6, 7, 8, 9, 10]);
    const merged = Stamp.zipArrays(stamp1.stampArray, stamp2.stampArray, 123, 6);

    expect(merged.length).toBeLessThanOrEqual(6);
    expect(merged.length).toBeGreaterThan(0);
  });

  test('should handle empty arrays', () => {
    const stamp1 = new Stamp([]);
    const stamp2 = new Stamp([1, 2, 3]);
    const merged = Stamp.zipArrays(stamp1.stampArray, stamp2.stampArray, 123);

    expect(merged).toEqual([1, 2, 3]);
  });
});

describe('Task Stamp Integration', () => {
  test('should create task with input stamp', () => {
    const term = Term.newAtom('a');
    const task = Task.createInput(term, Punctuation.BELIEF, null, Date.now(), Date.now());

    expect(task.stamp).toBeDefined();
    expect(task.stamp.stampArray.length).toBe(1);
  });

  test('should create derived task with merged stamp', () => {
    const term1 = Term.newAtom('a');
    const term2 = Term.newAtom('b');
    const termDerived = Term.createCompound(TermType.INHERITANCE, [term1, term2]);

    const task1 = Task.createInput(term1, Punctuation.BELIEF, null, 1000, 1000);
    const task2 = Task.createInput(term2, Punctuation.BELIEF, null, 2000, 2000);

    const derivedTask = Task.createDerived([task1, task2], termDerived, Punctuation.BELIEF, null, 3000, 3000);

    expect(derivedTask.stamp).toBeDefined();
    expect(derivedTask.stamp.stampArray.length).toBeGreaterThanOrEqual(2);
  });

  test('should detect task overlap', () => {
    const term = Term.newAtom('a');
    const task1 = Task.createInput(term, Punctuation.BELIEF, null, 1000, 1000);
    const task2 = Task.createInput(term, Punctuation.BELIEF, null, 2000, 2000);

    // Same content but different stamps - should not overlap (different evidence chains)
    // Note: Tasks with same content are considered equal but their stamps may not overlap
    expect(Stamp.overlap(task1, task2)).toBe(false);
  });

  test('should calculate task originality', () => {
    const term1 = Term.newAtom('a');
    const term2 = Term.newAtom('b');
    const termDerived = Term.createCompound(TermType.INHERITANCE, [term1, term2]);

    const inputTask = Task.createInput(term1, Punctuation.BELIEF, null, 1000, 1000);
    const task1 = Task.createInput(term1, Punctuation.BELIEF, null, 1000, 1000);
    const task2 = Task.createInput(term2, Punctuation.BELIEF, null, 2000, 2000);

    const derivedTask = Task.createDerived([task1, task2], termDerived, Punctuation.BELIEF, null, 3000, 3000);

    expect(inputTask.getOriginality()).toBeGreaterThanOrEqual(derivedTask.getOriginality());
  });
});

describe('Task Hashing and Equality', () => {
  test('should generate consistent hash for same content', () => {
    const term = Term.newAtom('a');
    const task1 = Task.createInput(term, Punctuation.BELIEF, null, 1000, 1000);
    const task2 = Task.createInput(term, Punctuation.BELIEF, null, 2000, 2000);

    expect(TaskHash.hashTask(task1)).toBe(TaskHash.hashTask(task2));
  });

  test('should detect equal tasks by content', () => {
    const term = Term.newAtom('a');
    const task1 = Task.createInput(term, Punctuation.BELIEF, null, 1000, 1000);
    const task2 = Task.createInput(term, Punctuation.BELIEF, null, 2000, 2000);

    expect(TaskHash.tasksEqual(task1, task2)).toBe(true);
    expect(task1.equals(task2)).toBe(true);
  });

  test('should detect different tasks', () => {
    const term1 = Term.newAtom('a');
    const term2 = Term.newAtom('b');

    const task1 = Task.createInput(term1, Punctuation.BELIEF, null, 1000, 1000);
    const task2 = Task.createInput(term2, Punctuation.BELIEF, null, 2000, 2000);

    expect(TaskHash.tasksEqual(task1, task2)).toBe(false);
    expect(task1.equals(task2)).toBe(false);
  });

  test('should detect duplicate tasks in array', () => {
    const term = Term.newAtom('a');
    const task1 = Task.createInput(term, Punctuation.BELIEF, null, 1000, 1000);
    const task2 = Task.createInput(term, Punctuation.BELIEF, null, 2000, 2000);
    const task3 = Task.createInput(Term.newAtom('b'), Punctuation.BELIEF, null, 3000, 3000);

    const tasks = [task1, task3];

    expect(task2.isDuplicateOf(tasks)).toBe(true);
    expect(task3.isDuplicateOf(tasks)).toBe(false);
  });
});

describe('Stamp Cloning and Manipulation', () => {
  test('should clone stamp correctly', () => {
    const original = new Stamp([1, 2, 3]);
    const cloned = original.clone();

    expect(original.equals(cloned)).toBe(true);
    expect(original.stampArray !== cloned.stampArray).toBe(true); // Different arrays
  });

  test('should create task with updated stamp', () => {
    const term = Term.newAtom('a');
    const originalTask = Task.createInput(term, Punctuation.BELIEF, null, 1000, 1000);
    const newStamp = new Stamp([999]);

    const updatedTask = originalTask.withStamp(newStamp);

    expect(originalTask.equals(updatedTask)).toBe(true); // Same content makes tasks equal, stamps are just evidence
    expect(updatedTask.stamp.stampArray).toEqual([999]);
  });

  test('should maintain stamp in withPriority', () => {
    const term = Term.newAtom('a');
    const originalTask = Task.createInput(term, Punctuation.BELIEF, null, 1000, 1000);
    const originalStamp = originalTask.stamp;

    const updatedTask = originalTask.withPriority(0.8);

    expect(originalTask.equals(updatedTask)).toBe(true); // Content should be same
    expect(originalTask.stamp.equals(updatedTask.stamp)).toBe(true); // Stamp should be same
  });
});

describe('Edge Cases and Error Handling', () => {
  test('should handle empty stamps', () => {
    const stamp1 = new Stamp([]);
    const stamp2 = new Stamp([]);

    expect(stamp1.overlaps(stamp2)).toBe(false);
    expect(Stamp.overlapFraction(stamp1.stampArray, stamp2.stampArray)).toBe(0);
  });

  test('should handle single element stamps', () => {
    const stamp1 = new Stamp([1]);
    const stamp2 = new Stamp([2]);

    expect(stamp1.overlaps(stamp2)).toBe(false);
    expect(Stamp.overlapFraction(stamp1.stampArray, stamp2.stampArray)).toBe(0);
  });

  test('should handle large stamp arrays', () => {
    const largeArray = Array.from({length: 100}, (_, i) => i + 1);
    const stamp = new Stamp(largeArray);

    expect(stamp.stampArray.length).toBe(100);
    expect(stamp.originality()).toBeLessThan(1.0);
  });
});