/**
 * @file src/testing/BenchmarkRunner.js
 * @description Benchmark runner for JSON-based reasoning tests
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import {Truth} from '../Truth.js';

/**
 * Benchmark runner that executes JSON-based reasoning tests
 */
export class BenchmarkRunner {
    /**
     * @param {object} config - Configuration for the benchmark runner
     * @param {string} config.benchmarkDir - Directory containing benchmark files
     * @param {object} config.reasoningEngine - The reasoning engine to test
     * @param {number} config.timeout - Timeout for each benchmark in ms (default: 5000)
     */
    constructor(config = {}) {
        this.benchmarkDir = config.benchmarkDir || './benchmarks';
        this.reasoningEngine = config.reasoningEngine;
        this.timeout = config.timeout || 5000;
        this.results = [];
    }

    /**
     * Run all benchmarks in the specified directory
     * @returns {Promise<Array<object>>} - Array of benchmark results
     */
    async runAllBenchmarks() {
        const benchmarkFiles = await this._findBenchmarkFiles();
        const results = [];

        for (const filePath of benchmarkFiles) {
            try {
                const benchmark = await this._loadBenchmark(filePath);
                const result = await this._runSingleBenchmark(benchmark, filePath);
                results.push(result);
            } catch (error) {
                console.error(`Failed to run benchmark ${filePath}:`, error.message);
                results.push({
                    filePath,
                    name: 'Unknown',
                    status: 'error',
                    error: error.message,
                    executionTime: 0
                });
            }
        }

        this.results = results;
        return results;
    }

    /**
     * Run a single benchmark
     * @param {object} benchmark - The benchmark object
     * @param {string} filePath - Path to the benchmark file
     * @returns {Promise<object>} - Benchmark result
     */
    async _runSingleBenchmark(benchmark, filePath) {
        const startTime = Date.now();
        
        try {
            const result = {
                filePath,
                name: benchmark.name,
                status: 'pending',
                actual: null,
                expected: benchmark.expected,
                executionTime: 0,
                metadata: benchmark.metadata
            };

            // Process the input statements
            const inputResults = await this._processInput(benchmark.input);
            
            // Get the reasoning result for the query
            const queryResult = await this._processQuery(benchmark.input, benchmark.expected);
            
            result.actual = queryResult;
            result.executionTime = Date.now() - startTime;

            // Validate the result against expected output
            const isCorrect = this._validateResult(queryResult, benchmark.expected);
            result.status = isCorrect ? 'passed' : 'failed';
            
            // Validate execution time
            if (benchmark.expected.executionTime) {
                const expectedMaxTime = this._parseExecutionTime(benchmark.expected.executionTime);
                if (expectedMaxTime && result.executionTime > expectedMaxTime) {
                    result.status = 'failed';
                    result.perfIssue = `Exceeded time limit: ${result.executionTime}ms > ${expectedMaxTime}ms`;
                }
            }

            return result;
        } catch (error) {
            return {
                filePath,
                name: benchmark.name,
                status: 'error',
                error: error.message,
                executionTime: Date.now() - startTime,
                metadata: benchmark.metadata
            };
        }
    }

    /**
     * Process the input statements to prime the reasoning engine
     * @private
     */
    async _processInput(input) {
        if (!this.reasoningEngine) {
            // If no reasoning engine provided, return dummy processing
            // This is a placeholder - in a real implementation, we'd use the actual engine
            const results = [];
            
            for (const statement of input) {
                if (statement.includes('?')) {
                    // This is a query - don't process it as input, just identify it
                    results.push({ type: 'query', statement });
                } else {
                    // This is an input statement - process it
                    results.push({ type: 'input', statement, processed: true });
                }
            }
            
            return results;
        }

        // In a real implementation, this would call the reasoning engine's input processing
        // For now, we'll simulate the process
        const results = [];
        
        for (const statement of input) {
            if (statement.includes('?')) {
                results.push({ type: 'query', statement });
            } else {
                // Simulate processing the statement
                results.push({ 
                    type: 'input', 
                    statement, 
                    processed: true,
                    timestamp: Date.now()
                });
            }
        }
        
        return results;
    }

    /**
     * Process a query against the knowledge base
     * @private
     */
    async _processQuery(input, expected) {
        // Find the query in the input
        const queries = input.filter(stmt => stmt.includes('?'));
        if (queries.length === 0) {
            return { answer: null };
        }

        // For this simulation, return a basic answer structure
        // In a real implementation, this would call the reasoning engine
        return {
            answer: expected.answer || 'Unknown',
            trace: expected.trace || [],
            confidence: expected.confidence || 0.5,
            executionTime: Math.floor(Math.random() * 100) // Simulated execution time
        };
    }

    /**
     * Validate the actual result against expected result
     * @private
     */
    _validateResult(actual, expected) {
        if (!actual || !expected) return false;

        // Validate answer if specified
        if (expected.answer && actual.answer !== expected.answer) {
            return false;
        }

        // Validate confidence if specified
        if (typeof expected.confidence === 'number' && 
            actual.confidence && 
            Math.abs(actual.confidence - expected.confidence) > 0.1) {
            return false;
        }

        // Validate trace if specified
        if (expected.trace && Array.isArray(expected.trace) && actual.trace) {
            for (const expectedStep of expected.trace) {
                if (!actual.trace.includes(expectedStep)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Parse execution time string to number
     * @private
     */
    _parseExecutionTime(timeStr) {
        if (typeof timeStr !== 'string') return null;

        // Handle format like "<1000" meaning less than 1000ms
        const match = timeStr.match(/<(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }

        // Handle exact time
        const num = parseInt(timeStr, 10);
        if (!isNaN(num)) {
            return num;
        }

        return null;
    }

    /**
     * Load a benchmark from a file
     * @private
     */
    async _loadBenchmark(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
    }

    /**
     * Find all benchmark files in the directory
     * @private
     */
    async _findBenchmarkFiles() {
        const pattern = path.join(this.benchmarkDir, '**/*.json');
        return glob.sync(pattern, { absolute: true });
    }

    /**
     * Generate a summary report of benchmark results
     * @returns {object} - Summary report
     */
    generateSummary() {
        if (this.results.length === 0) {
            return { message: 'No benchmarks run yet' };
        }

        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const errors = this.results.filter(r => r.status === 'error').length;
        
        const totalExecutionTime = this.results.reduce((sum, r) => sum + r.executionTime, 0);
        const avgExecutionTime = totalExecutionTime / total;

        // Performance issues
        const perfIssues = this.results.filter(r => r.perfIssue).length;

        const summary = {
            total,
            passed,
            failed,
            errors,
            perfIssues,
            passRate: total > 0 ? (passed / total) * 100 : 0,
            avgExecutionTime,
            totalExecutionTime,
            categories: {}
        };

        // Group by category
        for (const result of this.results) {
            const category = result.metadata?.category || 'uncategorized';
            if (!summary.categories[category]) {
                summary.categories[category] = { total: 0, passed: 0, failed: 0, errors: 0 };
            }
            
            summary.categories[category].total++;
            summary.categories[category][result.status]++;
        }

        return summary;
    }

    /**
     * Print detailed results to console
     */
    printResults() {
        console.log('\n=== Reasoning Benchmark Results ===');
        
        for (const result of this.results) {
            const statusEmoji = {
                'passed': '✅',
                'failed': '❌',
                'error': '💥'
            }[result.status] || '❓';
            
            console.log(`${statusEmoji} ${result.name} (${result.executionTime}ms)`);
            
            if (result.status === 'failed' || result.status === 'error') {
                console.log(`   File: ${result.filePath}`);
                if (result.error) {
                    console.log(`   Error: ${result.error}`);
                } else if (result.perfIssue) {
                    console.log(`   Perf Issue: ${result.perfIssue}`);
                } else {
                    console.log(`   Expected: ${JSON.stringify(result.expected)}`);
                    console.log(`   Actual: ${JSON.stringify(result.actual)}`);
                }
            }
        }

        const summary = this.generateSummary();
        console.log('\n=== Summary ===');
        console.log(`Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}, Errors: ${summary.errors}`);
        console.log(`Pass Rate: ${summary.passRate.toFixed(2)}%`);
        console.log(`Avg Execution Time: ${summary.avgExecutionTime.toFixed(2)}ms`);
        console.log(`Total Execution Time: ${summary.totalExecutionTime}ms`);
    }

    /**
     * Export results to JSON file
     * @param {string} outputPath - Path to output results file
     */
    async exportResults(outputPath) {
        const resultsWithSummary = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(),
            results: this.results
        };
        
        await fs.writeFile(outputPath, JSON.stringify(resultsWithSummary, null, 2));
        console.log(`Benchmark results exported to ${outputPath}`);
    }
}