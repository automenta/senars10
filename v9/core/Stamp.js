/**
 * "Stamp" (evidence chain) implementation for SeNARS
 * Based on Java NARS Stamp implementation but adapted for JavaScript
 *
 * Features:
 * - Evidence chain tracking with long[] stamps
 * - Cyclic (overlap) detection
 * - Stamp merging (zip operations) for derivations
 * - Consistent hashing for task equality
 * - Duplicate detection mechanisms
 */

import { ObjectUtils } from './base/utilities.js';

export class Stamp {
  constructor(stampArray = []) {
    this.stampArray = Stamp.toSetArray(stampArray);
  }

  // Serial number counter for stamp generation
  static #serialCounter = 0;

  /**
   * Get next serial number for stamp creation
   */
  static nextSerialNumber() {
    return ++Stamp.#serialCounter;
  }

  /**
   * Reset serial counter (mainly for testing)
   */
  static resetSerialCounter() {
    Stamp.#serialCounter = 0;
  }

  /**
   * Create a new stamp with a single evidence entry
   */
  static create(evidenceId) {
    return new Stamp([evidenceId]);
  }

  /**
   * Create a stamp from serial number (for new input tasks)
   */
  static createInput() {
    return new Stamp([Stamp.nextSerialNumber()]);
  }

  /**
   * Check if two tasks have overlapping evidence (cyclic detection)
   */
  static overlap(taskA, taskB) {
    const stampA = taskA.stamp?.stampArray || [];
    const stampB = taskB.stamp?.stampArray || [];
    return Stamp.overlapsAny(stampA, stampB);
  }

  /**
   * Merge stamps from two parent tasks for a derived task
   */
  static zip(taskA, taskB, capacity = 8) {
    const stampA = taskA.stamp?.stampArray || [];
    const stampB = taskB.stamp?.stampArray || [];

    const sampleHash = TaskHash.hashTask(taskA) + TaskHash.hashTask(taskB);
    const mergedArray = Stamp.zipArrays(stampA, stampB, sampleHash, capacity);

    // Ensure we have at least 2 elements for derived tasks
    if (mergedArray.length < 2) {
      const combined = [...stampA, ...stampB];
      const deduplicated = Stamp.toSetArray(combined, capacity);
      if (deduplicated.length > 0) {
        return new Stamp(deduplicated);
      }
      // Fallback: create new serial numbers
      return new Stamp([Stamp.nextSerialNumber(), Stamp.nextSerialNumber()]);
    }

    return new Stamp(mergedArray);
  }

  /**
   * Core stamp array merging logic
   */
  static zipArrays(a, b, sampleHash, capacity = 8) {
    const [aa, bb] = [a.length, b.length];

    // Handle empty cases
    if (aa === 0) {
      if (bb > capacity) throw new Error('Stamp capacity exceeded');
      return b.slice();
    }
    if (bb === 0 || (aa === bb && Stamp.arraysEqual(a, b))) {
      if (aa > capacity) throw new Error('Stamp capacity exceeded');
      return a.slice();
    }

    // Check for complete overlap
    const overlapCount = Stamp.overlapCount(a, b);
    if (overlapCount > 0 && aa === overlapCount) return b.slice();
    if (overlapCount > 0 && bb === overlapCount) return a.slice();

    // Calculate merged length
    const abLen = aa + bb - overlapCount;
    if (abLen <= capacity) {
      return overlapCount > 0 ? Stamp.zipFlat(a, b, abLen) : Stamp.zipDirect(a, b);
    }

    return Stamp.zipSample(capacity, [a, b], sampleHash, abLen);
  }

  /**
   * Merge two sorted arrays avoiding duplicates
   */
  static zipFlat(a, b, abLen) {
    const merged = new Array(abLen);
    let [i, j, k] = [0, 0, 0];

    while (i < a.length && j < b.length) {
      if (a[i] < b[j]) {
        if (k === 0 || merged[k - 1] !== a[i]) merged[k++] = a[i];
        i++;
      } else if (b[j] < a[i]) {
        if (k === 0 || merged[k - 1] !== b[j]) merged[k++] = b[j];
        j++;
      } else {
        // Equal elements
        if (k === 0 || merged[k - 1] !== a[i]) merged[k++] = a[i];
        i++;
        j++;
      }
    }

    // Add remaining elements
    while (i < a.length) {
      if (k === 0 || merged[k - 1] !== a[i]) merged[k++] = a[i];
      i++;
    }

    while (j < b.length) {
      if (k === 0 || merged[k - 1] !== b[j]) merged[k++] = b[j];
      j++;
    }

    return merged;
  }

  /**
   * Simple direct merge for non-overlapping arrays
   */
  static zipDirect(a, b) {
    const [aa, bb] = [a.length, b.length];
    const abLength = aa + bb;
    const ab = new Array(abLength);

    let [ia, ib] = [0, 0];
    for (let i = 0; i < abLength; i++) {
      const [an, bn] = [ia < aa ? a[ia] : Number.MAX_SAFE_INTEGER, ib < bb ? b[ib] : Number.MAX_SAFE_INTEGER];
      if (an < bn) {
        ab[i] = an;
        ia++;
      } else {
        ab[i] = bn;
        ib++;
      }
    }

    return ab;
  }

  /**
   * Sample-based merging when capacity is exceeded
   */
  static zipSample(capacity, arrays, sampleHash, totalLength) {
    const flatArray = Stamp.zipFlatMultiple(arrays, totalLength);
    return flatArray.length <= capacity ? flatArray : Stamp.zipSampleWithHash(capacity, sampleHash, flatArray);
  }

  /**
   * Flatten multiple arrays into one sorted array
   */
  static zipFlatMultiple(arrays, totalLength) {
    const result = new Array(totalLength);
    let index = 0;

    for (const arr of arrays) {
      for (const value of arr) {
        // Binary search insertion to maintain sorted order
        const pos = Stamp.binarySearch(result, value, 0, index - 1);
        if (pos < 0) {
          // Insert at correct position
          const insertPos = -pos - 1;
          // Shift elements to make room
          for (let i = index; i > insertPos; i--) {
            result[i] = result[i - 1];
          }
          result[insertPos] = value;
          index++;
        }
      }
    }

    return result.slice(0, index);
  }

  /**
   * Sample-based reduction using hash for randomization
   */
  static zipSampleWithHash(capacity, sampleHash, array) {
    const toRemove = array.length - capacity;

    // Create a simple hash-based sampling
    const rng = new SimpleRNG(sampleHash);
    const skip = new Set();

    let removed = 0;
    while (removed < toRemove) {
      const r = Math.floor(rng.next() * array.length);
      if (!skip.has(r)) {
        skip.add(r);
        removed++;
      }
    }

    // Collect non-skipped elements
    const result = array.filter((_, i) => !skip.has(i));
    return result.sort((a, b) => a - b);
  }

  /**
   * Binary search for insertion point
   */
  static binarySearch(arr, value, start, end) {
    let [low, high] = [start, end];

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (arr[mid] === value) {
        return mid;
      } else if (arr[mid] < value) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return -(low + 1);
  }

  /**
   * Check if arrays are equal
   */
  static arraysEqual(a, b) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  /**
   * Check if arrays have any overlapping elements
   */
  static overlapsAny(a, b) {
    return a.length === 1 && b.length === 1 ? a[0] === b[0] : Stamp.overlapExhaustive(a, b);
  }

  /**
   * Exhaustive overlap check
   */
  static overlapExhaustive(a, b) {
    let [i, j] = [0, 0];
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) return true; // Found overlap
      else if (a[i] < b[j]) i++;
      else j++;
    }
    return false; // No overlap found
  }

  /**
   * Count overlapping elements
   */
  static overlapCount(a, b) {
    let [i, j, count] = [0, 0, 0];

    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        count++;
        i++;
        j++;
      } else if (a[i] < b[j]) {
        i++;
      } else {
        j++;
      }
    }

    return count;
  }

  /**
   * Calculate overlap fraction between two stamps
   */
  static overlapFraction(a, b) {
    if (a.length === 0 || b.length === 0) return 0;
    if (a.length === 1 && b.length === 1) return a[0] === b[0] ? 1 : 0;

    const common = Stamp.overlapCount(a, b);
    return common === 0 ? 0 : common / Math.min(a.length, b.length);
  }

  /**
   * Convert array to deduplicated sorted array
   */
  static toSetArray(arr, outputLen = null) {
    if (arr.length < 2) return arr.slice();

    const sorted = arr.slice().sort((a, b) => a - b);
    const deduplicated = Stamp.deduplicate(sorted);

    return outputLen && deduplicated.length > outputLen ? deduplicated.slice(0, outputLen) : deduplicated;
  }

  /**
   * Remove duplicates from sorted array
   */
  static deduplicate(sorted) {
    return sorted.length === 0 ? [] : [sorted[0], ...sorted.filter((val, i) => i > 0 && val !== sorted[i-1])];
  }

  /**
   * Validate stamp array
   */
  static validStamp(stamp) {
    if (stamp.length <= 1) return true;
    if (stamp.length > 8) return false; // NAL.STAMP_CAPACITY equivalent

    for (let i = 1; i < stamp.length; i++) {
      if (stamp[i - 1] >= stamp[i]) return false; // Out of order or duplicate
    }

    return true;
  }

  /**
   * Get stamp array
   */
  stamp() { return this.stampArray; }

  /**
   * Get stamp length
   */
  length() { return this.stampArray.length; }

  /**
   * Calculate originality (decreases with evidence length)
   */
  originality() { return Stamp.originality(this.stampArray.length); }

  /**
   * Calculate originality based on stamp length
   */
  static originality(length) { return 1.0 / (1.0 + length * 0.1); } // Simplified version

  /**
   * Check if this stamp overlaps with another
   */
  overlaps(other) { return Stamp.overlapsAny(this.stampArray, other.stampArray); }

  /**
   * Get overlap fraction with another stamp
   */
  overlapFraction(other) { return Stamp.overlapFraction(this.stampArray, other.stampArray); }

  /**
   * Create a copy of this stamp
   */
  clone() { return new Stamp(this.stampArray.slice()); }

  /**
   * Convert to string representation
   */
  toString() { return `Stamp[${this.stampArray.join(',')}]`; }

  /**
   * Check equality with another stamp
   */
  equals(other) { return other instanceof Stamp && Stamp.arraysEqual(this.stampArray, other.stampArray); }

  /**
   * Get hash code for consistent hashing
   */
  hashCode() {
    let hash = 0;
    for (const value of this.stampArray) {
      hash = ((hash << 5) - hash) + value;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

/**
 * Simple random number generator for stamp sampling
 */
class SimpleRNG {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

/**
 * Task hashing utilities for consistent equality checks
 */
export class TaskHash {
  /**
   * Generate consistent hash for task content
   */
  static hashTask(task) {
    const content = task.term.toString() + task.punctuation;
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash;
  }

  /**
   * Check if two tasks are equal based on content and stamp
   */
  static tasksEqual(taskA, taskB) {
    if (!taskA || !taskB) return false;

    // Check content equality (this is what matters for task equality)
    if (taskA.term.toString() !== taskB.term.toString()) return false;
    if (taskA.punctuation !== taskB.punctuation) return false;

    // Tasks are equal based on content only, not stamps
    // Stamps are for evidence tracking, not task identity
    return true;
  }

  /**
   * Check if task is duplicate of any in array (excluding itself)
   */
  static isDuplicate(task, taskArray) {
    return taskArray.some(existing => existing !== task && TaskHash.tasksEqual(task, existing));
  }
}

export default Stamp;