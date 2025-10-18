import System from '../core/System.js';

async function runExample() {
  console.log('Starting SeNARS Example with Analysis Components...');

  // Create and start the system
  const system = new System({
    components: {
      analysis: {
        minConfidence: 0.5,
        similarityThreshold: 0.7,
        bottleneckThreshold: 100
      },
      ingestor: {
        bottleneckTimeThreshold: 100,
        bottleneckAvgTimeFactor: 2
      },
      reports: {
        includeCharts: true,
        maxRecommendations: 10
      }
    }
  });

  try {
    await system.start();
    console.log('System started successfully');

    // Show system health
    console.log('\nSystem Health:', JSON.stringify(system.getHealth(), null, 2));

    // Add some example tasks
    console.log('\nAdding example tasks...');
    system.remember('(cat --> animal)', { frequency: 0.9, confidence: 0.8 });
    system.remember('(animal --> living)', { frequency: 0.85, confidence: 0.75 });
    system.remember('(fluffy --> cat)', { frequency: 0.7, confidence: 0.85 });

    // Ask a question
    console.log('\nAsking question: (fluffy --> living)?');
    try {
      const answer = await system.ask('(fluffy --> living)');
      console.log('Answer:', answer);
    } catch (error) {
      console.log('No immediate answer available (expected in this simple example)');
    }

    // Demonstrate analysis capabilities
    console.log('\nDemonstrating analysis components...');

    // Use the analysis component
    if (system.core.analysis) {
      console.log('Analysis component stats:', system.core.analysis.getStats());

      // Perform an analysis
      const analysis = await system.core.analysis.analyze();
      console.log('Analysis completed with', analysis.bottlenecks.length, 'bottlenecks detected');
      console.log('Recommendations:', analysis.recommendations.length);
    }

    // Use the data ingestor
    if (system.core.ingestor) {
      console.log('DataIngestor stats:', system.core.ingestor.getStats());

      // Ingest some sample JSON data
      const sampleData = {
        name: 'test_subject',
        properties: {
          type: 'example',
          value: 42
        }
      };

      const tasks = await system.core.ingestor.ingest(sampleData, { format: 'json' });
      console.log('Ingested', tasks.length, 'tasks from sample JSON data');
    }

    // Use the report generator
    if (system.core.reports) {
      console.log('ReportGenerator stats:', system.core.reports.getStats());

      // Generate a system health report
      const report = await system.core.reports.generate('system');
      console.log('Generated system health report with title:', report.title);

      // Generate a performance report
      const perfReport = await system.core.reports.generate('performance');
      console.log('Generated performance report with title:', perfReport.title);
    }

    // Show final system metrics
    console.log('\nFinal System Metrics:', JSON.stringify(system.getMetrics(), null, 2));

  } catch (error) {
    console.error('Error during example execution:', error);
  } finally {
    // Stop the system
    await system.stop();
    console.log('\nSystem stopped');
  }
}

// Run the example
runExample().catch(console.error);