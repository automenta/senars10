#!/usr/bin/env node

import {BenchmarkRunner} from './BenchmarkRunner.js';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const benchmarkDir = path.join(__dirname, '../../benchmarks');

async function runBenchmarks() {
    console.log('Starting reasoning benchmark suite...\n');
    
    const runner = new BenchmarkRunner({
        benchmarkDir: benchmarkDir
    });
    
    try {
        const results = await runner.runAllBenchmarks();
        runner.printResults();
        
        const outputPath = path.join(__dirname, `../../benchmark-results-${Date.now()}.json`);
        await runner.exportResults(outputPath);
        
        const summary = runner.generateSummary();
        process.exit((summary.failed > 0 || summary.errors > 0) ? 1 : 0);
    } catch (error) {
        console.error('Error running benchmarks:', error);
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runBenchmarks();
}

export { runBenchmarks, BenchmarkRunner };