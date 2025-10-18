export class TaskTable {
  constructor(capacity = 1000) {
    this.tasks = new Map();
    this.tasksByOccurrenceTime = new Map();
    this.capacity = capacity;
    this.accessTime = new Map();
  }

  addTask(task) {
    if (this.tasks.size >= this.capacity) this._evictOldestTask();
    this.tasks.set(task.createdAt, task);
    this.accessTime.set(task.createdAt, Date.now());
    const timeSet = this.tasksByOccurrenceTime.get(task.occurrenceTime) || new Set();
    timeSet.add(task);
    this.tasksByOccurrenceTime.set(task.occurrenceTime, timeSet);
  }

  _evictOldestTask() {
    if (this.tasks.size === 0) return;
    const oldestKey = [...this.tasks.keys()].reduce((min, key) => key < min ? key : min, Infinity);
    if (oldestKey !== Infinity) this._removeTaskInternal(this.tasks.get(oldestKey));
  }

  _removeTaskInternal(task) {
    this.tasks.delete(task.createdAt);
    this.accessTime.delete(task.createdAt);
    const tasksAtTime = this.tasksByOccurrenceTime.get(task.occurrenceTime);
    if (tasksAtTime) {
      tasksAtTime.delete(task);
      if (tasksAtTime.size === 0) this.tasksByOccurrenceTime.delete(task.occurrenceTime);
    }
  }

  removeTask(task) { this._removeTaskInternal(task); }

  queryTasks(punctuation, time = Infinity, selectionCriteria = null, limit = 100) {
    const tasks = [...this.tasks.values()].filter(task =>
      task.punctuation === punctuation && (
        time === Infinity ||
        (task.occurrenceTime >= 0 && time === task.occurrenceTime) ||
        time === 'latest'
      )
    );
    const sortedTasks = this._applyRanking(tasks, selectionCriteria);
    return sortedTasks.slice(0, limit);
  }

  _applyRanking(tasks, selectionCriteria) {
    if (!selectionCriteria) return tasks.sort((a, b) => b.occurrenceTime - a.occurrenceTime);
    if (typeof selectionCriteria === 'function') return tasks.sort(selectionCriteria);
    if (typeof selectionCriteria === 'object') {
      const { timeWeight = 0.5, confidenceWeight = 0.5, customRanking = null, timeImportance = 'recency', referenceTime = Infinity } = selectionCriteria;
      return customRanking
        ? tasks.sort(customRanking)
        : this._rankByWeights(tasks, timeWeight, confidenceWeight, timeImportance, referenceTime);
    }
    return tasks;
  }

  _rankByWeights(tasks, timeWeight, confidenceWeight, timeImportance, referenceTime) {
    return tasks.sort((a, b) => {
      const [scoreA, scoreB] = this._calculateScores(a, b, timeWeight, confidenceWeight, timeImportance, referenceTime);
      return scoreB - scoreA;
    });
  }

  _calculateScores(a, b, timeWeight, confidenceWeight, timeImportance, referenceTime) {
    const getConfScore = (task) => (task.truth?.confidence || 0) * confidenceWeight;
    
    if (timeImportance === 'closest' || (timeImportance === 'recency' && referenceTime !== Infinity)) {
      // For 'closest' and 'recency' with referenceTime
      const timeDiffA = Math.abs(a.occurrenceTime - referenceTime);
      const timeDiffB = Math.abs(b.occurrenceTime - referenceTime);
      const maxDiff = Math.max(timeDiffA, timeDiffB, 1);
      const timeScoreA = (1 - timeDiffA / maxDiff) * timeWeight;
      const timeScoreB = (1 - timeDiffB / maxDiff) * timeWeight;
      return [timeScoreA + getConfScore(a), timeScoreB + getConfScore(b)];
    } else {
      // For 'recency' with Infinity reference time and 'relevance'
      const maxTime = Math.max(a.occurrenceTime, b.occurrenceTime, 1);
      const timeScoreA = (timeImportance === 'recency' ? a.occurrenceTime / maxTime : 1 - a.occurrenceTime / maxTime) * timeWeight;
      const timeScoreB = (timeImportance === 'recency' ? b.occurrenceTime / maxTime : 1 - b.occurrenceTime / maxTime) * timeWeight;
      return [timeScoreA + getConfScore(a), timeScoreB + getConfScore(b)];
    }
  }

  getAllTasks() { return Array.from(this.tasks.values()); }
  size() { return this.tasks.size; }
  clear() { this.tasks.clear(); this.tasksByOccurrenceTime.clear(); }
}

export const SelectionCriteria = {
  MOST_RECENT: { timeWeight: 1.0, confidenceWeight: 0.0, timeImportance: 'recency', referenceTime: Infinity },
  CLOSEST_TO_TIME: (referenceTime) => ({ timeWeight: 1.0, confidenceWeight: 0.0, timeImportance: 'closest', referenceTime }),
  HIGHEST_CONFIDENCE: { timeWeight: 0.0, confidenceWeight: 1.0, timeImportance: 'relevance' },
  BALANCED: { timeWeight: 0.5, confidenceWeight: 0.5, timeImportance: 'recency' },
  BELIEF_DEFAULT: { timeWeight: 0.6, confidenceWeight: 0.4, timeImportance: 'recency' },
  GOAL_DEFAULT: { customRanking: (a, b) => { const priorityDiff = b.getPriority() - a.getPriority(); return priorityDiff !== 0 ? priorityDiff : b.occurrenceTime - a.occurrenceTime; } },
  QUESTION_DEFAULT: { timeWeight: 1.0, confidenceWeight: 0.0, timeImportance: 'recency' }
};

export const DefaultAggregationFunctions = {
  average: (tasks) => {
    const validTasks = tasks.filter(task => task.truth);
    if (validTasks.length === 0) return null;
    let totalFreq = 0, totalConf = 0;
    for (const task of validTasks) { totalFreq += task.truth.frequency; totalConf += task.truth.confidence; }
    return { frequency: totalFreq / validTasks.length, confidence: totalConf / validTasks.length };
  },

  weighted: (tasks) => {
    const validTasks = tasks.filter(task => task.truth);
    if (validTasks.length === 0 || validTasks.every(t => t.truth.confidence === 0)) return null;
    let weightedFreq = 0, totalWeight = 0;
    for (const task of validTasks) {
      const weight = task.truth.confidence;
      weightedFreq += task.truth.frequency * weight;
      totalWeight += weight;
    }
    return { frequency: weightedFreq / totalWeight, confidence: totalWeight / validTasks.length };
  },

  mostRecent: (tasks) => {
    const validTasks = tasks.filter(task => task.truth);
    if (validTasks.length === 0) return null;
    const sorted = validTasks.sort((a, b) => b.occurrenceTime - a.occurrenceTime);
    const mostRecent = sorted[0];
    return { frequency: mostRecent.truth.frequency, confidence: mostRecent.truth.confidence };
  },

  strongest: (tasks) => {
    const validTasks = tasks.filter(task => task.truth);
    if (validTasks.length === 0) return null;
    const strongest = validTasks.reduce((a, b) => b.truth.confidence > a.truth.confidence ? b : a);
    return { frequency: strongest.truth.frequency, confidence: strongest.truth.confidence };
  }
};