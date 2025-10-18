/**
 * A trait/interface for a time source.
 */
export class Clock {
  /**
   * Returns the current time as a number timestamp.
   * @returns {number} Current time
   */
  getTime() {
    throw new Error('getTime() must be implemented by subclass');
  }

  /**
   * Advances the clock's state, if applicable.
   */
  tick() {
    throw new Error('tick() must be implemented by subclass');
  }
}

/**
 * A clock that increments a counter on each tick.
 *
 * This is useful for simulations and testing, where time advances in discrete steps.
 */
export class IterativeClock extends Clock {
  constructor() {
    super();
    this.time = 0;
  }

  getTime() {
    return this.time;
  }

  /**
   * Advances the clock by one time unit.
   */
  tick() {
    this.time += 1;
  }
}

/**
 * A clock that provides the current real-world time as a Unix timestamp.
 *
 * This is used for real-time applications where the system needs to interact
 * with the external world.
 */
export class UnixTimeClock extends Clock {
  getTime() {
    return Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  }

  /**
   * The tick method is a no-op for the real-time clock, as time advances automatically.
   */
  tick() {
    // No operation needed
  }
}

/**
 * A clock that provides millisecond precision time.
 *
 * This is useful for detailed timing in performance-critical scenarios.
 */
export class HighResolutionClock extends Clock {
  constructor() {
    super();
    this.startTime = performance.now();
    this.offset = Date.now();
  }

  getTime() {
    // Return time in milliseconds since start
    return Math.floor(this.offset + (performance.now() - this.startTime));
  }

  tick() {
    // No operation needed
  }
}