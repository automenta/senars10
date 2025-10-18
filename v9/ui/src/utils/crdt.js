// 2P-Set (Two-Phase Set) CRDT Implementation

class TwoPhaseSet {
  constructor() {
    this.adds = new Set();
    this.removes = new Set();
  }

  // Add an element to the set
  add(element) {
    this.adds.add(element);
  }

  // Remove an element from the set
  remove(element) {
    if (this.adds.has(element)) {
      this.removes.add(element);
    }
  }

  // Check if an element exists in the set
  has(element) {
    return this.adds.has(element) && !this.removes.has(element);
  }

  // Get all current values in the set
  get values() {
    const result = [];
    for (const element of this.adds) {
      if (!this.removes.has(element)) {
        result.push(element);
      }
    }
    return result;
  }

  // Merge another 2P-Set into this one
  merge(otherSet) {
    for (const element of otherSet.adds) {
      this.adds.add(element);
    }
    for (const element of otherSet.removes) {
      this.removes.add(element);
    }
  }

  // Serialize the set for network transfer
  toJSON() {
    return {
      adds: [...this.adds],
      removes: [...this.removes],
    };
  }

  // Deserialize from a plain object
  static fromJSON(data) {
    const set = new TwoPhaseSet();
    if (data && data.adds && data.removes) {
      set.adds = new Set(data.adds);
      set.removes = new Set(data.removes);
    }
    return set;
  }
}

export default TwoPhaseSet;
