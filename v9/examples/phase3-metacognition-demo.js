import System from '../core/system/System.js';

async function runPhase3MetacognitionDemo() {
  console.log('🧠 SeNARS Phase 3 Metacognition Demo');
  console.log('===================================');
  console.log('Demonstrating advanced reasoning and self-awareness capabilities');

  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    const components = {
      patternDetector: system.core.patternDetector,
      contradictionAnalyzer: system.core.contradictionAnalyzer,
      strategyRegistry: system.core.strategyRegistry,
      systemContext: system.core.systemContext,
      resolutionStrategy: system.core.resolutionStrategy
    };

    console.log('\n🔍 PatternDetector - Temporal & Causal Pattern Recognition:');
    if (components.patternDetector) {
      console.log('   ✅ PatternDetector component available');

      const tasks = [
        system.input({ term: '(EventA)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } }),
        system.input({ term: '(EventB)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } }),
        system.input({ term: '(EventA)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } }),
        system.input({ term: '(EventB)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } })
      ];

      console.log(`   📊 Added ${tasks.length} sample events for pattern analysis`);
      console.log('   🔄 PatternDetector analyzing temporal sequences...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const patternStats = components.patternDetector.getStats();
      console.log('   📈 Pattern detection results:', patternStats);
    } else {
      console.log('   ❌ PatternDetector not available');
    }

    console.log('\n⚖️ ContradictionAnalyzer - Logical Consistency Checking:');
    if (components.contradictionAnalyzer) {
      console.log('   ✅ ContradictionAnalyzer component available');

      system.input({ term: '(Bird --> CanFly)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } });
      system.input({ term: '(Penguin --> Bird)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } });
      system.input({ term: '(Penguin --> [NotCanFly])', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } });

      console.log('   📝 Added contradictory beliefs for analysis');
      console.log('   🔍 ContradictionAnalyzer scanning for logical conflicts...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const contradictionStats = components.contradictionAnalyzer.getStats();
      console.log('   📊 Contradiction analysis results:', contradictionStats);
    } else {
      console.log('   ❌ ContradictionAnalyzer not available');
    }

    console.log('\n🎯 StrategyRegistry - Dynamic Strategy Selection:');
    if (components.strategyRegistry) {
      console.log('   ✅ StrategyRegistry component available');

      components.strategyRegistry.registerStrategy('custom_reasoning', {
        execute: (tasks, context) => {
          console.log('   🎯 Executing custom reasoning strategy');
          return { result: 'Custom strategy executed', confidence: 0.8 };
        }
      }, {
        description: 'Custom reasoning strategy for demo',
        type: 'reasoning',
        group: 'demo'
      });

      components.strategyRegistry.registerStrategy('contradiction_demo', {
        execute: (contradiction, context) => {
          console.log('   ⚖️ Executing contradiction resolution strategy');
          return { resolution: 'Demo resolution applied', strategy: 'demo' };
        }
      }, {
        description: 'Demo contradiction resolution strategy',
        type: 'contradiction_resolution',
        group: 'demo'
      });

      console.log('   📋 Registered custom demo strategies');

      const availableStrategies = components.strategyRegistry.getAllStrategyIds();
      console.log(`   📊 Available strategies: ${availableStrategies.length}`);

      const strategyGroups = components.strategyRegistry.strategyGroups;
      console.log(`   📁 Strategy groups: ${Array.from(strategyGroups.keys()).join(', ')}`);
    } else {
      console.log('   ❌ StrategyRegistry not available');
    }

    console.log('\n🔧 SystemContext - Safe System Access:');
    if (components.systemContext) {
      console.log('   ✅ SystemContext component available');

      const memoryAccess = components.systemContext.getMemory();
      const reasoningAccess = components.systemContext.getReasoner();

      console.log('   🔒 Safe access interfaces created');
      console.log('   💾 Memory access:', typeof memoryAccess);
      console.log('   🧠 Reasoning access:', typeof reasoningAccess);

      const contextStats = components.systemContext.getSystemStats();
      console.log('   📊 Context access statistics:', contextStats);
    } else {
      console.log('   ❌ SystemContext not available');
    }

    console.log('\n🔄 ResolutionStrategy - Contradiction Resolution:');
    if (components.resolutionStrategy) {
      console.log('   ✅ ResolutionStrategy component available');

      const availableResolutions = components.resolutionStrategy.getAvailableStrategies();
      console.log(`   📋 Available resolution strategies: ${availableResolutions.length}`);

      const sampleContradiction = {
        type: 'direct_negation',
        statement1: '(A)',
        statement2: '([Not] A)',
        confidence: 0.9
      };

      const resolution = components.resolutionStrategy.resolveContradiction(sampleContradiction, 'confidence');
      console.log('   ⚖️ Resolution result:', resolution);
    } else {
      console.log('   ❌ ResolutionStrategy not available');
    }

    console.log('\n🔗 Phase 3 Integration Status:');
    const health = system.getHealth();

    const phase3Components = [
      'patternDetector', 'contradictionAnalyzer', 'resolutionStrategy',
      'strategyRegistry', 'systemContext'
    ];

    phase3Components.forEach(component => {
      const status = health.coreHealth[component]?.status || 'not_found';
      const icon = status === 'running' ? '✅' : status === 'unknown' ? '⚠️' : '❌';
      console.log(`   ${icon} ${component}: ${status}`);
    });

    console.log('\n🎉 Phase 3 Metacognition Features Demonstrated:');
    console.log('   ✅ Pattern Detection and Recognition');
    console.log('   ✅ Contradiction Analysis and Detection');
    console.log('   ✅ Dynamic Strategy Selection and Management');
    console.log('   ✅ Safe System Context Access');
    console.log('   ✅ Contradiction Resolution Strategies');
    console.log('   ✅ Component Integration and Coordination');

  } catch (error) {
    console.error('❌ Error during Phase 3 demo:', error);
  } finally {
    await system.stop();
    console.log('\n✅ System stopped');
    console.log('🎉 Phase 3 Metacognition Demo Complete!');
  }
}

// Run the demo
runPhase3MetacognitionDemo().catch(console.error);