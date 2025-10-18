import System from '../core/system/System.js';

async function runRealWorldApplicationDemo() {
  console.log('🌍 SeNARS Real-World Application Demo');
  console.log('====================================');
  console.log('Demonstrating practical applications and use cases');

  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    console.log('\n📚 Example 1: Knowledge Base Management');
    console.log('   Use Case: Building and maintaining a knowledge base for decision support');

    const knowledgeBase = [
      { term: '(Mammal --> HasHair)', punctuation: '.', truth: { frequency: 0.9, confidence: 0.8 } },
      { term: '(Dog --> Mammal)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
      { term: '(Cat --> Mammal)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
      { term: '(Bird --> CanFly)', punctuation: '.', truth: { frequency: 0.8, confidence: 0.7 } },
      { term: '(Penguin --> Bird)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
      { term: '(Penguin --> [NotCanFly])', punctuation: '.', truth: { frequency: 0.9, confidence: 0.8 } }
    ];

    console.log(`   📝 Adding ${knowledgeBase.length} knowledge statements to system`);
    knowledgeBase.forEach(statement => system.input(statement));

    console.log('   ❓ Querying: "What can we say about Penguins?"');
    const penguinQuery = await system.ask('(Penguin ?x)');
    console.log('   💡 Answer:', penguinQuery);

    console.log('\n⏰ Example 2: Temporal Reasoning');
    console.log('   Use Case: Understanding sequences and temporal relationships');

    const temporalEvents = [
      { term: '(Event StartProject)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
      { term: '(Event GatherRequirements)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
      { term: '(Event DesignSystem)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
      { term: '(Event ImplementFeatures)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
      { term: '(Event TestSystem)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } }
    ];

    console.log(`   📅 Adding ${temporalEvents.length} temporal events`);
    temporalEvents.forEach(event => system.input(event));

    console.log('\n⚖️ Example 3: Contradiction Detection and Resolution');
    console.log('   Use Case: Maintaining consistency in knowledge bases');

    system.input({
      term: '(System --> Reliable)',
      punctuation: '.',
      truth: { frequency: 0.9, confidence: 0.8 }
    });

    system.input({
      term: '(System --> [NotReliable])',
      punctuation: '.',
      truth: { frequency: 0.7, confidence: 0.6 }
    });

    console.log('   ⚠️ Added contradictory beliefs about system reliability');
    console.log('   🔍 System should detect and potentially resolve contradictions');

    console.log('\n🎯 Example 4: Goal-Oriented Reasoning');
    console.log('   Use Case: Planning and executing complex tasks');

    system.want('Improve system performance', 0.8);
    console.log('   🎯 Set goal: "Improve system performance"');

    const performanceBeliefs = [
      { term: '(OptimizeDatabase --> ImprovePerformance)', punctuation: '.', truth: { frequency: 0.8, confidence: 0.7 } },
      { term: '(AddCaching --> ImprovePerformance)', punctuation: '.', truth: { frequency: 0.9, confidence: 0.8 } },
      { term: '(ScaleHorizontally --> ImprovePerformance)', punctuation: '.', truth: { frequency: 0.7, confidence: 0.6 } }
    ];

    console.log(`   💡 Adding ${performanceBeliefs.length} performance improvement strategies`);
    performanceBeliefs.forEach(belief => system.input(belief));

    console.log('\n🔍 Example 5: Pattern Recognition');
    console.log('   Use Case: Identifying trends and making predictions');

    const usagePatterns = [
      { term: '(HighCPUDuringBusinessHours)', punctuation: '.', truth: { frequency: 0.8, confidence: 0.7 } },
      { term: '(LowMemoryUsageOvernight)', punctuation: '.', truth: { frequency: 0.9, confidence: 0.8 } },
      { term: '(SpikeInRequestsAtNoon)', punctuation: '.', truth: { frequency: 0.7, confidence: 0.6 } }
    ];

    console.log(`   📊 Adding ${usagePatterns.length} usage pattern observations`);
    usagePatterns.forEach(pattern => system.input(pattern));

    console.log('\n🎲 Example 6: Adaptive Strategy Selection');
    console.log('   Use Case: Choosing optimal approaches based on context');

    if (system.core.strategyRegistry) {
      system.core.strategyRegistry.registerStrategy('performance_optimization', {
        execute: (context) => {
          console.log('   🚀 Executing performance optimization strategy');
          return {
            actions: ['optimize_database', 'add_caching', 'scale_horizontally'],
            confidence: 0.85
          };
        }
      }, {
        description: 'Strategy for optimizing system performance',
        type: 'planning',
        group: 'optimization'
      });

      console.log('   ✅ Registered performance optimization strategy');
    }

    // Show system health and capabilities
    console.log('\n📊 System Status Summary:');
    const health = system.getHealth();
    console.log(`   Status: ${health.status}`);
    console.log(`   Uptime: ${Math.round(health.uptime / 1000)} seconds`);
    console.log(`   Tasks Processed: ${health.tasksProcessed}`);
    console.log(`   Components Active: ${Object.keys(health.coreHealth).length}`);

    // Demonstrate real-world applications
    console.log('\n🌟 Real-World Applications Demonstrated:');
    console.log('   📚 Knowledge Base Management - Building consistent knowledge bases');
    console.log('   ⏰ Temporal Reasoning - Understanding sequences and timing');
    console.log('   ⚖️ Contradiction Resolution - Maintaining logical consistency');
    console.log('   🎯 Goal-Oriented Planning - Executing complex objectives');
    console.log('   🔍 Pattern Recognition - Identifying trends and anomalies');
    console.log('   🎲 Adaptive Strategies - Context-aware decision making');

    console.log('\n💼 Practical Value Propositions:');
    console.log('   • Automated knowledge base maintenance and validation');
    console.log('   • Intelligent decision support systems');
    console.log('   • Predictive analytics and trend detection');
    console.log('   • Self-improving system optimization');
    console.log('   • Consistent reasoning across complex domains');

  } catch (error) {
    console.error('❌ Error during real-world demo:', error);
  } finally {
    await system.stop();
    console.log('\n✅ System stopped');
    console.log('🎉 Real-World Application Demo Complete!');
  }
}

// Run the demo
runRealWorldApplicationDemo().catch(console.error);