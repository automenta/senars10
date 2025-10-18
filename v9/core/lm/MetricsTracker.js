// Simple in-memory metrics tracker
class MetricsTracker {
  constructor() {
    this.metrics = [];
  }

  track(data) {
    this.metrics.push({
      ...data,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    return [...this.metrics]; // Return a copy
  }

  clear() {
    this.metrics.length = 0;
  }
}

export default MetricsTracker;