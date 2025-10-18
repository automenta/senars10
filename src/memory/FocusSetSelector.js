import {ConfigurableComponent} from '../util/ConfigurableComponent.js';

/**
 * Advanced task selection with composite scoring for focus sets
 * Implements sophisticated selection based on priority, urgency, and cognitive diversity
 */
export class FocusSetSelector extends ConfigurableComponent {
    constructor(config = {}) {
        const defaultConfig = {
            maxSize: 10,
            priorityThreshold: 0.1,
            priorityWeight: 0.5,
            urgencyWeight: 0.3,
            diversityWeight: 0.2
        };

        super(defaultConfig);
        this.configure(config);
    }

    /**
     * Select tasks using composite scoring algorithm
     * @param {Task[]} tasks - Candidate tasks to select from
     * @param {number} currentTime - Current system timestamp
     * @returns {Task[]} Selected tasks ordered by composite score
     */
    select(tasks, currentTime = Date.now()) {
        if (!tasks?.length) return [];

        // Filter by priority threshold
        const candidates = tasks.filter(task => task.budget.priority >= this.getConfigValue('priorityThreshold'));
        if (!candidates.length) return [];

        // Calculate normalization factors
        const maxUrgency = Math.max(...candidates.map(task => currentTime - task.stamp.creationTime));
        const maxComplexity = Math.max(...candidates.map(task => task.term.complexity || 1));

        // Calculate composite scores
        const scoredTasks = candidates.map(task => ({
            task,
            score: this._calculateCompositeScore(task, currentTime, maxUrgency, maxComplexity)
        }));

        // Sort by score and return top tasks
        return scoredTasks
            .sort((a, b) => b.score - a.score)
            .slice(0, this.getConfigValue('maxSize'))
            .map(item => item.task);
    }

    /**
     * Calculate composite score for task selection
     * @private
     */
    _calculateCompositeScore(task, currentTime, maxUrgency, maxComplexity) {
        const urgency = maxUrgency > 0 ? (currentTime - task.stamp.creationTime) / maxUrgency : 0;
        const diversity = maxComplexity > 0 ? (task.term.complexity || 1) / maxComplexity : 0;

        return task.budget.priority * this.getConfigValue('priorityWeight') +
            urgency * this.getConfigValue('urgencyWeight') +
            diversity * this.getConfigValue('diversityWeight');
    }
}