import {PERFORMANCE} from '../config/constants.js';

export class SystemMetrics {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            cycleCount: 0,
            taskCount: 0,
            conceptCount: 0,
            errorCount: 0,
            memoryUsage: 0,
            averageCycleTime: 0,
            peakMemoryUsage: 0,
            totalProcessingTime: 0,
        };
        this.cycleTimes = [];
        this.reset();
    }

    recordCycle(cycleData) {
        this.metrics.cycleCount++;
        const cycleTime = cycleData.duration || 0;
        this.cycleTimes.push(cycleTime);

        if (this.cycleTimes.length > PERFORMANCE.CACHE_SIZE) {
            this.cycleTimes.shift();
        }

        this.metrics.averageCycleTime = this.cycleTimes.reduce((a, b) => a + b, 0) / this.cycleTimes.length;
        this.metrics.totalProcessingTime += cycleTime;
    }

    recordTask(taskData) {
        this.metrics.taskCount++;
    }

    recordConcept(conceptData) {
        this.metrics.conceptCount++;
    }

    recordError(errorData) {
        this.metrics.errorCount++;
    }

    updateMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            this.metrics.memoryUsage = usage.heapUsed;
            this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, usage.heapUsed);
        }
    }

    getSystemMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            memoryUsageMB: Math.round(this.metrics.memoryUsage / 1024 / 1024),
            peakMemoryUsageMB: Math.round(this.metrics.peakMemoryUsage / 1024 / 1024),
            averageCycleTimeMs: Math.round(this.metrics.averageCycleTime),
            cyclesPerSecond: this.metrics.averageCycleTime > 0 ? Math.round(1000 / this.metrics.averageCycleTime) : 0,
        };
    }

    getPerformanceMetrics() {
        return {
            averageCycleTime: this.metrics.averageCycleTime,
            cyclesPerSecond: this.metrics.averageCycleTime > 0 ? 1000 / this.metrics.averageCycleTime : 0,
            totalProcessingTime: this.metrics.totalProcessingTime,
            cycleTimeVariance: this._calculateVariance(this.cycleTimes),
            memoryEfficiency: this.metrics.memoryUsage > 0 ? this.metrics.taskCount / this.metrics.memoryUsage : 0,
        };
    }

    getHealthMetrics() {
        const uptime = Date.now() - this.metrics.startTime;
        const errorRate = uptime > 0 ? this.metrics.errorCount / (uptime / 1000) : 0;

        return {
            isHealthy: errorRate < 0.1 && this.metrics.averageCycleTime < 100,
            errorRate: errorRate,
            systemLoad: this.metrics.cycleCount / Math.max(1, uptime / 1000),
            memoryPressure: this.metrics.memoryUsage / this.metrics.peakMemoryUsage,
        };
    }

    _calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    reset() {
        this.metrics = {
            startTime: Date.now(),
            cycleCount: 0,
            taskCount: 0,
            conceptCount: 0,
            errorCount: 0,
            memoryUsage: 0,
            averageCycleTime: 0,
            peakMemoryUsage: 0,
            totalProcessingTime: 0,
        };
        this.cycleTimes = [];
    }

    exportMetrics() {
        return {
            system: this.getSystemMetrics(),
            performance: this.getPerformanceMetrics(),
            health: this.getHealthMetrics(),
            timestamp: Date.now(),
        };
    }
}