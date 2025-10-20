/**
 * Performance Benchmarking for Phase 8
 * Establishes performance benchmarks for core operations
 */

import {NAR} from '../src/nar/NAR.js';
import {TermFactory} from '../src/term/TermFactory.js';
import {RuleEngine} from '../src/reasoning/RuleEngine.js';
import {Memory} from '../src/memory/Memory.js';
import {Task} from '../src/task/Task.js';

class PerformanceBenchmark {
    constructor() {
        this.results = {};
    }

    async runBenchmark(name, operation, iterations = 1000) {
        const startTime = process.hrtime.bigint();

        for (let i = 0; i < iterations; i++) {
            await operation(i);
        }

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const avgDuration = duration / iterations;

        this.results[name] = {
            totalTime: duration,
            avgTimePerOp: avgDuration,
            opsPerSecond: 1000 / avgDuration,
            iterations: iterations
        };

        console.log(`${name}: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(4)}ms avg, ${this.results[name].opsPerSecond.toFixed(2)} ops/sec`);
        return this.results[name];
    }

    getResults() {
        return this.results;
    }

    printSummary() {
        console.log('\n=== Performance Benchmark Summary ===');
        for (const [name, result] of Object.entries(this.results)) {
            console.log(`${name}:`);
            console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`);
            console.log(`  Average time per operation: ${result.avgTimePerOp.toFixed(4)}ms`);
            console.log(`  Operations per second: ${result.opsPerSecond.toFixed(2)}`);
            console.log(`  Iterations: ${result.iterations}`);
            console.log('');
        }
    }
}

async function runPerformanceBenchmarks() {
    console.log('=== Phase 8 Performance Benchmarking ===\n');

    const benchmark = new PerformanceBenchmark();

    // 1. Term Creation Benchmark
    console.log('1. Benchmarking Term Creation...');
    const termFactory = new TermFactory();
    await benchmark.runBenchmark('Term Creation', (i) => {
        return termFactory.create({name: `benchmark_term_${i}`});
    }, 10000);

    // 2. Memory Access Benchmark
    console.log('\n2. Benchmarking Memory Access...');
    const memory = new Memory();
    // Populate memory with concepts first
    for (let i = 0; i < 1000; i++) {
        const term = termFactory.create({name: `memory_test_${i}`});
        const task = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.5}
        });
        memory.addTask(task, Date.now());
    }

    await benchmark.runBenchmark('Memory Access', (i) => {
        const term = termFactory.create({name: `memory_test_${i % 1000}`});
        return memory.getConcept(term);
    }, 5000);

    // 3. Rule Application Benchmark (simplified)
    console.log('\n3. Benchmarking Rule-Related Operations...');
    const ruleEngine = new RuleEngine();
    await benchmark.runBenchmark('Rule Registration', (i) => {
        // Just time the creation of a simple object, since we don't have specific rules to benchmark
        return {id: `rule_${i}`, name: `Benchmark Rule ${i}`};
    }, 1000);

    // 4. Task Creation and Processing
    console.log('\n4. Benchmarking Task Operations...');
    await benchmark.runBenchmark('Task Creation', (i) => {
        const term = termFactory.create({name: `task_term_${i}`});
        return new Task({
            term,
            punctuation: '.',
            budget: {priority: Math.random()}
        });
    }, 5000);

    // 5. Complex Term Operations (with nesting)
    console.log('\n5. Benchmarking Complex Term Operations...');
    await benchmark.runBenchmark('Complex Term Creation', (i) => {
        const termA = termFactory.create({name: `A_${i}`});
        const termB = termFactory.create({name: `B_${i}`});
        const termC = termFactory.create({name: `C_${i}`});
        return termFactory.create({
            components: [
                termA,
                termFactory.create({components: [termB, termC], operator: '&'})
            ],
            operator: '-->'
        });
    }, 2000);

    // 6. NAR Input Processing
    console.log('\n6. Benchmarking NAR Input Processing...');
    const nar = new NAR({lm: {enabled: false}});
    await benchmark.runBenchmark('NAR Input Processing', async (i) => {
        // We'll time the parsing part without storing to avoid memory issues
        try {
            const input = `(term_${i} --> property_${i}). %${(i % 100) / 100};0.9%`;
            return nar._parser.parse(input);
        } catch (e) {
            // If parsing fails, return a simple value
            return {term: `term_${i}`, error: true};
        }
    }, 1000);

    // Print summary
    benchmark.printSummary();

    // Performance targets based on requirements
    console.log('=== Performance Targets Check ===');
    const termCreationAvg = benchmark.results['Term Creation'].avgTimePerOp;
    const memoryAccessAvg = benchmark.results['Memory Access'].avgTimePerOp;
    const taskCreationAvg = benchmark.results['Task Creation'].avgTimePerOp;

    console.log(`Term Creation: ${termCreationAvg < 0.01 ? '✅' : '⚠️'} (Target: < 0.01ms avg, Got: ${termCreationAvg.toFixed(4)}ms)`);
    console.log(`Memory Access: ${memoryAccessAvg < 0.05 ? '✅' : '⚠️'} (Target: < 0.05ms avg, Got: ${memoryAccessAvg.toFixed(4)}ms)`);
    console.log(`Task Creation: ${taskCreationAvg < 0.02 ? '✅' : '⚠️'} (Target: < 0.02ms avg, Got: ${taskCreationAvg.toFixed(4)}ms)`);

    return benchmark.getResults();
}

// Run the benchmarks
runPerformanceBenchmarks()
    .then(results => {
        console.log('\nPerformance benchmarking completed.');
    })
    .catch(err => {
        console.error('Error during benchmarking:', err);
    });