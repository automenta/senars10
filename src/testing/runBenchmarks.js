#!/usr/bin/env node

/**
 * @file src/testing/runBenchmarks.js
 * @description Script to run reasoning benchmarks
 */

import {BenchmarkRunner} from './BenchmarkRunner.js';
import path from 'path';
import {fileURLToPath} from 'url';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default benchmark directory relative to project root
const benchmarkDir = path.join(__dirname, '../../benchmarks');

async function runBenchmarks() {
    console.log('Starting reasoning benchmark suite...\n');
    
    const runner = new BenchmarkRunner({
        benchmarkDir: benchmarkDir
    });
    
    try {
        const results = await runner.runAllBenchmarks();
        runner.printResults();
        
        // Export results to a file
        const outputPath = path.join(__dirname, `../../benchmark-results-${Date.now()}.json`);
        await runner.exportResults(outputPath);
        
        // Exit with appropriate code
        const summary = runner.generateSummary();
        const hasFailures = summary.failed > 0 || summary.errors > 0;
        
        process.exit(hasFailures ? 1 : 0);
    } catch (error) {
        console.error('Error running benchmarks:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runBenchmarks();
}

export { runBenchmarks, BenchmarkRunner };