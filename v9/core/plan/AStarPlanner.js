// import {MinPriorityQueue} from '@datastructures-js/priority-queue'; // Temporarily commented out for dependency issue
import Planner from './Planner.js';
import { Logger } from '../base/utilities.js';

// Using a placeholder for MinPriorityQueue until dependency is resolved
class MinPriorityQueue {
  constructor(priorityFn) {
    this.priorityFn = priorityFn;
    this.items = [];
  }

  enqueue(item) {
    this.items.push(item);
    this.items.sort((a, b) => this.priorityFn(a) - this.priorityFn(b));
  }

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

class AStarPlanner extends Planner {
    constructor() {
        super();
        this.maxIterations = 1000;  // Default value, will be updated during initialization
        this.heuristicCache = new Map();
    }

    async initialize(config = {}) {
        await super.initialize(config);
        this.maxIterations = config.maxIterations || 1000;
    }

    // Called after core is set up to access dependencies
    async setupDependencies(memory, lm, configManager) {
        this.memory = memory;
        this.lm = lm;
        this.configManager = configManager;
        this.maxIterations = configManager ? configManager.get('ASTAR_PLANNER.maxIterations', 1000) : 1000;
    }

    // Check if a task is already achieved
    _isAchieved(task) {
        // Placeholder implementation - in a real system, this would check if the task condition is met
        return task && task.status === 'completed';
    }

    // Get possible expansions for a task
    _getExpansions(task) {
        // Placeholder implementation - in a real system, this would return possible task decompositions
        return [];
    }

    // Check if a task is primitive (not decomposable)
    _isPrimitive(task) {
        // Placeholder implementation - in a real system, this would check if the task is primitive
        return true;
    }

    async findPlan(goalTask) {
        // Check if dependencies are set up
        if (!this.memory) {
            Logger.warn('Memory component not available for AStarPlanner');
            return null;
        }

        const startNode = this.memory.getTerm(goalTask.termKey);
        if (!startNode) return null;

        // If the goal is already achieved, return an empty plan
        if (this._isAchieved(startNode)) return [];

        const openSet = new MinPriorityQueue(node => node.f);
        const visited = new Set();

        const initialHeuristic = await this._calculateHeuristic([startNode]);
        openSet.enqueue({
            tasks: [startNode],
            plan: [],
            g: 0,
            h: initialHeuristic,
            f: initialHeuristic,
        });

        for (let i = 0; i < this.maxIterations && !openSet.isEmpty(); i++) {
            const currentNode = openSet.dequeue();

            // If we have no more tasks, we've found a complete plan
            if (currentNode.tasks.length === 0) {
                return currentNode.plan.map(key => {
                    const term = this.memory.getTerm(key);
                    return term || {key}; // Return a minimal object if term not found
                });
            }

            const stateKey = this._getStateKey(currentNode);
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);

            await this._expandNode(currentNode, openSet);
        }

        return null;
    }

    async _expandNode(currentNode, openSet) {
        const [currentTask, ...remainingTasks] = currentNode.tasks;

        if (this._isAchieved(currentTask)) {
            await this._enqueueAchievedNode(currentNode, remainingTasks, openSet);
            return;
        }

        const expansions = this._getExpansions(currentTask);
        for (const expansion of expansions) {
            await this._enqueueExpansion(expansion, currentNode, remainingTasks, openSet);
        }
    }

    async _enqueueAchievedNode(currentNode, remainingTasks, openSet) {
        const nextNode = {
            ...currentNode,
            tasks: remainingTasks,
            g: currentNode.g
        };
        nextNode.h = await this._calculateHeuristic(nextNode.tasks);
        nextNode.f = nextNode.g + nextNode.h;
        openSet.enqueue(nextNode);
    }

    async _enqueueExpansion(expansion, currentNode, remainingTasks, openSet) {
        const {
            plan,
            g,
            tasks
        } = this._calculateNextState(expansion, currentNode, remainingTasks);
        const h = await this._calculateHeuristic(tasks);
        openSet.enqueue({
            tasks,
            plan,
            g,
            h,
            f: g + h
        });
    }

    _calculateNextState(expansion, currentNode, remainingTasks) {
        if (expansion.method === null) {
            // Use a default cost if costManager isn't available
            const cost = this.costManager?.getActionCost ? this.costManager.getActionCost(currentNode.tasks[0]) : 1;
            return {
                g: currentNode.g + cost,
                plan: [...currentNode.plan, currentNode.tasks[0].key],
                tasks: remainingTasks,
            };
        }
        return {
            g: currentNode.g,
            plan: currentNode.plan,
            tasks: [...expansion.subTasks, ...remainingTasks],
        };
    }

    _getStateKey(node) {
        const taskKey = node.tasks.map(t => t.key).sort().join(',');
        const planKey = node.plan.sort().join(',');
        return `${taskKey}|${planKey}`;
    }

    async _calculateHeuristic(tasks, visited = new Set()) {
        if (!tasks || tasks.length === 0) return 0;
        let totalCost = 0;
        for (const task of tasks) {
            if (visited.has(task.key)) return Infinity; // Cycle detected
            const newVisited = new Set(visited);
            newVisited.add(task.key);
            totalCost += await this._getMinTaskCost(task, newVisited);
        }
        return totalCost;
    }

    async _getMinTaskCost(task, visited) {
        const cacheKey = task.key;
        if (this.heuristicCache.has(cacheKey)) {
            return this.heuristicCache.get(cacheKey);
        }

        if (this._isPrimitive(task)) {
            // Use a default cost if costManager isn't available
            const cost = this.costManager?.getActionCost ? this.costManager.getActionCost(task) : 1;
            this.heuristicCache.set(cacheKey, cost);
            return cost;
        }

        const expansions = this._getExpansions(task);
        if (expansions.length === 0) return Infinity;

        let minCost = Infinity;
        for (const expansion of expansions) {
            minCost = Math.min(minCost, await this._calculateHeuristic(expansion.subTasks, visited));
        }

        if (minCost === Infinity) {
            // All expansions lead to cycles or dead ends, cache this
            this.heuristicCache.set(cacheKey, Infinity);
            return Infinity;
        }

        this.heuristicCache.set(cacheKey, minCost);
        return minCost;
    }
}

export default AStarPlanner;
