import {Task} from '../task/Task.js';
import {ConfigurableComponent} from '../util/ConfigurableComponent.js';

/**
 * Task Promotion Manager - handles intelligent task promotion between focus and long-term memory
 * Implements sophisticated algorithms for determining when and how tasks should be promoted
 */
export class TaskPromotionManager extends ConfigurableComponent {
    constructor(config = {}) {
        const defaultConfig = {
            promotionThreshold: 0.7,
            demotionThreshold: 0.2,
            stabilityThreshold: 0.5,
            minResidenceTime: 5000, // 5 seconds minimum in focus
            maxFocusTime: 30000, // 30 seconds maximum in focus
            priorityBoostFactor: 1.2,
            recencyWeight: 0.3,
            frequencyWeight: 0.4,
            priorityWeight: 0.3
        };

        super(defaultConfig);
        // The `configure` method returns a new instance.
        // Configuration should be handled by the caller.
    }

    /**
     * Evaluate tasks for promotion from focus to long-term memory
     * @param {Focus} focus - Focus management system
     * @param {Memory} memory - Memory system
     * @param {number} currentTime - Current timestamp
     * @returns {Object} Promotion results
     */
    evaluateForPromotion(focus, memory, currentTime = Date.now()) {
        const results = {
            promoted: 0,
            demoted: 0,
            stabilized: 0,
            candidates: []
        };

        // Get all focus sets
        const focusSets = focus._focusSets;

        for (const [focusName, focusSet] of focusSets) {
            const promotionCandidates = this._findPromotionCandidates(focusSet, currentTime);

            for (const candidate of promotionCandidates) {
                const decision = this._makePromotionDecision(candidate, focusSet, memory, currentTime);

                switch (decision.action) {
                    case 'promote':
                        this._promoteTask(candidate, focusSet, memory);
                        results.promoted++;
                        break;
                    case 'demote':
                        this._demoteTask(candidate, focusSet, memory);
                        results.demoted++;
                        break;
                    case 'stabilize':
                        this._stabilizeTask(candidate, focusSet);
                        results.stabilized++;
                        break;
                }

                results.candidates.push({
                    taskHash: candidate.task.stamp.id,
                    action: decision.action,
                    reason: decision.reason,
                    score: decision.score
                });
            }
        }

        return results;
    }

    /**
     * Find candidate tasks for promotion evaluation
     * @private
     */
    _findPromotionCandidates(focusSet, currentTime) {
        const candidates = [];
        const now = currentTime;

        for (const [taskHash, entry] of focusSet._tasks) {
            const residenceTime = now - entry.addedAt;

            // Check if task has been in focus long enough
            if (residenceTime >= this._config.minResidenceTime) {
                candidates.push({
                    task: entry.task,
                    priority: entry.priority,
                    residenceTime,
                    accessCount: focusSet._accessCount,
                    addedAt: entry.addedAt
                });
            }
        }

        return candidates;
    }

    /**
     * Make promotion decision for a candidate task
     * @private
     */
    _makePromotionDecision(candidate, focusSet, memory, currentTime) {
        const {task, priority, residenceTime, accessCount} = candidate;

        // Calculate promotion score
        const score = this._calculatePromotionScore(candidate, focusSet, currentTime);

        // Determine action based on score and thresholds
        let action, reason;

        if (score >= this._config.promotionThreshold) {
            action = 'promote';
            reason = 'High promotion score';
        } else if (score <= this._config.demotionThreshold) {
            action = 'demote';
            reason = 'Low promotion score';
        } else if (priority >= this._config.stabilityThreshold) {
            action = 'stabilize';
            reason = 'Stable priority level';
        } else {
            action = 'demote';
            reason = 'Insufficient priority for stabilization';
        }

        return {action, reason, score};
    }

    /**
     * Calculate promotion score for a task
     * @private
     */
    _calculatePromotionScore(candidate, focusSet, currentTime) {
        const {task, priority, residenceTime, accessCount} = candidate;

        // Normalize residence time (longer = higher score)
        const normalizedResidence = Math.min(residenceTime / this._config.maxFocusTime, 1);

        // Calculate recency score (more recent access = higher score)
        const timeSinceLastAccess = currentTime - focusSet._lastAccessed;
        const recencyScore = Math.max(0, 1 - (timeSinceLastAccess / 10000)); // Decay over 10 seconds

        // Calculate frequency score (more access = higher score)
        const frequencyScore = Math.min(accessCount / 10, 1);

        // Combine scores using weighted average
        const score = (
            normalizedResidence * 0.3 +
            recencyScore * this._config.recencyWeight +
            frequencyScore * this._config.frequencyWeight +
            priority * this._config.priorityWeight
        );

        return Math.min(score, 1.0);
    }

    /**
     * Promote task from focus to long-term memory
     * @private
     */
    _promoteTask(candidate, focusSet, memory) {
        const {task} = candidate;

        // Boost task priority for long-term storage
        const boostedPriority = Math.min(task.priority * this._config.priorityBoostFactor, 1.0);

        // Create promoted task with boosted priority
        const promotedTask = new Task({
            term: task.term,
            truth: task.truth,
            type: task.type,
            priority: boostedPriority,
            stamp: task.stamp
        });

        // Add to long-term memory
        memory.addTask(promotedTask);

        // Remove from focus
        focusSet.removeTask(task.stamp.id);
    }

    /**
     * Demote task from focus (remove without promotion)
     * @private
     */
    _demoteTask(candidate, focusSet, memory) {
        const {task} = candidate;

        // Simply remove from focus - task may be forgotten or stored elsewhere
        focusSet.removeTask(task.stamp.id);
    }

    /**
     * Stabilize task in focus (boost priority to maintain focus position)
     * @private
     */
    _stabilizeTask(candidate, focusSet) {
        const {task} = candidate;

        // Boost priority slightly to maintain stability
        const stabilityBoost = 0.1;
        const newPriority = Math.min(candidate.priority + stabilityBoost, 1.0);

        // Update priority in focus set
        const entry = focusSet._tasks.get(task.stamp.id);
        if (entry) {
            entry.priority = newPriority;
        }
    }

    /**
     * Force promotion of specific tasks
     * @param {string[]} taskHashes - Hashes of tasks to promote
     * @param {Focus} focus - Focus management system
     * @param {Memory} memory - Memory system
     * @returns {number} Number of tasks promoted
     */
    forcePromoteTasks(taskHashes, focus, memory) {
        let promoted = 0;

        for (const taskHash of taskHashes) {
            // Find task in any focus set
            let found = false;

            for (const focusSet of focus._focusSets.values()) {
                const entry = focusSet._tasks.get(taskHash);
                if (entry) {
                    this._promoteTask({task: entry.task}, focusSet, memory);
                    promoted++;
                    found = true;
                    break;
                }
            }
        }

        return promoted;
    }

    /**
     * Get promotion statistics
     * @param {Focus} focus - Focus management system
     * @returns {Object} Promotion statistics
     */
    getPromotionStats(focus) {
        const stats = {
            totalTasksInFocus: 0,
            promotionCandidates: 0,
            averageResidenceTime: 0,
            focusSetStats: {}
        };

        const focusSets = focus._focusSets;
        const residenceTimes = [];

        for (const [name, focusSet] of focusSets) {
            const setStats = {
                taskCount: focusSet._tasks.size,
                averagePriority: 0,
                oldestTaskAge: 0
            };

            stats.totalTasksInFocus += focusSet._tasks.size;

            let totalPriority = 0;
            let oldestAge = 0;

            for (const [taskHash, entry] of focusSet._tasks) {
                totalPriority += entry.priority;
                const age = Date.now() - entry.addedAt;
                residenceTimes.push(age);

                if (age > oldestAge) {
                    oldestAge = age;
                }

                // Check if task is a promotion candidate
                if (age >= this._config.minResidenceTime) {
                    setStats.promotionCandidates = (setStats.promotionCandidates || 0) + 1;
                    stats.promotionCandidates++;
                }
            }

            setStats.averagePriority = focusSet._tasks.size > 0 ? totalPriority / focusSet._tasks.size : 0;
            setStats.oldestTaskAge = oldestAge;
            stats.focusSetStats[name] = setStats;
        }

        stats.averageResidenceTime = residenceTimes.length > 0 ?
            residenceTimes.reduce((sum, time) => sum + time, 0) / residenceTimes.length : 0;

        return stats;
    }


}