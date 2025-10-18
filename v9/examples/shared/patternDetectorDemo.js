/**
 * @file: examples/shared/patternDetectorDemo.js
 * @description: Shared functionality for pattern detection demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Shared utilities for pattern detection demos
const createSystem = () => new System({});

const withSystem = async (fn) => {
  const system = createSystem();
  try {
    await system.start();
    return await fn(system);
  } finally {
    await system.stop();
  }
};

const createAlternatingEvents = (type, names, count) => {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      type,
      name: names[i % names.length],
      timestamp: Date.now() - (count - i)
    });
  }
  return events;
};

const createSequentialEvents = (type, name, count, interval = 1000) => {
  const events = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    events.push({
      type,
      name,
      timestamp: now - (count - i) * interval,
      context: 'server-001'
    });
  }
  return events;
};

const createCausalEvents = () => {
  const now = Date.now();
  return [
    { type: 'cpu-event', name: 'cpu-increase', value: 50, timestamp: now - 8, context: 'server' },
    { type: 'fan-event', name: 'fan-activation', value: 60, timestamp: now - 7, context: 'server' },
    { type: 'cpu-event', name: 'cpu-increase', value: 70, timestamp: now - 6, context: 'server' },
    { type: 'fan-event', name: 'fan-activation', value: 75, timestamp: now - 5, context: 'server' },
    { type: 'cpu-event', name: 'cpu-increase', value: 80, timestamp: now - 4, context: 'server' },
    { type: 'fan-event', name: 'fan-activation', value: 85, timestamp: now - 3, context: 'server' },
    { type: 'cpu-event', name: 'cpu-increase', value: 90, timestamp: now - 2, context: 'server' },
    { type: 'fan-event', name: 'fan-activation', value: 95, timestamp: now - 1, context: 'server' }
  ];
};

const createSampleEvents = () => [
  { id: 'event-1', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 10, context: 'server-room' },
  { id: 'event-2', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 9, context: 'server-room' },
  { id: 'event-3', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 8, context: 'server-room' },
  { id: 'event-4', type: 'fan-control', name: 'fan-reading', timestamp: Date.now() - 7, context: 'server-room' },
  { id: 'event-5', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 6, context: 'server-room' },
  { id: 'event-6', type: 'fan-control', name: 'fan-reading', timestamp: Date.now() - 5, context: 'server-room' },
  { id: 'event-7', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 4, context: 'server-room' },
  { id: 'event-8', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 3, context: 'server-room' },
  { id: 'event-9', type: 'cpu-monitor', name: 'cpu-reading', timestamp: Date.now() - 2, context: 'server' },
  { id: 'event-10', type: 'cpu-monitor', name: 'cpu-reading', timestamp: Date.now() - 1, context: 'server' }
];

const logPatternResults = (detectionResult) => {
  console.log('\\n📊 Pattern Detection Results:');
  console.log('   Temporal Patterns Found:', detectionResult.temporal.length);
  console.log('   Causal Patterns Found:', detectionResult.causal.length);
  console.log('   Hierarchical Patterns Found:', detectionResult.hierarchical.length);

  if (detectionResult.temporal.length > 0) {
    console.log('\\n📈 Temporal Patterns:');
    detectionResult.temporal.forEach((pattern, index) => {
      console.log(`   ${index + 1}. ${pattern.type}: ${pattern.length} events, confidence: ${pattern.confidence.toFixed(2)}`);
    });
  }

  if (detectionResult.causal.length > 0) {
    console.log('\\n🔗 Causal Patterns:');
    detectionResult.causal.forEach((pattern, index) => {
      console.log(`   ${index + 1}. Causal strength: ${pattern.strength.toFixed(2)}, confidence: ${pattern.confidence.toFixed(2)}`);
    });
  }

  if (detectionResult.hierarchical.length > 0) {
    console.log('\\n🏗️ Hierarchical Patterns:');
    detectionResult.hierarchical.forEach((pattern, index) => {
      console.log(`   ${index + 1}. Depth: ${pattern.depth}, confidence: ${pattern.confidence.toFixed(2)}`);
    });
  }
};

const runPatternDetectionWorkflow = async (patternDetector, events) => {
  const detectionResult = await patternDetector.processEventStream(events, 'temperature-monitoring');

  logPatternResults(detectionResult);

  // Demonstrate pattern matching
  if (detectionResult.temporal.length > 0) {
    const samplePattern = detectionResult.temporal[0];
    const matches = await patternDetector.matchPattern('temporal', events, samplePattern);
    console.log('   Matches found for temporal pattern:', matches.length);
  }

  // Demonstrate prediction
  const predictions = await patternDetector.predictNextEvents(events);
  console.log('   Predicted next events:', predictions.length);

  return { detectionResult, predictions };
};

// Main demonstration function
export async function demonstratePatternDetection() {
  const system = createSystem();

  try {
    await system.start();
    console.log('✅ System started successfully');

    const patternDetector = system.core.patternDetector;
    if (!patternDetector) {
      console.log('⚠️  PatternDetector not available in this configuration');
      return null;
    }

    console.log('\\n📋 Pattern Detector Initial Stats:');
    const initialStats = patternDetector.getStats();
    console.log('   Temporal Patterns:', initialStats.temporalPatterns);
    console.log('   Causal Patterns:', initialStats.causalPatterns);
    console.log('   Hierarchical Patterns:', initialStats.hierarchicalPatterns);

    console.log('\\n🔍 Creating sample event data for pattern detection...');
    const sampleEvents = createSampleEvents();

    console.log('\\n🧠 Processing event stream for pattern detection...');
    const { detectionResult, predictions } = await runPatternDetectionWorkflow(patternDetector, sampleEvents);

    console.log('\\n📈 Updated Pattern Detection Stats:');
    const finalStats = patternDetector.getStats();
    console.log('   Total Patterns Detected:', finalStats.totalPatterns);
    console.log('   Pattern Matches:', finalStats.patternMatches);
    console.log('   Learning Updates:', finalStats.learningUpdates);

    return {
      initialStats,
      finalStats,
      detectionResult,
      predictions,
      hasPatternDetector: !!patternDetector,
      system
    };

  } catch (error) {
    console.error('❌ Error during pattern detection example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Test function for pattern detection functionality
export async function testPatternDetectionFunctionality() {
  return await withSystem(async (system) => {
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) throw new Error('PatternDetector not available');

    const componentsAvailable = {
      hasPatternDetector: !!patternDetector,
      hasProcessEventStream: typeof patternDetector.processEventStream === 'function',
      hasMatchPattern: typeof patternDetector.matchPattern === 'function',
      hasPredictNextEvents: typeof patternDetector.predictNextEvents === 'function',
      hasGetPatterns: typeof patternDetector.getPatterns === 'function',
      hasGetStats: typeof patternDetector.getStats === 'function',
      hasLearnFromPatterns: typeof patternDetector.learnFromPatterns === 'function'
    };

    const testEvents = createAlternatingEvents('test', ['A', 'B'], 8);
    const result = await patternDetector.processEventStream(testEvents, 'test-stream');

    return {
      componentsAvailable,
      result,
      temporalPatterns: patternDetector.getPatterns('temporal'),
      causalPatterns: patternDetector.getPatterns('causal'),
      hierarchicalPatterns: patternDetector.getPatterns('hierarchical'),
      predictions: await patternDetector.predictNextEvents(testEvents),
      stats: patternDetector.getStats()
    };
  });
}

// Test function for temporal pattern recognition with prediction
export async function testTemporalPatternRecognition() {
  return await withSystem(async (system) => {
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) throw new Error('PatternDetector not available');

    // Configure for testing
    if (patternDetector.config) {
      patternDetector.config.minPatternFrequency = 2;
      patternDetector.config.similarityThreshold = 0.5;
    }

    const temporalEvents = createSequentialEvents('system-alert', 'high-cpu', 10);
    const temporalResult = await patternDetector.processEventStream(temporalEvents, 'temporal-test');

    const predictions = await patternDetector.predictNextEvents(temporalEvents);

    return {
      temporalResult,
      hasTemporalPatterns: temporalResult.temporal.length > 0,
      predictions,
      predictionCount: predictions.length,
      predictionConfidence: predictions.length > 0 ? predictions[0].confidence || 0 : 0
    };
  });
}

// Test function for causal relationship identification
export async function testCausalRelationshipIdentification() {
  return await withSystem(async (system) => {
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) throw new Error('PatternDetector not available');

    const causalEvents = createCausalEvents();
    const causalResult = await patternDetector.processEventStream(causalEvents, 'causal-test');

    const hasCausalPatterns = causalResult.causal.length > 0;
    const causalMatchCount = hasCausalPatterns
      ? (await patternDetector.matchPattern('causal', causalEvents, causalResult.causal[0])).length
      : 0;

    return {
      causalResult,
      hasCausalPatterns,
      causalMatchCount,
      detectedCausalPatterns: causalResult.causal.length
    };
  });
}

// Test function for pattern confidence scoring
export async function testPatternConfidenceScoring() {
  return await withSystem(async (system) => {
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) throw new Error('PatternDetector not available');

    const confidenceEvents = createAlternatingEvents('regular-pattern', ['pattern-a', 'pattern-b'], 8);
    confidenceEvents.forEach(event => event.context = 'test');

    const result = await patternDetector.processEventStream(confidenceEvents, 'confidence-test');
    const patternConfidences = result.all.map(p => p.confidence);

    return {
      result,
      patternConfidences,
      averageConfidence: patternConfidences.length > 0
        ? patternConfidences.reduce((a, b) => a + b) / patternConfidences.length
        : 0,
      highestConfidence: patternConfidences.length > 0
        ? Math.max(...patternConfidences)
        : 0
    };
  });
}