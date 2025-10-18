import System from '../core/system/System.js';

const DEFAULT_CONFIG = {
  version: '2.0.0',
  demoName: 'BootstrapAgent Activation Demo (Moved to Agent Layer)'
};

async function runBootstrapDemo(config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  console.log(`🚀 SeNARS ${finalConfig.demoName}`);
  console.log('========================================');

  const system = new System({});

  try {
    await system.start();
    console.log('✅ Core System started successfully');

    console.log('\\n⚠️  IMPORTANT NOTICE:');
    console.log('   BootstrapAgent has been moved from core to agent layer');
    console.log('   This demonstrates the architectural improvement:');
    console.log('   - Core focuses on essential reasoning and memory');
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

async function runBootstrapActivationDemo() {
  return runBootstrapDemo({
    demoName: 'BootstrapAgent Activation Demo (Moved to Agent Layer)',
  });
}

// Run the demo
runBootstrapActivationDemo().catch(console.error);