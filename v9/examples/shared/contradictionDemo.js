/**
 * @file: examples/shared/contradictionDemo.js
 * @description: Shared functionality for contradiction resolution demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateContradictionResolution() {
  // Create and start the system
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Access the contradiction analyzer and resolution strategy components
    const contradictionAnalyzer = system.core.contradictionAnalyzer;
    const resolutionStrategy = system.core.resolutionStrategy;

    if (!contradictionAnalyzer || !resolutionStrategy) {
      console.log('⚠️  Contradiction components not available in this configuration');
      return null;
    }

    console.log('\\n📋 Contradiction Analysis Initial Stats:');
    const initialStats = contradictionAnalyzer.getStats();
    console.log('   Contradictions Detected:', initialStats.contradictionsDetected);
    console.log('   Direct Negations:', initialStats.directNegations);
    console.log('   Partial Contradictions:', initialStats.partialContradictions);

    // 1. Create sample beliefs that might have contradictions
    console.log('\\n⚖️ Creating sample beliefs with potential contradictions...');
    const sampleBeliefs = [
      {
        id: 'belief-1',
        statement: 'The temperature is high',
        truth: { frequency: 0.9, confidence: 0.8 },
        priority: 5,
        creationTime: Date.now() - 1000
      },
      {
        id: 'belief-2',
        statement: 'The temperature is high',
        truth: { frequency: 0.1, confidence: 0.85 }, // Direct contradiction
        priority: 7,
        creationTime: Date.now()
      },
      {
        id: 'belief-3',
        statement: 'Server performance is good',
        truth: { frequency: 0.7, confidence: 0.9 },
        priority: 6,
        creationTime: Date.now() - 2000
      },
      {
        id: 'belief-4',
        statement: 'Server performance is good',
        truth: { frequency: 0.3, confidence: 0.8 }, // Partial contradiction
        priority: 4,
        creationTime: Date.now()
      }
    ];

    // 2. Analyze beliefs for contradictions
    console.log('\\n🔍 Analyzing beliefs for contradictions...');
    const contradictions = await contradictionAnalyzer.analyzeBeliefs(sampleBeliefs);

    console.log('\\n📊 Contradiction Analysis Results:');
    console.log('   Total contradictions found:', contradictions.length);

    contradictions.forEach((contr, index) => {
      console.log(`   ${index + 1}. Type: ${contr.type}, Strength: ${contr.strength.toFixed(2)}`);
      console.log(`      Belief 1: ${contr.beliefs[0].statement} (freq: ${contr.beliefs[0].truth.frequency})`);
      console.log(`      Belief 2: ${contr.beliefs[1].statement} (freq: ${contr.beliefs[1].truth.frequency})`);
    });

    // 3. Get available resolution strategies
    console.log('\\n⚙️ Available Resolution Strategies:');
    const availableStrategies = resolutionStrategy.getAvailableStrategies();
    console.log('   Strategies:', availableStrategies.join(', '));

    // 4. Resolve detected contradictions using different strategies
    console.log('\\n⚖️ Resolving contradictions...');
    if (contradictions.length > 0) {
      // Resolve using priority-based strategy
      const priorityResolution = await resolutionStrategy.resolveMultipleContradictions(
        contradictions, 'priority', { memory: system.core.memory }
      );
      console.log('   Priority-based resolution results:', priorityResolution.length);

      // Resolve using confidence-based strategy
      const confidenceResolution = await resolutionStrategy.resolveMultipleContradictions(
        contradictions, 'confidence', { memory: system.core.memory }
      );
      console.log('   Confidence-based resolution results:', confidenceResolution.length);

      // Resolve using temporal-based strategy
      const temporalResolution = await resolutionStrategy.resolveMultipleContradictions(
        contradictions, 'temporal', { memory: system.core.memory }
      );
      console.log('   Temporal-based resolution results:', temporalResolution.length);
    }

    // 5. Demonstrate integration strategy
    if (contradictions.length > 0) {
      console.log('\\n🔗 Testing integration strategy...');
      const integrationResolution = await resolutionStrategy.resolveMultipleContradictions(
        contradictions, 'integration', { memory: system.core.memory }
      );
      console.log('   Integration-based resolution results:', integrationResolution.length);
    }

    // 6. Show updated stats
    console.log('\\n📈 Updated Contradiction Analysis Stats:');
    const finalStats = contradictionAnalyzer.getStats();
    console.log('   Total Contradictions:', finalStats.totalContradictions);
    console.log('   Unresolved Contradictions:', finalStats.unresolvedContradictions);

    // Resolution strategy stats
    const resolutionStats = resolutionStrategy.getStats();
    console.log('\\n🔧 Resolution Strategy Stats:');
    console.log('   Contradictions Resolved:', resolutionStats.contradictionsResolved);
    console.log('   Resolution Success:', resolutionStats.resolutionSuccess);
    console.log('   Strategy Usage:', resolutionStats.strategyUsage);

    // Return results for verification
    return {
      initialStats,
      finalStats,
      contradictions,
      resolutionResults: {
        priority: priorityResolution,
        confidence: confidenceResolution,
        temporal: temporalResolution,
        integration: integrationResolution
      },
      resolutionStats,
      hasAnalyzer: !!contradictionAnalyzer,
      hasResolver: !!resolutionStrategy,
      system
    };

  } catch (error) {
    console.error('❌ Error during contradiction resolution example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Export a function specifically for testing contradiction resolution functionality
export async function testContradictionResolutionFunctionality() {
  const system = new System({});

  try {
    await system.start();

    const analyzer = system.core.contradictionAnalyzer;
    const resolver = system.core.resolutionStrategy;

    if (!analyzer || !resolver) {
      throw new Error('Contradiction components not available');
    }

    // Test contradiction detection components exist
    const detectionComponents = {
      hasAnalyzer: !!analyzer,
      hasAnalyzeBeliefs: typeof analyzer.analyzeBeliefs === 'function',
      hasGetContradictions: typeof analyzer.getContradictions === 'function',
      hasGetStats: typeof analyzer.getStats === 'function'
    };

    // Test resolution strategy components exist
    const resolutionComponents = {
      hasResolver: !!resolver,
      hasResolveContradiction: typeof resolver.resolveContradiction === 'function',
      hasGetAvailableStrategies: typeof resolver.getAvailableStrategies === 'function',
      hasGetStats: typeof resolver.getStats === 'function',
      hasAddStrategy: typeof resolver.addStrategy === 'function'
    };

    // Create sample beliefs with direct contradiction
    const testBeliefs = [
      {
        id: 'test-belief-1',
        statement: 'The sky is blue',
        truth: { frequency: 0.9, confidence: 0.8 },
        priority: 5,
        creationTime: Date.now() - 1000
      },
      {
        id: 'test-belief-2',
        statement: 'The sky is blue',  // Direct contradiction
        truth: { frequency: 0.1, confidence: 0.8 },
        priority: 7,
        creationTime: Date.now()
      },
      {
        id: 'test-belief-3',
        statement: 'Weather is good',
        truth: { frequency: 0.8, confidence: 0.7 },
        priority: 4,
        creationTime: Date.now() - 2000
      },
      {
        id: 'test-belief-4',
        statement: 'Weather is good',  // Partial contradiction
        truth: { frequency: 0.2, confidence: 0.8 },
        priority: 6,
        creationTime: Date.now()
      }
    ];

    // Test contradiction detection
    const contradictions = await analyzer.analyzeBeliefs(testBeliefs);

    // Test getting contradictions
    const allContradictions = analyzer.getContradictions();
    const unresolvedContradictions = analyzer.getUnresolvedContradictions();

    // Test resolution strategies
    const availableStrategies = resolver.getAvailableStrategies();

    // Resolve one contradiction using different strategies
    let resolutionResults = {};
    if (contradictions.length > 0) {
      for (const strategy of availableStrategies.slice(0, 3)) { // Test first 3 strategies
        const result = await resolver.resolveContradiction(contradictions[0], strategy, { memory: system.core.memory });
        resolutionResults[strategy] = result;
      }
    }

    // Get stats
    const analyzerStats = analyzer.getStats();
    const resolverStats = resolver.getStats();

    return {
      detectionComponents,
      resolutionComponents,
      contradictions,
      allContradictions,
      unresolvedContradictions,
      availableStrategies,
      resolutionResults,
      analyzerStats,
      resolverStats
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing direct contradiction detection
export async function testDirectContradictionDetection() {
  const system = new System({});

  try {
    await system.start();

    const analyzer = system.core.contradictionAnalyzer;
    if (!analyzer) {
      throw new Error('ContradictionAnalyzer not available');
    }

    // Create beliefs with direct contradiction
    const directContraBeliefs = [
      {
        id: 'direct-belief-1',
        statement: 'A is true',
        truth: { frequency: 0.95, confidence: 0.9 },
        priority: 5
      },
      {
        id: 'direct-belief-2',
        statement: 'A is true',  // Exact same statement but opposite truth value
        truth: { frequency: 0.05, confidence: 0.85 },  // Direct contradiction
        priority: 6
      }
    ];

    // Detect contradictions
    const contradictions = await analyzer.analyzeBeliefs(directContraBeliefs);

    // Check for direct negations
    const directNegations = contradictions.filter(c => c.type === 'direct_negation');
    const hasDirectNegation = directNegations.length > 0;

    return {
      contradictions,
      directNegations,
      hasDirectNegation,
      detectedCount: contradictions.length
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing resolution strategy selection
export async function testResolutionStrategySelection() {
  const system = new System({});

  try {
    await system.start();

    const resolver = system.core.resolutionStrategy;
    if (!resolver) {
      throw new Error('ResolutionStrategy not available');
    }

    // Create a sample contradiction
    const sampleContradiction = {
      type: 'direct_negation',
      beliefs: [
        {
          id: 'bel-1',
          statement: 'Sample statement',
          truth: { frequency: 0.9, confidence: 0.8 },
          priority: 5,
          creationTime: Date.now() - 1000
        },
        {
          id: 'bel-2',
          statement: 'Sample statement',  // Same statement
          truth: { frequency: 0.1, confidence: 0.85 },
          priority: 6,  // Higher priority
          creationTime: Date.now()
        }
      ],
      strength: 1.0
    };

    // Get available strategies
    const availableStrategies = resolver.getAvailableStrategies();

    // Test each strategy
    const strategyResults = {};
    for (const strategyName of availableStrategies) {
      const result = await resolver.resolveContradiction(
        sampleContradiction,
        strategyName,
        { memory: system.core.memory }
      );
      strategyResults[strategyName] = result;
    }

    // Get resolver stats
    const stats = resolver.getStats();

    return {
      availableStrategies,
      strategyResults,
      stats,
      totalStrategyTests: Object.keys(strategyResults).length
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing belief revision workflows
export async function testBeliefRevisionWorkflows() {
  const system = new System({});

  try {
    await system.start();

    const analyzer = system.core.contradictionAnalyzer;
    const resolver = system.core.resolutionStrategy;

    if (!analyzer || !resolver) {
      throw new Error('Contradiction components not available');
    }

    // Create beliefs with contradiction and resolve them
    const beliefs = [
      {
        id: 'belief-rev-1',
        statement: 'System status normal',
        truth: { frequency: 0.8, confidence: 0.9 },
        priority: 5,
        creationTime: Date.now() - 2000
      },
      {
        id: 'belief-rev-2',
        statement: 'System status normal',  // Contradiction
        truth: { frequency: 0.2, confidence: 0.85 },
        priority: 6,
        creationTime: Date.now() - 1000
      }
    ];

    // Detect contradiction
    const contradictions = await analyzer.analyzeBeliefs(beliefs);

    // Resolve using confidence-based strategy
    let resolutionResult = null;
    if (contradictions.length > 0) {
      resolutionResult = await resolver.resolveContradiction(
        contradictions[0],
        'confidence',
        { memory: system.core.memory }
      );

      // Check if the contradiction is now resolved
      const unresolvedAfter = analyzer.getUnresolvedContradictions();
    }

    // Get final stats
    const finalStats = analyzer.getStats();

    return {
      contradictions,
      resolutionResult,
      finalStats,
      beliefCount: beliefs.length
    };
  } finally {
    await system.stop();
  }
}