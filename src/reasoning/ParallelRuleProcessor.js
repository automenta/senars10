import {RuleProcessor} from './RuleProcessor.js';

/**
 * ParallelRuleProcessor: Applies rules in parallel to tasks for better performance
 */
export class ParallelRuleProcessor extends RuleProcessor {
    constructor(config = {}) {
        super(config);
        this.maxConcurrency = config.maxConcurrency || 5;
        this.batchSize = config.batchSize || 10;
    }

    /**
     * Process rules against tasks in parallel
     */
    async process(rules, tasks, context) {
        const results = [];

        // Split tasks into batches to manage memory and performance
        const taskBatches = this._createBatches(tasks, this.batchSize);

        for (const taskBatch of taskBatches) {
            const batchResults = await this._processBatch(rules, taskBatch, context);
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * Process a single batch of rules and tasks in parallel
     */
    async _processBatch(rules, tasks, context) {
        const allPromises = [];

        // Create task-rule combinations
        for (const rule of rules) {
            for (const task of tasks) {
                allPromises.push(this._applyRuleToTask(rule, task, context));
            }
        }

        // Process in chunks to respect maxConcurrency
        const chunkedPromises = this._chunkArray(allPromises, this.maxConcurrency);
        const allResults = [];

        for (const chunk of chunkedPromises) {
            const chunkResults = await Promise.all(chunk);
            allResults.push(...chunkResults.flat());
        }

        return allResults;
    }


    /**
     * Create batches of items
     */
    _createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Split array into chunks
     */
    _chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}