import System from '../core/system/System.js';

async function runBootstrapSystemDemo() {
  return runBootstrapDemo({
    demoName: 'BootstrapSystem Demo (Moved to Agent Layer)',
    priorityLevel: 3,
  });
}

// Function to run bootstrap demo
async function runBootstrapDemo(config = {}) {
  const finalConfig = {
    version: '2.0.0',
    priorityLevel: 3,
    demoName: 'BootstrapSystem Demo (Moved to Agent Layer)',
    ...config
  };

  console.log(`🚀 SeNARS ${finalConfig.demoName}`);
  console.log('===============================');

  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    console.log('\\n⚠️  BootstrapAgent is now in the agent layer, not in core');
    console.log('   This demonstrates proper architectural separation:');
    console.log('   - Core contains essential components only');
    console.log('   - Agent layer handles higher-level functionality like bootstrapping');
    console.log('\\n   To run BootstrapAgent demo:');
    console.log('   - node examples/bootstrap-agent-demo.js');

    console.log('\\n📋 Core System Status:');
    console.log(`   Version: ${finalConfig.version}`);
    console.log(`   Running: ${system.isRunning}`);

    // Show core component status
    if (system.core) {
      console.log('\\n📦 Core Components Available:');
      console.log(`   - Memory: ${system.core.memory ? '✅' : '❌'}`);
      console.log(`   - Reasoning: ${system.core.reasoning ? '✅' : '❌'}`);
      console.log(`   - LM: ${system.core.lm ? '✅' : '❌'}`);
      console.log(`   - Planning: ${system.core.htnPlanner ? '✅' : '❌'}`);
      console.log(`   - Messaging: ${system.core.messages ? '✅' : '❌'}`);
      console.log(`   - BootstrapAgent: ❌ (now in agent layer)`);
    }

    console.log('\\n🎯 Core System Features Demonstrated:');
    console.log('   ✅ Core system orchestration');
    console.log('   ✅ Component initialization and registration');
    console.log('   ✅ Cross-component dependency management');
    console.log('   ✅ Proper separation of concerns (Core vs Agent)');

  } catch (error) {
    console.error(`❌ Error during ${finalConfig.demoName.toLowerCase()}:`, error);
  } finally {
    await system.stop();
    console.log('\\n✅ System stopped');
    console.log(`🎉 ${finalConfig.demoName} Complete!`);
  }
}

// Demo shows architectural improvement: Core vs Agent separation
// For actual BootstrapAgent functionality, see examples/bootstrap-agent-demo.js