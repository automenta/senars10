/**
 * @file: examples/shared/index.js
 * @description: Unified exports for all shared demonstration modules used by tests and examples
 */

// Export WebSocket demo functions
export {
  demonstrateWebSocketCommunication,
  testWebSocketFunctionality
} from './webSocketDemo.js';

// Export Language Model demo functions
export {
  demonstrateLMProviders,
  testLMProviders,
  testLMResponseValidation
} from './lmDemo.js';

// Export Planning demo functions
export {
  demonstratePlanningSystem,
  testPlanningFunctionality,
  testTaskDependencyResolution
} from './planningDemo.js';

// Export Pattern Detection demo functions
export {
  demonstratePatternDetection,
  testPatternDetectionFunctionality,
  testTemporalPatternRecognition,
  testCausalRelationshipIdentification,
  testPatternConfidenceScoring
} from './patternDetectorDemo.js';

// Export Contradiction Resolution demo functions
export {
  demonstrateContradictionResolution,
  testContradictionResolutionFunctionality,
  testDirectContradictionDetection,
  testResolutionStrategySelection,
  testBeliefRevisionWorkflows
} from './contradictionDemo.js';

// Export Memory Attention demo functions
export {
  demonstrateMemoryAttention,
  testMemoryAttentionFunctionality,
  testMultiFocusSetOperations,
  testAttentionDecayAndUpdate,
  testCrossFocusSetQuerying
} from './memoryAttentionDemo.js';

// Export Cognitive Cycle demo functions
export {
  demonstrateCognitiveCycle,
  testCognitiveCycleFunctionality,
  testRuleMemoryInteraction,
  testTaskProcessingFlow,
  testEndToEndCognitiveLoop
} from './cognitiveDemo.js';

// Export System Health demo functions
export {
  demonstrateSystemHealthMonitoring,
  testSystemHealthMonitoringFunctionality,
  testComponentHealthAggregation,
  testPerformanceMetricCollection,
  testCrossComponentEventPropagation
} from './systemHealthDemo.js';

// Export Plan Processing demo functions
export {
  demonstratePlanProcessing,
  testPlanProcessingFunctionality,
  testDocumentParsingAndGoalExtraction,
  testGoalPrioritizationAndValidation,
  testTaskGenerationFromStructuredPlans
} from './planProcessorDemo.js';

// Export Bootstrap Agent demo functions
export {
  demonstrateBootstrapAgent,
  testBootstrapAgentFunctionality,
  testPlanFileMonitoringAndUpdates,
  testSelfDirectedGoalProcessing,
  testImprovementLoopIteration
} from './bootstrapDemo.js';

// Export existing demo functions
export {
  demonstrateCognitiveCycle as demonstrateCognitiveCycleOriginal
} from './cognitiveCycleDemo.js';

export {
  demonstrateMemorySystem as demonstrateMemorySystemOriginal
} from './memoryDemo.js';