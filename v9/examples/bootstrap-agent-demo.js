import System from '../core/system/System.js';
import BootstrapAgent from '../agent/BootstrapAgent.js';

async function runBootstrapAgentDemo() {
  return runBootstrapDemo({
    demoName: 'BootstrapAgent Demo',
    planFile: '../NEXT.md',
    priorityLevel: 3,
    enableSelfImprovement: true,
    watchPlanFiles: true,
    maxBootstrapIterations: 10
  });
}

// Import the shared function from bootstrap-activation-demo.js
async function runBootstrapDemo(config = {}) {
  const finalConfig = {
    version: '2.0.0',
    planFile: '../NEXT.md',
    priorityLevel: 3,
    enableSelfImprovement: true,
    watchPlanFiles: true,
    maxBootstrapIterations: 5,
    demoName: 'BootstrapAgent Demo',
    ...config
  };

  console.log(`🚀 SeNARS ${finalConfig.demoName}`);
  console.log('===============================');

  // Create the core system first
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Create and configure the BootstrapAgent separately
    const bootstrapAgent = new BootstrapAgent();

    // Setup dependencies
    bootstrapAgent.setupDependencies(
      system.core.lm,
      system.core.planProcessor,
      system.core.htnPlanner,
      system.core
    );

    // Add plan source
    bootstrapAgent.addPlanSource(finalConfig.planFile, 'file');

    if (!bootstrapAgent) return console.log('❌ BootstrapAgent not available');

    console.log('\\n📋 BootstrapAgent Status:');
    console.log(`   - Plan file: ${finalConfig.planFile}`);
    console.log(`   - Priority level: Phase ${finalConfig.priorityLevel}`);
    console.log(`   - Self-improvement: ${finalConfig.enableSelfImprovement ? 'Enabled' : 'Disabled'}`);
    console.log(`   - File watching: ${finalConfig.watchPlanFiles ? 'Enabled' : 'Disabled'}`);

    const initialStatus = bootstrapAgent.getStatus();
    console.log('\\n📊 Initial Bootstrap Status:');
    console.log(`   - Phase: ${initialStatus.phase}`);
    console.log(`   - Active: ${initialStatus.isActive}`);
    console.log(`   - Plan sources: ${initialStatus.goals.planSourcesCount}`);
    console.log(`   - Total goals: ${initialStatus.goals.total}`);

    console.log('\\n🚀 Starting Bootstrap Process...');
    await bootstrapAgent.start();

    console.log('⏳ Processing development plan...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const progressStatus = bootstrapAgent.getStatus();
    const stats = bootstrapAgent.getStats();

    console.log('\\n📈 Bootstrap Progress:');
    console.log(`   - Current phase: ${progressStatus.phase}`);
    console.log(`   - Iterations: ${stats.bootstrapIterations}`);
    console.log(`   - Goals processed: ${stats.goalsProcessed}`);
    console.log(`   - Goals completed: ${stats.goalsCompleted}`);
    console.log(`   - Plans processed: ${stats.plansProcessed}`);
    console.log(`   - Self-improvements: ${stats.selfImprovements}`);

    if (progressStatus.goals.completed > 0) {
      console.log('\\n✅ Completed Goals:');
      progressStatus.goals.completed.forEach((goal, index) => {
        console.log(`   ${index + 1}. ${goal.text}`);
      });
    }

    if (progressStatus.goals.failed > 0) {
      console.log('\\n❌ Failed Goals:');
      progressStatus.goals.failed.forEach((goal, index) => {
        console.log(`   ${index + 1}. ${goal.text} - ${goal.error}`);
      });
    }

    console.log('\\n🎯 Adding Custom Bootstrap Goal...');
    const customGoal = bootstrapAgent.addBootstrapGoal(
      'Create a comprehensive demonstration of Phase 3 metacognition components',
      0.9,
      0.95
    );
    console.log(`   Added goal: \"${customGoal.text}\"`);
    console.log(`   Priority: ${customGoal.priority}, Confidence: ${customGoal.confidence}`);

    console.log('\\n🏁 Final Bootstrap Status:');
    const finalStatus = bootstrapAgent.getStatus();
    console.log(`   - Phase: ${finalStatus.phase}`);
    console.log(`   - Active: ${finalStatus.isActive}`);
    console.log(`   - Completion rate: ${(stats.completionRate * 100).toFixed(1)}%`);

    console.log('\\n🎉 BootstrapAgent Features Demonstrated:');
    console.log('   ✅ Plan file reading and parsing');
    console.log('   ✅ Goal extraction and processing');
    console.log('   ✅ Self-directed development execution');
    console.log('   ✅ Real-time progress monitoring');
    console.log('   ✅ Custom goal injection');
    console.log('   ✅ Self-improvement capabilities');

  } catch (error) {
    console.error(`❌ Error during ${finalConfig.demoName.toLowerCase()}:`, error);
  } finally {
    // Stop bootstrap agent if it exists
    if (typeof bootstrapAgent !== 'undefined' && bootstrapAgent.isBootstrapActive) {
      try {
        await bootstrapAgent.stop();
      } catch (err) {
        console.error('Error stopping BootstrapAgent:', err);
      }
    }

    await system.stop();
    console.log('\\n✅ System stopped');
    console.log(`🎉 ${finalConfig.demoName} Complete!`);
  }
}

// Run the demo
runBootstrapAgentDemo().catch(console.error);