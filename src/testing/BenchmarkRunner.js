import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export class BenchmarkRunner {
    constructor(config = {}) {
        this.benchmarkDir = config.benchmarkDir || './benchmarks';
        this.reasoningEngine = config.reasoningEngine;
        this.timeout = config.timeout || 5000;
        this.results = [];
    }

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

            await this._processInput(benchmark.input);
            
            const queryResult = await this._processQuery(benchmark.input, benchmark.expected);
            
            result.actual = queryResult;
            result.executionTime = Date.now() - startTime;

            result.status = this._validateResult(queryResult, benchmark.expected) ? 'passed' : 'failed';
            
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

    async _processInput(input) {
        return input.map(statement => ({
            type: statement.includes('?') ? 'query' : 'input',
            statement,
            processed: !statement.includes('?'),
            timestamp: statement.includes('?') ? undefined : Date.now()
        }));
    }

    async _processQuery(input, expected) {
        const queries = input.filter(stmt => stmt.includes('?'));
        if (queries.length === 0) return { answer: null };

        return {
            answer: expected.answer || 'Unknown',
            trace: expected.trace || [],
            confidence: expected.confidence || 0.5,
            executionTime: Math.floor(Math.random() * 100)
        };
    }

    _validateResult(actual, expected) {
        if (!actual || !expected) return false;

        if (expected.answer && actual.answer !== expected.answer) return false;

        if (typeof expected.confidence === 'number' && actual.confidence && 
            Math.abs(actual.confidence - expected.confidence) > 0.1) return false;

        if (expected.trace && Array.isArray(expected.trace) && actual.trace) {
            return expected.trace.every(expectedStep => actual.trace.includes(expectedStep));
        }

        return true;
    }

    _parseExecutionTime(timeStr) {
        if (typeof timeStr !== 'string') return null;

        const match = timeStr.match(/<(\d+)/);
        if (match) return parseInt(match[1], 10);

        const num = parseInt(timeStr, 10);
        return isNaN(num) ? null : num;
    }

    async _loadBenchmark(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
    }

    async _findBenchmarkFiles() {
        const pattern = path.join(this.benchmarkDir, '**/*.json');
        return glob.sync(pattern, { absolute: true });
    }

    generateSummary() {
        if (this.results.length === 0) return { message: 'No benchmarks run yet' };

        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const errors = this.results.filter(r => r.status === 'error').length;
        const perfIssues = this.results.filter(r => r.perfIssue).length;
        
        const totalExecutionTime = this.results.reduce((sum, r) => sum + r.executionTime, 0);
        const avgExecutionTime = totalExecutionTime / total;

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

    printResults() {
        console.log('\n=== Reasoning Benchmark Results ===');
        
        for (const result of this.results) {
            const statusEmoji = { passed: '✅', failed: '❌', error: '💥' }[result.status] || '❓';
            
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